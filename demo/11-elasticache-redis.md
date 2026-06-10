# 11 - ElastiCache Redis

## Objective

Create a private Redis cache using Amazon ElastiCache to understand the cache layer in a production backend. The roadmap chooses ElastiCache over EFS because the demo app already has the `/api/demo-order` endpoint simulating Redis/cache, so learning cache will better match the current flow.

## Prerequisites

- Completed [step 04](04-vpc-network.md): VPC, private subnets, and security groups still exist.
- Completed [step 07](07-ecs-fargate-service.md): ECS service is still running in the private subnet.
- Should complete [step 09](09-secrets-and-env.md) to be familiar with env vars/runtime config.
- If network or ECS service was cleaned up: rerun the corresponding step first.

## Knowledge to understand

- ElastiCache Redis should be in private subnets, not public internet.
- The ECS app needs a security group rule to connect to Redis port `6379`.
- Redis is commonly used for cache/sessions/rate limiting, not a replacement for the primary database.
- This lab focuses on understanding network, endpoint, and config; the current app simulates Redis status via an env var.

## Estimated cost

ElastiCache is still a paid service. With the new Console, this lab prioritizes Redis OSS Serverless because it's easy to create, doesn't require selecting a node type, and is suitable for quickly learning network/cache endpoints. Delete the cache immediately after learning if not continuing to use it.

## Cost warning for paid services

Don't leave the Redis cache running overnight if just learning. ElastiCache is not free like local Docker Redis.

## Console steps

### 1. Create Security Group for Redis first

1. Go to EC2 > Security Groups > Create security group.
2. Security group name: `learn-devops-demo-redis-sg`.
3. Description: `Allow ECS to access Redis`.
4. VPC: select `learn-devops-demo-vpc`.
5. Inbound rules:
   - Type: Custom TCP.
   - Port range: `6379`.
   - Source: select the ECS service security group, e.g., `learn-devops-demo-ecs-sg`.
6. Outbound rules: keep defaults.
7. Create security group.

Redis needs no public inbound. Only the ECS security group is allowed to call Redis port `6379`.

### 2. Create Redis OSS cache using the new Console screen

1. Go to ElastiCache > Caches > Create cache.
2. If a Valkey introduction popup appears, click **Continue with Redis OSS**.
3. On the **Create Redis OSS cache** screen, select as follows:
   - Engine: **Redis OSS**.
   - Deployment option: **Serverless**.
   - Creation method: **New cache**.
4. Settings:
   - Name: `learn-devops-demo-redis`.
   - Description: can leave empty.
5. Default settings:
   - Select **Customize default settings** to check VPC, subnet, and security group yourself.
6. Connectivity:
   - Network type: **IPv4**.
   - VPC ID: select VPC `learn-devops-demo-vpc`.
   - Availability Zones/Subnets: only select the demo private subnets:
     - `learn-devops-demo-vpc-subnet-private1-ap-southeast-1a`
     - `learn-devops-demo-vpc-subnet-private2-ap-southeast-1b`
   - Do not select subnets containing `public`.
7. Security:
   - Select **Customize your security settings**.
   - Security groups: select `learn-devops-demo-redis-sg`.
   - Do not use the `default` security group for this lab.
8. Backup:
   - Uncheck **Enable automatic backups** for short-term lab.
9. Usage limits:
   - Can leave defaults if just learning quickly.
10. Tags:
    - Optional. Can add tag `Project=learn-devops`.
11. Click **Create**.
12. Wait for the cache to transition to **Available** status.
13. Open the newly created cache and copy the endpoint. Prefer the primary endpoint in the **Endpoint** section, don't use the reader endpoint if you only need a simple single host.
14. Update ECS task/service env var if you want to note the cache endpoint:
    Go to ECS > Task definitions -> Select family: learn-devops-demo-node -> Select the latest revision -> Create new revision

    - `REDIS_HOST=<redis-primary-endpoint>`
    - `DEMO_REDIS_STATUS=ok`

If the Console requires selecting a node type, you are in the **Node-based cluster** flow. Go back to the Deployment option section and select **Serverless** to match this lab.

## CLI check/debug commands

List Redis OSS Serverless caches:

```bash
aws elasticache describe-serverless-caches \
  --query 'ServerlessCaches[?contains(ServerlessCacheName, `learn-devops-demo`)].{Name:ServerlessCacheName,Status:Status,Engine:Engine,Endpoint:Endpoint.Address,Port:Endpoint.Port}' \
  --output table
```

Check Redis security group:

```bash
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=learn-devops-demo-redis-sg" \
  --query 'SecurityGroups[].IpPermissions' \
  --output json
```

Test app flow via ALB:

```bash
curl -i "http://$ALB_DNS/api/demo-order"
```

## Expected result

- Redis cache `learn-devops-demo-redis` is in available status.
- Redis is only in the private network.
- Security group allows ECS to connect to Redis port `6379`.
- `/api/demo-order` still returns the dependency flow with Redis/cache.

## Cleanup

- If continuing to Grafana/CloudFormation/Terraform immediately: can keep Redis to observe the resource.
- If pausing: delete the Redis cache to avoid charges.
- If finishing the entire demo: move to [step 15](15-cleanup-cost-control.md).

Delete Redis OSS Serverless cache:

```bash
aws elasticache delete-serverless-cache \
  --serverless-cache-name learn-devops-demo-redis
```

## Troubleshooting

- ECS cannot connect to Redis: check Redis SG inbound port `6379` from ECS SG.
- Endpoint not visible: wait for status to become available.
- Real Redis app/client TLS error: Serverless Redis OSS may require TLS, use `rediss://` or enable TLS in the Redis client.
- Cannot delete security group: delete the cache first, wait for delete to complete, then delete the security group.