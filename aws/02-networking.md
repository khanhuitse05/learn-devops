# AWS Networking & Traffic Management

Dịch vụ mạng của AWS giúp bạn kiểm soát cách traffic đi vào, đi ra, và di chuyển bên trong hệ thống. Các dịch vụ chính: **VPC**, **ALB/NLB**, **API Gateway**.

---

## 1. VPC (Virtual Private Cloud) - Nền tảng mạng riêng ảo

### VPC là gì?
VPC là một network ảo riêng biệt của bạn trong AWS. Bạn định nghĩa dải IP (CIDR), chia subnet, cấu hình route table, và kiểm soát traffic ra/vào bằng Security Group và NACL.

### Các thành phần chính của VPC

| Thành phần          | Vai trò                                                                |
|---------------------|------------------------------------------------------------------------|
| CIDR Block           | (Classless Inter-Domain Routing) Dải IP của VPC, vd: `10.0.0.0/16` (65,536 IP)                         |
| Subnet               | Chia nhỏ VPC thành các mạng con. Mỗi subnet nằm trong 1 Availability Zone |
| Public Subnet        | Subnet có route ra Internet Gateway → tài nguyên có thể truy cập internet |
| Private Subnet       | Subnet không có route trực tiếp ra internet → bảo mật cho database, backend |
| Internet Gateway (IGW)| Cổng kết nối VPC với internet công cộng                               |
| NAT Gateway          | Cho phép tài nguyên trong private subnet truy cập internet (1 chiều ra) mà không bị internet gọi vào |
| Route Table          | Bảng định tuyến: quyết định traffic từ subnet đi đâu                    |
| Security Group (SG)  | Firewall cấp instance: stateful, chỉ định nghĩa rule cho phép (allow)  |
| Network ACL (NACL)   | Firewall cấp subnet: stateless, định nghĩa cả allow lẫn deny           |
| VPC Endpoint         | Kết nối private từ VPC đến AWS services (S3, DynamoDB...) không qua internet |

### Kiến trúc VPC điển hình (3-tier)

```
[Internet] ↔ [IGW] ↔ Public Subnet (ALB, Bastion Host)
                          ↓
                    Private Subnet App (ECS, EC2)
                          ↓
                    Private Subnet Data (RDS, ElastiCache)
```

### Mẹo thực tế
- **Không đặt database vào public subnet** - đây là lỗi bảo mật nghiêm trọng
- Dùng **NAT Gateway** (không phải NAT Instance) cho production vì được AWS quản lý, auto-scale
- **VPC Endpoint** dùng để truy cập S3/DynamoDB từ private subnet mà không tốn NAT Gateway fee, giảm chi phí đáng kể
- **VPC Peering** và **Transit Gateway**: dùng để kết nối nhiều VPC với nhau. Transit Gateway là hub-and-spoke, tốt hơn VPC Peering mesh khi có >3 VPC

---

## 2. Elastic Load Balancer (ELB) - Cân bằng tải

AWS cung cấp 3 loại Load Balancer. Phân biệt rõ ràng để chọn đúng loại:

### Bảng so sánh 3 loại Load Balancer

| Tiêu chí              | ALB (Application LB)                | NLB (Network LB)                    | GWLB (Gateway LB)                  |
|-----------------------|--------------------------------------|--------------------------------------|-------------------------------------|
| Layer OSI             | Layer 7 (HTTP/HTTPS)                | Layer 4 (TCP/UDP/TLS)                | Layer 3 (IP)                       |
| Routing theo          | Path, Host header, Query string, Header | IP, Port, Protocol                  | Flow (dùng cho firewall appliance)  |
| WebSocket             | Hỗ trợ tốt                          | Hỗ trợ (TCP mode)                    | Không                              |
| Static IP             | Không (dùng Global Accelerator)     | Có (Elastic IP mỗi AZ)              | Có                                 |
| Latency               | ~1-3ms                              | <0.1ms (siêu thấp)                  | Rất thấp                           |
| SSL Termination       | Có (tích hợp ACM)                   | Có (TLS)                             | Không                              |
| Use case chính        | Web app, API, Microservices         | Game server, TCP/UDP streaming, IoT  | Chạy firewall/IDS/IPS ảo hóa       |

### ALB (Application Load Balancer) - Service chính bạn sẽ dùng

ALB là load balancer phổ biến nhất cho web developer. Nó hiểu HTTP/HTTPS.

**Các tính năng cần biết:**

1. **Listener Rules**: Định tuyến request dựa trên:
   - Path: `/api/*` → target group A, `/images/*` → target group B
   - Host header: `api.example.com` → target group API, `admin.example.com` → target group Admin
   - Query string, HTTP header, source IP

2. **Target Group**: Nhóm các backend nhận traffic. Có thể là:
   - EC2 Instances
   - ECS Tasks (Fargate hoặc EC2)
   - Lambda Functions
   - IP Addresses (on-premise server qua VPN/Direct Connect)

3. **Health Checks**: ALB liên tục kiểm tra sức khỏe từng target, nếu chết thì ngừng gửi traffic

