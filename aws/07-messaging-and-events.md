# AWS Messaging & Event-Driven Services

Services that enable system components to communicate asynchronously (async), reducing coupling and increasing scalability: **SQS** (queue), **SNS** (pub/sub), **EventBridge** (event bus), and **Step Functions** (workflow).

---

## 1. Overview Table

| Service        | Pattern          | Brief Description                                                  | Primary Use Case                                  |
|----------------|------------------|-------------------------------------------------------------------|---------------------------------------------------|
| SQS            | Message Queue    | Message queue between services (point-to-point)                    | Decouple microservices, buffer tasks, retry logic  |
| SNS            | Pub/Sub          | Send 1 message → many subscribers (fan-out)                        | Send notifications (email, SMS, push, Lambda)      |
| EventBridge    | Event Bus        | Route events from multiple sources to multiple targets based on rules | Event-driven architecture, SaaS integration     |
| Step Functions | Workflow         | Orchestrate multiple Lambdas/services into a state machine          | Saga pattern, order processing, ETL pipeline       |

---

## 2. SQS (Simple Queue Service)

### What is SQS?
SQS is a fully managed message queue. Producer sends messages to the queue, consumer picks them up for processing. If the consumer dies, messages are not lost – another consumer will process them.

### SQS Queue Types

| Type            | Description                                                    | Ordering | Guarantee           | Throughput            |
|-----------------|----------------------------------------------------------------|----------|---------------------|-----------------------|
| Standard Queue  | Nearly unlimited throughput, best-effort ordering              | No       | At-least-once       | ~Unlimited            |
| FIFO Queue      | First-In-First-Out, strict ordering                            | Yes      | Exactly-once        | 300 msg/s (batch 3,000) |

### SQS Key Concepts

| Concept                | Explanation                                                          |
|------------------------|----------------------------------------------------------------------|
| Visibility Timeout     | Time a message is "invisible" after a consumer receives it, for processing |
| Message Retention      | How long messages stay in the queue (default 4 days, max 14 days)    |
| Dead Letter Queue (DLQ)| Queue holding messages that failed >N times. Used for debug/isolation |
| Delay Queue            | Messages delayed N seconds before consumers can see them              |
| Long Polling           | Consumer waits for messages to arrive (instead of constant polling), reduces cost |
| Batch Send/Receive     | Send/receive up to 10 messages at once, increasing throughput         |

### SQS Visibility Timeout & Retry Flow

```
Producer → [SQS Queue]
                ↓ (Consumer receives message, message hidden for 30s)
                ↓ (Consumer processes successfully → deletes message)
                ↓ (Consumer errors → does not delete → after 30s message reappears)
                ↓ (Fails >3 times → moved to DLQ)
```

### Practical Tips
- Use **Long Polling** (WaitTimeSeconds=20) to reduce empty requests and save money
- Always configure **DLQ** for production queues to isolate failed messages
- **Visibility Timeout** should be > the consumer's maximum processing time (e.g.: if consumer takes 10s, set 30s)
- FIFO queues use **Message Group ID** to ensure ordering within the same group, parallel across groups
- Combine SQS + Lambda: Lambda auto-polls SQS and auto-scales based on message count

---

## 3. SNS (Simple Notification Service)

### What is SNS?
SNS is pub/sub messaging. You create a **topic**, publishers send messages to the topic, and all subscribers receive the message (fan-out pattern).

### SNS Subscriber Types

| Subscriber        | Protocol       | Use case                                         |
|-------------------|----------------|--------------------------------------------------|
| Lambda            | AWS internal   | Process events with code                          |
| SQS               | AWS internal   | Fan-out to multiple queues                        |
| HTTP/HTTPS        | Webhook        | Send events to external services (Slack, webhook) |
| Email             | SMTP           | Send email notifications                          |
| SMS               | SMS            | Send text messages to phone numbers               |
| Mobile Push       | Platform push  | Push notifications to iOS (APNs), Android (FCM)   |
| Kinesis Data Firehose | AWS internal | Stream events to S3/Redshift/OpenSearch          |

### SNS + SQS Fan-Out Pattern

```
                    ┌→ [SQS Queue A] → [Consumer A: Process images]
[S3 Upload Event] → [SNS Topic] ─┼→ [SQS Queue B] → [Consumer B: Generate thumbnails]
                    └→ [Lambda C] (index to ElasticSearch)
```

### SNS Features

| Feature                | Description                                                     |
|------------------------|-----------------------------------------------------------------|
| Message Filtering      | Subscribers only receive messages matching specific attributes  |
| Message Attributes     | Metadata attached to messages (type, priority, source...)       |
| FIFO Topic             | Ensures ordering + deduplication for SQS FIFO subscribers       |
| Raw Message Delivery   | Sends raw message (no SNS JSON wrapper)                         |

### Practical Tips
- Use **SNS → SQS fan-out** when 1 event needs to be processed by multiple services
- **Message Filtering** ensures subscribers only receive relevant events (e.g.: only events with `type: "order_created"`)
- Use **Raw Message Delivery** if the subscriber is Lambda/SQS to avoid parsing the SNS wrapper

---

## 4. EventBridge – Next-Gen Event Bus

