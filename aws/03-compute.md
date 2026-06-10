# AWS Compute Services

Six main AWS compute services, divided into **4 architectural groups**: Virtual Machines (IaaS), Container Orchestration, Serverless Container, and Serverless Function (FaaS).

---

## 1. Overview Comparison Table

| Service  | Nature                             | Management Level (AWS handles) | Pricing Model                                                | Typical Use Case                                              |
|----------|------------------------------------|-------------------------------|--------------------------------------------------------------|---------------------------------------------------------------|
| Lightsail| Simplified VPS                     | Low (simple interface)        | Fixed monthly price (all-inclusive)                          | Small websites, WordPress blog, quick Dev/Test environments    |
| EC2      | Deeply configurable virtual server | Low (you manage OS/Network)   | Per second/hour + separate EBS, bandwidth fees               | Traditional apps, need full OS/Kernel configuration            |
| ECS      | Container Orchestration (by AWS)   | Medium (AWS manages master)   | Free management, only pay for underlying infrastructure       | Run Docker containers in pure AWS ecosystem                   |
| EKS      | Managed Kubernetes (K8s)           | Medium (AWS manages Control Plane) | Fixed fee $0.10/hour/cluster + underlying infrastructure | Large microservices, need K8s standard, multi-cloud           |
| Fargate  | Serverless for Containers          | High (AWS manages OS + Server) | Per vCPU + RAM consumed per second of runtime                | Run Docker (ECS/EKS) without wanting to manage servers         |
| Lambda   | Serverless Function (FaaS)         | Highest (only worry about Code) | Per request + execution duration (GB-seconds)               | Event-driven, short APIs, cron jobs, image/file processing    |

---

## 2. Detailed Breakdown by Service Group

### Group 1: Virtual Machines

**Lightsail** – "Instant EC2". Pick a fixed configuration package (e.g.: $5/month includes RAM, CPU, SSD, bandwidth). Simple interface, easy to use, but **limited** in advanced customization and auto-scaling capabilities. Not recommended for large production.

**EC2 (Elastic Compute Cloud)** – AWS's core platform. You have full configuration control from Network (VPC), Security Groups, Storage (EBS), to OS. Suitable for large systems needing deep configuration, but you must handle security, OS patching, and Auto Scaling configuration yourself.

**EC2 Instance Types to Know (by purpose):**

| Family | Purpose                          | Example instance    |
|--------|-----------------------------------|-------------------|
| T      | Burstable (general purpose, cheap)| t3.medium, t4g    |
| M      | General purpose (balanced)        | m7i.medium        |
| C      | Compute optimized (CPU-heavy)     | c7i.large         |
| R      | Memory optimized (large RAM)      | r7i.large         |
| G/P    | GPU (ML training, rendering)      | g5.xlarge         |

**EC2 Pricing Models:**

| Model           | Description                                                       | Savings vs On-Demand |
|------------------|------------------------------------------------------------------|------------------------|
| On-Demand        | Pay per second, no commitment                                     | 0% (baseline)        |
| Reserved (RI)    | Commit 1 or 3 years, upfront or partial payment                  | Up to 72%            |
| Spot Instance    | Use AWS's spare capacity, very cheap but can be reclaimed anytime | Up to 90%            |
| Savings Plan     | Commit $X/hour spend for 1-3 years, more flexible than RI        | Up to 72%            |
| Dedicated Host   | Dedicated physical server (compliance, legacy licenses)          | Most expensive        |

---

### Group 2: Container Orchestration

If you package your app with Docker, you need a "brain" to decide which container runs where and how to scale. AWS has 2 options:

**ECS (Elastic Container Service)** – Orchestration developed by AWS itself. Deep integration with IAM, ALB, CloudWatch. No management fee. Faster to learn than K8s.

**EKS (Elastic Kubernetes Service)** – Standard managed Kubernetes. If your team is already familiar with K8s or wants to avoid vendor lock-in (can run on GCP, Azure), choose EKS. Management fee $0.10/hour/cluster.

> ⚠️ **Important:** ECS and EKS are only the orchestration "brain" – they need underlying infrastructure (compute) to run containers. You have 2 choices: run on **EC2** (manage servers yourself) or run on **Fargate** (serverless).

---

### Group 3: Serverless Container

**Fargate** – Not a standalone service, but a **compute engine** used with ECS or EKS. Instead of creating EC2 clusters to run Docker, you just need to:
1. Push Docker image to ECR
2. Declare: "I need 1 vCPU + 2GB RAM"
3. Fargate automatically runs that container

**No need** to patch OS, no server management, no capacity planning worries.

