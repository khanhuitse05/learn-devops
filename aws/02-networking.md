# AWS Networking & Traffic Management

AWS networking services help you control how traffic enters, exits, and moves within your system. The main services: **VPC**, **ALB/NLB**, **API Gateway**.

---

## 1. VPC (Virtual Private Cloud) - Virtual Private Network Foundation

### What is VPC?
VPC is your own isolated virtual network within AWS. You define the IP range (CIDR), divide into subnets, configure route tables, and control inbound/outbound traffic using Security Groups and NACLs.

### Key VPC Components

| Component            | Role                                                                  |
|----------------------|-----------------------------------------------------------------------|
| CIDR Block           | (Classless Inter-Domain Routing) IP range of the VPC, e.g.: `10.0.0.0/16` (65,536 IPs) |
| Subnet               | Divides VPC into smaller networks. Each subnet resides in 1 Availability Zone |
| Public Subnet        | Subnet with a route to Internet Gateway → resources can access the internet |
| Private Subnet       | Subnet with no direct route to the internet → secure for databases, backend |
| Internet Gateway (IGW)| Gateway connecting VPC to the public internet                         |
| NAT Gateway          | Allows resources in private subnets to access the internet (outbound only) without being reachable from the internet |
| Route Table          | Routing table: decides where traffic from a subnet goes               |
| Security Group (SG)  | Instance-level firewall: stateful, only allows defining allow rules   |
| Network ACL (NACL)   | Subnet-level firewall: stateless, defines both allow and deny rules   |
| VPC Endpoint         | Private connection from VPC to AWS services (S3, DynamoDB...) without going through the internet |

### Typical VPC Architecture (3-tier)

```
[Internet] ↔ [IGW] ↔ Public Subnet (ALB, Bastion Host)
                        ↓
                  Private Subnet App (ECS, EC2)
                        ↓
                  Private Subnet Data (RDS, ElastiCache)
```

### Practical Tips
- **Never put a database in a public subnet** - this is a serious security mistake
- Use **NAT Gateway** (not NAT Instance) for production as it's AWS-managed and auto-scales
- **VPC Endpoint** for accessing S3/DynamoDB from private subnets without NAT Gateway fees, significantly reducing costs
- **VPC Peering** and **Transit Gateway**: used to connect multiple VPCs together. Transit Gateway is hub-and-spoke, better than VPC Peering mesh when you have >3 VPCs

---

## 2. Elastic Load Balancer (ELB) - Load Balancing

AWS provides 3 types of Load Balancers. Understand the differences clearly to choose the right one:

### Comparison Table of 3 Load Balancer Types

| Criteria              | ALB (Application LB)                | NLB (Network LB)                    | GWLB (Gateway LB)                  |
|-----------------------|-------------------------------------|--------------------------------------|-------------------------------------|
| OSI Layer             | Layer 7 (HTTP/HTTPS)                | Layer 4 (TCP/UDP/TLS)                | Layer 3 (IP)                       |
| Routing by            | Path, Host header, Query string, Header | IP, Port, Protocol                  | Flow (for firewall appliances)      |
| WebSocket             | Good support                        | Supported (TCP mode)                 | No                                 |
| Static IP             | No (use Global Accelerator)         | Yes (Elastic IP per AZ)              | Yes                                |
| Latency               | ~1-3ms                              | <0.1ms (ultra-low)                   | Very low                           |
| SSL Termination       | Yes (integrated with ACM)           | Yes (TLS)                            | No                                 |
| Primary use case      | Web app, API, Microservices         | Game server, TCP/UDP streaming, IoT  | Running virtualized firewall/IDS/IPS |

### ALB (Application Load Balancer) - The Primary Service You'll Use

ALB is the most popular load balancer for web developers. It understands HTTP/HTTPS.

**Features to know:**

1. **Listener Rules**: Route requests based on:
   - Path: `/api/*` → target group A, `/images/*` → target group B
   - Host header: `api.example.com` → target group API, `admin.example.com` → target group Admin
   - Query string, HTTP header, source IP

2. **Target Group**: Group of backends receiving traffic. Can be:
   - EC2 Instances
   - ECS Tasks (Fargate or EC2)
   - Lambda Functions
   - IP Addresses (on-premise servers via VPN/Direct Connect)

3. **Health Checks**: ALB continuously checks the health of each target; if down, stops sending traffic

4. **Sticky Sessions**: User is always sent to the same backend (using cookies) - needed for apps with local sessions

