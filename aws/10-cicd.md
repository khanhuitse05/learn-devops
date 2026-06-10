# AWS CI/CD Services

CI/CD (Continuous Integration / Continuous Deployment) is an automated pipeline for building, testing, and deploying code every time a developer pushes code. AWS provides: **CodePipeline**, **CodeBuild**, **CodeDeploy**, and **ECR** (container registry).

---

## 1. Overview Table

| Service        | Role                                           | Equivalent to                                |
|----------------|------------------------------------------------|---------------------------------------------|
| CodePipeline   | Orchestrate the entire pipeline (connect stages)| GitHub Actions Workflow, Jenkins Pipeline    |
| CodeBuild      | Build & test code (compile, unit test, build Docker image) | GitHub Actions Runner, Jenkins Agent        |
| CodeDeploy     | Deploy code to EC2, ECS, Lambda                | Similar to CodeDeploy (no direct equivalent) |
| ECR            | Container image registry (store Docker images) | Docker Hub, GitHub Container Registry        |

> **Also available:** CodeArtifact (package registry), CodeGuru (AI code review), CodeStar (project template).

---

## 2. CodePipeline – Orchestration Pipeline

### What is CodePipeline?
CodePipeline is a managed CI/CD orchestration service. You define a pipeline consisting of multiple **stages**, each stage having multiple **actions** (Source → Build → Test → Deploy).

### Typical CodePipeline Flow

```
[GitHub/CodeCommit] → [CodeBuild: Build & Test] → [CodeDeploy: Staging]
                                                        ↓ (Manual Approval)
                                                  [CodeDeploy: Production]
```

### CodePipeline Concepts

| Concept        | Description                                                           |
|----------------|-----------------------------------------------------------------------|
| Pipeline       | The entire CI/CD workflow                                             |
| Stage          | A step in the pipeline (Source, Build, Deploy...)                     |
| Action         | Specific task in a stage (CodeBuild, CodeDeploy, Manual Approval)     |
| Artifact       | Output file from one stage, input to the next (build output → deploy input) |
| Trigger        | Auto-run on code push (GitHub webhook, EventBridge rule)              |
| Manual Approval| Pause pipeline waiting for human approval before production deploy     |

### CodePipeline Integration

CodePipeline can trigger actions:
- **Source**: CodeCommit, GitHub, Bitbucket, S3, ECR
- **Build**: CodeBuild, Jenkins
- **Test**: CodeBuild (unit test, integration test, SAST)
- **Deploy**: CodeDeploy, CloudFormation, ECS, Elastic Beanstalk, S3, Lambda
- **Invoke**: Lambda function, Step Functions

### Practical Tips
- Use **Manual Approval** before production deploy
- **Pipeline Execution History**: View execution history, debug pipeline failures
- Integrate **CodePipeline + Chatbot** (Slack) to receive notifications on pipeline success/failure
- **Cross-account pipeline**: Source in Dev account, deploy to Prod account

---

## 3. CodeBuild – Build & Test

### What is CodeBuild?
CodeBuild is a managed build service: you provide source code + buildspec.yml, CodeBuild runs the build in a container and returns artifacts.

### buildspec.yml Example

```yaml
version: 0.2

phases:
  install:
    runtime-versions:
      nodejs: 18
    commands:
      - npm ci
  
  pre_build:
    commands:
      - npm run lint
  
  build:
    commands:
      - npm run build
      - npm test
  
  post_build:
    commands:
      - docker build -t $ECR_REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION .
      - docker push $ECR_REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION

artifacts:
  files:
    - '**/*'
  base-directory: dist

cache:
  paths:
    - 'node_modules/**'
```

### CodeBuild Features

| Feature              | Description                                                     |
|----------------------|-----------------------------------------------------------------|
| Managed Build Env    | Ubuntu, Windows, custom Docker image                            |
| Build Caching        | Cache dependencies (S3 or local) for faster builds              |
| Build Artifacts      | Output stored in S3, used for subsequent stages                 |
| Environment Variables| Pass secrets (Secrets Manager) or plaintext                     |
| VPC Integration      | Run build inside VPC (access RDS, private resources)            |
| Batch Build          | Build multiple configurations in parallel (matrix build)        |
| Test Reports         | Auto-parse JUnit/NUnit/Cucumber reports, display test results   |

### Practical Tips
- **Caching** dependencies (npm `node_modules`, Maven `.m2`) significantly reduces build time
- Use **build spec override** if you want to share 1 CodeBuild project across multiple pipelines
- **Environment type**: Choose `LINUX_GPU_CONTAINER` if you need GPU (ML builds)
- CodeBuild logs are automatically sent to CloudWatch Logs

---

## 4. CodeDeploy – Deploy Application

### What is CodeDeploy?
CodeDeploy automatically deploys code to EC2, on-premise servers, ECS, or Lambda. It supports multiple deployment strategies to minimize downtime.

### CodeDeploy Deployment Strategies

| Strategy           | Description                                                    | Suitable for          |
|--------------------|----------------------------------------------------------------|------------------------|
| In-place           | Deploy directly onto existing instances (slight downtime)       | EC2/On-premise         |
| Rolling            | Deploy one batch of instances at a time (e.g.: batch 25%)       | EC2 (no downtime)      |
| Blue/Green         | Create new environment (blue), test → switch DNS to blue        | ECS, Lambda, EC2       |
| Canary             | Deploy 10% traffic → if stable → 100%                          | ECS, Lambda            |
| Linear             | Gradually increase traffic (10% every N minutes)               | ECS, Lambda            |

