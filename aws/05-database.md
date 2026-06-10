# AWS Database Services

AWS cung cấp nhiều loại database cho các nhu cầu khác nhau: **RDS** (quan hệ), **Aurora** (quan hệ cloud-native), **DynamoDB** (NoSQL key-value/serverless), và **ElastiCache** (in-memory cache).

---

## 1. Bảng so sánh tổng quan

| Dịch vụ       | Loại                     | Mô hình              | Engine hỗ trợ                                    | Scaling                 | Use case chính                              |
|---------------|--------------------------|----------------------|--------------------------------------------------|-------------------------|---------------------------------------------|
| RDS           | Quan hệ (SQL)            | Managed              | PostgreSQL, MySQL, MariaDB, Oracle, SQL Server    | Vertical + Read Replica | Ứng dụng truyền thống, CMS, ERP             |
| Aurora        | Quan hệ (SQL) Cloud-Native| Managed (tối ưu)     | MySQL-compatible, PostgreSQL-compatible           | Vertical + Auto Read Replica + Aurora Serverless | High-performance, global app           |
| DynamoDB      | NoSQL (Key-Value/Document)| Serverless           | AWS proprietary                                   | Horizontal auto (on-demand) | Mobile/web app, session store, real-time |
| ElastiCache   | In-memory Cache           | Managed              | Redis, Memcached                                  | Horizontal (sharding/cluster) | Cache, session, real-time leaderboard |

> **Ngoài ra còn có:** DocumentDB (MongoDB-compatible), Neptune (Graph), Keyspaces (Cassandra-compatible), Timestream (Time-series), QLDB (Ledger).

---

## 2. RDS (Relational Database Service)

### RDS là gì?
RDS là dịch vụ database quan hệ được AWS quản lý. Bạn không cần cài đặt, patch OS/DB, backup thủ công. Hỗ trợ 6 engine: PostgreSQL, MySQL, MariaDB, Oracle, SQL Server, và IBM Db2.

### RDS Features cốt lõi

| Tính năng            | Mô tả                                                                 |
|----------------------|-----------------------------------------------------------------------|
| Multi-AZ             | Tự động sync sang AZ khác (Standby). Khi primary chết, failover <1-2 phút |
| Read Replica         | Bản sao chỉ đọc (read-only), scale horizontal cho read traffic         |
| Automated Backup     | Backup tự động hàng ngày, giữ tối đa 35 ngày. Có thể point-in-time restore |
| Manual Snapshot      | Backup thủ công, giữ vĩnh viễn (đến khi bạn xóa)                      |
| Encryption at rest   | Dùng KMS mã hóa cả DB + snapshot + replica                            |
| Deletion Protection  | Chống xóa nhầm database production                                    |

### RDS Multi-AZ vs Read Replica

| Tiêu chí            | Multi-AZ                                     | Read Replica                                  |
|---------------------|----------------------------------------------|-----------------------------------------------|
| Mục đích            | High Availability / Disaster Recovery         | Scale read traffic                            |
| Sync                | Synchronous (đồng bộ tức thì)                 | Async (không đồng bộ, có độ trễ)               |
| Failover            | Tự động (DNS tự chuyển sang standby)          | Phải promote thủ công (hoặc script)            |
| Sử dụng được không? | Standby không dùng được (chỉ chờ failover)     | Đọc được (SELECT), giảm tải cho primary        |

### RDS Proxy
- Pool connection từ app đến RDS, giảm stress cho database khi app scale đột ngột (Lambda)
- Giảm thời gian failover (RDS Proxy tự reconnect)
- Bắt buộc với Lambda + RDS (Lambda mở connection mới mỗi lần cold start → dễ bội connection pool)

### Mẹo thực tế
- Dùng **gp3 storage**, không dùng Magnetic cũ
- **Performance Insights**: Dashboard giúp xác định câu SQL nào đang chiếm CPU/RAM, xem wait events
- **RDS Enhanced Monitoring**: Xem OS-level metrics (CPU, RAM, disk IO của từng process)
- Bật **Deletion Protection** cho database production

