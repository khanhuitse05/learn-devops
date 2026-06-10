# AWS Database Services

AWS provides various database types for different needs: **RDS** (relational), **Aurora** (cloud-native relational), **DynamoDB** (NoSQL key-value/serverless), and **ElastiCache** (in-memory cache).

---

## 1. Overview Comparison Table

| Service      | Type                       | Model               | Supported Engines                               | Scaling                 | Primary Use Case                            |
|--------------|----------------------------|---------------------|-------------------------------------------------|-------------------------|---------------------------------------------|
| RDS          | Relational (SQL)           | Managed             | PostgreSQL, MySQL, MariaDB, Oracle, SQL Server   | Vertical + Read Replica | Traditional apps, CMS, ERP                  |
| Aurora       | Relational (SQL) Cloud-Native| Managed (optimized) | MySQL-compatible, PostgreSQL-compatible          | Vertical + Auto Read Replica + Aurora Serverless | High-performance, global apps         |
| DynamoDB     | NoSQL (Key-Value/Document) | Serverless          | AWS proprietary                                  | Horizontal auto (on-demand) | Mobile/web apps, session store, real-time |
| ElastiCache  | In-memory Cache            | Managed             | Redis, Memcached                                 | Horizontal (sharding/cluster) | Cache, session, real-time leaderboard  |

> **Also available:** DocumentDB (MongoDB-compatible), Neptune (Graph), Keyspaces (Cassandra-compatible), Timestream (Time-series), QLDB (Ledger).

---

## 2. RDS (Relational Database Service)

### What is RDS?
RDS is an AWS-managed relational database service. You don't need to install, patch OS/DB, or do manual backups. Supports 6 engines: PostgreSQL, MySQL, MariaDB, Oracle, SQL Server, and IBM Db2.

### Core RDS Features

| Feature              | Description                                                                |
|----------------------|----------------------------------------------------------------------------|
| Multi-AZ             | Automatically syncs to another AZ (Standby). When primary fails, failover <1-2 min |
| Read Replica         | Read-only copy, horizontally scale read traffic                            |
| Automated Backup     | Automatic daily backups, retained up to 35 days. Point-in-time restore     |
| Manual Snapshot      | Manual backup, retained indefinitely (until you delete it)                 |
| Encryption at rest   | Uses KMS to encrypt DB + snapshots + replicas                              |
| Deletion Protection  | Prevents accidental deletion of production databases                       |

### RDS Multi-AZ vs Read Replica

| Criteria            | Multi-AZ                                     | Read Replica                                  |
|---------------------|----------------------------------------------|-----------------------------------------------|
| Purpose             | High Availability / Disaster Recovery         | Scale read traffic                            |
| Sync                | Synchronous (instant sync)                    | Async (not synchronous, has lag)              |
| Failover            | Automatic (DNS auto-switches to standby)      | Must promote manually (or script)             |
| Can it be used?     | Standby not usable (only waiting for failover)| Readable (SELECT), reduces primary load       |

### RDS Proxy
- Pools connections from app to RDS, reducing database stress when app scales suddenly (Lambda)
- Reduces failover time (RDS Proxy auto-reconnects)
- Essential for Lambda + RDS (Lambda opens new connections on every cold start → easily exhausts connection pool)

### Practical Tips
- Use **gp3 storage**, not old Magnetic
- **Performance Insights**: Dashboard that identifies which SQL queries are consuming CPU/RAM, shows wait events
- **RDS Enhanced Monitoring**: View OS-level metrics (CPU, RAM, disk IO per process)
- Enable **Deletion Protection** for production databases

---

## 3. Aurora – AWS Cloud-Native Database

### What is Aurora?
Aurora is a relational database developed by AWS, compatible with MySQL and PostgreSQL, but redesigned to run on AWS infrastructure. Performance **5x higher than MySQL, 3x higher than PostgreSQL**.

### Aurora vs RDS

| Criteria              | RDS (MySQL/PostgreSQL)                   | Aurora                                     |
|-----------------------|------------------------------------------|--------------------------------------------|
| Storage               | EBS (64TB limit)                         | Aurora Storage Engine (auto-scales to 128TB)|
| Replica               | Up to 5 Read Replicas (manual)           | Up to 15 Aurora Replicas (auto)            |
| Replication lag       | Possibly a few seconds                   | <100ms (shared storage)                    |
| Failover              | ~1-2 minutes                             | <30 seconds                                |
| Backtrack             | No                                       | Yes (go back to a point in time, no restore needed) |
| Serverless            | No                                       | Aurora Serverless v2 (auto pause/resume)   |
| Global Database       | Cross-region Read Replica (manual)       | Aurora Global Database (cross-region, lag <1s) |

### Aurora Serverless v2
- Database auto-scales up/down (ACU - Aurora Capacity Unit)
- Can scale to 0 (fully paused) → $0 when idle
- Suitable for: Dev/test, apps with business-hours traffic, new apps with unknown load

### Aurora Global Database
- 1 Primary region (read/write) + up to 5 secondary regions (read-only)
- Cross-region replication with <1 second lag
- Failover to another region <1 minute (typically 30s)
- Used for: Multi-region apps, global DR

