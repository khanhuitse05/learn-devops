# AWS Messaging & Event-Driven Services

Các dịch vụ giúp các thành phần trong hệ thống giao tiếp với nhau một cách bất đồng bộ (async), giảm coupling và tăng khả năng mở rộng: **SQS** (hàng đợi), **SNS** (pub/sub), **EventBridge** (event bus), và **Step Functions** (workflow).

---

## 1. Bảng tổng quan

| Dịch vụ        | Pattern          | Mô tả ngắn                                                       | Use case chính                                    |
|----------------|------------------|------------------------------------------------------------------|---------------------------------------------------|
| SQS            | Message Queue    | Hàng đợi tin nhắn giữa các service (point-to-point)               | Decouple microservices, buffer task, retry logic   |
| SNS            | Pub/Sub          | Gửi 1 message → nhiều subscriber (fan-out)                       | Gửi notification (email, SMS, push, Lambda)        |
| EventBridge    | Event Bus        | Router event từ nhiều source đến nhiều target dựa trên rule       | Event-driven architecture, SaaS integration        |
| Step Functions | Workflow         | Orchestrate nhiều Lambda/service thành state machine             | Saga pattern, order processing, ETL pipeline       |

---

## 2. SQS (Simple Queue Service)

### SQS là gì?
SQS là hàng đợi message được quản lý hoàn toàn. Producer gửi message vào queue, consumer lấy message ra xử lý. Nếu consumer chết, message không mất – consumer khác sẽ xử lý.

### SQS Queue Types

| Loại            | Mô tả                                                           | Thứ tự    | Đảm bảo             | Throughput            |
|-----------------|-----------------------------------------------------------------|-----------|---------------------|-----------------------|
| Standard Queue  | Gần như không giới hạn throughput, best-effort ordering         | Không     | At-least-once       | ~Không giới hạn       |
| FIFO Queue      | First-In-First-Out, đúng thứ tự tuyệt đối                       | Có        | Exactly-once        | 300 msg/s (batch 3,000) |

### SQS Key Concepts

| Khái niệm              | Giải thích                                                            |
|------------------------|-----------------------------------------------------------------------|
| Visibility Timeout     | Thời gian message "tàng hình" sau khi consumer nhận, để xử lý         |
| Message Retention      | Message tồn tại trong queue bao lâu (mặc định 4 ngày, tối đa 14 ngày)  |
| Dead Letter Queue (DLQ)| Queue chứa message bị fail quá N lần. Dùng để debug/isolation         |
| Delay Queue            | Message bị delay N giây trước khi consumer thấy được                   |
| Long Polling           | Consumer đợi message đến (thay vì poll liên tục), giảm cost            |
| Batch Send/Receive     | Gửi/nhận tối đa 10 message 1 lần, tăng throughput                     |

### SQS Visibility Timeout & Retry Flow

```
Producer → [SQS Queue]
                ↓ (Consumer nhận message, message ẩn 30s)
                ↓ (Consumer xử lý thành công → xóa message)
                ↓ (Consumer xử lý lỗi → không xóa → sau 30s message xuất hiện lại)
                ↓ (Fail >3 lần → chuyển vào DLQ)
```

### Mẹo thực tế
- Dùng **Long Polling** (WaitTimeSeconds=20) để giảm số request rỗng và tiết kiệm tiền
- Luôn cấu hình **DLQ** cho production queue để isolate message bị lỗi
- **Visibility Timeout** nên > thời gian xử lý tối đa của consumer (ví dụ: consumer mất 10s thì đặt 30s)
- FIFO queue dùng **Message Group ID** để đảm bảo thứ tự trong cùng group, song song giữa các group
- Kết hợp SQS + Lambda: Lambda tự poll SQS và auto scale theo số message

---

## 3. SNS (Simple Notification Service)

### SNS là gì?
SNS là pub/sub messaging. Bạn tạo **topic**, publisher gửi message vào topic, và tất cả subscriber đều nhận message (fan-out pattern).

### SNS Subscriber Types

