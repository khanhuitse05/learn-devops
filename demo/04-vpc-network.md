# 04 - VPC Network

## Objective

Create a minimal network to prepare for RDS, ECS, and ALB. Prioritize cost savings, so do not create a NAT Gateway initially if not needed.

## Prerequisites

- Completed [step 00](00-prerequisites.md): AWS CLI logged into the correct account and knowing the region used for the lab.
- Stopped the local stack from [step 03](03-docker-compose-app-postgres.md) if no longer running locally.
- No AWS resources from previous steps needed yet.
- If a lab VPC was created previously, check before recreating to avoid duplicate resources.

## Knowledge to understand

- ALB needs public subnets.
- ECS tasks and RDS should run in private subnets.
- Security Groups are the primary firewall at the resource level.
- RDS does not need public access if the app runs in the same VPC.

## Estimated cost

- VPC, subnet, route table, security group: free.
- Internet Gateway: free.
- NAT Gateway: charges hourly and by data. Do not create a NAT Gateway in the minimal lab unless you truly need outbound internet from private subnets.

## Cost warning for paid services

NAT Gateway is an easy-to-forget resource that incurs costs. For a cost-saving lab, avoid creating a NAT Gateway or delete it immediately after testing.

## Console steps

### Part 1: Create network using the wizard

1. Go to VPC Console.
2. Follow the guide: [Create VPC using AWS Console](more/create-vpc-console.md).

The `VPC and more` wizard will create the following resources in one go. No need to recreate manually:

- VPC `learn-devops-demo-vpc`: `10.0.0.0/16`.
- 2 public subnets:
  - Public subnet A: `10.0.1.0/24`.
  - Public subnet B: `10.0.2.0/24`.
- 2 private subnets:
  - Private subnet A: `10.0.11.0/24`.
  - Private subnet B: `10.0.12.0/24`.
- Internet Gateway attached to the VPC.
- Public route table has route `0.0.0.0/0` to Internet Gateway and is associated with the 2 public subnets.
- Private route table only has local route because this lab does not create a NAT Gateway.

The wizard auto-generates Name tags for subnets. Use CIDR to precisely identify each subnet. If desired, you can rename Name tags after creation:

- `learn-devops-demo-public-a`: `10.0.1.0/24`.
- `learn-devops-demo-public-b`: `10.0.2.0/24`.
- `learn-devops-demo-private-a`: `10.0.11.0/24`.
- `learn-devops-demo-private-b`: `10.0.12.0/24`.

### Part 2: Manually create Security Groups

`Security Group` is a resource-level firewall. `Inbound rules` specify which sources are allowed to connect to the resource and on which port.

In this lab, traffic follows this path:

```text
Internet
  └── HTTP port 80 → ALB
                       └── app port 3000 → ECS task
                                              └── PostgreSQL port 5432 → RDS
```

Create Security Groups in the exact order below, because Security Groups created later need to reference Security Groups created earlier.

#### 2.1. Create Security Group for ALB

1. Go to `VPC Console` → `Security groups`.
2. Click `Create security group`.
3. Fill in the `Basic details` section:

| Field | Value |
| --- | --- |
| `Security group name` | `learn-devops-demo-alb-sg` |
| `Description` | `Allow HTTP traffic from internet to ALB` |
| `VPC` | Select `learn-devops-demo-vpc` |

4. In `Inbound rules`, click `Add rule` and fill in:

| Type | Port range | Source |
| --- | --- | --- |
| `HTTP` | `80` | `Anywhere-IPv4` (`0.0.0.0/0`) |

5. Keep default `Outbound rules`.
6. Click `Create security group`.

Meaning: internet users are allowed to send HTTP requests to ALB.

#### 2.2. Create Security Group for ECS task

1. Go back to `Security groups`.
2. Click `Create security group`.
3. Fill in the `Basic details` section:

| Field | Value |
| --- | --- |
| `Security group name` | `learn-devops-demo-ecs-sg` |
| `Description` | `Allow app traffic from ALB to ECS` |
| `VPC` | Select `learn-devops-demo-vpc` |

4. In `Inbound rules`, click `Add rule` and fill in:

| Type | Port range | Source |
| --- | --- | --- |
| `Custom TCP` | `3000` | Select Security Group `learn-devops-demo-alb-sg` |

5. Keep default `Outbound rules`.
6. Click `Create security group`.

Meaning: only ALB is allowed to send requests to the app running on the ECS task. Do not select `Anywhere-IPv4` for this rule.

#### 2.3. Create Security Group for RDS PostgreSQL

1. Go back to `Security groups`.
2. Click `Create security group`.
3. Fill in the `Basic details` section:

| Field | Value |
| --- | --- |
| `Security group name` | `learn-devops-demo-rds-sg` |
| `Description` | `Allow PostgreSQL traffic from ECS to RDS` |
| `VPC` | Select `learn-devops-demo-vpc` |

