# AWS Security & Identity Services

Bảo mật là nền tảng của AWS. Các dịch vụ chính: **IAM** (quản lý quyền), **Cognito** (xác thực người dùng), **WAF & Shield** (chống tấn công), **KMS** (mã hóa), **Secrets Manager**, và **ACM** (chứng chỉ SSL/TLS).

---

## 1. Bảng tổng quan các dịch vụ

| Dịch vụ          | Vai trò                                           | Use case chính                                          |
|------------------|---------------------------------------------------|---------------------------------------------------------|
| IAM              | Quản lý user, role, permission (ai được làm gì)    | Phân quyền nhân viên, app-to-service access              |
| Cognito          | Xác thực & quản lý user pool cho app               | Login/Register cho mobile/web app                       |
| WAF              | Web Application Firewall (chống SQLi, XSS, bot)    | Bảo vệ web app ở layer 7                                |
| Shield           | Chống DDoS (tầng 3/4 và 7)                         | Bảo vệ hạ tầng khỏi DDoS volumetric                      |
| KMS              | Quản lý encryption key                            | Mã hóa dữ liệu (S3, EBS, RDS, Secrets...)               |
| Secrets Manager  | Lưu trữ & tự động rotate secrets (DB password, API key) | Quản lý credential an toàn, auto rotate              |
| ACM              | Cấp & quản lý SSL/TLS certificate (miễn phí)       | HTTPS cho ALB, CloudFront, API Gateway                   |
| GuardDuty        | Threat detection (phát hiện xâm nhập)              | Giám sát an ninh tự động                                |
| Inspector        | Vulnerability scanning (quét lỗ hổng)              | Quét EC2, ECR image, Lambda tìm CVE                     |

---

## 2. IAM (Identity and Access Management)

### IAM là gì?
IAM kiểm soát **ai** (user/role) được làm **gì** (action) với **tài nguyên nào** (resource) trên AWS.

### IAM Core Components

| Thành phần     | Mô tả                                                              |
|----------------|--------------------------------------------------------------------|
| User           | Người dùng (nhân viên), có credentials (password + access key)      |
| Group          | Nhóm user (Dev, Admin, ReadOnly) để gán policy hàng loạt            |
| Role           | Identity cho service (EC2, Lambda, ECS Task) – app assume role để gọi API |
| Policy         | JSON document định nghĩa quyền (Allow/Deny)                        |

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

### Best Practices IAM

| Practice                        | Mô tả                                                         |
|---------------------------------|---------------------------------------------------------------|
| Least Privilege Principle       | Chỉ cấp đúng quyền cần thiết, không cấp thừa                    |
| IAM Role thay vì Access Key     | Cho service-to-service (EC2 gọi S3, ECS gọi DynamoDB)          |
| MFA cho root user & admin       | Bắt buộc xác thực 2 lớp cho root và user có quyền admin        |
| Password Policy mạnh            | Bắt buộc: độ dài, ký tự đặc biệt, expire định kỳ               |
| Rotate Access Key định kỳ       | Không dùng access key cũ >90 ngày                              |
| IAM Access Analyzer             | Kiểm tra resource nào đang public ra ngoài (S3 bucket...)      |
| Không dùng Root cho daily work  | Tạo admin IAM user riêng, root chỉ dùng cho việc khẩn cấp      |

### IAM Role vs IAM User

| Tiêu chí          | IAM User                                | IAM Role                                 |
|-------------------|-----------------------------------------|------------------------------------------|
| Ai dùng?          | Con người (nhân viên)                   | Service (EC2, Lambda, ECS) hoặc cross-account |
| Credentials       | Password + Access Key (vĩnh viễn)       | Temporary token (tự động rotate)          |
| Bảo mật           | Dễ lộ nếu không rotate key              | An toàn hơn (token ngắn hạn)             |
| Nên dùng khi      | Người cần AWS Console/CLI               | App/service cần gọi AWS API               |

---

