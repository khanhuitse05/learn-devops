# AWS Infrastructure as Code & Configuration

Infrastructure as Code (IaC) is how you define AWS infrastructure using code instead of clicking manually in the Console. AWS provides **CloudFormation**, **CDK**, and **Terraform** (third-party) as the main IaC tools.

---

## 1. Overview Table

| Tool            | Type                | Language                                  | State management         | Popularity           |
|-----------------|---------------------|-------------------------------------------|--------------------------|----------------------|
| CloudFormation  | AWS native IaC      | YAML/JSON                                 | Automatic (AWS managed)  | Within AWS ecosystem |
| AWS CDK         | AWS native IaC      | TypeScript, Python, Java, C#, Go          | Via CloudFormation       | Growing rapidly      |
| Terraform       | Third-party IaC     | HCL (HashiCorp Language)                  | Self-managed (state file) | Most popular for multi-cloud |
| Pulumi          | Third-party IaC     | TypeScript, Python, Go, C#               | Self-managed (state file) | Emerging             |

---

## 2. CloudFormation – AWS Native IaC

### What is CloudFormation?
You write YAML/JSON templates describing your entire infrastructure (VPC, ALB, ECS, RDS...), and CloudFormation creates, updates, and deletes resources in the correct dependency order.

### CloudFormation Core Concepts

| Concept          | Description                                                         |
|------------------|---------------------------------------------------------------------|
| Template         | YAML/JSON file defining infrastructure (resources, parameters, outputs) |
| Stack            | An instance of a template (1 stack = 1 set of created resources)    |
| Resource         | 1 AWS resource (EC2, S3, RDS...)                                    |
| Parameter        | Dynamic input when creating a stack (e.g.: InstanceType, DBPassword)|
| Output           | Output after creation (e.g.: ALB DNS Name, S3 Bucket URL)           |
| Condition        | If-else logic in templates (e.g.: create Production or Dev)         |
| Mapping          | Lookup table (e.g.: AMI ID by region)                               |
| Change Set       | Preview changes before applying (diff between old and new template) |
| Drift Detection  | Detect resources changed outside of CloudFormation                  |

### CloudFormation Template Example

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

### CloudFormation Pros & Cons

| Pros                                                  | Cons                                                |
|-------------------------------------------------------|-----------------------------------------------------|
| Deepest AWS integration (new services get CFN support day 1) | YAML/JSON verbose, no real code logic (if/loop) |
| State auto-managed, no need to store separate file    | Hard to reuse (must use nested stacks/modules)      |
| Auto-rollback if creation fails                       | No multi-cloud support                              |
| Drift detection: know when resources are manually changed | AWS-only                                          |

### Practical Tips
- Use **Change Set** before applying to know exactly what will change
- **Nested Stack** or **StackSet** to manage multiple stacks (multi-account, multi-region)
- Use **DeletionPolicy: Retain** for S3, RDS to prevent deletion when deleting a stack
- CloudFormation has **rollback triggers** (CloudWatch Alarm) to auto-rollback if the app fails after deployment

---

## 3. AWS CDK – IaC with Real Code

### What is CDK?
CDK lets you write infrastructure using TypeScript, Python, Java, C#, Go. CDK synthesizes code into a CloudFormation template and deploys it. Essentially, CDK = a code compiler that outputs CloudFormation.

### CDK Core Concepts

| Concept     | Description                                                        |
|-------------|--------------------------------------------------------------------|
| App         | Root of the CDK application                                        |
| Stack       | Group of resources (maps 1-1 with CloudFormation stack)            |
| Construct   | Basic unit: 1 construct = 1 or more resources                       |
| L1 Construct| Low-level, 1-1 with CloudFormation resource (rarely used)           |
| L2 Construct| High-level, has sensible defaults + helper methods (primary use)    |
| L3 Construct| Pattern: pre-built combination of multiple resources (e.g.: EcsServiceWithALB) |
| Environment | Target AWS account + region for deployment                         |

### CDK Code Example (TypeScript)

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

| Criteria          | CloudFormation                    | CDK                                   |
|-------------------|-----------------------------------|---------------------------------------|
| Language          | YAML/JSON                         | TypeScript, Python, Java, C#, Go      |
| Code logic        | Limited (Conditions, !If)         | Full (if/else, for loop, functions)   |
| Reusability       | Nested stacks, modules            | Construct library, OOP inheritance    |
| Learning curve    | Easier (declarative)              | Need programming + CFN concepts       |
| IDE support       | Poor (basic YAML validation)      | Good (autocomplete, type checking)    |
| Suitable for      | Small, simple infrastructure      | Complex infrastructure, dev teams     |

### CDK Best Practices
- Use **L2/L3 Constructs** whenever possible, avoid L1
- Organize code: **separate stacks for stateful (RDS, S3)** and **stateless (ECS, Lambda)** to avoid accidentally deleting data
- Use **CDK Pipelines** for CI/CD of infrastructure itself
- **cdk diff** before deploying to see changes
- Use **Context values** (cdk.json) instead of hardcoding account/region

---

## 4. Terraform

### What is Terraform?
Terraform (HashiCorp) is the most popular IaC tool, supporting **multi-cloud** (AWS, GCP, Azure, Kubernetes...). Uses HCL (HashiCorp Language) to define infrastructure.

### Terraform vs CloudFormation/CDK

| Criteria          | Terraform                          | CloudFormation/CDK                |
|-------------------|------------------------------------|-----------------------------------|
| Cloud support     | Multi-cloud (AWS + GCP + Azure...) | AWS only                          |
| State management  | You manage (S3 + DynamoDB lock)    | AWS manages automatically         |
| Language          | HCL (declarative)                  | YAML/JSON or TypeScript/Python    |
| Module Registry   | Very rich (community modules)      | Fewer (CDK Construct Hub growing) |
| Drift Detection   | Yes (terraform plan)               | Yes (drift detection)             |
| Speed             | Fast (parallel resource creation)  | Medium (more sequential)          |

### Terraform Example (HCL)

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

### When to Choose Terraform?
- Need multi-cloud or hybrid cloud
- Team already familiar with Terraform
- Need rich community modules
- Need to provision resources outside AWS (Datadog, Cloudflare, GitHub...)

---

## 5. SSM Parameter Store & AppConfig

### SSM Parameter Store
Stores configuration (string, secure string, StringList) for applications. Hierarchical by path (`/myapp/prod/DB_HOST`).

| Tier       | Throughput       | Cost       | When to use                 |
|------------|------------------|------------|-----------------------------|
| Standard   | 40 req/s         | Free       | Regular config              |
| Advanced   | 100 req/s        | $0.05/param/month | Config needing high throughput |

### AppConfig
Automatically deploys configuration changes with validation and rollback. Used for feature flags, dynamic config.

---

## 6. Tool Selection Summary

| Need                                                        | Tool                           |
|-------------------------------------------------------------|--------------------------------|
| AWS-only, simple infrastructure, want native integration     | **CloudFormation**             |
| AWS-only, dev team, need code logic (if/for, OOP)           | **AWS CDK**                    |
| Multi-cloud (AWS + GCP + Azure), need community modules     | **Terraform**                  |
| Multi-cloud + want to use TypeScript/Python                  | **Pulumi**                     |
| Store static config (DB host, feature flag URL) for free    | **SSM Parameter Store (Standard)** |
| Store dynamic config + feature flags + validation           | **AppConfig**                  |
| Store secrets (password, API key) + auto rotate             | **Secrets Manager**            |
| Manage container images                                     | **ECR**                        |
| CI/CD for infrastructure                                    | **CDK Pipelines** or **GitHub Actions + Terraform** |