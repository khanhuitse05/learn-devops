# 14 - CloudFormation (Full Stack IaC)

## Objective

Deploy the **entire demo stack** from steps 04-12 using a single CloudFormation template — replacing all manual Console/CLI steps with Infrastructure as Code.

## Prerequisites

- Completed [step 00](00-prerequisites.md): AWS CLI configured, correct account/region.
- Completed the manual steps 04-12 at least once to understand each resource.
- Cleaned up any existing `learn-devops-demo-*` resources from previous manual runs (use [step 13](13-cleanup-cost-control.md)).
- ECR image `learn-devops-demo-node:demo-001` already pushed (from step 06) — or push it before deploying.

## What This Template Creates

```
VPC (10.0.0.0/16)
├── 2 Public Subnets  (10.0.1.0/24, 10.0.2.0/24)
├── 2 Private Subnets (10.0.11.0/24, 10.0.12.0/24)
├── Internet Gateway
├── Public Route Table (0.0.0.0/0 → IGW)
│
├── Security Groups
│   ├── ALB-SG   (port 80 from 0.0.0.0/0)
│   ├── ECS-SG   (port 3000 from ALB-SG)
│   ├── RDS-SG   (port 5432 from ECS-SG)
│   └── Redis-SG (port 6379 from ECS-SG)
│
├── RDS PostgreSQL (db.t4g.micro, private subnets)
├── DB Subnet Group
│
├── ElastiCache Redis Serverless (private subnets)
├── Cache Subnet Group
│
├── ECR Repository
├── ECS Cluster (Fargate)
├── ECS Task Definition + Execution Role + Task Role
├── ECS Service (desired count: 1, private subnets)
│
├── ALB (public subnets)
├── Target Group (port 3000, /health)
├── ALB Listener (HTTP:80 → Target Group)
│
├── SSM Parameter (/learn-devops-demo/db-url)
├── CloudWatch Log Group (/ecs/learn-devops-demo-node)
├── CloudWatch Alarm (CPU > 80%)
├── CloudWatch Dashboard
│
└── Amazon Managed Grafana Workspace
```

## Estimated cost

| Resource | Approx. Rate |
|----------|-------------|
| NAT Gateway | **Not created** (saves ~$32/month) |
| RDS db.t4g.micro | ~$0.016/hr |
| ElastiCache Serverless | ~$0.025/hr |
| ECS Fargate 0.25 vCPU | ~$0.012/hr |
| ALB | ~$0.0225/hr |
| Secrets/SSM/Logs | ~$0.50/month total |
| Grafana | ~$9/workspace/month (1 user) |
| **Total** | **~$2.50/day** |

> ⚠️ **Delete the stack when done!** Run `aws cloudformation delete-stack` or use [step 13](13-cleanup-cost-control.md).

---

## Part 1: The CloudFormation Template

Save the following template as `demo-stack.yml`:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Full learn-devops demo stack - VPC, RDS, ECS, ALB, ElastiCache, Grafana'

Parameters:
  DemoPrefix:
    Type: String
    Default: learn-devops-demo
    Description: Prefix for all resource names

  DBUsername:
    Type: String
    Default: devops_demo
    Description: RDS master username

  DBPassword:
    Type: String
    NoEcho: true
    MinLength: 8
    Description: RDS master password (min 8 characters)

  DBName:
    Type: String
    Default: devops_demo
    Description: Initial database name

  AppPort:
    Type: Number
    Default: 3000
    Description: Container application port

  ImageTag:
    Type: String
    Default: demo-001
    Description: ECR image tag to deploy

  ContainerCpu:
    Type: Number
    Default: 256
    Description: CPU units for Fargate task (256 = 0.25 vCPU)

  ContainerMemory:
    Type: Number
    Default: 512
    Description: Memory for Fargate task (in MiB)

  DesiredCount:
    Type: Number
    Default: 1
    Description: Number of ECS tasks to run

  LogRetentionDays:
    Type: Number
    Default: 3
    Description: CloudWatch log retention in days