## 3. Cognito – Xác thực người dùng cho app

### Cognito là gì?
Cognito giúp bạn thêm login/register vào app mà không cần code backend auth. Hỗ trợ: email/password, Google, Facebook, Apple, SAML, OIDC.

### Cognito User Pool vs Identity Pool

| Thành phần      | Vai trò                                                 | Khi nào dùng                                     |
|-----------------|---------------------------------------------------------|--------------------------------------------------|
| User Pool       | Database người dùng (đăng ký, đăng nhập, quên mật khẩu)  | App cần login/register riêng                    |
| Identity Pool   | Cấp temporary AWS credentials cho user đã xác thực       | User đã login (qua User Pool hoặc social) cần truy cập thẳng S3, DynamoDB |

### Cognito Features

| Tính năng                  | Mô tả                                                         |
|----------------------------|---------------------------------------------------------------|
| Hosted UI                  | Giao diện login có sẵn (tùy chỉnh logo, màu)                   |
| JWT Token                  | Trả về ID Token, Access Token, Refresh Token sau login         |
| MFA                        | SMS, TOTP (Google Authenticator)                              |
| Advanced Security          | Phát hiện compromised credential, adaptive auth               |
| Lambda Triggers            | Custom logic trước/sau login (pre-signup, post-confirmation...) |
| Federation                 | Login bằng Google, Facebook, Apple, SAML IdP                   |

### Cognito Flow điển hình

```
[Mobile App]
    ↓ (1) Login: email + password
[Cognito User Pool]
    ↓ (2) Trả về JWT Token (ID + Access + Refresh)
[Mobile App]
    ↓ (3) Gọi API Gateway với JWT trong header
[API Gateway + Cognito Authorizer] → validate JWT → gọi Lambda/ECS
```

---

## 4. WAF & Shield – Chống tấn công

### AWS WAF (Web Application Firewall)
WAF bảo vệ web app ở **layer 7** (HTTP/HTTPS). Gắn vào CloudFront, ALB, API Gateway, hoặc AppSync.

| WAF Rule Type            | Mô tả                                                      |
|--------------------------|------------------------------------------------------------|
| AWS Managed Rules        | Rule có sẵn: SQL injection, XSS, PHP/WordPress attack       |
| Rate-based Rule          | Chặn IP gửi >N request/5 phút                               |
| IP Set                   | Allow/Block list IP cụ thể                                  |
| Regex Rule               | Match pattern trong request body/header/URI                 |
| Geo Match                | Block/Allow theo quốc gia                                   |

### AWS Shield
Chống DDoS. 2 tier:

| Tier        | Mô tả                                                        | Chi phí         |
|-------------|--------------------------------------------------------------|-----------------|
| Shield Standard | Miễn phí, tự động bảo vệ layer 3/4 cho mọi AWS resource    | $0              |
| Shield Advanced| Bảo vệ layer 7, có DDoS Response Team (DRT), cost protection | $3,000/tháng    |

### Mẹo thực tế
- Gắn WAF vào **CloudFront** (thay vì ALB trực tiếp) để chặn attack ở edge, giảm tải cho backend
- Dùng **Rate-based Rule** để chống brute-force login
- Shield Advanced có **cost protection**: nếu DDoS làm tăng phí CloudFront/ALB, AWS refund
- Kết hợp WAF + CloudFront + Shield = bảo vệ toàn diện

---

## 5. KMS (Key Management Service)

### KMS là gì?
KMS quản lý encryption key dùng để mã hóa dữ liệu. Hầu hết các dịch vụ AWS dùng KMS để encrypt (S3, EBS, RDS, Secrets Manager, CloudWatch Logs...).

### KMS Key Types