| Subscriber        | Protocol       | Use case                                         |
|-------------------|----------------|--------------------------------------------------|
| Lambda            | AWS internal    | Xử lý event bằng code                             |
| SQS               | AWS internal    | Fan-out tới nhiều queue                           |
| HTTP/HTTPS        | Webhook         | Gửi event đến external service (Slack, webhook)   |
| Email             | SMTP            | Gửi email notification                            |
| SMS               | SMS             | Gửi text message đến số điện thoại                 |
| Mobile Push       | Platform push   | Push notification đến iOS (APNs), Android (FCM)   |
| Kinesis Data Firehose | AWS internal | Stream event vào S3/Redshift/OpenSearch           |

### SNS + SQS Fan-Out Pattern

```
                    ┌→ [SQS Queue A] → [Consumer A: Xử lý ảnh]
[S3 Upload Event] → [SNS Topic] ─┼→ [SQS Queue B] → [Consumer B: Xử lý thumbnail]
                    └→ [Lambda C] (index vào ElasticSearch)
```

### SNS Features

| Tính năng              | Mô tả                                                     |
|------------------------|-----------------------------------------------------------|
| Message Filtering      | Subscriber chỉ nhận message match attribute nhất định      |
| Message Attributes     | Metadata kèm message (type, priority, source...)          |
| FIFO Topic             | Đảm bảo thứ tự + deduplication cho SQS FIFO subscriber    |
| Raw Message Delivery   | Gửi nguyên bản message (không bọc JSON SNS)               |

### Mẹo thực tế
- Dùng **SNS → SQS fan-out** khi 1 event cần được xử lý bởi nhiều service khác nhau
- **Message Filtering** giúp subscriber chỉ nhận event liên quan (vd: chỉ event có `type: "order_created"`)
- Dùng **Raw Message Delivery** nếu subscriber là Lambda/SQS để tránh phải parse SNS wrapper

---

## 4. EventBridge – Event Bus thế hệ mới

### EventBridge là gì?
EventBridge là phiên bản nâng cấp của CloudWatch Events. Nó là **event bus** – router trung tâm nhận event từ nhiều nguồn và định tuyến đến nhiều đích dựa trên **rules** pattern matching.

### EventBridge vs SNS

| Tiêu chí          | SNS                                          | EventBridge                               |
|-------------------|----------------------------------------------|-------------------------------------------|
| Pattern matching  | Message attribute (đơn giản)                 | JSON rule engine (phức tạp, mạnh mẽ)       |
| Schema Registry   | Không                                        | Có (discover & validate event schema)      |
| SaaS Integration  | Không                                        | Có (Shopify, Datadog, Auth0, PagerDuty...) |
| Event Replay      | Không                                        | Có (archive + replay event cũ)             |
| Event Bus         | 1 topic = 1 bus                              | Có thể có nhiều event bus (custom)         |

### EventBridge Components

| Thành phần     | Vai trò                                                      |
|----------------|--------------------------------------------------------------|
| Event Bus      | Đường ống nhận event (default bus, custom bus, SaaS partner)  |
| Rule           | Pattern để match event và route đến target                   |
| Target         | Đích đến khi rule match (Lambda, SQS, Step Functions...)      |
| Event Archive  | Lưu event cũ để replay sau                                   |
| Schema Registry| Tự động generate schema từ event, dùng cho code generation    |

### EventBridge Rule Example

```json
{
  "source": ["aws.ec2"],
  "detail-type": ["EC2 Instance State-change Notification"],
  "detail": {
    "state": ["terminated", "stopped"]
  }
}
```

Rule này trigger khi EC2 instance bị terminated hoặc stopped, có thể → Lambda để cleanup, → SNS để gửi cảnh báo.

### Mẹo thực tế
- Dùng **EventBridge** thay SNS khi cần pattern matching phức tạp hoặc tích hợp SaaS
- Dùng **Schema Registry** để tự động generate TypeScript/Python type từ event schema
- **Event Archive + Replay** cực kỳ hữu ích khi cần debug hoặc replay event sau khi sửa bug

---

## 5. Step Functions – Serverless Workflow