# ─────────────────────────────────────────────────────────────────────
# VPC + Networking
# ─────────────────────────────────────────────────────────────────────
Resources:

  # VPC
  DemoVpc:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsSupport: true
      EnableDnsHostnames: true
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-vpc

  # Internet Gateway
  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-igw

  VpcGatewayAttachment:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref DemoVpc
      InternetGatewayId: !Ref InternetGateway

  # Public Subnets
  PublicSubnetA:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref DemoVpc
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [0, !GetAZs '']
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-public-a

  PublicSubnetB:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref DemoVpc
      CidrBlock: 10.0.2.0/24
      AvailabilityZone: !Select [1, !GetAZs '']
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-public-b

  # Private Subnets
  PrivateSubnetA:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref DemoVpc
      CidrBlock: 10.0.11.0/24
      AvailabilityZone: !Select [0, !GetAZs '']
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-private-a

  PrivateSubnetB:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref DemoVpc
      CidrBlock: 10.0.12.0/24
      AvailabilityZone: !Select [1, !GetAZs '']
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-private-b

  # Public Route Table
  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref DemoVpc
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-public-rt

  PublicRoute:
    Type: AWS::EC2::Route
    DependsOn: VpcGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  PublicSubnetARouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnetA
      RouteTableId: !Ref PublicRouteTable

  PublicSubnetBRouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnetB
      RouteTableId: !Ref PublicRouteTable

# ─────────────────────────────────────────────────────────────────────
# Security Groups
# ─────────────────────────────────────────────────────────────────────

  # ALB Security Group
  AlbSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub ${DemoPrefix}-alb-sg
      GroupDescription: Allow HTTP from internet to ALB
      VpcId: !Ref DemoVpc
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-alb-sg

  # ECS Security Group
  EcsSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub ${DemoPrefix}-ecs-sg
      GroupDescription: Allow app traffic from ALB to ECS
      VpcId: !Ref DemoVpc
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: !Ref AppPort
          ToPort: !Ref AppPort
          SourceSecurityGroupId: !Ref AlbSecurityGroup
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-ecs-sg

  # RDS Security Group
  RdsSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub ${DemoPrefix}-rds-sg
      GroupDescription: Allow PostgreSQL from ECS to RDS
      VpcId: !Ref DemoVpc
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 5432
          ToPort: 5432
          SourceSecurityGroupId: !Ref EcsSecurityGroup
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-rds-sg

  # Redis Security Group
  RedisSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub ${DemoPrefix}-redis-sg
      GroupDescription: Allow Redis from ECS
      VpcId: !Ref DemoVpc
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 6379
          ToPort: 6379
          SourceSecurityGroupId: !Ref EcsSecurityGroup
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-redis-sg

# ─────────────────────────────────────────────────────────────────────
# RDS PostgreSQL
# ─────────────────────────────────────────────────────────────────────

  DbSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupName: !Sub ${DemoPrefix}-db-subnet
      DBSubnetGroupDescription: RDS subnet group for private subnets
      SubnetIds:
        - !Ref PrivateSubnetA
        - !Ref PrivateSubnetB
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-db-subnet

  RdsInstance:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: !Sub ${DemoPrefix}-postgres
      DBName: !Ref DBName
      Engine: postgres
      EngineVersion: '16.3'
      DBInstanceClass: db.t4g.micro
      AllocatedStorage: '20'
      StorageType: gp3
      MasterUsername: !Ref DBUsername
      MasterUserPassword: !Ref DBPassword
      DBSubnetGroupName: !Ref DbSubnetGroup
      VPCSecurityGroups:
        - !Ref RdsSecurityGroup
      PubliclyAccessible: false
      BackupRetentionPeriod: 0
      DeletionProtection: false
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-postgres

