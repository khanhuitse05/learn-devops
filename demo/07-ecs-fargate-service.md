# 07 - ECS Fargate Service

## Objective

Deploy the complete server image to ECS/Fargate. Initially run app health independently of the DB, then attach ALB and inject RDS secret in later steps.

## Prerequisites

- Completed [step 04](04-vpc-network.md): VPC, subnets, and `learn-devops-demo-ecs-sg` still exist.
- Completed [step 06](06-ecr-image-registry.md): ECR repository still has image tag `demo-001`.
- Have an ECS task execution role that allows pulling images from ECR and writing to CloudWatch Logs. If not yet available, the ECS Console can create a default role during task definition creation.
- Account has ECS service-linked role `AWSServiceRoleForECS`, or the current IAM user/role has `iam:CreateServiceLinkedRole` permission so ECS can auto-create this role.
- If network was cleaned up: rerun [step 04](04-vpc-network.md).
- If ECR repository was cleaned up: rerun [step 06](06-ecr-image-registry.md).

## Knowledge to understand

- ECS cluster is where tasks/services are managed.
- Task definition describes container, CPU, memory, env, log config.
- Fargate charges by vCPU, memory, and task running time.
- Execution role is used to pull images and write logs; task role is used for the app to call AWS services.
- The image already supports PostgreSQL. No server code added in the ECS step.

## Estimated cost

- Fargate task charges when running.
- Select the smallest CPU/memory for the lab, e.g., `0.25 vCPU` and `0.5 GB`.
- Desired count should be `1`.

## Cost warning for paid services

ECS service will automatically keep tasks running continuously based on desired count. After the lab, set desired count to 0 or delete the service.

## Console steps

Before creating a cluster, check the ECS service-linked role:

1. Go to **IAM Console** -> **Roles**.
2. Find the role `AWSServiceRoleForECS`.
3. If the role already exists, continue creating the cluster.
4. If the role does not exist, create it in one of two ways:
   - Console method: **Create role** -> select **AWS service** -> select the use case for **Elastic Container Service** if the Console shows the service-linked role option.
   - Faster method: open **CloudShell** and run the CLI command below to create `AWSServiceRoleForECS`.
5. If you cannot create the role, the current IAM user/role lacks `iam:CreateServiceLinkedRole` permission; use an admin role or ask an admin to create it once for the account.

Create cluster:

1. Go to **ECS Console** in the correct region used for the lab, e.g., `ap-southeast-1`.
2. In the left menu, select **Clusters** -> **Create cluster**.
3. Under **Cluster configuration**:
   - Cluster name: `learn-devops-demo-cluster`.
   - **Service Connect defaults - optional**: leave empty.
4. Under **Infrastructure**:
   - Select **Fargate only**.
5. Under **Monitoring - optional** 
6. Under **Encryption - optional**
7. Under **Tags - optional**.
8. Select **Create**.

After the cluster is created, create a task definition:

1. In ECS Console, select **Task definitions** -> **Create new task definition**.
2. Under **Task definition configuration**:
   - Task definition family: `learn-devops-demo-node`.
3. Under **Infrastructure requirements**:
   - Launch type: **AWS Fargate**.
   - Operating system: **Linux**.
   - CPU architecture: select the architecture matching the image built in step 06, usually **X86_64**. If you built an ARM64 image, select **ARM64**.
   - CPU: `0.25 vCPU`.
   - Memory: `0.5 GB`.
   - Task role: leave empty at this step.
   - Task execution role: if the dropdown has **Create default role**, select it. ECS will create a default execution role with the `AmazonECSTaskExecutionRolePolicy` policy. If the account already has a role like `ecsTaskExecutionRole`, select that role. Do not select **None**.
4. Under **Container - 1**:
   - Name: `app`.
   - Image URI: ECR image from step 06, use a specific tag like `demo-001`.
   - Essential container: enable.
   - Container port: `3000`.
   - Protocol: `TCP`.
   - Port name: can enter `app-3000-tcp` or let the Console auto-generate.
5. Under **Environment variables**:
   - `PORT=3000`
   - `HOST=0.0.0.0`
6. Under **Log collection**:
   - Enable **Use log collection** if not already enabled.
   - Destination: **Amazon CloudWatch**.
   - Keep **Value type** as **Value** for all rows.
   - `awslogs-group`: `/ecs/learn-devops-demo-node`
   - `awslogs-region`: region used for the lab, e.g., `ap-southeast-1`.
   - `awslogs-stream-prefix`: `ecs`
   - If the Console has `awslogs-create-group` row, set value to `true` so ECS auto-creates the log group when the role has permission.
7. Select **Create**.

Create an ECS service to run the task continuously:

1. Go to **Clusters** -> select `learn-devops-demo-cluster`.
2. In the **Services** tab, select **Create**.
   - Task definition family: `learn-devops-demo-node`.
   - Revision: select the latest revision.
   - Service name: `learn-devops-demo-node-service`.
