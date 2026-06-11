# Create RDS PostgreSQL using AWS Console

This guide creates a private database for [05 - RDS PostgreSQL](../05-rds-postgresql.md). The flow follows the current `Aurora and RDS` console layout shown in the screenshot.

## Desired result

```text
RDS PostgreSQL: learn-devops-demo-postgres
├── Database: devops_demo
├── Master username: devops_demo
├── Port: 5432
├── Deployment: Single-AZ
├── Public access: No
├── DB subnet group: private subnets only
└── VPC: learn-devops-demo-vpc
```

The database is not publicly accessible. It should only accept PostgreSQL connections from resources using Security Group `learn-devops-demo-ecs-sg`.


## Recommended: create the DB subnet group first

RDS needs a DB subnet group to decide which subnets the database may use. For this lab, use only the two private subnets.

The create database screen may show `Create new DB Subnet Group`, like in the screenshot. That option is convenient, but it does not always let you carefully select only the private subnets from this page. For a clearer lab setup, create the subnet group before starting the database wizard:

1. Go to `Aurora and RDS` → `Subnet groups`.
2. Click `Create DB subnet group`.
3. Fill in:

| Field | Value |
| --- | --- |
| `Name` | `learn-devops-demo-rds-subnet-group` |
| `Description` | `Private subnets for learn-devops demo RDS` |
| `VPC` | `learn-devops-demo-vpc` |

4. In `Availability Zones`, select the two AZs used by the lab private subnets.
5. In `Subnets`, select only the two private subnets.
6. Click `Create`.

Do not select the public subnets. If you used the sample CIDRs from the lab, the private subnets are `10.0.11.0/...` and `10.0.12.0/...`. If the VPC wizard generated different CIDRs, identify the private subnets by their route table: private subnets do not have a direct route to the Internet Gateway.

## Open the database creation screen

1. Sign in to AWS Console.
2. Select the lab region, for example `Asia Pacific (Singapore)`.
3. Open `Aurora and RDS`.
4. Go to `Databases`.
5. Click `Create database`.

## 1. Engine options

| Field | Value to select or enter | Why |
| --- | --- | --- |
| `Engine type` | `PostgreSQL` | Use standard RDS PostgreSQL, not Aurora. |
| `Choose a database creation method` | `Full configuration` | Shows networking, storage, monitoring, and cost controls. |
| `Templates` | `Free tier`, if available | Keeps the lab small. Use `Dev/Test` only if Free Tier is unavailable. |

## 2. Availability and durability

| Field | Value to select or enter | Why |
| --- | --- | --- |
| `Deployment options` | `Single-AZ DB instance deployment (1 instance)` | Cheapest option for this lab. No standby instance. |

Do not choose Multi-AZ for the cost-saving lab. Multi-AZ creates extra database capacity and costs more.

## 3. Settings and credentials

| Field | Value to select or enter |
| --- | --- |
| `Engine version` | Keep the AWS default shown in your console |
| `Show only versions that support the Multi-AZ DB cluster` | Off |
| `Enable RDS Extended Support` | Unchecked |
| `DB instance identifier` | `learn-devops-demo-postgres` |
| `Master username` | `devops_demo` |
| `Credentials management` | `Self managed` |
| `Auto generate password` | Usually unchecked for this lab |
| `Master password` | Enter a strong password |
| `Confirm master password` | Re-enter the same password |

### Additional credentials settings

| Field | Value |
| --- | --- |
| `Database authentication options` | `Password authentication` |


## 4. Instance configuration

| Field | Value to select or enter | Why |
| --- | --- | --- |
| `Include previous generation classes` | Off | Keeps old instance types hidden. |
| `DB instance class` | `Burstable classes (includes t classes)` | Suitable for light lab traffic. |
| `Instance type` | `db.t4g.micro`, if available | Free Tier-eligible in many accounts and small enough for the lab. |

If `db.t4g.micro` is unavailable, select the smallest available burstable instance type.

## 5. Storage

