# CloudShell VPC environment

This guide introduces CloudShell VPC environment and uses the private database from [05 - RDS PostgreSQL](../05-rds-postgresql.md) as a connection example.

## What is CloudShell VPC environment

Regular CloudShell is a browser-based terminal pre-authenticated by AWS. CloudShell VPC environment is a CloudShell environment placed in a VPC, subnet, and Security Group of your choice.

This environment is suitable for debugging private resources within a VPC without enabling public access or creating an EC2 test host. In the example below, the CloudShell VPC environment is used to connect to RDS PostgreSQL with `PubliclyAccessible=false`.

## Prerequisites

You need:

- RDS PostgreSQL with status `Available`.
- VPC `learn-devops-demo-vpc`.
- One private subnet from the lab.
- Security Group `learn-devops-demo-ecs-sg`.
- RDS Security Group `learn-devops-demo-rds-sg` with inbound rule PostgreSQL port `5432` from `learn-devops-demo-ecs-sg`.
- DB instance endpoint, database name, username, and password.
- If RDS was cleaned up, rerun [step 05](../05-rds-postgresql.md) first.

## Create CloudShell VPC environment

1. Open AWS Console and select the correct region containing RDS, e.g., Singapore is `ap-southeast-1`.
2. Open `CloudShell`.
3. Click the `+` sign → `Create VPC environment`.
4. Fill in:

| Field | Value to select or enter |
| --- | --- |
| `Name` | `learn-devops-demo-shell` |
| `VPC` | `learn-devops-demo-vpc` |
| `Subnet` | Select a private subnet from the lab |
| `Security group` | `learn-devops-demo-ecs-sg` |

5. Click `Create`.

Select `learn-devops-demo-ecs-sg` because the lab's RDS SG only allows port `5432` connections from this SG.

## Example: connect to private RDS PostgreSQL

### Check psql

In the CloudShell VPC environment, run:

```bash
psql --version
```

If `psql` is already available, continue to the section below.

The minimal lab does not create a NAT Gateway, so the CloudShell VPC environment has no outbound internet to install packages or download files from the internet. If `psql` is not yet available, use an ECS task, EC2 test host with suitable configuration, or consider creating a temporary NAT Gateway and deleting it immediately after testing to avoid charges.

### Connect to RDS PostgreSQL

Set variables according to the created database. Do not save the password to Git:

```bash
RDS_ENDPOINT=YOUR_RDS_ENDPOINT
DB_NAME=devops_demo
DB_USERNAME=devops_demo
```

Test DNS:

```bash
nslookup "$RDS_ENDPOINT"
```

Connect to PostgreSQL:

```bash
psql "host=$RDS_ENDPOINT port=5432 dbname=$DB_NAME user=$DB_USERNAME sslmode=require"
```

Enter the password when `psql` prompts. Do not put the password directly in the command to avoid saving the secret in shell history.

In the PostgreSQL prompt, run:

```sql
select now();
```

Exit:

```sql
\q
```

### Full TLS verification if you already have a CA bundle

The RDS Console can generate a sample command using `sslmode=verify-full`. This mode encrypts the connection, verifies the certificate, and verifies the hostname.

If the CloudShell VPC environment already has the `global-bundle.pem` file, run:

```bash
psql "host=$RDS_ENDPOINT port=5432 dbname=$DB_NAME user=$DB_USERNAME sslmode=verify-full sslrootcert=./global-bundle.pem"
```

Do not run `curl` to download the CA bundle in the lab's private subnet if you don't have a NAT Gateway or suitable outbound internet path.

## Troubleshooting

- `could not translate host name ... to address`: confirm the endpoint is copied directly from the RDS Console and RDS has status `Available`.
- Timeout when connecting: confirm the CloudShell VPC environment uses `learn-devops-demo-ecs-sg` and RDS SG allows inbound port `5432` from that SG.
- `password authentication failed`: check username, password, and database name.
- `psql: command not found`: the current CloudShell VPC environment does not have a PostgreSQL client. Do not create a NAT Gateway just for testing if not necessary.

## Cleanup

After testing, delete the CloudShell VPC environment if no longer in use:

1. Open the menu of the CloudShell VPC environment.
2. Select `Delete`.
3. Confirm environment deletion.

CloudShell does not charge extra, but you should delete the temporary environment to keep the workspace tidy and avoid confusion.

Reference AWS documentation: [Connect to Private Amazon RDS PostgreSQL Database Using AWS CloudShell](https://docs.aws.amazon.com/hands-on/latest/connect-to-private-amazon-rds-for-postgresql-from-aws-cloudshell/connect-to-private-amazon-rds-postgresql-database-using-aws-cloudshell.html).