# ─────────────────────────────────────────────────────────────────────
# ElastiCache Redis (Serverless)
# ─────────────────────────────────────────────────────────────────────

  CacheSubnetGroup:
    Type: AWS::ElastiCache::SubnetGroup
    Properties:
      CacheSubnetGroupName: !Sub ${DemoPrefix}-redis-subnet
      Description: Redis subnet group for private subnets
      SubnetIds:
        - !Ref PrivateSubnetA
        - !Ref PrivateSubnetB
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-redis-subnet

  RedisServerlessCache:
    Type: AWS::ElastiCache::ServerlessCache
    Properties:
      ServerlessCacheName: !Sub ${DemoPrefix}-redis
      Engine: redis
      SecurityGroupIds:
        - !Ref RedisSecurityGroup
      SubnetIds:
        - !Ref PrivateSubnetA
        - !Ref PrivateSubnetB
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-redis

# ─────────────────────────────────────────────────────────────────────
# ECR Repository
# ─────────────────────────────────────────────────────────────────────

  EcrRepository:
    Type: AWS::ECR::Repository
    Properties:
      RepositoryName: !Sub ${DemoPrefix}-node
      ImageTagMutability: MUTABLE
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-node

# ─────────────────────────────────────────────────────────────────────
# IAM Roles
# ─────────────────────────────────────────────────────────────────────

  EcsTaskExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub ${DemoPrefix}-ecs-execution-role
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ecs-tasks.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
      Policies:
        - PolicyName: ReadDbUrlSsmParameter
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - ssm:GetParameter
                  - ssm:GetParameters
                Resource: !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${DemoPrefix}/db-url
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-ecs-execution-role

  EcsTaskRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub ${DemoPrefix}-ecs-task-role
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ecs-tasks.amazonaws.com
            Action: sts:AssumeRole
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-ecs-task-role

# ─────────────────────────────────────────────────────────────────────
# CloudWatch Log Group
# ─────────────────────────────────────────────────────────────────────

  EcsLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub /ecs/${DemoPrefix}-node
      RetentionInDays: !Ref LogRetentionDays
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-ecs-logs

# ─────────────────────────────────────────────────────────────────────
# SSM Parameter for DB URL
# ─────────────────────────────────────────────────────────────────────

  DbUrlParameter:
    Type: AWS::SSM::Parameter
    Properties:
      Name: !Sub /${DemoPrefix}/db-url
      Type: String
      Value: !Sub postgres://${DBUsername}:${DBPassword}@${RdsInstance.Endpoint.Address}:${RdsInstance.Endpoint.Port}/${DBName}?sslmode=require
      Tags:
        Project: !Ref DemoPrefix

# ─────────────────────────────────────────────────────────────────────
# ECS Cluster
# ─────────────────────────────────────────────────────────────────────

  EcsCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: !Sub ${DemoPrefix}-cluster
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-cluster