### CodeDeploy Components

| Component         | Description                                                        |
|--------------------|--------------------------------------------------------------------|
| Application        | Name of the app to deploy                                          |
| Deployment Group   | Group of targets (EC2 tag, ASG, ECS service, Lambda function)      |
| AppSpec file       | Defines how to deploy (YAML/JSON file)                             |
| Deployment         | A specific deployment instance                                     |

### AppSpec for ECS (appspec.yml)

```yaml
version: 0.0
Resources:
  - TargetService:
      Type: AWS::ECS::Service
      Properties:
        TaskDefinition: <task-definition-arn>
        LoadBalancerInfo:
          ContainerName: "my-app"
          ContainerPort: 3000
```

### CodeDeploy Hooks (For EC2)

| Hook                  | When it runs                    |
|-----------------------|----------------------------------|
| BeforeBlockTraffic    | Before blocking traffic          |
| BlockTraffic          | Block traffic (deregister ALB)   |
| AfterBlockTraffic     | After blocking traffic           |
| ApplicationStop       | Stop old app                     |
| BeforeInstall         | Before installing new code       |
| Install               | Copy new code to server          |
| AfterInstall          | After copying code               |
| ApplicationStart      | Start new app                    |
| ValidateService       | Health check                     |
| BeforeAllowTraffic    | Before opening traffic           |
| AllowTraffic          | Open traffic (register ALB)      |
| AfterAllowTraffic     | After opening traffic            |

### Practical Tips
- **Blue/Green for ECS Fargate**: Automatically creates replacement task set, tests, then switches traffic – zero downtime
- **CodeDeploy Deployment Group** can configure alarm-based rollback: if CloudWatch Alarm signals error after deploy → auto rollback
- **AppSpec hooks**: Run a validate script (check HTTP 200) in the ValidateService stage

---

## 5. ECR (Elastic Container Registry)

### What is ECR?
ECR is AWS's container image registry, storing Docker images for ECS/EKS to pull and run. Similar to Docker Hub but deeply integrated with AWS.

### ECR Features

| Feature                | Description                                                       |
|------------------------|-------------------------------------------------------------------|
| Repository             | Where Docker images are stored (1 repo = 1 app)                   |
| Image Tag              | Tag images (latest, v1.2.3, commit-hash)                         |
| Image Scanning         | Scan for CVEs in images (free: basic scan, paid: Inspector)       |
| Lifecycle Policy       | Auto-delete old images (keep N most recent)                       |
| Cross-Account Access   | Share repos with other accounts                                   |
| Replication            | Cross-region replication for DR                                   |
| Pull-Through Cache     | Cache images from Docker Hub/ECR Public into private ECR          |

### ECR Lifecycle Policy Example

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": { "type": "expire" }
    },
    {
      "rulePriority": 2,
      "description": "Delete untagged images after 7 days",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 7
      },
      "action": { "type": "expire" }
    }
  ]
}
```

### Practical Tips
- **Image tag strategy**: Use `git-commit-hash` instead of `latest` to trace versions. `latest` doesn't tell you which code is running
- Enable **image scanning** to know if there are CVEs in your base image
- **Lifecycle policy** prevents unlimited image storage (saves S3 costs)
- ECR is a **private registry** by default, not publicly exposed

---

## 6. Complete CI/CD Flow with AWS Services

```
Developer pushes code
        ↓
[GitHub] → webhook trigger
        ↓
[CodePipeline: Source Stage] → Pull source code
        ↓
[CodeBuild: Build Stage]
    - npm ci / pip install
    - npm test / pytest (unit test)
    - docker build -t app:$COMMIT_HASH .
    - docker push $ECR_REPO:$COMMIT_HASH
    - create imagedefinitions.json artifact
        ↓
[CodeBuild: Test Stage] (optional)
    - integration test
    - security scan
        ↓
[CodeDeploy: Deploy Staging]
    - ECS Blue/Green deploy with $COMMIT_HASH
    - Automated smoke test
        ↓
[Manual Approval Stage]
        ↓
[CodeDeploy: Deploy Production]
    - ECS Blue/Green deploy
    - CloudWatch Alarm monitor (rollback on error)
```

---

## 7. Service Selection Summary

| Need                                                       | Service                          |
|------------------------------------------------------------|----------------------------------|
| Orchestrate automated CI/CD pipeline                       | **CodePipeline**                 |
| Build, test, and build Docker image                        | **CodeBuild** + buildspec.yml    |
| Zero-downtime deploy to ECS/Lambda/EC2                    | **CodeDeploy (Blue/Green)**      |
| Store Docker images for ECS/EKS                            | **ECR**                          |
| Store team packages (npm, pip, Maven)                      | **CodeArtifact**                 |
| Scan CVEs in Docker images                                  | **ECR Image Scanning** or **Inspector** |
| AI code review (find bugs, best practice violations)       | **CodeGuru Reviewer**            |
| Want CI/CD outside AWS (GitHub Actions)                    | GitHub Actions + AWS CLI/SDK      |
| Want CI/CD multi-cloud                                     | GitLab CI / Jenkins + Terraform  |