# AWS Storage Services

Ba dịch vụ lưu trữ chính của AWS: **S3** (Object Storage), **EBS** (Block Storage cho EC2), và **EFS** (File Storage dùng chung). Chọn đúng loại dựa trên cách ứng dụng đọc/ghi dữ liệu.

---

## 1. Bảng so sánh tổng quan

| Dịch vụ | Loại storage   | Truy cập đồng thời     | Dùng với                   | Tính phí theo                              | Use case chính                              |
|---------|----------------|------------------------|----------------------------|---------------------------------------------|---------------------------------------------|
| S3      | Object Storage | Không giới hạn (HTTP)  | Độc lập (REST API)         | GB lưu trữ + request + data transfer        | Ảnh, video, static web, backup, data lake   |
| EBS     | Block Storage  | Gắn vào 1 EC2 duy nhất  | EC2 (như ổ cứng gắn ngoài) | GB provisioned + IOPS (bất kể có dùng hay không) | Ổ đĩa cho EC2, database tự quản, app state |
| EFS     | File Storage   | Nhiều EC2 cùng lúc      | EC2, ECS, Lambda           | GB lưu trữ thực tế dùng + throughput        | Shared filesystem, CMS (WordPress), user uploads |

> **Ngoài ra còn có:** **FSx** (cho Windows File Server hoặc Lustre high-performance), **Storage Gateway** (hybrid cloud, nối on-premise với S3).

---

## 2. Amazon S3 (Simple Storage Service)

### S3 là gì?
S3 là object storage với độ bền **99.999999999% (11 số 9)**. Bạn lưu file (object) vào bucket. Mỗi object có key (path), value (dữ liệu), metadata, và version ID. Truy cập qua HTTP/HTTPS.

### S3 Storage Classes – Chọn class phù hợp với tần suất truy cập

| Storage Class              | Độ bền    | Use case                                           | Chi phí lưu trữ (tương đối) | Phí retrieval         |
|----------------------------|-----------|----------------------------------------------------|------------------------------|-----------------------|
| S3 Standard                 | 11 số 9   | Truy cập thường xuyên, production                  | $$                           | Không                 |
| S3 Intelligent-Tiering      | 11 số 9   | Không biết pattern truy cập, auto move giữa tier    | $$ (phí monitoring nhỏ)      | Không                 |
| S3 Standard-IA (Infrequent) | 11 số 9   | Truy cập ít (<1 lần/tháng) nhưng cần lấy nhanh      | $                            | Có (per GB)           |
| S3 One Zone-IA              | 11 số 9 * | Như IA nhưng chỉ 1 AZ (rẻ hơn, kém bền hơn)         | $ (rẻ hơn IA 20%)            | Có (per GB)           |
| S3 Glacier Instant Retrieval| 11 số 9   | Archive truy cập ~1 lần/quý, cần lấy trong mili giây| $                            | Có                     |
| S3 Glacier Flexible Retrieval| 11 số 9  | Archive lấy lại trong vài phút đến vài giờ          | Rất rẻ                       | Có (cao hơn)          |
| S3 Glacier Deep Archive     | 11 số 9   | Archive tối thượng, lấy lại trong 12-48 giờ         | Rẻ nhất                      | Có (cao nhất)         |

> \* One Zone-IA không chịu được mất cả AZ.

### S3 Lifecycle Rules
Tự động chuyển object giữa các storage class hoặc xóa theo thời gian:
```
Ví dụ: 
  0-30 ngày → S3 Standard
  30-90 ngày → S3 Standard-IA
  90-365 ngày → S3 Glacier Flexible Retrieval
  >365 ngày → Xóa (expire)
```

### S3 Versioning & Replication
- **Versioning**: Bật lên để giữ mọi phiên bản cũ của object. Xóa nhầm? Chỉ cần restore version cũ. Chú ý: version cũ vẫn bị tính tiền.
- **Cross-Region Replication (CRR)**: Tự copy object sang bucket ở region khác (DR, compliance)
- **Same-Region Replication (SRR)**: Copy trong cùng region (aggregate log, backup sang account khác)

