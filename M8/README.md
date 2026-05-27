# M8: Data Layer with RDS, Redis, and EFS

M8 covers stateful services. The goal is to connect application services to
managed data stores privately, protect data with backups, and understand restore
procedures.

## Learning Goals

- Create private RDS PostgreSQL access from ECS or EC2.
- Understand Redis/ElastiCache for cache, sessions, queues, and rate limits.
- Use EFS for shared file storage when an app truly needs files.
- Configure security groups and subnets for private connectivity.
- Practice backup and restore, not only backup creation.

## Core Topics

### RDS

- DB instance or cluster.
- DB subnet group.
- Security group on port `5432` for PostgreSQL.
- Parameter group.
- Automated backup, snapshot, point-in-time recovery.
- Multi-AZ for higher availability.

### ElastiCache Redis

- Subnet group and security group.
- Port `6379`.
- Eviction policy and memory pressure.
- TLS/auth where supported.
- Use cases: cache, sessions, queue broker.

### EFS

- Mount targets in private subnets.
- Security group allows NFS port `2049` from ECS/EC2.
- Access points for safer path and permission control.
- EFS is shared storage, not a database replacement.

## Hands-On Lab

1. Create private RDS PostgreSQL in the VPC from M4.
2. Connect from a private EC2 test host or ECS task.
3. Create a snapshot and restore to a new dev database.
4. Create Redis dev cluster and test connectivity.
5. Create EFS with mount targets in two AZs.
6. Mount EFS from ECS or EC2 and verify read/write permissions.

## Useful Commands

```bash
aws rds describe-db-instances --output table
aws rds describe-db-snapshots --output table
aws elasticache describe-cache-clusters --show-cache-node-info --output table
aws efs describe-file-systems --output table
aws efs describe-mount-targets --file-system-id FS_ID --output table
```

Connection tests from a private host:

```bash
nc -vz DB_ENDPOINT 5432
nc -vz REDIS_ENDPOINT 6379
nc -vz EFS_MOUNT_TARGET_IP 2049
```

## Production Notes

- Never public RDS or Redis unless there is a very specific and reviewed
  design.
- RDS security group should accept traffic from app/ECS security group only.
- Always test restore. A backup that has never been restored is only a hope.
- Plan maintenance windows and parameter changes carefully.
- Monitor storage, connections, CPU, memory, and replication lag if applicable.

## Troubleshooting

- App cannot connect to DB: check endpoint, port, SG, subnet route, credentials.
- Too many DB connections: add pooling and tune app concurrency.
- Redis memory full: inspect eviction policy and key sizes.
- EFS permission denied: check POSIX UID/GID, access point, and mount path.
