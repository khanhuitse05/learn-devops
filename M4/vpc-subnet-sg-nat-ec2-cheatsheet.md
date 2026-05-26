# M4: VPC, Subnet, Security Group, NAT Gateway, and EC2

M4 is about building the private network where ECS, RDS, Redis, EFS, and EC2
run. The key DevOps skill is understanding whether traffic can reach the right
place, through the right route, with the right firewall rules.

## Target Architecture

Use this lab shape:

```text
Internet
  -> Internet Gateway
  -> Public subnets in 2 AZs
       -> ALB later
       -> NAT Gateway
  -> Private subnets in 2 AZs
       -> ECS tasks later
       -> RDS / Redis / EFS later
       -> EC2 test instance
```

Public subnet means it has a route to the Internet Gateway.

Private subnet means it does not route directly to the Internet Gateway.
Outbound internet usually goes through a NAT Gateway in a public subnet.

## Core Concepts

### VPC

A VPC is your private network boundary in AWS.

Example CIDR:

```text
10.0.0.0/16
```

This gives you many private IP addresses from `10.0.0.0` to
`10.0.255.255`.

### Subnet

A subnet is a smaller IP range inside a VPC and belongs to one Availability
Zone.

Example 2 AZ layout:

| Name | AZ | CIDR | Purpose |
| --- | --- | --- | --- |
| `public-a` | `ap-southeast-1a` | `10.0.1.0/24` | ALB, NAT |
| `public-b` | `ap-southeast-1b` | `10.0.2.0/24` | ALB |
| `private-a` | `ap-southeast-1a` | `10.0.11.0/24` | ECS, EC2 test |
| `private-b` | `ap-southeast-1b` | `10.0.12.0/24` | ECS, RDS |

### Route Table

A route table decides where packets go.

Public route table:

```text
10.0.0.0/16 -> local
0.0.0.0/0   -> Internet Gateway
```

Private route table:

```text
10.0.0.0/16 -> local
0.0.0.0/0   -> NAT Gateway
```

### Internet Gateway

An Internet Gateway lets public subnet resources communicate with the internet
when their route table points to it and security rules allow traffic.

### NAT Gateway

A NAT Gateway lets private subnet resources call out to the internet while
remaining unreachable from the public internet.

Common use:

```text
Private EC2/ECS -> NAT Gateway -> Internet
```

NAT Gateway has hourly and data processing cost, so delete it after practice if
you do not need it.

### Security Group

A security group is a stateful firewall attached to resources such as EC2, ALB,
RDS, and ECS tasks.

Stateful means if inbound traffic is allowed, the response traffic is allowed
back automatically.

Common production pattern:

| Resource | Inbound rule |
| --- | --- |
| ALB SG | `80/443` from `0.0.0.0/0` |
| ECS SG | app port from ALB SG only |
| RDS SG | database port from ECS SG only |
| Redis SG | Redis port from ECS SG only |

Avoid opening database, Redis, or private app ports to `0.0.0.0/0`.

### NACL

A Network ACL is a subnet-level stateless firewall. Most beginner and normal
ECS setups rely mainly on security groups. Learn NACLs as a second layer, but
do not start by changing them unless you have a clear reason.

### EC2

EC2 is a virtual machine. In this module, use EC2 as a network test host:

- Public EC2: easy SSH test, but less private.
- Private EC2: better practice for production network debugging.
- SSM Session Manager: preferred access pattern when possible because it avoids
  public SSH exposure.

## AWS CLI Setup

Run these from macOS host or Ubuntu VM after M3 AWS CLI setup is working.

Check identity:

```bash
aws sts get-caller-identity
```

Set a default region for this shell:

```bash
export AWS_DEFAULT_REGION=ap-southeast-1
export AWS_REGION="$AWS_DEFAULT_REGION"
```

Check available AZs:

```bash
aws ec2 describe-availability-zones \
  --region "$AWS_REGION" \
  --query 'AvailabilityZones[].ZoneName' \
  --output table
```

## Practice Lab: Create a Small VPC

This lab creates a two-AZ VPC shape with public and private subnets. Replace
names and CIDRs if you already have a VPC using the same range.