### Practical Tips
- **Aurora is the default choice** if you need MySQL/PostgreSQL on AWS, unless you need a specific version Aurora doesn't support
- **Aurora Serverless v2** only scales ACU, doesn't scale to 0 instantly like DynamoDB, still has a slight cold start on resume
- **RDS Proxy** also works with Aurora, reducing connection stress

---

## 4. DynamoDB – NoSQL Serverless

### What is DynamoDB?
DynamoDB is AWS's serverless NoSQL key-value/document database. No server provisioning needed, auto-scales to zero. Single-digit millisecond performance at any scale.

### DynamoDB Core Concepts

| Concept           | Explanation                                                                    |
|-------------------|--------------------------------------------------------------------------------|
| Table             | Table containing items (no fixed schema)                                       |
| Item              | A record (like a row in SQL), maximum 400KB                                    |
| Partition Key     | Primary key for sharding data (hash key)                                       |
| Sort Key          | Secondary key for sorting within a partition (range key)                       |
| GSI (Global Secondary Index) | Index with different partition/sort keys from the base table, for querying along other dimensions |
| LSI (Local Secondary Index)  | Index sharing the same partition key, different sort key                          |

### DynamoDB Capacity Modes

| Mode               | Description                                                           | Suitable for                         |
|--------------------|-----------------------------------------------------------------------|--------------------------------------|
| On-Demand           | Pay per actual request, no capacity planning needed                   | New apps, unpredictable traffic      |
| Provisioned         | Pre-define RCU/WCU (Read/Write Capacity Units), cheaper than On-Demand| Stable, predictable traffic          |
| Reserved            | Commit 1-3 years, additional savings                                 | Long-term production                 |

### DynamoDB Features

| Feature                  | Description                                                              |
|--------------------------|--------------------------------------------------------------------------|
| DAX (DynamoDB Accelerator)| In-memory cache for DynamoDB, reduces latency from milliseconds to microseconds |
| Streams                  | Captures changes (insert/update/delete) in order, triggers Lambda       |
| Global Tables            | Multi-region multi-write, automatic sync                                 |
| TTL                      | Auto-deletes items after a specified time                                |
| Encryption at rest       | Enabled by default, cannot be disabled                                   |
| Point-in-Time Recovery   | Restore to any point in time within 35 days                              |
| Transactions             | ACID transactions for multiple items (has limits)                        |

---

## 5. ElastiCache – In-Memory Cache

### What is ElastiCache?
ElastiCache is a managed service for Redis and Memcached. Data resides in RAM → **microsecond** latency.

### Redis vs Memcached on ElastiCache

| Criteria          | Redis                                        | Memcached                    |
|-------------------|----------------------------------------------|------------------------------|
| Data structure    | String, List, Set, Sorted Set, Hash, Stream  | Pure key-value               |
| Persistence       | Yes (snapshot + AOF)                         | No                           |
| Replication       | Multi-AZ + Read Replica                      | No (pure cache)              |
| Pub/Sub           | Yes                                          | No                           |
| Cluster mode      | Yes (sharding)                               | Yes (node ring)              |
| Use case          | Advanced cache, session store, leaderboard, rate limiter | Simple caching only    |

### ElastiCache Patterns

| Pattern              | Description                                                           |
|----------------------|-----------------------------------------------------------------------|
| Lazy Loading         | App checks cache → miss → query DB → save to cache → return           |
| Write Through        | App writes to DB + cache simultaneously (cache always fresh)          |
| Session Store        | Store user sessions in Redis instead of local memory (stateless app)  |
| Rate Limiter         | Use Redis INCR + EXPIRE to count requests within a time window        |
| Leaderboard          | Use Redis Sorted Set with ZADD and ZRANK                              |

### Practical Tips
- **Redis Auth**: Enable AUTH token to protect the Redis cluster
- **Encryption in transit + at rest**: Enable both for production
- **Multi-AZ**: Use for Redis if HA is needed; Memcached has no Multi-AZ
- **Cluster Mode Enabled**: Use when horizontal scaling (shard data) >1 node group
- Combine with **RDS**: RDS as source-of-truth, Redis as hot cache in front of RDS

---

## 6. Database Selection Summary

| Need                                                                     | Service                        |
|--------------------------------------------------------------------------|--------------------------------|
| App needs SQL, JOINs, transactions, fixed schema                         | **RDS** or **Aurora**          |
| Need highest SQL performance, multi-region, auto-scale                   | **Aurora**                     |
| Cost-optimized for dev/test, intermittent traffic                        | **Aurora Serverless v2**       |
| Large-scale mobile/web app, flexible schema, no JOINs needed             | **DynamoDB**                   |
| Need fast cache (microseconds), session store, pub/sub                   | **ElastiCache (Redis)**        |
| Only need simple key-value cache, no persistence                         | **ElastiCache (Memcached)**    |
| Need MongoDB but want managed                                            | **DocumentDB**                 |
| Graph database (social network, fraud detection)                         | **Neptune**                    |
| Time-series data (IoT, metrics)                                          | **Timestream**                 |
| Need immutable ledger (audit, transaction history)                       | **QLDB**                       |