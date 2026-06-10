# Create RDS PostgreSQL using AWS Console

This guide creates a private database for [05 - RDS PostgreSQL](../05-rds-postgresql.md).

## Desired result

```text
RDS PostgreSQL: learn-devops-demo-postgres
├── Database: devops_demo
├── Master username: devops_demo
├── Port: 5432
├── Deployment: Single-AZ
├── Public access: No
└── VPC: learn-devops-demo-vpc
```

The database runs in private subnets and only accepts connections from the ECS task's Security Group.

## Prerequisites

Complete [04 - VPC Network](../04-vpc-network.md) first. You need:

- VPC `learn-devops-demo-vpc`.
- Two private subnets in two different Availability Zones.
- Security Group `learn-devops-demo-rds-sg`.
- Inbound rule PostgreSQL port `5432` of RDS SG only accepting traffic from `learn-devops-demo-ecs-sg`.
- If network was cleaned up, rerun [step 04](../04-vpc-network.md) before creating the database.
- If the database `learn-devops-demo-postgres` already exists, check its status before recreating.

## Open the database creation screen

1. Sign in to AWS Console.
2. Find the `Aurora and RDS` service.
3. Go to `Databases`.
4. Click `Create database` → `Full configuration`.

## Select engine and deployment

| Field | Value to select or enter | Explanation |
| --- | --- | --- |
| `Engine type` | `PostgreSQL` | Use standard RDS PostgreSQL, not Aurora. |
| `Choose a database creation method` | `Full configuration` | Allows configuring private network and cost settings. |
| `Template` | `Free tier` if available | Use a small configuration for the lab. |
| `Deployment options` | `Single-AZ DB instance deployment (1 instance)` | Do not create a paid standby instance. |
| `Engine version` | Keep the default PostgreSQL version recommended by AWS | The demo schema only uses basic PostgreSQL features. |
| `Enable RDS Extended Support` | Do not enable | The lab does not need the paid extended support service. |

`Free tier` is the name of the small configuration template. Actual billing also depends on account promotional conditions or credits. RDS can still charge by instance hours, storage, backup, and data transfer.

## Fill in settings and credentials

| Field | Value to select or enter |
| --- | --- |
| `DB instance identifier` | `learn-devops-demo-postgres` |
| `Master username` | `devops_demo` |
| `Credentials management` | `Self managed` |
| `Master password` | Enter a strong password yourself or enable `Auto generate a password` |
| `Database authentication options` | `Password authentication` |

Do not save the password to Git. If you enable `Auto generate a password`, AWS only shows the password once after creating the database. You must save the password to a password manager before closing the dialog.

## Fill in instance and storage

| Field | Value to select or enter | Explanation |
| --- | --- | --- |
| `DB instance class` | `Burstable classes (includes t classes)` | Suitable for the lab's light load. |
| `Instance type` | `db.t4g.micro` if available | Select a small instance to save costs. |
| `Storage type` | `General Purpose SSD (gp2)` | Sufficient for the lab. |
| `Allocated storage` | `20 GiB` | Minimum level suitable for the lab. |
| `Enable storage autoscaling` | Do not enable | Avoid unexpected storage growth. |

## Fill in connectivity

| Field | Value to select or enter |
| --- | --- |
| `Compute resource` | `Don't connect to an EC2 compute resource` |
| `Virtual private cloud (VPC)` | `learn-devops-demo-vpc` |
| `Public access` | `No` |
| `VPC security group (firewall)` | `Choose existing` |
| `Existing VPC security groups` | `learn-devops-demo-rds-sg` |
| `Availability Zone` | `No preference` |
| `Create an RDS Proxy` | Do not enable |
| `Certificate authority` | Keep default |

### Create DB subnet group if the list is empty

If the `DB subnet group` section only shows `Create new DB Subnet Group`, select it and fill in:

| Field | Value to select or enter |
| --- | --- |
| `Name` | `learn-devops-demo-rds-subnet-group` |
| `Description` | `Private subnets for RDS demo` |
| `VPC` | `learn-devops-demo-vpc` |

Add exactly two private subnets in two different Availability Zones:

- Private subnet A: `10.0.11.0/24`.
- Private subnet B: `10.0.12.0/24`.

Do not select public subnet `10.0.1.0/24` or `10.0.2.0/24`. If you used different CIDRs when creating the VPC, select the corresponding two private subnets instead of matching against the sample CIDRs.

## Fill in additional configuration

Expand `Additional configuration` and fill in:

| Field | Value to select or enter |
| --- | --- |
| `Initial database name` | `devops_demo` |
| `Backup retention period` | Lowest suitable for the lab |
| `Enable deletion protection` | Do not enable |

Keep `Database Insights - Standard`. For a cost-minimized lab:

- Do not select `Database Insights - Advanced`.
- You can disable `Enable Performance Insights`.
- Do not enable `Enhanced Monitoring`.
- Do not enable `Log exports`.

Click `Create database`.

### Saving an auto-generated password

If you enabled `Auto generate a password`, go to the `Databases` page and click `View credential details` immediately after creating the database. In the `Connection details to your database` dialog:

1. Confirm `Master username` is `devops_demo`.
2. Copy `Master password`.
3. Save the password to a password manager.
4. Only close the dialog after saving the password.

AWS does not allow viewing the auto-generated password again after closing this dialog. If you lose the password, wait for the database to become `Available`, go to the database → `Modify`, and set a new master password.

Then wait for the status to change to `Available`.

## Check after creation

Go to the database `learn-devops-demo-postgres` and confirm:

- `Status` is `Available`.
- `Publicly accessible` is `No`.
- VPC is `learn-devops-demo-vpc`.
- Port is `5432`.
- Security Group is `learn-devops-demo-rds-sg`.
- Endpoint has appeared to use for later steps.

## Cost note

RDS can incur charges even with no requests. If pausing the lab or not continuing, delete the database per the cleanup section of [05 - RDS PostgreSQL](../05-rds-postgresql.md).