4. **Sticky Sessions**: User luôn được gửi đến cùng 1 backend (dùng cookie) - cần cho ứng dụng có session local

5. **Redirect & Fixed Response**: Redirect HTTP→HTTPS, hoặc trả fixed response (vd: 503 maintenance page) ngay tại ALB, không cần code trong app

6. **WAF Integration**: Gắn AWS WAF vào ALB để chặn SQL injection, XSS, rate limit

### NLB (Network Load Balancer) - Khi cần hiệu năng cực cao

- Xử lý hàng triệu request/giây với latency siêu thấp
- Có thể gán **Elastic IP** cố định cho mỗi AZ - rất quan trọng khi partner yêu cầu IP whitelist
- Dùng cho TCP/UDP service, không cần hiểu HTTP

### Mẹo thực tế
- Luôn đặt ALB ở **public subnet** và backend (ECS/EC2) ở **private subnet**
- Dùng **ACM (AWS Certificate Manager)** để tạo SSL/TLS certificate miễn phí, tích hợp thẳng vào ALB
- Bật **access logs** cho ALB để debug request và phân tích traffic
- **Deletion protection**: Bật lên để không ai xóa nhầm ALB production

---

## 3. API Gateway - Cổng API Serverless

### API Gateway là gì?
API Gateway là dịch vụ managed giúp bạn tạo, publish, và quản lý REST API hoặc WebSocket API ở quy mô lớn. Nó khác với ALB ở chỗ:
- **Serverless hoàn toàn**: Không cần cấu hình instance, auto-scale về 0
- **Tích hợp sâu với AWS**: Có thể gọi thẳng Lambda, DynamoDB, Step Functions, SQS... không cần code backend trung gian
- **Nhiều tính năng API management**: Authentication, rate limiting, request validation, documentation

### Các loại API Gateway

| Loại               | Giao thức                | Use case                                    |
|--------------------|--------------------------|---------------------------------------------|
| REST API           | HTTP/HTTPS               | Web app, mobile backend, BFF (Backend for Frontend) |
| HTTP API           | HTTP/HTTPS (nhẹ hơn)     | Proxy cho Lambda, microservices đơn giản, rẻ hơn REST API 70% |
| WebSocket API      | WebSocket                | Chat app, real-time dashboard, game         |

### Kiến trúc hoạt động

```
[Client] → [API Gateway] → [Lambda] → [DynamoDB]
                ↓
        [Request Validation] → [IAM Authorizer / Cognito / Lambda Authorizer]
                ↓
        [Rate Limiting / Throttling]
                ↓
        [Response Transform / Mapping Templates]
```

### Các tính năng cốt lõi

1. **Authentication & Authorization**
   - **IAM Authorizer**: Dùng cho internal API, service-to-service
   - **Cognito Authorizer**: Dùng cho user pool (mobile user login)
   - **Lambda Authorizer**: Custom logic xác thực (JWT, OAuth2, API Key)

2. **Throttling & Rate Limiting**
   - Giới hạn request/giây cho toàn API hoặc từng API Key, ngăn abuse
   - Có thể cấu hình burst limit và rate limit riêng

3. **Request/Response Transformation**
   - Dùng **Mapping Template** (VTL - Velocity Template Language) để transform JSON request/response
   - Ví dụ: Client gửi XML → API Gateway transform thành JSON cho Lambda xử lý

4. **Caching**
   - Cache response tại API Gateway (TTL configurable), giảm gọi Lambda/backend
   - Cache riêng theo stage (dev/staging/prod)

5. **CORS Support**
   - Enable CORS chỉ với 1 click hoặc vài dòng config

6. **Usage Plans & API Keys**
   - Tạo gói API (free, basic, premium) cho third-party developer

### So sánh ALB vs API Gateway

| Tiêu chí              | ALB                               | API Gateway                        |
|-----------------------|-----------------------------------|------------------------------------|
| Target                | EC2, ECS, Lambda                  | Lambda, DynamoDB, SQS, Step Functions, HTTP endpoint |
| Auth                  | Dùng Cognito hoặc OIDC            | IAM, Cognito, Lambda Authorizer, API Keys |
| Rate Limiting         | Không có sẵn (cần WAF)            | Có sẵn, cấu hình dễ dàng           |
| Request Validation    | Không                             | Có (JSON Schema)                   |
| Documentation         | Không                             | Tự động generate Swagger/OpenAPI   |
| Chi phí               | Theo giờ chạy + LCU                | Theo số request + data transfer    |
| Phù hợp khi           | Backend là EC2/ECS, cần WebSocket | Backend là Lambda, cần quản lý API đầy đủ |

### Mẹo thực tế
- Dùng **HTTP API** thay vì REST API nếu chỉ cần proxy đến Lambda - rẻ hơn ~70%
- **Mapping Template** chỉ cần khi làm API transformation phức tạp, còn không thì dùng Lambda proxy integration (pass-through) cho đơn giản
- **Stages** cho phép bạn có `dev`, `staging`, `prod` cùng 1 API, mỗi stage có config riêng (throttling, cache, logging)
- Kết hợp **CloudFront + API Gateway** để có edge caching toàn cầu cho API response