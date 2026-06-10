# AWS Security & Identity Services

Security is the foundation of AWS. Key services: **IAM** (permission management), **Cognito** (user authentication), **WAF & Shield** (attack protection), **KMS** (encryption), **Secrets Manager**, and **ACM** (SSL/TLS certificates).

---

## 1. Services Overview

| Service          | Role                                              | Primary Use Case                                         |
|------------------|---------------------------------------------------|----------------------------------------------------------|
| IAM              | Manage users, roles, permissions (who can do what)| Employee access control, app-to-service access            |
| Cognito          | Authentication & user pool management for apps    | Login/Register for mobile/web apps                       |
| WAF              | Web Application Firewall (block SQLi, XSS, bots)  | Protect web apps at layer 7                              |
| Shield           | DDoS protection (layer 3/4 and 7)                 | Protect infrastructure from volumetric DDoS               |
| KMS              | Encryption key management                         | Encrypt data (S3, EBS, RDS, Secrets...)                   |
| Secrets Manager  | Store & auto-rotate secrets (DB password, API key)| Secure credential management, auto rotation               |
| ACM              | Issue & manage SSL/TLS certificates (free)        | HTTPS for ALB, CloudFront, API Gateway                    |
| GuardDuty        | Threat detection                                  | Automated security monitoring                             |
| Inspector        | Vulnerability scanning                            | Scan EC2, ECR images, Lambda for CVEs                    |

---

## 2. IAM (Identity and Access Management)

### What is IAM?
IAM controls **who** (user/role) can do **what** (action) on **which resources** (resource) in AWS.

### IAM Core Components

| Component     | Description                                                          |
|---------------|----------------------------------------------------------------------|
| User          | People (employees), have credentials (password + access key)          |
| Group         | Group of users (Dev, Admin, ReadOnly) to assign policies in bulk      |
| Role          | Identity for services (EC2, Lambda, ECS Task) – app assumes role to call APIs |
| Policy        | JSON document defining permissions (Allow/Deny)                      |

### IAM Policy Structure

```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:ListBucket"],
  "Resource": "arn:aws:s3:::my-bucket/*",
  "Condition": {
    "IpAddress": {"aws:SourceIp": "203.0.113.0/24"}
  }
}
```

### IAM Best Practices

| Practice                        | Description                                                    |
|---------------------------------|----------------------------------------------------------------|
| Least Privilege Principle       | Grant only necessary permissions, nothing extra                 |
| IAM Role instead of Access Key  | For service-to-service (EC2 calling S3, ECS calling DynamoDB)   |
| MFA for root user & admins      | Require 2-factor auth for root and users with admin privileges  |
| Strong Password Policy          | Enforce: minimum length, special characters, periodic expiration |
| Rotate Access Keys regularly    | Don't use access keys older than 90 days                        |
| IAM Access Analyzer             | Check which resources are publicly exposed (S3 buckets...)     |
| Don't use Root for daily work   | Create a separate admin IAM user; root only for emergencies     |

### IAM Role vs IAM User

| Criteria          | IAM User                                | IAM Role                                 |
|-------------------|-----------------------------------------|------------------------------------------|
| Who uses it?      | People (employees)                      | Services (EC2, Lambda, ECS) or cross-account |
| Credentials       | Password + Access Key (permanent)       | Temporary token (auto-rotated)            |
| Security          | Vulnerable if keys aren't rotated       | More secure (short-lived token)           |
| Use when          | Person needs AWS Console/CLI            | App/service needs to call AWS APIs        |

---

## 3. Cognito – User Authentication for Apps

### What is Cognito?
Cognito lets you add login/register to your app without coding backend auth. Supports: email/password, Google, Facebook, Apple, SAML, OIDC.

### Cognito User Pool vs Identity Pool

| Component       | Role                                                    | When to use                                  |
|-----------------|---------------------------------------------------------|----------------------------------------------|
| User Pool       | User database (sign up, sign in, forgot password)       | App needs its own login/register             |
| Identity Pool   | Grants temporary AWS credentials to authenticated users | Users already logged in (via User Pool or social) need direct S3/DynamoDB access |

### Cognito Features

| Feature                    | Description                                                       |
|----------------------------|-------------------------------------------------------------------|
| Hosted UI                  | Built-in login interface (customizable logo, colors)              |
| JWT Token                  | Returns ID Token, Access Token, Refresh Token after login         |
| MFA                        | SMS, TOTP (Google Authenticator)                                  |
| Advanced Security          | Compromised credential detection, adaptive auth                   |
| Lambda Triggers            | Custom logic before/after login (pre-signup, post-confirmation...)|
| Federation                 | Login with Google, Facebook, Apple, SAML IdP                      |

### Typical Cognito Flow

```
[Mobile App]
    ↓ (1) Login: email + password
[Cognito User Pool]
    ↓ (2) Returns JWT Token (ID + Access + Refresh)
[Mobile App]
    ↓ (3) Calls API Gateway with JWT in header
[API Gateway + Cognito Authorizer] → validates JWT → calls Lambda/ECS
```

---

## 4. WAF & Shield – Attack Protection