### 1. Create VPC

```bash
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=m4-demo-vpc}]' \
  --query 'Vpc.VpcId' \
  --output text)

echo "$VPC_ID"
```

Enable DNS support:

```bash
aws ec2 modify-vpc-attribute \
  --vpc-id "$VPC_ID" \
  --enable-dns-support '{"Value":true}'

aws ec2 modify-vpc-attribute \
  --vpc-id "$VPC_ID" \
  --enable-dns-hostnames '{"Value":true}'
```

### 2. Create Subnets

Pick two AZs:

```bash
AZ_A=$(aws ec2 describe-availability-zones \
  --query 'AvailabilityZones[0].ZoneName' \
  --output text)

AZ_B=$(aws ec2 describe-availability-zones \
  --query 'AvailabilityZones[1].ZoneName' \
  --output text)

echo "$AZ_A $AZ_B"
```

Create subnets:

```bash
PUBLIC_A=$(aws ec2 create-subnet \
  --vpc-id "$VPC_ID" \
  --cidr-block 10.0.1.0/24 \
  --availability-zone "$AZ_A" \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=m4-public-a}]' \
  --query 'Subnet.SubnetId' \
  --output text)

PUBLIC_B=$(aws ec2 create-subnet \
  --vpc-id "$VPC_ID" \
  --cidr-block 10.0.2.0/24 \
  --availability-zone "$AZ_B" \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=m4-public-b}]' \
  --query 'Subnet.SubnetId' \
  --output text)

PRIVATE_A=$(aws ec2 create-subnet \
  --vpc-id "$VPC_ID" \
  --cidr-block 10.0.11.0/24 \
  --availability-zone "$AZ_A" \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=m4-private-a}]' \
  --query 'Subnet.SubnetId' \
  --output text)

PRIVATE_B=$(aws ec2 create-subnet \
  --vpc-id "$VPC_ID" \
  --cidr-block 10.0.12.0/24 \
  --availability-zone "$AZ_B" \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=m4-private-b}]' \
  --query 'Subnet.SubnetId' \
  --output text)
```

Allow public subnets to auto-assign public IPv4 addresses:

```bash
aws ec2 modify-subnet-attribute \
  --subnet-id "$PUBLIC_A" \
  --map-public-ip-on-launch

aws ec2 modify-subnet-attribute \
  --subnet-id "$PUBLIC_B" \
  --map-public-ip-on-launch
```

### 3. Create Internet Gateway and Public Route

```bash
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=m4-demo-igw}]' \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

aws ec2 attach-internet-gateway \
  --internet-gateway-id "$IGW_ID" \
  --vpc-id "$VPC_ID"
```

Create and associate a public route table:

```bash
PUBLIC_RT=$(aws ec2 create-route-table \
  --vpc-id "$VPC_ID" \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=m4-public-rt}]' \
  --query 'RouteTable.RouteTableId' \
  --output text)

aws ec2 create-route \
  --route-table-id "$PUBLIC_RT" \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id "$IGW_ID"

aws ec2 associate-route-table --route-table-id "$PUBLIC_RT" --subnet-id "$PUBLIC_A"
aws ec2 associate-route-table --route-table-id "$PUBLIC_RT" --subnet-id "$PUBLIC_B"
```

### 4. Create NAT Gateway and Private Route

Create an Elastic IP:

```bash
EIP_ALLOC_ID=$(aws ec2 allocate-address \
  --domain vpc \
  --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=m4-nat-eip}]' \
  --query 'AllocationId' \
  --output text)
```

Create NAT Gateway in a public subnet:

```bash
NAT_ID=$(aws ec2 create-nat-gateway \
  --subnet-id "$PUBLIC_A" \
  --allocation-id "$EIP_ALLOC_ID" \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=m4-nat-a}]' \
  --query 'NatGateway.NatGatewayId' \
  --output text)

aws ec2 wait nat-gateway-available --nat-gateway-ids "$NAT_ID"
```

Create and associate a private route table:

```bash
PRIVATE_RT=$(aws ec2 create-route-table \
  --vpc-id "$VPC_ID" \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=m4-private-rt}]' \
  --query 'RouteTable.RouteTableId' \
  --output text)

aws ec2 create-route \
  --route-table-id "$PRIVATE_RT" \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id "$NAT_ID"

aws ec2 associate-route-table --route-table-id "$PRIVATE_RT" --subnet-id "$PRIVATE_A"
aws ec2 associate-route-table --route-table-id "$PRIVATE_RT" --subnet-id "$PRIVATE_B"
```

## Security Group Practice

Create an ALB security group:

```bash
ALB_SG=$(aws ec2 create-security-group \
  --group-name m4-alb-sg \
  --description "M4 ALB public web access" \
  --vpc-id "$VPC_ID" \
  --query 'GroupId' \
  --output text)

aws ec2 authorize-security-group-ingress \
  --group-id "$ALB_SG" \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id "$ALB_SG" \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

Create an app security group that only receives traffic from the ALB security
group:

```bash
APP_SG=$(aws ec2 create-security-group \
  --group-name m4-app-sg \
  --description "M4 app access from ALB only" \
  --vpc-id "$VPC_ID" \
  --query 'GroupId' \
  --output text)

aws ec2 authorize-security-group-ingress \
  --group-id "$APP_SG" \
  --protocol tcp \
  --port 3000 \
  --source-group "$ALB_SG"
```

Create a database security group that only receives traffic from the app
security group:

```bash
DB_SG=$(aws ec2 create-security-group \
  --group-name m4-db-sg \
  --description "M4 database access from app only" \
  --vpc-id "$VPC_ID" \
  --query 'GroupId' \
  --output text)

aws ec2 authorize-security-group-ingress \
  --group-id "$DB_SG" \
  --protocol tcp \
  --port 5432 \
  --source-group "$APP_SG"
```

## EC2 Test Host

For production-like access, use SSM Session Manager instead of opening SSH to
the internet. To use SSM, the EC2 instance needs:

- An IAM instance profile with `AmazonSSMManagedInstanceCore`.
- Network path to SSM endpoints, either through NAT Gateway or VPC endpoints.
- The SSM agent installed, which Amazon Linux 2 and Amazon Linux 2023 usually
  include.

Useful checks after connecting to the instance:

```bash
ip addr
ip route
curl -I https://aws.amazon.com
curl -s https://checkip.amazonaws.com
```

If the private EC2 can reach the internet through NAT, `curl` should work, but
the instance should not have a public IPv4 address.

## Debugging Checklist

When something cannot connect:

1. Check the source and destination subnets.
2. Check the source route table.
3. Check whether the destination is public or private.
4. Check security group inbound rules on the destination.
5. Check security group outbound rules on the source.
6. Check whether the app is listening on the expected port.
7. Check DNS names and private IP addresses.
8. Check CloudWatch logs or system logs.

AWS CLI inspection commands:

```bash
aws ec2 describe-vpcs --vpc-ids "$VPC_ID" --output table
aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --output table
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$VPC_ID" --output table
aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" --output table
aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=$VPC_ID" --output table
```

## Cleanup

Delete resources when you finish the lab. NAT Gateway and Elastic IP can cost
money while they exist.

Recommended cleanup order:

1. Terminate EC2 instances.
2. Delete NAT Gateway and wait until deleted.
3. Release Elastic IP.
4. Delete route tables after disassociating subnets if needed.
5. Detach and delete Internet Gateway.
6. Delete security groups.
7. Delete subnets.
8. Delete VPC.

Example NAT cleanup:

```bash
aws ec2 delete-nat-gateway --nat-gateway-id "$NAT_ID"
aws ec2 wait nat-gateway-deleted --nat-gateway-ids "$NAT_ID"
aws ec2 release-address --allocation-id "$EIP_ALLOC_ID"
```

## M4 Exercises

1. Draw the VPC with public and private subnets in two AZs.
2. Explain why private subnets use NAT Gateway for outbound internet.
3. Create three security groups: ALB, app, and database.
4. Launch a private EC2 test instance and verify outbound internet access.
5. Explain why RDS should not allow inbound traffic from `0.0.0.0/0`.
