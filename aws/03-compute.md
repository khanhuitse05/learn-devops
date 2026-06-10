# AWS Compute Services

Sáu dịch vụ compute chính của AWS, chia thành **4 nhóm kiến trúc**: Máy chủ ảo (IaaS), Container Orchestration, Serverless Container, và Serverless Function (FaaS).

---

## 1. Bảng so sánh tổng quan

| Dịch vụ   | Bản chất                          | Mức quản lý (AWS lo)         | Mô hình tính phí                                               | Use case điển hình                                              |
|-----------|-----------------------------------|-------------------------------|----------------------------------------------------------------|-----------------------------------------------------------------|
| Lightsail | VPS đơn giản hóa                   | Thấp (giao diện đơn giản)     | Giá cố định hàng tháng (trọn gói)                               | Web nhỏ, WordPress blog, môi trường Dev/Test nhanh               |
| EC2       | Máy chủ ảo cấu hình sâu            | Thấp (bạn tự quản OS/Network)  | Theo giây/giờ + phí EBS, bandwidth riêng                        | Ứng dụng truyền thống, cần toàn quyền cấu hình OS/Kernel         |
| ECS       | Container Orchestration (của AWS)  | Trung bình (AWS quản lý master) | Miễn phí quản lý, chỉ trả tiền hạ tầng bên dưới                 | Chạy Docker container trong hệ sinh thái thuần AWS                |
| EKS       | Managed Kubernetes (K8s)           | Trung bình (AWS quản lý Control Plane) | Phí cố định $0.10/giờ/cluster + hạ tầng bên dưới               | Hệ Microservices lớn, cần chuẩn K8s, multi-cloud                 |
| Fargate   | Serverless cho Container           | Cao (AWS quản cả OS + Server)   | Theo vCPU + RAM tiêu thụ mỗi giây chạy                           | Chạy Docker (ECS/EKS) không muốn quản lý máy chủ                  |
| Lambda    | Serverless Function (FaaS)         | Cao nhất (chỉ quan tâm Code)    | Theo số request + thời gian chạy (GB-giây)                       | Event-driven, API ngắn hạn, cron job, xử lý ảnh/file             |

---

## 2. Chi tiết từng nhóm dịch vụ

### Nhóm 1: Máy chủ ảo (Virtual Machines)

**Lightsail** – "EC2 mì ăn liền". Chọn gói cấu hình cố định (vd: $5/tháng có sẵn RAM, CPU, SSD, bandwidth). Giao diện đơn giản, dễ dùng, nhưng **bị giới hạn** về khả năng tùy biến nâng cao và auto-scaling. Không nên dùng cho production lớn.

**EC2 (Elastic Compute Cloud)** – Nền tảng core của AWS. Bạn có toàn quyền cấu hình từ Network (VPC), Security Group, Storage (EBS), đến OS. Phù hợp cho hệ thống lớn cần cấu hình sâu, nhưng bạn phải tự lo bảo mật, patch OS, và cấu hình Auto Scaling.

**EC2 Instance Types cần biết (theo mục đích):**

| Family | Mục đích                          | Ví dụ instance    |
|--------|-----------------------------------|-------------------|
| T      | Burstable (general purpose, rẻ)   | t3.medium, t4g    |
| M      | General purpose (cân bằng)        | m7i.medium        |
| C      | Compute optimized (CPU nặng)      | c7i.large         |
| R      | Memory optimized (RAM lớn)        | r7i.large         |
| G/P    | GPU (ML training, rendering)      | g5.xlarge         |

**EC2 Pricing Models:**

| Model           | Mô tả                                                        | Tiết kiệm so với On-Demand |
|------------------|--------------------------------------------------------------|----------------------------|
| On-Demand        | Trả theo giây, không cam kết                                  | 0% (baseline)              |
| Reserved (RI)    | Cam kết 1 hoặc 3 năm, trả trước hoặc từng phần               | Lên đến 72%                |
| Spot Instance    | Dùng capacity dư của AWS, giá rẻ nhưng có thể bị thu hồi bất kỳ lúc nào | Lên đến 90%        |
| Savings Plan     | Cam kết spend $X/giờ trong 1-3 năm, linh hoạt hơn RI         | Lên đến 72%                |
| Dedicated Host   | Máy chủ vật lý riêng (compliance, license cũ)                 | Đắt nhất                   |

---

### Nhóm 2: Container Orchestration (Điều phối container)

