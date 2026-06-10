# AWS CI/CD Services

CI/CD (Continuous Integration / Continuous Deployment) là pipeline tự động build, test, và deploy code mỗi khi developer push code. AWS cung cấp: **CodePipeline**, **CodeBuild**, **CodeDeploy**, và **ECR** (container registry).

---

## 1. Bảng tổng quan

| Dịch vụ        | Vai trò                                     | Tương đương với                              |
|----------------|---------------------------------------------|---------------------------------------------|
| CodePipeline   | Orchestrate toàn bộ pipeline (gắn kết các stage) | GitHub Actions Workflow, Jenkins Pipeline   |
| CodeBuild      | Build & test code (compile, unit test, build Docker image) | GitHub Actions Runner, Jenkins Agent       |
| CodeDeploy     | Deploy code đến EC2, ECS, Lambda            | Giống CodeDeploy (không có tương đương trực tiếp) |
| ECR            | Container image registry (lưu Docker image) | Docker Hub, GitHub Container Registry       |

> **Ngoài ra còn có:** CodeArtifact (package registry), CodeGuru (AI code review), CodeStar (project template).

---

## 2. CodePipeline – Orchestration Pipeline

### CodePipeline là gì?
CodePipeline là dịch vụ managed CI/CD orchestration. Bạn định nghĩa pipeline gồm nhiều **stage**, mỗi stage có nhiều **action** (Source → Build → Test → Deploy).

### CodePipeline Flow Điển Hình

```
[GitHub/CodeCommit] → [CodeBuild: Build & Test] → [CodeDeploy: Staging]
                                                          ↓ (Manual Approval)
                                                    [CodeDeploy: Production]
```

### CodePipeline Concepts

| Khái niệm      | Mô tả                                                            |
|----------------|------------------------------------------------------------------|
| Pipeline       | Toàn bộ workflow CI/CD                                           |
| Stage          | Một bước trong pipeline (Source, Build, Deploy...)               |
| Action         | Công việc cụ thể trong stage (CodeBuild, CodeDeploy, Manual Approval) |
| Artifact       | File đầu ra từ stage này, đầu vào cho stage sau (build output → deploy input) |
| Trigger        | Tự động chạy khi push code (GitHub webhook, EventBridge rule)     |
| Manual Approval| Dừng pipeline chờ người approve trước khi deploy production      |

### CodePipeline Integration

CodePipeline có thể trigger action:
- **Source**: CodeCommit, GitHub, Bitbucket, S3, ECR
- **Build**: CodeBuild, Jenkins
- **Test**: CodeBuild (unit test, integration test, SAST)
- **Deploy**: CodeDeploy, CloudFormation, ECS, Elastic Beanstalk, S3, Lambda
- **Invoke**: Lambda function, Step Functions

### Mẹo thực tế
- Dùng **Manual Approval** trước production deploy
- **Pipeline Execution History**: Xem lịch sử chạy, debug pipeline lỗi
- Tích hợp **CodePipeline + Chatbot** (Slack) để nhận notification khi pipeline thành công/thất bại
- **Cross-account pipeline**: Source ở account Dev, deploy đến account Prod

---

## 3. CodeBuild – Build & Test

### CodeBuild là gì?
CodeBuild là dịch vụ managed build: bạn đưa source code + buildspec.yml, CodeBuild chạy build trong container và trả về artifact.

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

| Tính năng            | Mô tả                                                           |
|----------------------|-----------------------------------------------------------------|
| Managed Build Env    | Ubuntu, Windows, custom Docker image                            |
| Build Caching        | Cache dependencies (S3 hoặc local) để build nhanh hơn           |
| Build Artifacts      | Output lưu vào S3, dùng cho stage sau                           |
| Environment Variables| Truyền secret (Secrets Manager) hoặc plaintext                  |
| VPC Integration      | Chạy build trong VPC (truy cập RDS, private resources)          |
| Batch Build          | Build song song nhiều cấu hình (matrix build)                   |
| Test Reports         | Tự động parse JUnit/NUnit/Cucumber report, hiển thị kết quả test |

### Mẹo thực tế
- **Caching** dependencies (npm `node_modules`, Maven `.m2`) giảm build time đáng kể
- Dùng **build spec override** nếu muốn dùng chung 1 CodeBuild project cho nhiều pipeline
- **Environment type**: Chọn `LINUX_GPU_CONTAINER` nếu cần GPU (ML build)
- CodeBuild logs tự động gửi lên CloudWatch Logs

---

## 4. CodeDeploy – Deploy Application

### CodeDeploy là gì?
CodeDeploy tự động deploy code đến EC2, on-premise server, ECS, hoặc Lambda. Nó hỗ trợ nhiều deployment strategy để giảm downtime.

### CodeDeploy Deployment Strategies