---

## 3. Aurora – Database Cloud-Native của AWS

### Aurora là gì?
Aurora là database quan hệ do AWS tự phát triển, tương thích MySQL và PostgreSQL, nhưng được thiết kế lại để chạy trên infrastructure của AWS. Hiệu năng **cao hơn MySQL 5x, PostgreSQL 3x**.

### Aurora so với RDS

| Tiêu chí              | RDS (MySQL/PostgreSQL)                   | Aurora                                     |
|-----------------------|------------------------------------------|--------------------------------------------|
| Storage               | EBS (giới hạn 64TB)                      | Aurora Storage Engine (tự scale đến 128TB)  |
| Replica               | Tối đa 5 Read Replica (manual)           | Tối đa 15 Aurora Replica (auto)            |
| Replication lag       | Có thể vài giây                          | <100ms (shared storage)                    |
| Failover              | ~1-2 phút                                | <30 giây                                   |
| Backtrack             | Không                                    | Có (quay về điểm thời gian trước, không cần restore) |
| Serverless            | Không                                    | Aurora Serverless v2 (auto pause/resume)   |
| Global Database       | Cross-region Read Replica (manual)       | Aurora Global Database (cross-region, lag <1s) |

### Aurora Serverless v2
- Database tự động scale up/down (ACU - Aurora Capacity Unit)
- Có thể scale về 0 (pause hoàn toàn) → $0 khi không dùng
- Phù hợp: Dev/test, app có traffic theo giờ hành chính, app mới chưa biết load

### Aurora Global Database
- 1 Primary region (đọc/ghi) + tối đa 5 secondary region (chỉ đọc)
- Replication cross-region với lag <1 giây
- Failover sang region khác <1 phút (thường 30s)
- Dùng cho: Multi-region app, DR toàn cầu

### Mẹo thực tế
- **Aurora là default choice** nếu bạn cần MySQL/PostgreSQL trên AWS, trừ khi bạn cần version cụ thể Aurora chưa hỗ trợ
- **Aurora Serverless v2** chỉ scale ACU, không về 0 giây như DynamoDB, vẫn có cold start nhẹ khi resume
- **RDS Proxy** cũng hoạt động với Aurora, giảm connection stress

---

## 4. DynamoDB – NoSQL Serverless

### DynamoDB là gì?
DynamoDB là NoSQL key-value/document database serverless của AWS. Không cần provision server, auto-scale về 0. Hiệu năng single-digit milisecond ở mọi quy mô.

### DynamoDB Core Concepts

| Khái niệm        | Giải thích                                                                 |
|------------------|----------------------------------------------------------------------------|
| Table            | Bảng chứa items (không có schema cố định)                                   |
| Item             | Một bản ghi (giống row trong SQL), tối đa 400KB                             |
| Partition Key    | Khóa chính để phân mảnh dữ liệu (hash key)                                  |
| Sort Key         | Khóa phụ để sắp xếp trong partition (range key)                             |
| GSI (Global Secondary Index) | Index với partition/sort key khác bảng chính, dùng để query theo chiều khác |
| LSI (Local Secondary Index)  | Index dùng chung partition key, sort key khác                               |

### DynamoDB Capacity Modes

| Mode               | Mô tả                                                                  | Phù hợp                              |
|--------------------|------------------------------------------------------------------------|--------------------------------------|
| On-Demand           | Trả tiền theo request thực tế (pay-per-request), không cần plan capacity| App mới, traffic không dự đoán được   |
| Provisioned         | Bạn định trước RCU/WCU (Read/Write Capacity Units), rẻ hơn On-Demand   | Traffic ổn định, có thể dự đoán       |
| Reserved            | Cam kết 1-3 năm, tiết kiệm thêm                                       | Production lâu dài                    |

