# Learn DevOps Demo - CloudFormation

This repository contains the Infrastructure as Code (IaC) to deploy the Learn DevOps demo stack using AWS CloudFormation.

## Architecture

This stack deploys:
- A custom VPC with Public and Private subnets
- An Application Load Balancer (ALB)
- Amazon ECS (Fargate) for the Node.js application
- Amazon RDS (PostgreSQL)
- Amazon ElastiCache (Redis Serverless)
- CloudWatch Logs and Metrics
- Amazon Managed Grafana

## Daily Operations

### 1. Validate the Template

Before deploying, always validate the template syntax:

```bash
aws cloudformation validate-template --template-body file://demo-stack.yml
```

### 2. Deploy or Update the Stack

To deploy the stack or update it with new changes (e.g., changing `DesiredCount` or deploying a new `ImageTag`), run:

```bash
aws cloudformation deploy \
  --stack-name learn-devops-demo-stack \
  --template-file demo-stack.yml \
  --parameter-overrides \
    DBPassword=YourSecurePassword123 \
    ImageTag=demo-001 \
    DesiredCount=1 \
  --capabilities CAPABILITY_NAMED_IAM
```

*Note: `CAPABILITY_NAMED_IAM` is required because this stack provisions IAM roles for ECS.*

### 3. Monitor Stack Events

You can watch the deployment progress from the AWS Console or use the CLI:

```bash
aws cloudformation describe-stack-events \
  --stack-name learn-devops-demo-stack \
  --query 'StackEvents[?ResourceStatus!=`CREATE_IN_PROGRESS`]|[0:10].[LogicalResourceId,ResourceType,ResourceStatus]' \
  --output table
```

### 4. Retrieve Outputs

Once deployed, retrieve the ALB DNS name and other endpoints:

```bash
aws cloudformation describe-stacks \
  --stack-name learn-devops-demo-stack \
  --query 'Stacks[0].Outputs' \
  --output table
```

### 5. Destroy the Stack

To completely tear down the environment and stop incurring costs:

```bash
aws cloudformation delete-stack --stack-name learn-devops-demo-stack
```