### AWS WAF (Web Application Firewall)
WAF protects web apps at **layer 7** (HTTP/HTTPS). Attached to CloudFront, ALB, API Gateway, or AppSync.

| WAF Rule Type            | Description                                                    |
|--------------------------|----------------------------------------------------------------|
| AWS Managed Rules        | Built-in rules: SQL injection, XSS, PHP/WordPress attacks      |
| Rate-based Rule          | Block IPs sending >N requests/5 minutes                        |
| IP Set                   | Allow/Block specific IPs                                       |
| Regex Rule               | Match patterns in request body/header/URI                       |
| Geo Match                | Block/Allow by country                                         |

### AWS Shield
DDoS protection. 2 tiers:

| Tier           | Description                                                    | Cost            |
|----------------|----------------------------------------------------------------|-----------------|
| Shield Standard| Free, automatic layer 3/4 protection for all AWS resources     | $0              |
| Shield Advanced| Layer 7 protection, DDoS Response Team (DRT), cost protection  | $3,000/month    |

### Practical Tips
- Attach WAF to **CloudFront** (instead of ALB directly) to block attacks at the edge, reducing backend load
- Use **Rate-based Rules** to prevent brute-force login
- Shield Advanced has **cost protection**: if DDoS spikes CloudFront/ALB fees, AWS refunds
- Combine WAF + CloudFront + Shield = comprehensive protection

---

## 5. KMS (Key Management Service)

### What is KMS?
KMS manages encryption keys used to encrypt data. Most AWS services use KMS for encryption (S3, EBS, RDS, Secrets Manager, CloudWatch Logs...).

### KMS Key Types

| Type                    | Who manages the key?      | When to use                                     |
|-------------------------|---------------------------|-------------------------------------------------|
| AWS Owned Key           | AWS (free, default)       | Default for S3 SSE-S3, EBS encryption           |
| AWS Managed Key         | AWS (auto-created)        | When you enable encryption for RDS, DynamoDB... |
| Customer Managed Key (CMK) | You fully manage       | Need audit trail, rotation control, cross-account |

### KMS Features
- **Key Rotation**: CMK can auto-rotate annually (no re-encryption needed)
- **Envelope Encryption**: Uses CMK to encrypt data keys, data keys encrypt actual data
- **Cross-Account Access**: Share CMK with other accounts via Key Policy

---

## 6. Secrets Manager & ACM

### Secrets Manager
Stores credentials (DB password, API key, OAuth token...) securely. Differs from Parameter Store (SSM) in that:
- **Auto rotate**: Automatically rotate RDS, DocumentDB passwords on schedule (using Lambda)
- **Cross-account sharing**
- Direct integration with RDS, DocumentDB, Redshift

### ACM (AWS Certificate Manager)
Issues **free** SSL/TLS certificates for AWS services. Auto-renews before expiration. Directly integrated with ALB, CloudFront, API Gateway, NLB.

| Feature              | Description                                                       |
|----------------------|-------------------------------------------------------------------|
| Public Certificate   | Free, for public domains (example.com)                            |
| Private Certificate  | For internal use (VPC, internal domains), requires Private CA ($400/month) |
| DNS Validation       | Issued by adding CNAME record to Route 53 (auto if same account)  |
| Email Validation     | Issued by verifying via domain owner email                        |

### Practical Tips
- **Secrets Manager is cheaper than Parameter Store** if you need rotation; if only storing static config, use **Parameter Store** (free for Standard tier)
- **ACM + Route 53** same account: DNS validation is automatic, no manual intervention
- Use **Secrets Manager** for RDS master passwords, third-party API keys; never hardcode in code

---

## 7. Shared Responsibility Model

AWS secures **OF** the cloud, you secure **IN** the cloud.

| AWS Handles                         | You Handle                                      |
|-------------------------------------|-------------------------------------------------|
| Physical data center protection     | Proper Security Group configuration             |
| Hardware, hypervisor protection     | Encrypt data (enable encryption)                |
| Patch OS of managed services        | Patch OS of EC2 you manage                      |
| IAM infrastructure                  | Configure IAM policies correctly (least privilege)|
| DDoS protection (Shield Standard)   | Write secure code (no SQL injection)            |

---

## 8. Service Selection Summary

| Need                                                                 | Service                     |
|----------------------------------------------------------------------|-----------------------------|
| Manage employee & service permissions                                | **IAM**                     |
| Add login/register to mobile/web app                                 | **Cognito User Pool**       |
| Authenticated users need direct S3 access                            | **Cognito Identity Pool**   |
| Block SQL injection, XSS, rate limiting                              | **AWS WAF**                 |
| Protect against large volumetric DDoS                                | **AWS Shield Advanced**     |
| Encrypt data, manage keys                                            | **KMS**                     |
| Store DB password, API key & auto-rotate                             | **Secrets Manager**         |
| Issue free SSL/TLS certificate for domain                            | **ACM**                     |
| Detect intrusions, suspicious activity                               | **GuardDuty**               |
| Scan EC2 vulnerabilities, container images                           | **Inspector**               |
| Store config without rotation (feature flags, URLs)                  | **SSM Parameter Store**     |