| Strategy           | Mô tả                                                       | Phù hợp               |
|--------------------|------------------------------------------------------------|------------------------|
| In-place           | Deploy thẳng lên instance hiện tại (có downtime nhẹ)       | EC2/On-premise         |
| Rolling            | Deploy từng batch instance một (vd: batch 25%)             | EC2 (không downtime)   |
| Blue/Green         | Tạo môi trường mới (xanh), test → switch DNS sang xanh      | ECS, Lambda, EC2       |
| Canary             | Deploy 10% traffic → nếu ổn → 100%                         | ECS, Lambda            |
| Linear             | Tăng dần traffic (10% mỗi N phút)                          | ECS, Lambda            |

### CodeDeploy Components

| Thành phần         | Mô tả                                                         |
|--------------------|---------------------------------------------------------------|
| Application        | Tên app cần deploy                                            |
| Deployment Group   | Nhóm target (EC2 tag, ASG, ECS service, Lambda function)      |
| AppSpec file       | Định nghĩa cách deploy (file YAML/JSON)                       |
| Deployment         | Một lần deploy cụ thể                                         |

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

### CodeDeploy Hooks (Cho EC2)

| Hook                  | Khi nào chạy                    |
|-----------------------|---------------------------------|
| BeforeBlockTraffic    | Trước khi chặn traffic          |
| BlockTraffic          | Chặn traffic (deregister ALB)   |
| AfterBlockTraffic     | Sau khi chặn traffic            |
| ApplicationStop       | Dừng app cũ                    |
| BeforeInstall         | Trước khi cài code mới          |
| Install               | Copy code mới vào server        |
| AfterInstall          | Sau khi copy code               |
| ApplicationStart      | Khởi động app mới               |
| ValidateService       | Health check                    |
| BeforeAllowTraffic    | Trước khi mở traffic            |
| AllowTraffic          | Mở traffic (register ALB)       |
| AfterAllowTraffic     | Sau khi mở traffic              |

### Mẹo thực tế
- **Blue/Green cho ECS Fargate**: Tự động tạo replacement task set, test, rồi switch traffic – không downtime
- **CodeDeploy Deployment Group** có thể config alarm-based rollback: nếu CloudWatch Alarm báo lỗi sau deploy → auto rollback
- **AppSpec hooks**: Chạy script validate (kiểm tra HTTP 200) ở ValidateService stage

---

## 5. ECR (Elastic Container Registry)

### ECR là gì?
ECR là container image registry của AWS, lưu Docker image để ECS/EKS kéo về chạy. Tương tự Docker Hub nhưng tích hợp sâu với AWS.

### ECR Features

| Tính năng              | Mô tả                                                           |
|------------------------|-----------------------------------------------------------------|
| Repository             | Nơi lưu Docker image (1 repo = 1 app)                           |
| Image Tag              | Gắn tag cho image (latest, v1.2.3, commit-hash)                 |
| Image Scanning         | Quét CVE trong image (free: basic scan, paid: Inspector)        |
| Lifecycle Policy       | Tự động xóa image cũ (giữ N image gần nhất)                     |
| Cross-Account Access   | Chia sẻ repo cho account khác                                   |
| Replication            | Cross-region replication cho DR                                 |
| Pull-Through Cache     | Cache image từ Docker Hub/ECR Public vào private ECR            |

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

### Mẹo thực tế
- **Image tag strategy**: Dùng `git-commit-hash` thay vì `latest` để trace được version. `latest` không cho biết đang chạy code nào
- Bật **image scanning** để biết có CVE nào trong base image không
- **Lifecycle policy** giúp không bị lưu image vô hạn (tốn tiền S3)
- ECR là **private registry** mặc định, không public ra ngoài

---

## 6. Complete CI/CD Flow với AWS Services

```
Developer push code
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
    - tạo imagedefinitions.json artifact
        ↓
[CodeBuild: Test Stage] (tùy chọn)
    - integration test
    - security scan
        ↓
[CodeDeploy: Deploy Staging]
    - ECS Blue/Green deploy với $COMMIT_HASH
    - Automated smoke test
        ↓
[Manual Approval Stage]
        ↓
[CodeDeploy: Deploy Production]
    - ECS Blue/Green deploy
    - CloudWatch Alarm monitor (rollback nếu lỗi)
```

---

## 7. Tóm tắt chọn dịch vụ

| Nhu cầu                                                      | Dịch vụ                         |
|--------------------------------------------------------------|---------------------------------|
| Orchestrate CI/CD pipeline tự động                            | **CodePipeline**                |
| Build, test, và build Docker image                            | **CodeBuild** + buildspec.yml   |
| Deploy zero-downtime lên ECS/Lambda/EC2                      | **CodeDeploy (Blue/Green)**     |
| Lưu Docker image cho ECS/EKS                                 | **ECR**                         |
| Lưu package (npm, pip, Maven) riêng của team                  | **CodeArtifact**                |
| Quét CVE trong Docker image                                   | **ECR Image Scanning** hoặc **Inspector** |
| AI code review (tìm bug, best practice violation)             | **CodeGuru Reviewer**           |
| Muốn CI/CD ngoài AWS (GitHub Actions)                         | GitHub Actions + AWS CLI/SDK    |
| Muốn CI/CD multi-cloud                                        | GitLab CI / Jenkins + Terraform |