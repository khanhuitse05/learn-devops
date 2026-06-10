# AWS Monitoring & Logging Services

System monitoring is mandatory for production. AWS provides: **CloudWatch** (metrics, logs, alarms), **CloudTrail** (audit API calls), and **X-Ray** (distributed tracing).

---

## 1. Overview Table

| Service       | Role                                     | Data                                              | Primary Use Case                                  |
|---------------|------------------------------------------|---------------------------------------------------|---------------------------------------------------|
| CloudWatch    | Metrics, Logs, Alarms, Dashboards        | CPU, RAM, request count, application logs         | Monitor system health, alert when issues arise     |
| CloudTrail    | Audit API calls (who called what API, when) | Every API call in the AWS account               | Security audit, compliance, debug "who deleted S3?"|
| X-Ray         | Distributed tracing (trace requests across services) | Trace map + segments + subsegments    | Debug latency in microservices, find bottlenecks   |

---

## 2. CloudWatch – Monitoring Hub

### CloudWatch Components

| Component            | Description                                                                 |
|----------------------|-----------------------------------------------------------------------------|
| Metrics              | Time-series data (CPU%, NetworkIn, RequestCount...)                         |
| Logs                 | Collect logs from EC2, Lambda, ECS, API Gateway...                          |
| Alarms               | Alert when a metric exceeds a threshold → trigger SNS, Auto Scaling...      |
| Dashboards           | Custom dashboards visualizing multiple metrics/graphs at once               |
| Composite Alarms     | Combine multiple alarms with AND/OR logic                                    |
| Logs Insights        | Query logs with SQL-like syntax (fast, cheaper than OpenSearch)              |
| Contributor Insights | Analyze top-N contributors (e.g.: top 10 IPs sending the most requests)     |
| Application Insights | Auto-setup dashboard + alarms for apps (.NET, Java)                         |
| Synthetics           | Canary tests: run scripts (Selenium/Node.js) periodically to check endpoints|

### CloudWatch Metrics – Important Metrics

| Service   | Important Metrics                                      | Should set alarm for                                     |
|-----------|--------------------------------------------------------|----------------------------------------------------------|
| EC2       | CPUUtilization, NetworkIn/Out, StatusCheckFailed       | CPU > 80% for 5 min, StatusCheckFailed > 0               |
| ALB       | RequestCount, TargetResponseTime, HTTPCode_ELB_5XX     | 5XX > 0, TargetResponseTime > 2s                         |
| RDS       | CPUUtilization, DatabaseConnections, FreeStorageSpace  | FreeStorageSpace < 10%, DatabaseConnections > threshold  |
| Lambda    | Invocations, Duration, Errors, Throttles               | Errors > 0, Throttles > 0, Duration > timeout × 80%      |
| SQS       | ApproximateNumberOfMessagesVisible, AgeOfOldestMessage  | AgeOfOldestMessage > 5 minutes                           |
| DynamoDB  | ConsumedReadCapacityUnits, ThrottledRequests           | ThrottledRequests > 0                                    |

### CloudWatch Alarms

```
Metric (CPU > 80%) 
    → Alarm state: OK → ALARM
    → Action: SNS notification → Email/Slack/PagerDuty
    → Action: Auto Scaling (scale-out EC2)
```

### CloudWatch Logs

| Log Source              | How logs are sent                                           |
|--------------------------|-------------------------------------------------------------|
| EC2                      | Install CloudWatch Agent (CWAgent) or send via SDK          |
| ECS Fargate              | Auto-sends stdout/stderr to CloudWatch (awslogs driver)     |
| Lambda                   | Automatic, no additional configuration needed                |
| API Gateway              | Enable CloudWatch Logs in stage settings                     |
| VPC Flow Logs            | Records IP traffic in VPC (metadata only, no content)        |

### CloudWatch Logs Insights – Query Log

```
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 20
```

Query to find ERROR logs in the latest 20 lines. Can aggregate, count, stats.

### CloudWatch Synthetics – Canary

Automatically test endpoints on schedule (e.g.: every 5 minutes):
- **Heartbeat monitoring**: Call URL, check HTTP 200
- **Browser canary**: Run Selenium scripts (e.g.: login → click → verify text)
- **Visual monitoring**: Screenshot UI and compare with baseline

### Practical Tips
- **CloudWatch Agent** for EC2: sends both system logs + custom metrics (memory, disk) – CloudWatch doesn't see EC2 RAM by default
- **Metric Filter**: Create metrics from logs (e.g.: count "ERROR" lines in logs → alarm when >10/min)
- **Log Retention**: Configure retention for each log group (default never expires → costs money)
- **Dashboard**: Create a unified production dashboard with all important metrics
- **Composite Alarm**: Use when you want to alert only if CPU >80% **AND** request count > 1000 (avoid false alarms)

---

## 3. CloudTrail – Audit API Calls

### What is CloudTrail?
CloudTrail records **every API call** in your AWS account: who, called what API, when, from which IP, and the result. Logs are stored in S3 or CloudWatch Logs.

