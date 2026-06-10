# AWS Storage Services

Three main AWS storage services: **S3** (Object Storage), **EBS** (Block Storage for EC2), and **EFS** (Shared File Storage). Choose the right type based on how your application reads/writes data.

---

## 1. Overview Comparison Table

| Service | Storage Type   | Concurrent Access       | Used with                  | Pricing Model                              | Primary Use Case                            |
|---------|----------------|--------------------------|----------------------------|---------------------------------------------|---------------------------------------------|
| S3      | Object Storage | Unlimited (HTTP)         | Standalone (REST API)      | GB stored + requests + data transfer        | Images, video, static web, backup, data lake|
| EBS     | Block Storage  | Attached to 1 EC2 only   | EC2 (like external drive)  | GB provisioned + IOPS (whether used or not) | Disk for EC2, self-managed DB, app state    |
| EFS     | File Storage   | Multiple EC2 concurrently| EC2, ECS, Lambda           | GB actually stored + throughput             | Shared filesystem, CMS (WordPress), user uploads |

> **Also available:** **FSx** (for Windows File Server or Lustre high-performance), **Storage Gateway** (hybrid cloud, connects on-premise with S3).

---

## 2. Amazon S3 (Simple Storage Service)

### What is S3?
S3 is object storage with **99.999999999% (11 nines)** durability. You store files (objects) in buckets. Each object has a key (path), value (data), metadata, and version ID. Accessed via HTTP/HTTPS.

### S3 Storage Classes – Choose the right class based on access frequency

| Storage Class              | Use case                                            | Storage cost (relative) | Retrieval fee        |
|----------------------------|-----------------------------------------------------|--------------------------|----------------------|
| S3 Standard                | Frequent access, production                         | $$                       | None                 |
| S3 Intelligent-Tiering     | Unknown access pattern, auto-moves between tiers    | $$ (small monitoring fee)| None                 |
| S3 Standard-IA (Infrequent)| Infrequent access (<1 time/month) but need fast retrieval | $                   | Yes (per GB)         |
| S3 One Zone-IA             | Like IA but only 1 AZ (cheaper, less durable)       | $ (20% cheaper than IA)  | Yes (per GB)         |
| S3 Glacier Instant Retrieval| Archive accessed ~1 time/quarter, need millisecond retrieval | $                 | Yes                  |
| S3 Glacier Flexible Retrieval | Archive retrieved in minutes to hours            | Very cheap               | Yes (higher)         |
| S3 Glacier Deep Archive    | Ultimate archive, retrieved in 12-48 hours          | Cheapest                 | Yes (highest)        |

### S3 Lifecycle Rules
Automatically transition objects between storage classes or delete them over time:
```
Example: 
  0-30 days → S3 Standard
  30-90 days → S3 Standard-IA
  90-365 days → S3 Glacier Flexible Retrieval
  >365 days → Delete (expire)
```

### S3 Versioning & Replication
- **Versioning**: Enable to keep all old versions of an object. Deleted by mistake? Just restore the old version. Note: old versions still incur charges.
- **Cross-Region Replication (CRR)**: Automatically copy objects to a bucket in another region (DR, compliance)
- **Same-Region Replication (SRR)**: Copy within the same region (aggregate logs, backup to another account)

### S3 Encryption
| Encryption Type      | Description                                                    |
|----------------------|----------------------------------------------------------------|
| SSE-S3               | AWS manages keys, simplest                                     |
| SSE-KMS              | Uses AWS KMS keys, has audit trail, more granular control     |
| SSE-C                | You bring your own keys, AWS only encrypts/decrypts            |
| Client-Side Encryption| You encrypt before uploading, AWS only stores ciphertext       |

### S3 Security & Access Control
- **Bucket Policy**: JSON policy controlling who/what can access the bucket
- **IAM Policy**: Attached to user/role to grant S3 permissions
- **Pre-signed URL**: Generate a temporary (time-limited) URL for upload/download without AWS credentials
- **Block Public Access**: Always enable for production buckets
- **Object Lock**: Prevent deletion/modification of objects for a fixed period (compliance, WORM - Write Once Read Many)

### S3 Use Cases
- **Static Website Hosting**: Upload HTML/CSS/JS to S3, enable static website hosting, point CloudFront to it
- **Data Lake**: Store raw data (JSON, CSV, Parquet), use Athena/Glue to query directly
- **Backup & Restore**: Store database dumps, snapshots
- **CloudTrail Logs, ALB Access Logs**: Centralized log storage in S3, cheap and durable

### Practical Tips
- Use **S3 Transfer Acceleration** for fast uploads from remote locations via CloudFront edge locations
- **Multipart Upload** for files >100MB: upload multiple parts in parallel, faster and resumable on error
- **S3 Select**: Query JSON/CSV/Parquet objects using SQL without downloading the entire object
- Enable **Requester Pays** when sharing data with other accounts – they pay for their own downloads