3. Under **Environment**:
   - Compute options: **Launch type**.
   - Launch type: **Fargate**.
   - Platform version: **Latest**.
4. Under **Deployment configuration**:
   - Service type: **Replica**.
   - Desired tasks: `1`.
5. Under **Networking**:
   - VPC: `learn-devops-demo-vpc`.
   - Subnets: for a short lab, only keep 2 public subnets:
     - `learn-devops-demo-vpc-subnet-public1-ap-southeast-1a`
     - `learn-devops-demo-vpc-subnet-public2-ap-southeast-1b`
   - Uncheck 2 private subnets:
     - `learn-devops-demo-vpc-subnet-private1-ap-southeast-1a`
     - `learn-devops-demo-vpc-subnet-private2-ap-southeast-1b`
   - Enable **Public IP** so the task can pull images/logs if no NAT gateway or VPC endpoints exist.
   - If NAT gateway or suitable VPC endpoints already exist, you can select private subnets and disable **Public IP**.
   - Security group: select **Existing security group** -> `learn-devops-demo-ecs-sg`.
6. Under **Load balancing**: select **None**. Step 08 will create ALB and attach target group later.
7. Keep remaining items as default, select **Create**.
8. Wait for the service to reach **Desired tasks = 1** and **Running tasks = 1**.

Do not inject `DATABASE_URL` in plain text at this step. `/health` still works; DB endpoints will connect to RDS after configuring secrets in step 09.

## CLI check/debug commands

Check cluster:

```bash
aws ecs describe-clusters \
  --clusters learn-devops-demo-cluster \
  --query 'clusters[].{Name:clusterName,Status:status,Running:runningTasksCount}' \
  --output table
```

Check ECS service-linked role:

```bash
aws iam get-role \
  --role-name AWSServiceRoleForECS \
  --query 'Role.Arn' \
  --output text
```

Create ECS service-linked role if the account does not have one:

```bash
aws iam create-service-linked-role \
  --aws-service-name ecs.amazonaws.com
```

View service:

```bash
aws ecs describe-services \
  --cluster learn-devops-demo-cluster \
  --services learn-devops-demo-node-service \
  --query 'services[].{Name:serviceName,Status:status,Desired:desiredCount,Running:runningCount,Pending:pendingCount}' \
  --output table
```

View stopped reason if task errors:

```bash
aws ecs list-tasks \
  --cluster learn-devops-demo-cluster \
  --desired-status STOPPED \
  --query 'taskArns[]' \
  --output text
```

```bash
aws logs tail /ecs/learn-devops-demo-node --since 30m
```

If ECS Console reports CloudFormation stack `UPDATE_FAILED` or `ECSService` resource `CREATE_FAILED`, view the root error:

```bash
aws cloudformation describe-stack-events \
  --stack-name ECS-Console-V2-Service-learn-devops-demo-node-service-learn-devops-demo-cluster-YOUR_SUFFIX \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED`].[LogicalResourceId,ResourceStatus,ResourceStatusReason]' \
  --output table
```

## Expected result

- ECS cluster active.
- Service desired count 1, running count 1.
- CloudWatch Logs has `server started` line.
- No need to modify or rebuild the server image.

## Cleanup

- If continuing immediately to step 08: keep ECS service with desired count `1`. Step 08 needs the running task to attach to the ALB target group.
- If pausing but will continue: scale desired count to `0` to stop Fargate charges. Before continuing step 08, scale back to `1`.
- If ending the lab: delete ECS service. Step 15 will clean up remaining resources.

Scale to `0` when pausing:

```bash
aws ecs update-service \
  --cluster learn-devops-demo-cluster \
  --service learn-devops-demo-node-service \
  --desired-count 0
```

Delete service when ending the lab:

```bash
aws ecs delete-service \
  --cluster learn-devops-demo-cluster \
  --service learn-devops-demo-node-service \
  --force
```

## Troubleshooting

- Create cluster reports `Unable to assume the service linked role`: check role `AWSServiceRoleForECS`. If not present, create with `aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com`. If the command returns `AccessDenied`, the current IAM user/role lacks `iam:CreateServiceLinkedRole`.
- ECS Console opens CloudFormation and reports `ECSService` `CREATE_FAILED`: this is not yet the root error. Go to the **Events** tab, open the `ECSService` row, view **Status reason**. Common causes: **Public IP** not enabled when using public subnets, mistakenly selecting private subnets without NAT/VPC endpoints, task execution role lacking ECR/CloudWatch Logs permissions, or log group doesn't exist and role lacks permission to create it.
- Task stops immediately: view ECS stopped reason and CloudWatch logs.
- Pull image error: check ECR URI and execution role.
- No logs: check task execution role and log group.
- App not listening: image must use `HOST=0.0.0.0` and `PORT=3000`.
- `/api/db/health` returns HTTP 503 before step 09: this is expected because the task hasn't received `DATABASE_URL` yet.