### What is EventBridge?
EventBridge is an upgraded version of CloudWatch Events. It is an **event bus** – a central router that receives events from multiple sources and routes them to multiple targets based on **rule** pattern matching.

### EventBridge vs SNS

| Criteria          | SNS                                          | EventBridge                               |
|-------------------|----------------------------------------------|-------------------------------------------|
| Pattern matching  | Message attributes (simple)                  | JSON rule engine (complex, powerful)       |
| Schema Registry   | No                                           | Yes (discover & validate event schema)     |
| SaaS Integration  | No                                           | Yes (Shopify, Datadog, Auth0, PagerDuty...)|
| Event Replay      | No                                           | Yes (archive + replay past events)         |
| Event Bus         | 1 topic = 1 bus                              | Can have multiple event buses (custom)     |

### EventBridge Components

| Component      | Role                                                         |
|----------------|--------------------------------------------------------------|
| Event Bus      | Pipeline receiving events (default bus, custom bus, SaaS partner) |
| Rule           | Pattern to match events and route to targets                 |
| Target         | Destination when rule matches (Lambda, SQS, Step Functions...)|
| Event Archive  | Store past events for later replay                           |
| Schema Registry| Auto-generate schema from events, used for code generation    |

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

This rule triggers when an EC2 instance is terminated or stopped, can → Lambda for cleanup, → SNS for alerting.

### Practical Tips
- Use **EventBridge** instead of SNS when you need complex pattern matching or SaaS integration
- Use **Schema Registry** to auto-generate TypeScript/Python types from event schemas
- **Event Archive + Replay** is extremely useful when debugging or replaying events after fixing a bug

---

## 5. Step Functions – Serverless Workflow

### What is Step Functions?
Step Functions is a serverless orchestration service. You define a workflow (state machine) using JSON (ASL - Amazon States Language). It orchestrates multiple Lambdas, ECS tasks, SNS, SQS... sequentially or in parallel.

### Step Functions Use Cases

| Pattern              | Description                                                        |
|----------------------|--------------------------------------------------------------------|
| Sequential Chain      | Lambda A → Lambda B → Lambda C                                    |
| Parallel Execution    | Run Lambda A and B in parallel → merge results → Lambda C          |
| Choice/Decision       | Branch based on output (if-else)                                   |
| Retry & Catch         | Retry on error, catch errors and handle separately                 |
| Saga Pattern          | Distributed transaction with compensation (rollback)               |
| Human Approval        | Pause workflow awaiting human approval (via SNS/SES)               |
| Map State             | Process batches of items in parallel (like for-each)               |

### Step Functions vs SQS/Lambda

| Criteria          | SQS + Lambda                          | Step Functions                          |
|-------------------|---------------------------------------|-----------------------------------------|
| Model             | Async, each message independent       | Workflow with state, sequential or parallel |
| State management  | No (stateless)                        | Yes (input/output passed between steps)  |
| Retry logic       | Code yourself in Lambda or use DLQ    | Built-in (Retry/Catch in ASL)            |
| Timeout           | Lambda max 15 minutes                 | Workflow can run up to 1 year            |
| Debug             | View logs per Lambda                  | Visual execution history                |

### Practical Tips
- **Express Workflow** for low latency, **Standard Workflow** for long-running (up to 1 year)
- Use **Step Functions** instead of manual Lambda chaining when you need complex orchestration: retry, parallel, rollback
- Step Functions can call ECS Tasks, Glue Jobs, SageMaker, not just Lambda

---

## 6. Service Combination Summary

### Pattern 1: Decouple Microservices
```
[Service A] → [SQS] → [Service B]
```
Service A and B are independent, B can be temporarily down without affecting A.

### Pattern 2: Fan-Out Processing
```
[Upload Image] → [SNS] → [SQS: Resize] + [SQS: Watermark] + [Lambda: Index]
```
1 event triggers 3 independent actions.

### Pattern 3: Event-Driven with EventBridge
```
[EC2 Terminated] → [EventBridge Rule] → [Lambda Cleanup] + [SNS Alert Ops]
```
Events from AWS services automatically trigger actions.

### Pattern 4: Saga Distributed Transaction
```
[Step Functions: Order Saga]
  → [Lambda: Create Order]
  → [Lambda: Reserve Inventory] (on error → Lambda: Cancel Order)
  → [Lambda: Process Payment]   (on error → Lambda: Release Inventory)
  → [Lambda: Ship Order]
```
Each step has its own compensation (rollback).

### Pattern 5: SQS + Step Functions
```
[SQS] → [Step Functions (Express)] → [Lambda A] → [Lambda B] → [Lambda C]
```
Queue for buffering, Step Functions for complex orchestration within each message.

---

## 7. Service Selection Summary

| Need                                                        | Service                       |
|-------------------------------------------------------------|-------------------------------|
| Decouple service A and B (message queue, retry, DLQ)         | **SQS**                       |
| Send 1 event to many services (fan-out)                     | **SNS** + SQS                 |
| Route events based on complex patterns, SaaS integration     | **EventBridge**               |
| Orchestrate multi-step workflow, distributed transaction     | **Step Functions**            |
| Send email/SMS/push notifications                           | **SNS**                       |
| Need to replay past events for debugging                     | **EventBridge (Archive+Replay)** |
| Need absolute message ordering                              | **SQS FIFO**                  |