# Incident Runbook - CloudFormation Demo

This document outlines common incidents when deploying or operating the CloudFormation stack and how to resolve them.

## 1. Stack rollback during RDS creation

**Symptom:** CloudFormation stack creation fails and rolls back. The events show RDS failed to create with a message like `Password does not meet requirements`.

**Cause:** The `DBPassword` parameter provided is too simple or too short.

**Resolution:**
1. Wait for the rollback to complete and the stack to delete (or delete it manually if stuck).
2. Redeploy the stack using a stronger password (at least 8 characters, mix of uppercase, lowercase, numbers, and symbols).

## 2. ECS tasks stuck in PROVISIONING state

**Symptom:** The stack creation is taking a long time. ECS tasks are visible in the console but never reach the `RUNNING` state.

**Cause:** 
- The ECS Tasks cannot reach ECR to pull the Docker image. 
- The `ImageTag` provided does not exist in the ECR repository.

**Resolution:**
1. Ensure you have pushed the Docker image to your ECR repository (Step 06).
2. Check that the ECS Service has `AssignPublicIp: ENABLED` and is deployed in Public Subnets (this template defaults to public subnets for learning purposes).
3. If using Private Subnets, ensure a NAT Gateway or VPC Endpoints for ECR, S3, and CloudWatch Logs are created.

## 3. ALB Target Group reports Unhealthy

**Symptom:** The stack deploys successfully, but visiting the ALB DNS returns a `502 Bad Gateway` or `503 Service Temporarily Unavailable`.

**Cause:** 
- The ECS task is failing to start or crashing.
- The Node.js application is not listening on the correct port (default `3000`).
- The application cannot connect to the RDS or Redis instance.

**Resolution:**
1. Go to **CloudWatch > Log groups** and check `/ecs/learn-devops-demo-node`.
2. Look for application errors such as `ECONNREFUSED` (indicates DB/Redis connection issue).
3. Verify that the correct `AppPort` is passed to the container and matches the Target Group configuration.

## 4. DELETE_FAILED on VPC

**Symptom:** Running `aws cloudformation delete-stack` fails with `DELETE_FAILED` on the VPC or Subnets.

**Cause:** There are lingering Elastic Network Interfaces (ENIs) attached to the VPC. This commonly happens if the ALB or ECS tasks take longer than expected to shut down.

**Resolution:**
1. Wait a few minutes for AWS to clean up the ENIs in the background.
2. Run `aws cloudformation delete-stack` again.
3. If it still fails, go to the EC2 Console > Network Interfaces, filter by the VPC ID, and manually delete any remaining ENIs before retrying the stack deletion.

## 5. Cannot Access Grafana Dashboard

**Symptom:** Amazon Managed Grafana workspace is created, but you get an "Access Denied" or login prompt that fails.

**Cause:** Grafana requires AWS IAM Identity Center (formerly AWS SSO) to be configured with an active user.

**Resolution:**
1. Ensure AWS IAM Identity Center is enabled in your account.
2. Assign a user or group to the Grafana workspace via the AWS Console.
3. If you do not have IAM Identity Center set up, you can safely skip the Grafana component by removing it from the CloudFormation template.