# ─────────────────────────────────────────────────────────────────────
# ECS Task Definition
# ─────────────────────────────────────────────────────────────────────

  EcsTaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      Family: !Sub ${DemoPrefix}-node
      Cpu: !Ref ContainerCpu
      Memory: !Ref ContainerMemory
      NetworkMode: awsvpc
      RequiresCompatibilities:
        - FARGATE
      ExecutionRoleArn: !Ref EcsTaskExecutionRole
      TaskRoleArn: !Ref EcsTaskRole
      ContainerDefinitions:
        - Name: app
          Image: !Sub ${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/${DemoPrefix}-node:${ImageTag}
          Essential: true
          PortMappings:
            - ContainerPort: !Ref AppPort
              Protocol: tcp
          Environment:
            - Name: PORT
              Value: !Ref AppPort
            - Name: HOST
              Value: 0.0.0.0
          Secrets:
            - Name: DATABASE_URL
              ValueFrom: !Ref DbUrlParameter
          LogConfiguration:
            LogDriver: awslogs
            Options:
              awslogs-group: !Ref EcsLogGroup
              awslogs-region: !Ref AWS::Region
              awslogs-stream-prefix: ecs
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-node

# ─────────────────────────────────────────────────────────────────────
# ALB
# ─────────────────────────────────────────────────────────────────────

  ApplicationLoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: !Sub ${DemoPrefix}-alb
      Scheme: internet-facing
      Type: application
      IpAddressType: ipv4
      Subnets:
        - !Ref PublicSubnetA
        - !Ref PublicSubnetB
      SecurityGroups:
        - !Ref AlbSecurityGroup
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-alb

  AlbListener:
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      LoadBalancerArn: !Ref ApplicationLoadBalancer
      Port: 80
      Protocol: HTTP
      DefaultActions:
        - Type: forward
          TargetGroupArn: !Ref EcsTargetGroup

  EcsTargetGroup:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Name: !Sub ${DemoPrefix}-node-tg
      Port: !Ref AppPort
      Protocol: HTTP
      TargetType: ip
      VpcId: !Ref DemoVpc
      HealthCheckPath: /health
      HealthCheckProtocol: HTTP
      HealthCheckIntervalSeconds: 30
      HealthCheckTimeoutSeconds: 5
      HealthyThresholdCount: 2
      UnhealthyThresholdCount: 3
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-node-tg

# ─────────────────────────────────────────────────────────────────────
# ECS Service
# ─────────────────────────────────────────────────────────────────────

  EcsService:
    Type: AWS::ECS::Service
    DependsOn:
      - AlbListener
      - RdsInstance
    Properties:
      ServiceName: !Sub ${DemoPrefix}-node-service
      Cluster: !Ref EcsCluster
      TaskDefinition: !Ref EcsTaskDefinition
      DesiredCount: !Ref DesiredCount
      LaunchType: FARGATE
      NetworkConfiguration:
        AwsvpcConfiguration:
          Subnets:
            - !Ref PrivateSubnetA
            - !Ref PrivateSubnetB
          SecurityGroups:
            - !Ref EcsSecurityGroup
          AssignPublicIp: DISABLED
      LoadBalancers:
        - ContainerName: app
          ContainerPort: !Ref AppPort
          TargetGroupArn: !Ref EcsTargetGroup
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-node-service

# ─────────────────────────────────────────────────────────────────────
# CloudWatch Alarm
# ─────────────────────────────────────────────────────────────────────

  CpuAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub ${DemoPrefix}-ecs-cpu-high
      AlarmDescription: Alert when ECS CPU exceeds 80%
      Namespace: AWS/ECS
      MetricName: CPUUtilization
      Dimensions:
        - Name: ClusterName
          Value: !Ref EcsCluster
        - Name: ServiceName
          Value: !GetAtt EcsService.Name
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 80
      ComparisonOperator: GreaterThanThreshold
      Tags:
        - Key: Name
          Value: !Sub ${DemoPrefix}-ecs-cpu-alarm

# ─────────────────────────────────────────────────────────────────────
# CloudWatch Dashboard
# ─────────────────────────────────────────────────────────────────────

  DemoDashboard:
    Type: AWS::CloudWatch::Dashboard
    Properties:
      DashboardName: !Sub ${DemoPrefix}-dashboard
      DashboardBody: !Sub |
        {
          "widgets": [
            {
              "type": "metric",
              "x": 0, "y": 0, "width": 12, "height": 6,
              "properties": {
                "metrics": [
                  ["AWS/ECS", "CPUUtilization", "ClusterName", "${EcsCluster}", "ServiceName", "${EcsService.Name}"]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "${AWS::Region}",
                "title": "ECS CPU Utilization",
                "period": 300
              }
            },
            {
              "type": "metric",
              "x": 12, "y": 0, "width": 12, "height": 6,
              "properties": {
                "metrics": [
                  ["AWS/ECS", "MemoryUtilization", "ClusterName", "${EcsCluster}", "ServiceName", "${EcsService.Name}"]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "${AWS::Region}",
                "title": "ECS Memory Utilization",
                "period": 300
              }
            },
            {
              "type": "metric",
              "x": 0, "y": 6, "width": 12, "height": 6,
              "properties": {
                "metrics": [
                  ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", "${ApplicationLoadBalancer.FullName}"]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "${AWS::Region}",
                "title": "ALB Target Response Time",
                "period": 300
              }
            },
            {
              "type": "metric",
              "x": 12, "y": 6, "width": 12, "height": 6,
              "properties": {
                "metrics": [
                  ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", "${ApplicationLoadBalancer.FullName}"]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "${AWS::Region}",
                "title": "ALB 5XX Errors",
                "period": 300
              }
            }
          ]
        }

# ─────────────────────────────────────────────────────────────────────
# Amazon Managed Grafana Workspace
# ⚠️ Requires AWS Grafana service-linked roles and IAM Identity Center
# ─────────────────────────────────────────────────────────────────────

  GrafanaWorkspace:
    Type: AWS::Grafana::Workspace
    Properties:
      Name: !Sub ${DemoPrefix}-grafana
      AccountAccessType: CURRENT_ACCOUNT
      AuthenticationProviders:
        - AWS_SSO
      PermissionType: SERVICE_MANAGED
      DataSources:
        - CLOUDWATCH
      Description: Demo Grafana workspace for learn-devops

# ─────────────────────────────────────────────────────────────────────
# Outputs
# ─────────────────────────────────────────────────────────────────────

Outputs:
  AlbDnsName:
    Description: ALB public DNS name
    Value: !GetAtt ApplicationLoadBalancer.DNSName
    Export:
      Name: !Sub ${DemoPrefix}-alb-dns

  RdsEndpoint:
    Description: RDS PostgreSQL endpoint
    Value: !GetAtt RdsInstance.Endpoint.Address
    Export:
      Name: !Sub ${DemoPrefix}-rds-endpoint

  EcrRepositoryUri:
    Description: ECR repository URI
    Value: !Sub ${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/${DemoPrefix}-node
    Export:
      Name: !Sub ${DemoPrefix}-ecr-uri

  RedisEndpoint:
    Description: ElastiCache Redis endpoint
    Value: !GetAtt RedisServerlessCache.Endpoint.Address
    Export:
      Name: !Sub ${DemoPrefix}-redis-endpoint

  GrafanaEndpoint:
    Description: Grafana workspace URL
    Value: !GetAtt GrafanaWorkspace.Endpoint
    Export:
      Name: !Sub ${DemoPrefix}-grafana-endpoint
```

---

## Part 2: Deploy the Stack

### Step 1: Save the template

```bash
# Save the YAML above to a file
cat > /tmp/demo-stack.yml <<'YAML'
# (paste the full template here, or save from your editor)
YAML
```

### Step 2: Validate the template

```bash
aws cloudformation validate-template \
  --template-body file:///tmp/demo-stack.yml
```

### Step 3: Deploy

```bash
aws cloudformation deploy \
  --stack-name learn-devops-demo-stack \
  --template-file /tmp/demo-stack.yml \
  --parameter-overrides \
    DBPassword=YourSecurePassword123 \
  --capabilities CAPABILITY_NAMED_IAM
```

> ⚠️ `CAPABILITY_NAMED_IAM` is required because the template creates IAM roles.

### Step 4: Wait for completion

```bash
# Monitor stack events
aws cloudformation describe-stack-events \
  --stack-name learn-devops-demo-stack \
  --query 'StackEvents[?ResourceStatus!=`CREATE_IN_PROGRESS`]|[0:10].[LogicalResourceId,ResourceType,ResourceStatus]' \
  --output table
```

This takes **10-20 minutes** (mostly waiting for RDS + Redis + Grafana).

### Step 5: Get outputs

```bash
aws cloudformation describe-stacks \
  --stack-name learn-devops-demo-stack \
  --query 'Stacks[0].Outputs' \
  --output table
```

---

## Part 3: Verify the Deployment

### Get ALB DNS and test

```bash
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name learn-devops-demo-stack \
  --query 'Stacks[0].Outputs[?OutputKey==`AlbDnsName`].OutputValue' \
  --output text)

echo "ALB: http://$ALB_DNS"

# Wait 1-2 minutes for ECS tasks to be healthy, then test
curl -i "http://$ALB_DNS/health"
curl -i "http://$ALB_DNS/api/db/health"
curl -i "http://$ALB_DNS/flow"
curl -i "http://$ALB_DNS/api/demo-order"
curl -i "http://$ALB_DNS/test-error"
```

Expected: `/health` → 200, `/api/db/health` → 200, `/test-error` → 500.

### Check CloudWatch Dashboard

```bash
aws cloudwatch list-dashboards \
  --dashboard-name-prefix learn-devops-demo
```

Open CloudWatch Console → Dashboards → `learn-devops-demo-dashboard`.

### Check Grafana

```bash
GRAFANA_URL=$(aws cloudformation describe-stacks \
  --stack-name learn-devops-demo-stack \
  --query 'Stacks[0].Outputs[?OutputKey==`GrafanaEndpoint`].OutputValue' \
  --output text)

echo "Grafana: $GRAFANA_URL"
```

> ⚠️ Grafana requires IAM Identity Center user assignment. If not configured, you can still verify the workspace exists.

---

## Part 4: Update the Stack

Change anything and re-deploy:

```bash
# Example: increase desired count to 2
aws cloudformation deploy \
  --stack-name learn-devops-demo-stack \
  --template-file /tmp/demo-stack.yml \
  --parameter-overrides \
    DBPassword=YourSecurePassword123 \
    DesiredCount=2 \
  --capabilities CAPABILITY_NAMED_IAM
```

CloudFormation updates only changed resources (change sets).

---

## Part 5: Cleanup

```bash
# Delete the entire stack (this deletes ALL resources!)
aws cloudformation delete-stack --stack-name learn-devops-demo-stack

# Monitor deletion progress
aws cloudformation describe-stacks \
  --stack-name learn-devops-demo-stack \
  --query 'Stacks[0].StackStatus'
```

⏱ Deletion takes **15-25 minutes** (RDS + Grafana take longest).

> ⚠️ If the stack deletion fails on a resource (e.g., S3 bucket not empty), fix the issue manually in AWS Console, then retry deletion.

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| Stack rollback during RDS | Password too simple | Use 8+ chars, mix case + numbers |
| ECS service fails to create | ECR image `demo-001` doesn't exist | Push the image first (step 06) |
| ECS tasks stuck PROVISIONING | No NAT Gateway + no VPC endpoints | Tasks need ECR pull access. Either add VPC endpoints (ecr.dkr, ecr.api, logs, s3) or use public subnets with `AssignPublicIp: ENABLED` |
| Grafana workspace fails | Missing IAM Identity Center org | Skip Grafana by removing the resource from template |
| Target unhealthy | Task still starting or wrong port | Wait 2-3 min after stack creation, check CloudWatch Logs |
| DELETE_FAILED on VPC | ENIs still attached | Wait longer, then retry. Check for lingering ALB/ECS network interfaces |

### Note: VPC Endpoints for Private Subnets

Since this template places ECS tasks in **private subnets without NAT Gateway**, you MUST add VPC endpoints if tasks need to pull images from ECR. This is an advanced topic — for learning, the easiest approach is to modify the ECS Service to use:

```yaml
AssignPublicIp: ENABLED
```

And move ECS tasks to public subnets. The template above uses private subnets — add VPC endpoints if needed:

```bash
# These are NOT in the template — add manually via Console or CLI if needed
# - com.amazonaws.REGION.ecr.dkr
# - com.amazonaws.REGION.ecr.api
# - com.amazonaws.REGION.logs
# - com.amazonaws.REGION.s3    (gateway type)
```

---

## Expected Result

- All resources from steps 04-12 created in one command.
- ALB DNS returns `/health` → 200.
- `/api/db/health` → 200 (app connected to RDS).
- CloudWatch Logs show container output.
- CPU Alarm exists in CloudWatch.
- Dashboard shows ECS + ALB metrics.
- Grafana workspace exists (login requires IAM Identity Center setup).
- Stack delete removes everything cleanly.

---

**Next**: [Step 15 - Terraform](15-terraform.md) — same resources, different IaC tool.