### Step Functions là gì?
Step Functions là dịch vụ orchestration serverless. Bạn định nghĩa workflow (state machine) bằng JSON (ASL - Amazon States Language). Nó điều phối nhiều Lambda, ECS task, SNS, SQS... theo trình tự hoặc song song.

### Step Functions Use Cases

| Pattern              | Mô tả                                                        |
|----------------------|--------------------------------------------------------------|
| Sequential Chain      | Lambda A → Lambda B → Lambda C                               |
| Parallel Execution    | Chạy Lambda A và B song song → gộp kết quả → Lambda C       |
| Choice/Decision       | Rẽ nhánh dựa trên output (if-else)                           |
| Retry & Catch         | Retry khi lỗi, catch error và xử lý riêng                    |
| Saga Pattern          | Distributed transaction với compensation (rollback)          |
| Human Approval        | Pause workflow đợi người approve (qua SNS/SES)               |
| Map State             | Xử lý hàng loạt item song song (giống for-each)              |

### Step Functions vs SQS/Lambda

| Tiêu chí          | SQS + Lambda                          | Step Functions                          |
|-------------------|---------------------------------------|-----------------------------------------|
| Mô hình           | Async, từng message độc lập            | Workflow có state, tuần tự hoặc song song|
| State management  | Không (stateless)                     | Có (input/output truyền qua các bước)    |
| Retry logic       | Tự code trong Lambda hoặc dùng DLQ    | Built-in (Retry/Catch trong ASL)         |
| Timeout           | Lambda max 15 phút                    | Workflow có thể chạy đến 1 năm           |
| Debug             | Xem log từng Lambda                   | Visual execution history                |

### Mẹo thực tế
- **Express Workflow** cho latency thấp, **Standard Workflow** cho long-running (chạy đến 1 năm)
- Dùng **Step Functions** thay vì Lambda chain thủ công khi cần orchestration phức tạp: retry, parallel, rollback
- Step Functions có thể gọi ECS Task, Glue Job, SageMaker, không chỉ Lambda

---

## 6. Tóm tắt kết hợp các dịch vụ

### Pattern 1: Decouple Microservices
```
[Service A] → [SQS] → [Service B]
```
Service A và B độc lập, B có thể chết tạm thời mà không ảnh hưởng A.

### Pattern 2: Fan-Out Processing
```
[Upload Image] → [SNS] → [SQS: Resize] + [SQS: Watermark] + [Lambda: Index]
```
1 event trigger 3 hành động độc lập.

### Pattern 3: Event-Driven với EventBridge
```
[EC2 Terminated] → [EventBridge Rule] → [Lambda Cleanup] + [SNS Alert Ops]
```
Event từ AWS service tự động trigger hành động.

### Pattern 4: Saga Distributed Transaction
```
[Step Functions: Order Saga]
  → [Lambda: Create Order]
  → [Lambda: Reserve Inventory] (nếu lỗi → Lambda: Cancel Order)
  → [Lambda: Process Payment]   (nếu lỗi → Lambda: Release Inventory)
  → [Lambda: Ship Order]
```
Mỗi bước có compensation (rollback) riêng.

### Pattern 5: SQS + Step Functions
```
[SQS] → [Step Functions (Express)] → [Lambda A] → [Lambda B] → [Lambda C]
```
Queue để buffer, Step Functions để orchestrate phức tạp bên trong mỗi message.

---

## 7. Tóm tắt chọn dịch vụ

| Nhu cầu                                                     | Dịch vụ                       |
|-------------------------------------------------------------|-------------------------------|
| Decouple service A và B (message queue, retry, DLQ)          | **SQS**                       |
| Gửi 1 event đến nhiều service (fan-out)                     | **SNS** + SQS                 |
| Route event dựa trên pattern phức tạp, SaaS integration      | **EventBridge**               |
| Orchestrate multi-step workflow, distributed transaction     | **Step Functions**            |
| Gửi email/SMS/push notification                             | **SNS**                       |
| Cần replay event cũ để debug                                 | **EventBridge (Archive+Replay)** |
| Cần đảm bảo thứ tự message tuyệt đối                         | **SQS FIFO**                  |