### CloudTrail Events

| Event Type           | Description                                                    | Example                                        |
|----------------------|----------------------------------------------------------------|-----------------------------------------------|
| Management Events    | API calls managing resources (create/delete/modify)            | `ec2:RunInstances`, `s3:CreateBucket`         |
| Data Events          | API calls accessing data (read/write objects)                  | `s3:GetObject`, `lambda:Invoke`               |
| Insights Events      | Detect unusual activity (API call spikes, anomalies)           | Auto-detect spike in `s3:DeleteBucket` calls   |

### CloudTrail Use Cases

- **Security audit**: "Who deleted the RDS database yesterday at 3 AM?"
- **Compliance**: Meet SOC2, PCI-DSS, HIPAA requirements
- **Troubleshooting**: "Why was the EC2 terminated?" → check CloudTrail logs
- **Anomaly detection**: CloudTrail Insights auto-detects unusual API calls

### Practical Tips
- Enable **CloudTrail for all regions** + **Organization trail** (if using AWS Organizations)
- Enable **Data Events for S3** if buckets contain sensitive data (Data Events are off by default)
- Store CloudTrail logs in a **dedicated S3 bucket**, configure lifecycle (transition to Glacier after 90 days)
- **CloudTrail Lake**: Query CloudTrail logs using SQL without exporting to Athena

---

## 4. X-Ray – Distributed Tracing

### What is X-Ray?
X-Ray helps you trace a request as it travels through multiple services (microservices, Lambda, SQS, DynamoDB...). It draws a **trace map** showing latency at each service, helping find bottlenecks.

### X-Ray Concepts

| Concept    | Description                                                              |
|------------|--------------------------------------------------------------------------|
| Trace      | The entire journey of 1 request (contains multiple segments)             |
| Segment    | 1 service in the trace (e.g.: API Gateway → Lambda → DynamoDB)           |
| Subsegment | 1 operation within a service (e.g.: calling DynamoDB.GetItem in Lambda)  |
| Annotation | Key-value metadata for filtering/searching (e.g.: user_id, order_id)     |
| Metadata   | Additional debug data (not used for searching)                           |
| Trace Map  | Visual graph of all services and latency between them                    |

### X-Ray Trace Map Example

```
[Client] → (30ms) → [API Gateway] → (150ms) → [Lambda A]
                                                    ↓ (500ms)
                                              [DynamoDB.GetItem]
                                                    ↓ (50ms)
                                              [Lambda B] → (800ms) → [RDS Query]
```

Looking at the trace map, you immediately see RDS Query is the bottleneck (800ms).

### X-Ray Integration

X-Ray is built-in for:
- **Lambda**: Just enable X-Ray tracing in Lambda configuration
- **API Gateway**: Enable X-Ray per stage
- **ECS/EC2**: Run X-Ray Daemon as a sidecar container or agent
- **SQS, SNS, Step Functions**: Auto-propagate trace context

### Practical Tips
- Use **X-Ray SDK** in your code (Node.js, Python, Java...) to create custom subsegments, annotations
- **Sampling rule**: Default samples based on requests/second (not by %), avoiding overload
- Use annotations `user_id`, `order_id` to filter traces by business context
- Combine X-Ray + CloudWatch Logs: X-Ray auto-correlates traces with log groups

---

## 5. CloudWatch, CloudTrail, X-Ray – How Are They Different?

| Criteria          | CloudWatch                              | CloudTrail                              | X-Ray                                    |
|-------------------|-----------------------------------------|----------------------------------------|------------------------------------------|
| Asks what?        | "Is the system healthy?"                | "Who did what?"                        | "Where did the request go, where is it slow?"|
| Data              | Metrics (CPU, RAM), application logs    | API call logs (audit)                  | Traces, latency per service              |
| Time              | Real-time (metrics <1 min)              | Within 15 min (usually 5-10 min)       | Real-time                                |
| Default retention | 15 months (metrics), configurable (logs)| 90 days (management events)            | 30 days                                  |
| Pricing           | Cheap                                   | Nearly free (except data events)        | $5/1 million traces                      |

---

## 6. Service Selection Summary

| Need                                                               | Service                              |
|--------------------------------------------------------------------|--------------------------------------|
| View EC2 CPU/RAM, ALB request count                                | **CloudWatch Metrics**               |
| View application logs, query logs with SQL-like syntax             | **CloudWatch Logs + Logs Insights**  |
| Alert when CPU > 80%, 5XX errors, free disk < 10%                  | **CloudWatch Alarms** + SNS          |
| System overview dashboard                                          | **CloudWatch Dashboards**            |
| Audit: who deleted the S3 bucket, who called which API             | **CloudTrail**                       |
| Trace requests through microservices, find bottlenecks             | **X-Ray**                            |
| Auto-test endpoints periodically (heartbeat)                       | **CloudWatch Synthetics**            |
| Analyze top IPs, top URLs sending the most requests                | **CloudWatch Contributor Insights**  |
| Auto-detect unusual API calls                                      | **CloudTrail Insights**              |