5. **Redirect & Fixed Response**: Redirect HTTP→HTTPS, or return a fixed response (e.g.: 503 maintenance page) directly at ALB, no app code needed

6. **WAF Integration**: Attach AWS WAF to ALB to block SQL injection, XSS, rate limiting

### NLB (Network Load Balancer) - When You Need Extreme Performance

- Handles millions of requests/second with ultra-low latency
- Can assign a fixed **Elastic IP** per AZ - very important when partners require IP whitelisting
- Used for TCP/UDP services, doesn't need to understand HTTP

### Practical Tips
- Always place ALB in **public subnets** and backend (ECS/EC2) in **private subnets**
- Use **ACM (AWS Certificate Manager)** to create free SSL/TLS certificates, integrated directly with ALB
- Enable **access logs** for ALB to debug requests and analyze traffic
- **Deletion protection**: Turn it on so no one accidentally deletes production ALB

---

## 3. API Gateway - Serverless API Gateway

### What is API Gateway?
API Gateway is a managed service that lets you create, publish, and manage REST APIs or WebSocket APIs at scale. It differs from ALB in that:
- **Fully serverless**: No instance configuration needed, auto-scales to zero
- **Deep AWS integration**: Can directly call Lambda, DynamoDB, Step Functions, SQS... without intermediary backend code
- **Many API management features**: Authentication, rate limiting, request validation, documentation

### Types of API Gateway

| Type               | Protocol                | Use case                                    |
|--------------------|-------------------------|---------------------------------------------|
| REST API           | HTTP/HTTPS              | Web app, mobile backend, BFF (Backend for Frontend) |
| HTTP API           | HTTP/HTTPS (lighter)    | Proxy for Lambda, simple microservices, ~70% cheaper than REST API |
| WebSocket API      | WebSocket               | Chat app, real-time dashboard, games        |

### Operational Architecture

```
[Client] → [API Gateway] → [Lambda] → [DynamoDB]
                ↓
        [Request Validation] → [IAM Authorizer / Cognito / Lambda Authorizer]
                ↓
        [Rate Limiting / Throttling]
                ↓
        [Response Transform / Mapping Templates]
```

### Core Features

1. **Authentication & Authorization**
   - **IAM Authorizer**: For internal APIs, service-to-service
   - **Cognito Authorizer**: For user pools (mobile user login)
   - **Lambda Authorizer**: Custom authentication logic (JWT, OAuth2, API Key)

2. **Throttling & Rate Limiting**
   - Limit requests/second for the entire API or per API Key, preventing abuse
   - Can configure burst limit and rate limit separately

3. **Request/Response Transformation**
   - Use **Mapping Templates** (VTL - Velocity Template Language) to transform JSON request/response
   - Example: Client sends XML → API Gateway transforms to JSON for Lambda processing

4. **Caching**
   - Cache responses at API Gateway (configurable TTL), reducing Lambda/backend calls
   - Cache per stage (dev/staging/prod)

5. **CORS Support**
   - Enable CORS with just 1 click or a few lines of config

6. **Usage Plans & API Keys**
   - Create API packages (free, basic, premium) for third-party developers

### ALB vs API Gateway Comparison

| Criteria              | ALB                               | API Gateway                        |
|-----------------------|-----------------------------------|------------------------------------|
| Target                | EC2, ECS, Lambda                  | Lambda, DynamoDB, SQS, Step Functions, HTTP endpoint |
| Auth                  | Use Cognito or OIDC               | IAM, Cognito, Lambda Authorizer, API Keys |
| Rate Limiting         | Not built-in (needs WAF)          | Built-in, easy to configure        |
| Request Validation    | No                                | Yes (JSON Schema)                  |
| Documentation         | No                                | Auto-generate Swagger/OpenAPI      |
| Cost                  | Per running hour + LCU            | Per request + data transfer        |
| Suitable when         | Backend is EC2/ECS, need WebSocket | Backend is Lambda, need full API management |

### Practical Tips
- Use **HTTP API** instead of REST API if you only need to proxy to Lambda - ~70% cheaper
- **Mapping Templates** only needed for complex API transformation; otherwise use Lambda proxy integration (pass-through) for simplicity
- **Stages** let you have `dev`, `staging`, `prod` on the same API, each stage with separate config (throttling, cache, logging)
- Combine **CloudFront + API Gateway** for global edge caching of API responses