4. In `Inbound rules`, click `Add rule` and fill in:

| Type | Port range | Source |
| --- | --- | --- |
| `PostgreSQL` | `5432` | Select Security Group `learn-devops-demo-ecs-sg` |

5. Keep default `Outbound rules`.
6. Click `Create security group`.

Meaning: only the ECS task is allowed to connect to the database. Do not open port `5432` to `0.0.0.0/0`.

#### 2.4. Expected result to verify

| Security Group | Receives traffic from | Port |
| --- | --- | --- |
| `learn-devops-demo-alb-sg` | Internet: `0.0.0.0/0` | `80` |
| `learn-devops-demo-ecs-sg` | `learn-devops-demo-alb-sg` | `3000` |
| `learn-devops-demo-rds-sg` | `learn-devops-demo-ecs-sg` | `5432` |

## CLI check/debug commands

AWS CLI only finds resources in the specified region. First, set `AWS_REGION` to the same region selected in the top-right of the AWS Console. For example, Singapore is `ap-southeast-1`:

```bash
AWS_REGION=ap-southeast-1
```

### 1. Get VPC ID

```bash
VPC_ID=$(aws ec2 describe-vpcs \
  --region "$AWS_REGION" \
  --filters "Name=tag:Name,Values=learn-devops-demo-vpc" \
  --query 'Vpcs[0].VpcId' \
  --output text)

echo "$VPC_ID"
```

Expected result should be in the form `vpc-...`. If the result is `None`, see troubleshooting below.

### 2. Check VPC

```bash
aws ec2 describe-vpcs \
  --region "$AWS_REGION" \
  --vpc-ids "$VPC_ID" \
  --query 'Vpcs[].{VpcId:VpcId,Cidr:CidrBlock}' \
  --output table
```

Expected result: 1 VPC with CIDR `10.0.0.0/16`.

### 3. Check subnets

```bash
aws ec2 describe-subnets \
  --region "$AWS_REGION" \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'Subnets[].{Name:Tags[?Key==`Name`]|[0].Value,SubnetId:SubnetId,Cidr:CidrBlock,Az:AvailabilityZone}' \
  --output table
```

Expected result: 4 subnets across 2 different Availability Zones. If you customized CIDR per the guide, the result includes:

- `10.0.1.0/24`
- `10.0.2.0/24`
- `10.0.11.0/24`
- `10.0.12.0/24`

If you keep the wizard defaults, AWS auto-assigns different CIDRs, e.g., `/20`. This is still correct if CIDRs do not overlap and all belong to VPC `10.0.0.0/16`.

### 4. Check Security Groups

```bash
aws ec2 describe-security-groups \
  --region "$AWS_REGION" \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'SecurityGroups[].{GroupName:GroupName,GroupId:GroupId,VpcId:VpcId}' \
  --output table
```

Expected result:

- `default`
- `learn-devops-demo-alb-sg`
- `learn-devops-demo-ecs-sg`
- `learn-devops-demo-rds-sg`

### Troubleshooting

If `$VPC_ID` is `None` or results return an empty table:

1. Check `echo "$AWS_REGION"` and confirm the region matches the AWS Console.
2. Run `aws sts get-caller-identity` to confirm the CLI is using the correct AWS account.
3. List VPCs in the current region:

```bash
aws ec2 describe-vpcs \
  --region "$AWS_REGION" \
  --query 'Vpcs[].{Name:Tags[?Key==`Name`]|[0].Value,VpcId:VpcId,Cidr:CidrBlock}' \
  --output table
```

Find the VPC with CIDR `10.0.0.0/16`. If the VPC has a different Name tag, assign the actual ID:

```bash
VPC_ID=vpc-xxxxxxxxxxxxxxxxx
```

## Expected result

- VPC and 4 subnets with non-overlapping CIDRs, across exactly 2 Availability Zones.
- Public subnets have a route to Internet Gateway.
- Private subnets are not directly public to the internet.
- RDS Security Group only accepts traffic from ECS SG, not open to `0.0.0.0/0`.

## Cleanup

- If continuing: keep VPC, subnets, route tables, Internet Gateway, and the 3 Security Groups. Step 05 uses private subnets and RDS SG; step 07 uses private subnets and ECS SG; step 08 uses public subnets and ALB SG.
- If stopping here: can delete the network since no RDS, ECS, or ALB depends on it. Do comprehensive cleanup per [step 15](15-cleanup-cost-control.md).
- Do not delete the network midway after creating RDS, ECS, or ALB. You must delete dependent resources first.

## Troubleshooting

- Cannot delete VPC: ENIs, RDS, ALB, or ECS resources still exist in the VPC.
- ECS cannot connect to RDS: check the inbound rule of RDS SG has source as ECS SG.
- ALB cannot reach ECS: check ECS SG has inbound port 3000 from ALB SG.