# M4: VPC, Subnet, Security Group, NAT Gateway, and EC2

M4 is the AWS networking foundation. ECS, RDS, Redis, EFS, ALB, and EC2 all
depend on correct VPC design, routing, and security groups.

## Learning Goals

- Design a VPC with public and private subnets across two Availability Zones.
- Understand Internet Gateway, NAT Gateway, route tables, and subnet
  association.
- Build security group rules for ALB, ECS, RDS, Redis, and EFS.
- Use EC2 or SSM Session Manager as a private network test host.
- Debug connection failures by checking route, firewall, DNS, and app port.

## Target Network

```text
Internet
  -> Internet Gateway
  -> Public subnets
       -> ALB
       -> NAT Gateway
  -> Private subnets
       -> ECS tasks
       -> RDS / Redis / EFS
       -> EC2 test host
```

## Core Topics

### Public vs Private Subnet

- Public subnet: route table has `0.0.0.0/0` to Internet Gateway.
- Private subnet: no direct Internet Gateway route.
- Private outbound internet normally goes through NAT Gateway or VPC endpoints.

### Security Group Pattern

| Resource | Inbound rule |
| --- | --- |
| ALB | `80/443` from internet |
| ECS app | app port from ALB security group only |
| RDS | `5432` from ECS security group only |
| Redis | `6379` from ECS security group only |
| EFS | `2049` from ECS/EC2 security group only |

### EC2 Access

- Prefer SSM Session Manager for private instances.
- Avoid public SSH unless it is explicitly needed and tightly restricted.
- EC2 can be used as a temporary test host for DB, Redis, DNS, and route checks.

## Hands-On Lab

1. Create a VPC with CIDR `10.0.0.0/16`.
2. Create two public and two private subnets.
3. Attach Internet Gateway and configure public route table.
4. Create NAT Gateway and private route table.
5. Create ALB, app, DB, Redis, and EFS security groups.
6. Launch a private EC2 test host.
7. Verify outbound internet from private subnet through NAT.
8. Draw the final network diagram.

## Useful Commands

```bash
aws ec2 describe-vpcs --output table
aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --output table
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$VPC_ID" --output table
aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" --output table
aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=$VPC_ID" --output table
```

From a test host:

```bash
ip route
curl -I https://aws.amazon.com
curl -s https://checkip.amazonaws.com
nc -vz DB_ENDPOINT 5432
```

## Production Notes

- Route table, NAT Gateway, and security group changes can cause downtime.
- Keep databases, Redis, and internal services private.
- NAT Gateway costs money while running.
- Use separate security groups for clear source-to-destination rules.
- Keep a rollback plan before changing production network rules.

## Extra Notes

- See `vpc-subnet-sg-nat-ec2-cheatsheet.md` for a full AWS CLI lab.