### S3 Encryption
| Loại mã hóa          | Mô tả                                                    |
|----------------------|----------------------------------------------------------|
| SSE-S3               | AWS quản lý key, đơn giản nhất                           |
| SSE-KMS              | Dùng AWS KMS key, có audit trail, kiểm soát chi tiết hơn  |
| SSE-C                | Bạn mang key của mình, AWS chỉ mã hóa/giải mã             |
| Client-Side Encryption| Bạn mã hóa trước khi upload, AWS chỉ lưu ciphertext       |

### S3 Security & Access Control
- **Bucket Policy**: JSON policy kiểm soát ai/cái gì được truy cập bucket
- **IAM Policy**: Gắn vào user/role để cấp quyền S3
- **Pre-signed URL**: Tạo URL tạm thời (có hạn) cho phép upload/download mà không cần AWS credentials
- **Block Public Access**: Luôn bật cho production bucket
- **Object Lock**: Chống xóa/sửa object trong thời gian cố định (compliance, WORM - Write Once Read Many)

### S3 Use Cases
- **Static Website Hosting**: Upload HTML/CSS/JS lên S3, bật static website hosting, trỏ CloudFront vào
- **Data Lake**: Lưu raw data (JSON, CSV, Parquet), dùng Athena/Glue để query trực tiếp
- **Backup & Restore**: Lưu database dump, snapshot
- **CloudTrail Logs, ALB Access Logs**: Lưu log tập trung vào S3, rẻ và bền

### Mẹo thực tế
- Dùng **S3 Transfer Acceleration** để upload nhanh từ xa qua CloudFront edge location
- **Multipart Upload** cho file >100MB: upload song song nhiều phần, nhanh hơn và resume được nếu lỗi
- **S3 Select**: Query JSON/CSV/Parquet object chỉ bằng SQL, không cần tải toàn bộ object về
- Bật **Requester Pays** nếu chia sẻ dữ liệu cho account khác – họ tự trả phí download

---

## 3. EBS (Elastic Block Store)

### EBS là gì?
EBS là ổ cứng ảo (block storage) gắn trực tiếp vào EC2 instance, giống như cắm USB/SSD ngoài. Dữ liệu tồn tại độc lập với lifecycle của EC2 (có thể detach từ instance này gắn sang instance khác).

### EBS Volume Types

| Loại                  | Mô tả                                     | IOPS tối đa   | Throughput    | Use case                                 |
|-----------------------|-------------------------------------------|---------------|---------------|------------------------------------------|
| gp3 (General SSD)     | Cân bằng giá/hiệu năng (khuyên dùng)       | 16,000        | 1,000 MB/s    | Boot volume, app thông thường             |
| gp2 (General SSD)     | IOPS tăng theo dung lượng (burst)          | 16,000        | 250 MB/s      | Legacy, boot volume (đang bị thay bởi gp3)|
| io2 Block Express     | Hiệu năng cao nhất, sub-milisecond latency | 256,000       | 4,000 MB/s    | Database yêu cầu IOPS cực cao             |
| st1 (Throughput HDD)  | HDD rẻ, throughput cao                     | 500           | 500 MB/s      | Big data, log processing, streaming       |
| sc1 (Cold HDD)        | HDD rẻ nhất, cho dữ liệu ít truy cập       | 250           | 250 MB/s      | Archive lạnh                             |

### EBS Snapshots
- Backup incremental của EBS volume, lưu vào S3 (bạn không thấy bucket, AWS quản lý)
- Chỉ tính tiền cho phần thay đổi (delta) sau lần snapshot đầu
- Có thể copy snapshot cross-region để DR
- **Fast Snapshot Restore (FSR)**: Khởi tạo volume từ snapshot nhanh hơn, không cần "lazy loading"