Nếu bạn đóng gói app bằng Docker, cần một "bộ não" để quyết định container nào chạy ở đâu, scale ra sao. AWS có 2 lựa chọn:

**ECS (Elastic Container Service)** – Orchestration do chính AWS phát triển. Tích hợp sâu với IAM, ALB, CloudWatch. Không tốn phí quản lý. Học nhanh hơn K8s.

**EKS (Elastic Kubernetes Service)** – Managed Kubernetes chuẩn. Nếu team đã quen K8s hoặc muốn tránh vendor lock-in (chạy được trên GCP, Azure), chọn EKS. Phí quản lý $0.10/giờ/cluster.

> ⚠️ **Quan trọng:** ECS và EKS chỉ là "bộ não" điều phối – chúng cần hạ tầng (compute) bên dưới để chạy container. Bạn có 2 lựa chọn: chạy trên **EC2** (tự quản lý máy) hoặc chạy trên **Fargate** (serverless).

---

### Nhóm 3: Serverless Container

**Fargate** – Không phải dịch vụ độc lập, mà là **compute engine** dùng chung với ECS hoặc EKS. Thay vì tạo cụm EC2 để chạy Docker, bạn chỉ cần:
1. Đẩy Docker image lên ECR
2. Khai báo: "Tôi cần 1 vCPU + 2GB RAM"
3. Fargate tự chạy container đó

**Không cần** patch OS, không cần quản lý server, không cần lo capacity planning.

---

### Nhóm 4: Serverless Function (FaaS)

**Lambda** – Đỉnh cao của serverless. Bạn chỉ cần viết code (Node.js, Python, Go, Java, .NET...) và upload. Code chỉ chạy khi có event trigger. Nếu không có request, bạn tốn **0 đồng**.

**Giới hạn của Lambda:**
- Thời gian chạy tối đa: **15 phút/request** (có thể cấu hình tối đa 15 phút)
- Bộ nhớ tối đa: 10GB RAM
- Ổ đĩa tạm (/tmp): tối đa 10GB
- **Cold Start**: Request đầu tiên sau một thời gian không dùng sẽ bị delay (vài trăm ms đến vài giây) do AWS cần khởi động môi trường thực thi

**Cold Start là gì và cách giảm thiểu?**

Khi Lambda function không được gọi trong ~5-15 phút, AWS "đóng băng" môi trường. Request tiếp theo sẽ mất thêm thời gian để khởi tạo lại. So sánh mức độ ảnh hưởng:

| Runtime     | Cold Start điển hình | Giải pháp giảm thiểu                           |
|-------------|----------------------|------------------------------------------------|
| Node.js     | ~200-500ms           | Nhẹ nhất, dùng Provisioned Concurrency nếu cần  |
| Python      | ~300-600ms           | Tối ưu import, giảm dependencies                |
| Go          | ~100-300ms           | Compile ra binary nhẹ                           |
| Java        | ~1-5 giây            | Dùng GraalVM native image, SnapStart            |
| .NET        | ~1-4 giây            | Dùng .NET 8 native AOT                          |

**Cách giảm Cold Start:**
- **Provisioned Concurrency**: Giữ sẵn N instance "ấm" luôn sẵn sàng (tốn thêm phí)
- **Lambda SnapStart (Java)**: Chụp snapshot môi trường đã init, khởi động nhanh hơn
- **Giảm package size**: Dùng layer, tree-shaking, tránh import thư viện không cần
- **Dùng Lambda container image nhỏ**: Dùng AWS base image tối ưu thay vì image nặng

---

## 3. So sánh Lambda vs Fargate – Khi nào dùng cái nào?

| Tiêu chí               | Lambda                                   | Fargate                                      |
|-------------------------|------------------------------------------|----------------------------------------------|
| Đơn vị                  | Function (code)                          | Container (Docker image)                     |
| Thời gian chạy tối đa   | 15 phút                                  | Không giới hạn (long-running)                |
| RAM tối đa              | 10 GB                                    | 120 GB                                       |
| CPU tối đa              | Tỉ lệ với RAM (tối đa 6 vCPU)            | 16 vCPU                                      |
| Cold Start              | Có (có thể giảm)                          | Có nhưng nhẹ hơn (~30-60s để provision)       |
| Chi phí khi idle        | $0                                       | $0 (nhưng phải đợi spin-up lại)              |
| Stateful                | Không (stateless)                        | Không (container tự hủy sau khi dừng)         |
| Phù hợp nhất            | Event-driven, API ngắn, cron, xử lý file | Web server, API dài, WebSocket, background job |

