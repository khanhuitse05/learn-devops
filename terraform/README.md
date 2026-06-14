# Terraform Mini Architecture - Operations Guide

This folder deploys the Terraform capstone for `learn-devops`.

## What It Creates

- VPC with 2 public and 2 private subnets
- Public Application Load Balancer
- ECS Fargate service running the Node.js demo app
- Private RDS PostgreSQL database
- SSM Parameter Store value for `DATABASE_URL`
- CloudWatch Log Group for app logs

ECR is expected to already exist from step 06.

## First-Time Setup

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and set your own `db_password`.

## Deploy

```bash
terraform init
terraform fmt
terraform validate
terraform plan
terraform apply
```

## Verify

```bash
ALB_URL=$(terraform output -raw alb_url)
curl -i "$ALB_URL/health"
curl -i "$ALB_URL/flow"
curl -i "$ALB_URL/api/db/health"
```

## Logs

```bash
aws logs tail "$(terraform output -raw log_group_name)" --since 10m --follow
```

## Check ECS

```bash
aws ecs describe-services \
  --cluster "$(terraform output -raw cluster_name)" \
  --services "$(terraform output -raw service_name)"
```

## Check ALB Targets

```bash
aws elbv2 describe-target-health \
  --target-group-arn "$(terraform output -raw target_group_arn)"
```

## Scale

```bash
terraform apply -var="desired_count=2"
terraform apply -var="desired_count=1"
```

## Deploy a New Image

```bash
terraform apply -var="image_tag=demo-002"
```

## Destroy

```bash
terraform destroy
terraform state list
```