# 05 - RDS PostgreSQL

## Objective

Create a private Amazon RDS PostgreSQL instance so the complete server can use a managed database. This lab follows after the app can already run with local PostgreSQL; no source code changes needed.

## Prerequisites

- Completed [step 04](04-vpc-network.md).
- VPC `learn-devops-demo-vpc` still exists.
- 2 private subnets across 2 different Availability Zones exist.
- Security Group `learn-devops-demo-rds-sg` still exists and allows PostgreSQL port `5432` from `learn-devops-demo-ecs-sg`.
- If network was cleaned up in step 04: rerun [step 04](04-vpc-network.md) first.

## Knowledge to understand

- RDS is a managed database, you don't SSH into the instance.
- DB subnet group selects private subnets.
- Security Group controls who can access port 5432.
- Backup, storage, instance class, and Multi-AZ directly affect costs.
- The same app image works with both local PostgreSQL and RDS; only connection config changes.

## Estimated cost

- If the account still has Free Tier and selects an eligible configuration, costs can be very low.
- If Free Tier is no longer available, RDS charges by instance hours, storage, backup, and I/O.
- A cost-saving lab should use the smallest suitable instance, the lowest allowed storage, and delete immediately after learning.

## Cost warning for paid services

RDS incurs charges while the instance exists, even with no requests. Do not enable Multi-AZ for a cost-saving lab. Do not leave RDS running overnight if not needed.

## Console steps

Follow the detailed guide: [Create RDS PostgreSQL using AWS Console](more/create-database-console.md).

1. Go to RDS Console.
2. Select Create database - Full configuration.
3. Engine: PostgreSQL.
4. Template: Free tier if available; otherwise, select Dev/Test with a small configuration.
5. DB identifier: `learn-devops-demo-postgres`.
6. Master username: `devops_demo`.
7. Password: create a strong password, save temporarily to a password manager.
8. Instance class: select the smallest type suitable for the lab.
9. Storage: select the lowest level, disable storage autoscaling if you want to control costs.
10. Connectivity:
    - VPC: `learn-devops-demo-vpc`.
    - Public access: No.
    - DB subnet group: private subnets.
    - Security Group: `learn-devops-demo-rds-sg`.
11. Database authentication: Password authentication.
12. Initial database name: `devops_demo`.
13. Backup retention: lowest suitable for the lab.
14. Create database.

## CLI check/debug commands

Set `DB_ID` to the DB instance identifier entered when creating RDS. If using the suggested lab name:

```bash
DB_ID=learn-devops-demo-postgres
DB_NAME=devops_demo
DB_USERNAME=devops_demo
DB_PASSWORD=YOUR_PASSWORD
```

View RDS status:

```bash
aws rds describe-db-instances \
  --db-instance-identifier "$DB_ID" \
  --query 'DBInstances[0].{Status:DBInstanceStatus,Endpoint:Endpoint.Address,Port:Endpoint.Port,Public:PubliclyAccessible}' \
  --output table
```

Get endpoint:

```bash
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_ID" \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "$RDS_ENDPOINT"
```

### Note when verifying private RDS

This lab sets `PubliclyAccessible=false`, so RDS has no public IP and only accepts connections from resources with a network path into the VPC. From your local machine, the private endpoint may not resolve DNS or may not be reachable on port `5432`.

You can do basic verification right on the RDS Console:

- Status is `Available`.
- `Publicly accessible` is `No`.
- VPC, Security Group, and endpoint match the lab configuration.

To run SQL commands, use an EC2 test host, ECS task, CloudShell VPC environment, VPN, or a suitable bastion/SSM. Do not enable public access just for debugging.

Detailed guide: [CloudShell VPC environment](more/cloudshell-vpc.md).

From an EC2 test host or ECS task in the same VPC:

```bash
psql "host=$RDS_ENDPOINT port=5432 dbname=$DB_NAME user=$DB_USERNAME password=$DB_PASSWORD sslmode=require" \
  -c "select now();"
```

Create demo schema from a host with `psql`:

```bash
psql "host=$RDS_ENDPOINT port=5432 dbname=$DB_NAME user=$DB_USERNAME password=$DB_PASSWORD sslmode=require" \
  -f server/schema.sql
```

## Expected result

- RDS status is `available`.
- `PubliclyAccessible` is `false`.
- PostgreSQL connection succeeds from an EC2 test host or suitable client in the same VPC.
- The `orders` schema has been created on RDS.
- Have the RDS endpoint to inject into the ECS task via `DATABASE_URL` in step 09.

## Cleanup

- If continuing: keep RDS. Step 09 needs the endpoint and database to configure `DATABASE_URL` for the ECS task.
- If pausing or not continuing: delete RDS to stop hourly charges. The command below deletes the DB without creating a final snapshot; only use when you don't need to keep data.

```bash
aws rds delete-db-instance \
  --db-instance-identifier "$DB_ID" \
  --skip-final-snapshot \
  --delete-automated-backups
```

Check until the DB disappears:

```bash
aws rds describe-db-instances \
  --db-instance-identifier "$DB_ID"
```

## Troubleshooting

- `could not translate host name ... to address`: check if RDS has status `available` and re-fetch the endpoint using the CLI command above. The endpoint may not be usable while the instance is still `creating`.
- Timeout when connecting: RDS SG does not allow the source SG, or the client is not in the same VPC/private route.
- Auth error: check username, password, database name.
- SSL issue: try adding `sslmode=require`.