---

## 4. Auto Scaling – Tự động co giãn

### EC2 Auto Scaling
- **Scale-out**: Thêm EC2 instance khi CPU/RAM/Network cao
- **Scale-in**: Xóa bớt instance khi tải giảm
- **Launch Template**: Định nghĩa AMI, instance type, user data script
- **Scaling Policy**: Target tracking (giữ CPU ~50%), Step scaling, Scheduled scaling

### ECS Service Auto Scaling
- Tăng/giảm số lượng task (container) dựa trên CloudWatch metrics
- Có thể scale theo: CPU, RAM, ALB Request Count Per Target
- Kết hợp với **Capacity Provider** để tự động thêm EC2 instance khi cần (nếu dùng EC2 launch type)

### Lambda Auto Scaling
- **Tự động hoàn toàn** – bạn không cần cấu hình gì
- Lambda sẽ tự scale từ 0 lên hàng ngàn concurrent execution trong vài giây
- Giới hạn mặc định: **1000 concurrent execution/region** (có thể request nâng quota)

---

## 5. Góc nhìn chi phí

| Dịch vụ   | Idle cost        | Production nhỏ (100 req/s) | Production lớn (10,000 req/s) |
|-----------|------------------|----------------------------|-------------------------------|
| Lightsail | Cố định ~$5-20/tháng | Rẻ nhưng không scale được | Không phù hợp                  |
| EC2       | Có (server chạy 24/7) | ~$50-200/tháng (t3.medium) | ~$500-2000/tháng (cần RI)      |
| ECS+EC2   | Có (EC2 chạy 24/7)  | Giống EC2 + ít overhead   | Tối ưu hơn EC2 thuần           |
| ECS+Fargate | Không (pay-per-use) | ~$30-100/tháng            | ~$400-1500/tháng               |
| EKS       | Có (~$72/tháng cluster + compute) | ~$150-400/tháng           | ~$1000-5000/tháng              |
| Lambda    | $0                   | ~$5-30/tháng              | Có thể đắt hơn container ở scale lớn |

> **Mẹo:** Lambda rẻ nhất ở scale nhỏ và không liên tục. Ở scale lớn + chạy 24/7, ECS+Fargate thường rẻ hơn Lambda.

---

## 6. Quyết định chọn dịch vụ nào?

```
Bắt đầu ──→ App nhỏ, đơn giản, không cần scale?
│               └→ YES → Lightsail
│
├── Cần chạy 24/7, full control OS/network?
│               └→ YES → EC2 (+ Auto Scaling Group)
│
├── Đã đóng gói Docker, muốn ít quản lý?
│               └→ YES → ECS + Fargate (khuyên dùng nhất)
│
├── Team dùng Kubernetes, cần multi-cloud?
│               └→ YES → EKS + Fargate (hoặc EC2)
│
├── Chạy theo event (trigger), không cần chạy liên tục?
│               └→ YES → Lambda
│
├── Chạy liên tục nhưng không muốn quản lý server + Docker?
│               └→ YES → ECS + Fargate
│
└── WebSocket real-time, long-running connection?
                └→ YES → ECS/EKS + Fargate (Lambda không phù hợp WebSocket lâu dài)
```

---

## 7. Tóm tắt lựa chọn theo bài toán thực tế

| Bài toán                                                                 | Dịch vụ khuyên dùng                        |
|--------------------------------------------------------------------------|--------------------------------------------|
| Dựng nhanh web portfolio, blog, app demo cho khách                        | **Lightsail**                              |
| Ứng dụng monolithic cũ (PHP, .NET Framework), cần cài tool riêng vào OS  | **EC2**                                    |
| Đã đóng gói app bằng Docker, chạy microservices ổn định, không muốn bảo trì server | **ECS + Fargate**                          |
| Hệ thống microservices rất lớn, kiến trúc Kubernetes chuẩn toàn cầu       | **EKS + Fargate** (hoặc EKS + EC2)         |
| Tính năng gửi email khi user đăng ký, resize ảnh upload, Telegram Bot    | **Lambda**                                 |
| REST API backend cho mobile app, dùng Node.js/Python                      | **ECS + Fargate** (cần chạy liên tục) hoặc **Lambda** (nếu ít request) |
| Long-running background job (>15 phút)                                    | **ECS + Fargate** (Lambda bị giới hạn 15 phút) |
| WebSocket real-time app (chat, game)                                      | **ECS/EKS + Fargate**                      |