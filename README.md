# learn-devops

A workspace for learning and practicing DevOps concepts from Linux basics to a
small AWS ECS/Fargate production-style architecture.

## Module Index

| Module | Topic | Main document |
| --- | --- | --- |
| M0 | Linux, terminal, Git, server operations | [M0/README.md](M0/README.md) |
| M1 | Networking, HTTP, DNS, TLS | [M1/README.md](M1/README.md) |
| M2 | Docker and containerization | [M2/README.md](M2/README.md) |
| M3 | AWS account, AWS CLI, IAM | [M3/README.md](M3/README.md) |
| M4 | VPC, subnet, security group, NAT, EC2 | [M4/README.md](M4/README.md) |
| M5 | ALB, ACM, Route 53, API Gateway | [M5/README.md](M5/README.md) |
| M6 | Amazon ECR image registry | [M6/README.md](M6/README.md) |
| M7 | Amazon ECS and Fargate | [M7/README.md](M7/README.md) |
| M8 | RDS, Redis, EFS data layer | [M8/README.md](M8/README.md) |
| M9 | ECS service auto scaling | [M9/README.md](M9/README.md) |
| M10 | EventBridge and SNS | [M10/README.md](M10/README.md) |
| M11 | CloudFormation IaC | [M11/README.md](M11/README.md) |
| M12 | CI/CD for ECR and ECS | [M12/README.md](M12/README.md) |
| M13 | Observability with CloudWatch and CloudTrail | [M13/README.md](M13/README.md) |
| M14 | Security, secrets, backup/DR, cost | [M14/README.md](M14/README.md) |
| M15 | Capstone project | [M15/README.md](M15/README.md) |

## Recommended Flow

1. Start with M0-M3 to build the operating, networking, Docker, and IAM
   foundation.
2. Build network and entry layer in M4-M5.
3. Deploy containers with M6-M7.
4. Add data, scaling, events, IaC, and CI/CD in M8-M12.
5. Finish with observability, security, and the capstone in M13-M15.

## Practice App

The `server/` directory contains a small Node.js demo app used by the AWS labs.
The `demo/` directory contains a more step-by-step practical path from local
server to ECS/Fargate.

## Cost Reminder

Some AWS labs can create paid resources such as NAT Gateway, RDS, Fargate, ALB,
CloudWatch logs, and Secrets Manager. Use a sandbox account, create a budget,
and clean up resources after practice.
