# AWS Infrastructure as Code & Configuration

Infrastructure as Code (IaC) là cách bạn định nghĩa hạ tầng AWS bằng code thay vì click thủ công trên Console. AWS cung cấp **CloudFormation**, **CDK**, và **Terraform** (third-party) là các công cụ IaC chính.

---

## 1. Bảng tổng quan

| Công cụ         | Loại                | Ngôn ngữ                                  | State management         | Độ phổ biến         |
|-----------------|---------------------|-------------------------------------------|--------------------------|----------------------|
| CloudFormation  | AWS native IaC      | YAML/JSON                                 | Tự động (AWS quản lý)    | Trong hệ sinh thái AWS |
| AWS CDK         | AWS native IaC      | TypeScript, Python, Java, C#, Go          | Qua CloudFormation       | Đang tăng nhanh      |
| Terraform       | Third-party IaC     | HCL (HashiCorp Language)                  | Tự quản lý (state file)   | Phổ biến nhất multi-cloud |
| Pulumi          | Third-party IaC     | TypeScript, Python, Go, C#               | Tự quản lý (state file)   | Mới nổi             |

---

## 2. CloudFormation – IaC gốc của AWS

### CloudFormation là gì?
Bạn viết template YAML/JSON mô tả toàn bộ hạ tầng (VPC, ALB, ECS, RDS...), CloudFormation sẽ tạo, cập nhật, và xóa tài nguyên theo đúng thứ tự phụ thuộc.

### CloudFormation Core Concepts

| Khái niệm        | Mô tả                                                           |
|------------------|-----------------------------------------------------------------|
| Template          | File YAML/JSON định nghĩa hạ tầng (resources, parameters, outputs) |
| Stack             | Một instance của template (1 stack = 1 bộ tài nguyên được tạo ra) |
| Resource          | 1 tài nguyên AWS (EC2, S3, RDS...)                              |
| Parameter         | Input động khi tạo stack (vd: InstanceType, DBPassword)         |
| Output            | Output sau khi tạo (vd: ALB DNS Name, S3 Bucket URL)            |
| Condition         | Logic if-else trong template (vd: tạo Production hay Dev)       |
| Mapping           | Lookup table (vd: AMI ID theo region)                           |
| Change Set        | Preview thay đổi trước khi apply (diff giữa template cũ và mới) |
| Drift Detection   | Phát hiện tài nguyên bị thay đổi ngoài CloudFormation           |

### CloudFormation Template Ví dụ

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Simple S3 bucket

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, staging, prod]

Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub my-app-${Environment}-bucket
      VersioningConfiguration:
        Status: Enabled

Outputs:
  BucketName:
    Value: !Ref MyBucket
    Description: Name of the S3 bucket
```

### CloudFormation Ưu & Nhược

| Ưu điểm                                              | Nhược điểm                                           |
|------------------------------------------------------|-----------------------------------------------------|
| Tích hợp sâu nhất với AWS (service mới có CFN support ngày 1) | YAML/JSON verbose, không có code logic (if/loop) |
| State tự động quản lý, không cần lưu file riêng        | Khó tái sử dụng (phải dùng nested stack/module)     |
| Rollback tự động nếu tạo lỗi                           | Không hỗ trợ multi-cloud                           |
| Drift detection: biết khi nào tài nguyên bị sửa tay    | Chỉ chạy trên AWS                                   |

### Mẹo thực tế
- Dùng **Change Set** trước khi apply để biết chính xác cái gì sẽ thay đổi
- **Nested Stack** hoặc **StackSet** để quản lý nhiều stack (multi-account, multi-region)
- Dùng **DeletionPolicy: Retain** cho S3, RDS để không bị xóa khi xóa stack
- CloudFormation có **rollback triggers** (CloudWatch Alarm) để auto-rollback nếu app lỗi sau deploy

---

## 3. AWS CDK – IaC bằng code thực thụ

### CDK là gì?
CDK cho phép bạn viết infrastructure bằng TypeScript, Python, Java, C#, Go. CDK tổng hợp (synthesize) code thành CloudFormation template và deploy. Về bản chất, CDK = code compiler ra CloudFormation.

### CDK Core Concepts

| Khái niệm    | Mô tả                                                        |
|--------------|--------------------------------------------------------------|
| App          | Root của CDK application                                     |
| Stack        | Nhóm tài nguyên (map 1-1 với CloudFormation stack)            |
| Construct    | Đơn vị cơ bản: 1 construct = 1 hoặc nhiều tài nguyên          |
| L1 Construct | Low-level, 1-1 với CloudFormation resource (ít dùng)          |
| L2 Construct | High-level, có default hợp lý + helper method (dùng chính)     |
| L3 Construct | Pattern: tổ hợp sẵn nhiều tài nguyên (vd: EcsServiceWithALB) |
| Environment  | Target AWS account + region để deploy                        |

### CDK Code Ví dụ (TypeScript)

```typescript
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'MyStack');