---

## 3. EBS (Elastic Block Store)

### What is EBS?
EBS is a virtual hard drive (block storage) attached directly to an EC2 instance, like plugging in an external USB/SSD. Data exists independently of the EC2 lifecycle (you can detach from one instance and attach to another).

### EBS Volume Types

| Type                  | Description                               | Max IOPS      | Throughput    | Use case                                 |
|-----------------------|-------------------------------------------|---------------|---------------|------------------------------------------|
| gp3 (General SSD)     | Balanced cost/performance (recommended)    | 16,000        | 1,000 MB/s    | Boot volume, regular apps                 |
| gp2 (General SSD)     | IOPS scales with capacity (burst)          | 16,000        | 250 MB/s      | Legacy, boot volume (being replaced by gp3)|
| io2 Block Express     | Highest performance, sub-millisecond latency | 256,000     | 4,000 MB/s    | Database requiring extreme IOPS           |
| st1 (Throughput HDD)  | Cheap HDD, high throughput                 | 500           | 500 MB/s      | Big data, log processing, streaming       |
| sc1 (Cold HDD)        | Cheapest HDD, for infrequently accessed data| 250          | 250 MB/s      | Cold archive                             |

### EBS Snapshots
- Incremental backup of EBS volumes, stored in S3 (you don't see the bucket, AWS manages it)
- Only charged for changed blocks (delta) after the first snapshot
- Can copy snapshots cross-region for DR
- **Fast Snapshot Restore (FSR)**: Initialize volumes from snapshots faster, no "lazy loading"

### Practical Tips
- **Always use gp3** instead of gp2 for new volumes: 20% cheaper and higher baseline performance
- **Separate root volume and data volume**: root volume for OS, data volume for app data. When replacing OS, data is not lost
- **Snapshot automation**: Use AWS Backup or Lambda cron to auto-snapshot daily, retain the last N days
- EBS volumes are **limited to 1 AZ** – cannot attach cross-AZ. For cross-AZ, snapshot then restore to another AZ

---

## 4. EFS (Elastic File System)

### What is EFS?
EFS is an AWS-managed NFS (Network File System). Multiple EC2 instances can read/write concurrently to the same filesystem. Capacity **auto-scales** (no pre-provisioning needed), you only pay for actual usage.

### EFS Storage Classes

| Class              | Description                                         | Use case                              |
|--------------------|-----------------------------------------------------|---------------------------------------|
| EFS Standard       | Data in multiple AZs, high durability              | Production, frequent access           |
| EFS One Zone       | Data in 1 AZ, 47% cheaper                          | Dev/test, workloads not needing multi-AZ |
| EFS Infrequent Access (IA) | 92% cheaper storage, retrieval fees apply    | Infrequently accessed data            |
| EFS Archive        | Cheapest, retrieval takes time                     | Long-term archive data                |

### EFS Lifecycle Management
Automatically moves files to IA or Archive if not accessed after N days.

### EFS Performance Modes

| Mode                 | Description                                                    |
|----------------------|----------------------------------------------------------------|
| Bursting Throughput  | Throughput proportional to capacity (free)                     |
| Provisioned Throughput| You specify fixed throughput (higher than bursting)            |
| Elastic Throughput   | Auto-scales throughput based on workload (new, recommended)    |

### When to use EFS over S3 or EBS?

| Scenario                                               | Choose |
|--------------------------------------------------------|--------|
| Need shared filesystem across multiple EC2/ECS containers| EFS   |
| EC2 needs high-performance, low-latency disk           | EBS    |
| Store static files via HTTP, need 11 nines durability  | S3     |
| WordPress/Drupal with multiple servers mounting 1 uploads folder | EFS |
| Big data analytics, query with SQL (Athena)             | S3     |

### Practical Tips
- **EFS + Lambda**: Lambda can mount EFS (since 2020), solving the need for shared state or processing large files exceeding `/tmp` 10GB
- Use **EFS Access Points** to restrict POSIX permissions (user/group/permission) per application
- EFS is more expensive than S3, only use when you truly need a POSIX filesystem

---

## 5. Service Selection Summary

| Need                                                       | Service           |
|------------------------------------------------------------|-------------------|
| Store images, video, static files, backup, serve via web/CDN| **S3**           |
| Disk for EC2 (boot, database, app)                         | **EBS**           |
| Need shared filesystem for multiple EC2/containers to mount | **EFS**          |
| High-performance file system for Windows (SMB)             | **FSx for Windows**|
| High-performance for HPC, machine learning (Lustre)        | **FSx for Lustre**|
| On-premise needs sync/backup to AWS                        | **Storage Gateway**|
| Data lake for querying with SQL/Spark                      | **S3** + Athena   |
| WordPress multi-server, need shared `wp-content/uploads`   | **EFS**           |