**Suitable for**: Web servers, long-running APIs, WebSocket, background jobs.

---

### Group 4: Serverless Function (FaaS)

**Lambda** – The pinnacle of serverless. You only need to write code (Node.js, Python, Go, Java, .NET...) and upload. Code only runs when triggered by an event. If there are no requests, you pay **$0**.

**Lambda Limitations:**
- Maximum runtime: **15 minutes/request** (configurable up to 15 minutes)
- Maximum memory: 10GB RAM
- Temporary disk (/tmp): maximum 10GB
- **Cold Start**: The first request after a period of inactivity will be delayed (a few hundred ms to a few seconds) as AWS needs to start the execution environment

**Best suited for**: Event-driven, short APIs, cron jobs, file processing.

---

## 4. Auto Scaling – Automatic Scaling

### EC2 Auto Scaling
- **Scale-out**: Add EC2 instances when CPU/RAM/Network is high
- **Scale-in**: Remove instances when load decreases
- **Launch Template**: Define AMI, instance type, user data script
- **Scaling Policy**: Target tracking (keep CPU ~50%), Step scaling, Scheduled scaling

### ECS Service Auto Scaling
- Increase/decrease number of tasks (containers) based on CloudWatch metrics
- Can scale by: CPU, RAM, ALB Request Count Per Target
- Combine with **Capacity Provider** to automatically add EC2 instances when needed (if using EC2 launch type)

### Lambda Auto Scaling
- **Fully automatic** – you don't need to configure anything
- Lambda will auto-scale from 0 to thousands of concurrent executions in seconds
- Default limit: **1000 concurrent executions/region** (can request quota increase)

---

## 5. Cost Perspective

| Service   | Idle cost        | Small Production (100 req/s) | Large Production (10,000 req/s) |
|-----------|------------------|------------------------------|---------------------------------|
| Lightsail | Fixed ~$5-20/month | Cheap but can't scale       | Not suitable                    |
| EC2       | Yes (server runs 24/7) | ~$50-200/month (t3.medium) | ~$500-2000/month (need RI)      |
| ECS+EC2   | Yes (EC2 runs 24/7)  | Similar to EC2 + little overhead | More optimized than pure EC2 |
| ECS+Fargate | No (pay-per-use) | ~$30-100/month              | ~$400-1500/month               |
| EKS       | Yes (~$72/month cluster + compute) | ~$150-400/month         | ~$1000-5000/month              |
| Lambda    | $0                  | ~$5-30/month                | Can be more expensive than containers at large scale |

> **Tip:** Lambda is cheapest at small scale and non-continuous usage. At large scale + 24/7 runtime, ECS+Fargate is usually cheaper than Lambda.

---

## 6. Decision Guide: Which Service to Choose?

```
Start ──→ Small, simple app, no scaling needed?
│               └→ YES → Lightsail
│
├── Need 24/7 runtime, full OS/network control?
│               └→ YES → EC2 (+ Auto Scaling Group)
│
├── Already using Docker, want minimal management?
│               └→ YES → ECS + Fargate (most recommended)
│
├── Team uses Kubernetes, need multi-cloud?
│               └→ YES → EKS + Fargate (or EC2)
│
├── Event-driven (triggered), no need for continuous runtime?
│               └→ YES → Lambda
│
├── Continuous runtime but don't want to manage servers + Docker?
│               └→ YES → ECS + Fargate
│
└── WebSocket real-time, long-running connections?
                └→ YES → ECS/EKS + Fargate (Lambda not suitable for persistent WebSocket)
```

---

## 7. Summary: Choosing by Real-World Use Case

| Use Case                                                                  | Recommended Service                        |
|---------------------------------------------------------------------------|--------------------------------------------|
| Quick portfolio website, blog, demo app for clients                       | **Lightsail**                              |
| Legacy monolithic app (PHP, .NET Framework), need custom tools on OS      | **EC2**                                    |
| App already containerized with Docker, running stable microservices, no server maintenance | **ECS + Fargate**                          |
| Very large microservices system, standard global Kubernetes architecture  | **EKS + Fargate** (or EKS + EC2)           |
| Email feature on user signup, image resize on upload, Telegram Bot        | **Lambda**                                 |
| REST API backend for mobile app, using Node.js/Python                     | **ECS + Fargate** (needs continuous runtime) or **Lambda** (if low requests) |
| Long-running background job (>15 minutes)                                 | **ECS + Fargate** (Lambda limited to 15 min) |
| WebSocket real-time app (chat, games)                                     | **ECS/EKS + Fargate**                      |