new s3.Bucket(stack, 'MyBucket', {
  versioned: true,
  encryption: s3.BucketEncryption.S3_MANAGED,
  lifecycleRules: [{
    expiration: cdk.Duration.days(90)
  }]
});
```

### CDK vs CloudFormation

| Tiêu chí          | CloudFormation                    | CDK                                   |
|-------------------|-----------------------------------|---------------------------------------|
| Ngôn ngữ          | YAML/JSON                         | TypeScript, Python, Java, C#, Go      |
| Code logic        | Hạn chế (Conditions, !If)         | Đầy đủ (if/else, for loop, function)  |
| Tái sử dụng       | Nested stack, modules             | Construct library, OOP inheritance    |
| Learning curve    | Dễ hơn (declarative)              | Cần biết programming + CFN concepts   |
| IDE support       | Kém (YAML validation cơ bản)      | Tốt (autocomplete, type check)        |
| Phù hợp           | Hạ tầng nhỏ, đơn giản             | Hạ tầng phức tạp, team dev            |

### CDK Best Practices
- Dùng **L2/L3 Constructs** khi có thể, tránh L1
- Tổ chức code: **stack riêng cho stateful (RDS, S3)** và **stateless (ECS, Lambda)** để tránh vô tình xóa dữ liệu
- Dùng **CDK Pipelines** để CI/CD luôn cho hạ tầng
- **cdk diff** trước khi deploy để xem thay đổi
- Dùng **Context values** (cdk.json) thay vì hardcode account/region

---

## 4. Terraform

### Terraform là gì?
Terraform (HashiCorp) là công cụ IaC phổ biến nhất, hỗ trợ **multi-cloud** (AWS, GCP, Azure, Kubernetes...). Dùng HCL (HashiCorp Language) để định nghĩa hạ tầng.

### Terraform vs CloudFormation/CDK

| Tiêu chí          | Terraform                          | CloudFormation/CDK                |
|-------------------|------------------------------------|-----------------------------------|
| Cloud support     | Multi-cloud (AWS + GCP + Azure...) | Chỉ AWS                           |
| State management  | Bạn tự quản (S3 + DynamoDB lock)   | AWS quản lý tự động               |
| Language          | HCL (declarative)                  | YAML/JSON hoặc TypeScript/Python  |
| Module Registry   | Rất phong phú (community modules)  | Ít hơn (CDK Construct Hub đang lớn) |
| Drift Detection   | Có (terraform plan)                | Có (drift detection)              |
| Speed             | Nhanh (parallel resource creation) | Trung bình (tuần tự hơn)          |

### Terraform Ví dụ (HCL)

```hcl
resource "aws_s3_bucket" "my_bucket" {
  bucket = "my-app-bucket"

  versioning {
    enabled = true
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}
```

### Khi nào chọn Terraform?
- Cần multi-cloud hoặc hybrid cloud
- Team đã quen Terraform
- Cần community modules phong phú
- Cần provision cả outside-AWS resources (Datadog, Cloudflare, GitHub...)

---

## 5. SSM Parameter Store & AppConfig

### SSM Parameter Store
Lưu trữ configuration (string, secret string, StringList) cho app. Phân cấp theo path (`/myapp/prod/DB_HOST`).

| Tier       | Throughput       | Chi phí    | Dùng khi                    |
|------------|------------------|------------|-----------------------------|
| Standard   | 40 req/s         | Miễn phí   | Config thông thường         |
| Advanced   | 100 req/s        | $0.05/param/tháng | Config cần throughput cao |

### AppConfig
Tự động deploy configuration thay đổi với validation và rollback. Dùng cho feature flag, dynamic config.

---

## 6. Tóm tắt chọn công cụ

| Nhu cầu                                                     | Công cụ                        |
|-------------------------------------------------------------|--------------------------------|
| Chỉ dùng AWS, hạ tầng đơn giản, muốn native tích hợp        | **CloudFormation**             |
| Chỉ dùng AWS, team dev, cần code logic (if/for, OOP)        | **AWS CDK**                    |
| Multi-cloud (AWS + GCP + Azure), cần module community       | **Terraform**                  |
| Multi-cloud + muốn dùng TypeScript/Python                    | **Pulumi**                     |
| Lưu config static (DB host, feature flag URL) miễn phí      | **SSM Parameter Store (Standard)** |
| Lưu config dynamic + feature flag + validation              | **AppConfig**                  |
| Lưu secrets (password, API key) + auto rotate               | **Secrets Manager**            |
| Quản lý container image                                     | **ECR**                        |
| CI/CD cho hạ tầng                                           | **CDK Pipelines** hoặc **GitHub Actions + Terraform** |