### DynamoDB Features

| Tính năng                | Mô tả                                                                     |
|--------------------------|---------------------------------------------------------------------------|
| DAX (DynamoDB Accelerator)| In-memory cache cho DynamoDB, giảm latency từ mili-giây xuống micro-giây   |
| Streams                  | Capture thay đổi (insert/update/delete) theo thứ tự, trigger Lambda       |
| Global Tables            | Multi-region multi-write, sync tự động                                    |
| TTL                      | Tự động xóa item sau thời gian nhất định                                  |
| Encryption at rest       | Mặc định bật, không thể tắt                                               |
| Point-in-Time Recovery   | Restore về bất kỳ thời điểm nào trong 35 ngày                             |
| Transactions             | ACID transaction cho nhiều items (có giới hạn)                            |

---

## 5. ElastiCache – In-Memory Cache

### ElastiCache là gì?
ElastiCache là dịch vụ managed cho Redis và Memcached. Dữ liệu nằm trong RAM → latency **micro-giây**.

### Redis vs Memcached trên ElastiCache

| Tiêu chí          | Redis                                        | Memcached                    |
|-------------------|----------------------------------------------|------------------------------|
| Data structure    | String, List, Set, Sorted Set, Hash, Stream  | Key-value thuần              |
| Persistence       | Có (snapshot + AOF)                          | Không                        |
| Replication       | Multi-AZ + Read Replica                      | Không (thuần cache)          |
| Pub/Sub           | Có                                           | Không                        |
| Cluster mode      | Có (sharding)                                | Có (node ring)               |
| Use case          | Cache nâng cao, session store, leaderboard, rate limiter | Cache đơn thuần             |

### ElastiCache Patterns

| Pattern              | Mô tả                                                                  |
|----------------------|------------------------------------------------------------------------|
| Lazy Loading         | App check cache → miss → query DB → lưu vào cache → trả về             |
| Write Through        | App ghi vào DB + cache cùng lúc (cache luôn fresh)                     |
| Session Store        | Lưu user session vào Redis thay vì local memory (stateless app)        |
| Rate Limiter         | Dùng Redis INCR + EXPIRE để đếm request trong khoảng thời gian          |
| Leaderboard          | Dùng Redis Sorted Set với ZADD và ZRANK                                |

### Mẹo thực tế
- **Redis Auth**: Bật AUTH token để bảo vệ Redis cluster
- **Encryption in transit + at rest**: Bật cả hai cho production
- **Multi-AZ**: Dùng cho Redis nếu cần HA; Memcached không có Multi-AZ
- **Cluster Mode Enabled**: Dùng khi cần scale horizontal (shard data) >1 node group
- Kết hợp với **RDS**: RDS làm source-of-truth, Redis làm cache nóng trước RDS

---

## 6. Tóm tắt chọn database

| Nhu cầu                                                                 | Dịch vụ                        |
|-------------------------------------------------------------------------|--------------------------------|
| Ứng dụng cần SQL, JOIN, transaction, schema cố định                      | **RDS** hoặc **Aurora**        |
| Cần hiệu năng SQL cao nhất, multi-region, auto-scale                     | **Aurora**                     |
| Chi phí tối ưu cho dev/test, traffic gián đoạn                           | **Aurora Serverless v2**       |
| App mobile/web scale lớn, schema linh hoạt, không cần JOIN               | **DynamoDB**                   |
| Cần cache nhanh (micro-giây), session store, pub/sub                     | **ElastiCache (Redis)**        |
| Chỉ cần cache key-value đơn giản, không cần persist                      | **ElastiCache (Memcached)**    |
| Cần MongoDB nhưng muốn managed                                           | **DocumentDB**                 |
| Graph database (social network, fraud detection)                         | **Neptune**                    |
| Dữ liệu time-series (IoT, metrics)                                       | **Timestream**                 |
| Cần immutable ledger (audit, transaction history)                        | **QLDB**                       |