| Loại                    | Ai quản lý key?         | Dùng khi nào                                   |
|-------------------------|--------------------------|------------------------------------------------|
| AWS Owned Key           | AWS (miễn phí, mặc định) | Mặc định cho S3 SSE-S3, EBS encryption         |
| AWS Managed Key         | AWS (tạo tự động)        | Khi bạn bật encryption cho RDS, DynamoDB...    |
| Customer Managed Key (CMK) | Bạn quản lý hoàn toàn  | Cần audit trail, kiểm soát rotation, cross-account |

### KMS Features
- **Key Rotation**: CMK có thể tự động rotate hàng năm (không cần re-encrypt)
- **Envelope Encryption**: Dùng CMK mã hóa data key, data key mã hóa dữ liệu thực
- **Cross-Account Access**: Chia sẻ CMK cho account khác qua Key Policy

---

## 6. Secrets Manager & ACM

### Secrets Manager
Lưu trữ credential (DB password, API key, OAuth token...) an toàn. Khác với Parameter Store (SSM) ở chỗ:
- **Auto rotate**: Tự động đổi password RDS, DocumentDB theo lịch (dùng Lambda)
- **Cross-account sharing**
- Tích hợp thẳng với RDS, DocumentDB, Redshift

### ACM (AWS Certificate Manager)
Cấp SSL/TLS certificate **miễn phí** cho AWS services. Tự động renew trước khi hết hạn. Tích hợp thẳng vào ALB, CloudFront, API Gateway, NLB.

| Tính năng             | Mô tả                                                          |
|-----------------------|----------------------------------------------------------------|
| Public Certificate    | Miễn phí, dùng cho domain public (example.com)                  |
| Private Certificate   | Dùng nội bộ (VPC, internal domain), cần Private CA ($400/tháng) |
| DNS Validation        | Cấp bằng cách thêm CNAME record vào Route 53 (auto nếu cùng account) |
| Email Validation      | Cấp bằng cách xác minh qua email domain owner                   |

### Mẹo thực tế
- **Secrets Manager rẻ hơn Parameter Store** nếu bạn cần rotate; nếu chỉ lưu static config, dùng **Parameter Store** (miễn phí cho Standard)
- **ACM + Route 53** cùng account: DNS validation tự động, không cần can thiệp thủ công
- Dùng **Secrets Manager** cho RDS master password, API key third-party; không hardcode vào code

---

## 7. Shared Responsibility Model

AWS bảo mật **OF** the cloud, bạn bảo mật **IN** the cloud.

| AWS lo                              | Bạn lo                                          |
|-------------------------------------|-------------------------------------------------|
| Bảo vệ data center (vật lý)         | Cấu hình Security Group đúng                    |
| Bảo vệ hardware, hypervisor         | Mã hóa dữ liệu (enable encryption)              |
| Patch OS của managed service        | Patch OS của EC2 bạn tự quản                    |
| IAM infrastructure                  | Cấu hình IAM policy đúng (least privilege)      |
| DDoS protection (Shield Standard)   | Viết code an toàn (không SQL injection)         |

---

## 8. Tóm tắt chọn dịch vụ

| Nhu cầu                                                              | Dịch vụ                     |
|----------------------------------------------------------------------|-----------------------------|
| Quản lý quyền nhân viên & service                                     | **IAM**                     |
| Thêm login/register cho mobile/web app                                | **Cognito User Pool**       |
| User login rồi cần truy cập thẳng S3                                  | **Cognito Identity Pool**   |
| Chống SQL injection, XSS, rate limiting                              | **AWS WAF**                 |
| Chống DDoS volumetric lớn                                             | **AWS Shield Advanced**     |
| Mã hóa dữ liệu, quản lý key                                          | **KMS**                     |
| Lưu DB password, API key & auto rotate                               | **Secrets Manager**         |
| Cấp SSL/TLS miễn phí cho domain                                      | **ACM**                     |
| Phát hiện xâm nhập, suspicious activity                              | **GuardDuty**               |
| Quét lỗ hổng EC2, container image                                    | **Inspector**               |
| Lưu config không cần rotate (feature flag, URL)                      | **SSM Parameter Store**     |