| Field | Value to select or enter | Why |
| --- | --- | --- |
| `Storage type` | `General Purpose SSD (gp2)` | Matches the screenshot and is enough for the lab. |
| `Allocated storage` | `20 GiB` | Minimum shown by the console for this configuration. |
| `Additional storage configuration` | Leave default, or disable storage autoscaling if shown | Avoid unexpected storage growth. |

## 6. Connectivity

| Field | Value to select or enter |
| --- | --- |
| `Compute resource` | `Don't connect to an EC2 compute resource` |
| `Virtual private cloud (VPC)` | `learn-devops-demo-vpc` |
| `DB subnet group` | `learn-devops-demo-rds-subnet-group` |
| `Public access` | `No` |
| `VPC security group (firewall)` | `Choose existing` |
| `Existing VPC security groups` | `learn-devops-demo-rds-sg` |
| `Availability Zone` | `No preference` |
| `Create an RDS Proxy` | Unchecked |
| `Certificate authority` | Keep default |

If the `DB subnet group` dropdown only shows `Create new DB Subnet Group`, stop and create `learn-devops-demo-rds-subnet-group` first using the section above. This keeps the database placement intentional instead of relying on RDS to choose subnets for you.

### Additional connectivity configuration

Expand `Additional configuration` inside the `Connectivity` section:

| Field | Value |
| --- | --- |
| `Database port` | `5432` |

## 7. Tags

Tags are optional. You can leave this section empty for the lab.

## 8. Monitoring

| Field | Value to select or enter | Why |
| --- | --- | --- |
| `Database Insights` | `Database Insights - Standard` | Basic default option. |
| `Enable Performance Insights` | Optional; disable for lowest cost | The screenshot has it enabled with 7-day retention. |
| `Retention period` | `7 days`, if Performance Insights is enabled | Lowest visible retention in the screenshot. |
| `AWS KMS key` | `(default) aws/rds` | Fine for the lab. |
| `Enable Enhanced monitoring` | Unchecked | Avoid extra monitoring setup/cost. |
| `Log exports` | Leave unchecked | Not needed for the demo. |
| `Turn on DevOps Guru` | Unchecked | Not needed for the demo. |

For the most cost-conscious setup, disable `Enable Performance Insights`. If you leave it enabled, keep the retention period at `7 days`.

## 9. Additional configuration

Expand the final `Additional configuration` section near the bottom of the page.

| Field | Value to select or enter | Why |
| --- | --- | --- |
| `Initial database name` | `devops_demo` | This is the database the app connects to. |
| `Backup retention period` | Lowest suitable value for the lab | Reduces backup storage retention. |
| `Enable deletion protection` | Unchecked | Allows cleanup after the lab. |

Keep the other default options unless you have a specific reason to change them.

## 10. Review estimated costs and create

Review `Estimated monthly costs`. The screenshot shows the Free Tier reminder:

- 750 hours per month for an eligible Single-AZ micro DB instance.
- 20 GiB of General Purpose SSD storage.
- 20 GiB of backup storage and snapshots.

Free Tier eligibility depends on your account age, region, usage, and selected options. RDS can still charge for instance hours, storage, backups, monitoring, and data transfer.

Click `Create database`.

## If you used an auto-generated password

If you enabled `Auto generate password`, AWS shows the generated password only once after database creation:

1. Go to the `Databases` page.
2. Click `View credential details`.
3. Confirm `Master username` is `devops_demo`.
4. Copy `Master password`.
5. Save it in a password manager before closing the dialog.

If you close the dialog before saving the password, wait for the database to become `Available`, open the database, click `Modify`, and set a new master password.

## Check after creation

Wait for status to become `Available`, then open `learn-devops-demo-postgres` and confirm:

- `Status` is `Available`.
- `Publicly accessible` is `No`.
- VPC is `learn-devops-demo-vpc`.
- DB subnet group is `learn-devops-demo-rds-subnet-group`.
- Port is `5432`.
- Security Group is `learn-devops-demo-rds-sg`.
- Endpoint has appeared.

You will use the endpoint, database name, username, and password in later steps.

## Cost note

RDS can incur charges even with no requests. If pausing the lab or not continuing, delete the database per the cleanup section of [05 - RDS PostgreSQL](../05-rds-postgresql.md).