### Mẹo thực tế
- **Luôn dùng gp3** thay vì gp2 nếu là volume mới: rẻ hơn 20% và hiệu năng baseline cao hơn
- **Tách riêng root volume và data volume**: root volume chứa OS, data volume chứa app data. Khi thay OS, không mất data
- **Snapshot automation**: Dùng AWS Backup hoặc Lambda cron để tự động snapshot hàng ngày, giữ lại N ngày gần nhất
- EBS volume bị **giới hạn trong 1 AZ** – không thể gắn cross-AZ. Muốn cross-AZ thì phải snapshot rồi restore sang AZ khác

---

## 4. EFS (Elastic File System)

### EFS là gì?
EFS là NFS (Network File System) được quản lý bởi AWS. Nhiều EC2 instance có thể đọc/ghi cùng lúc vào cùng một filesystem. Dung lượng **tự động co giãn** (không cần provision trước), chỉ trả tiền cho dung lượng thực dùng.

### EFS Storage Classes

| Class              | Mô tả                                              | Use case                              |
|--------------------|----------------------------------------------------|---------------------------------------|
| EFS Standard       | Dữ liệu trong nhiều AZ, bền cao                    | Production, thường xuyên truy cập      |
| EFS One Zone       | Dữ liệu trong 1 AZ, rẻ hơn 47%                     | Dev/test, workload không cần multi-AZ |
| EFS Infrequent Access (IA) | Rẻ hơn 92% chi phí lưu trữ, có phí retrieval | Dữ liệu ít truy cập                   |
| EFS Archive        | Rẻ nhất, retrieval mất thời gian                   | Dữ liệu archive lâu dài               |

### EFS Lifecycle Management
Tự động chuyển file sang IA hoặc Archive nếu không được truy cập sau N ngày.

### EFS Performance Modes

| Mode                 | Mô tả                                                    |
|----------------------|----------------------------------------------------------|
| Bursting Throughput  | Throughput tỉ lệ với dung lượng (miễn phí)               |
| Provisioned Throughput| Bạn chỉ định throughput cố định (cao hơn bursting)       |
| Elastic Throughput   | Tự động scale throughput theo workload (mới, khuyên dùng) |

### When to use EFS over S3 or EBS?

| Tình huống                                              | Chọn |
|---------------------------------------------------------|------|
| Cần filesystem shared giữa nhiều EC2/ECS container      | EFS  |
| EC2 cần ổ đĩa hiệu năng cao, low latency                | EBS  |
| Lưu file tĩnh, qua HTTP, cần bền 11 số 9                | S3   |
| WordPress/ Drupal nhiều server cùng mount 1 thư mục uploads | EFS  |
| Big data analytics, query bằng SQL (Athena)              | S3   |

### Mẹo thực tế
- **EFS + Lambda**: Lambda có thể mount EFS (từ 2020), giải quyết vấn đề Lambda cần shared state hoặc xử lý file lớn vượt `/tmp` 10GB
- Dùng **EFS Access Points** để giới hạn quyền POSIX (user/group/permission) cho từng application
- EFS đắt hơn S3, chỉ dùng khi thực sự cần POSIX filesystem

---

## 5. Tóm tắt chọn dịch vụ

| Nhu cầu                                                    | Dịch vụ           |
|------------------------------------------------------------|-------------------|
| Lưu ảnh, video, file tĩnh, backup, serve qua web/CDN       | **S3**            |
| Ổ đĩa cho EC2 (boot, database, app)                        | **EBS**           |
| Cần filesystem chung cho nhiều EC2/container cùng mount     | **EFS**           |
| High-performance file system cho Windows (SMB)             | **FSx for Windows**|
| High-performance cho HPC, machine learning (Lustre)        | **FSx for Lustre** |
| On-premise cần sync/backup lên AWS                         | **Storage Gateway**|
| Data lake để query bằng SQL/Spark                          | **S3** + Athena   |
| WordPress chạy multi-server, cần shared `wp-content/uploads`| **EFS**           |