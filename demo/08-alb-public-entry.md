# 08 - ALB Public Entry

## Objective

Create a public Application Load Balancer to access the ECS app via HTTP and test `/health`, `/flow`, `/api/demo-order`, `/test-error`.

## Prerequisites

- Completed [step 04](04-vpc-network.md): 2 public subnets and `learn-devops-demo-alb-sg` still exist.
- Completed [step 07](07-ecs-fargate-service.md): ECS service still exists and desired count is `1`.
- ECS task is in `RUNNING` status and the app is listening on port `3000`.
- If ECS service was scaled to `0`, scale back to `1` first.
- If ALB was cleaned up from a previous run, recreate per this step.

## Knowledge to understand

- ALB resides in public subnets.
- Target group forwards traffic to ECS task port 3000.
- Health check path should be `/health`.
- ALB Security Group receives HTTP from the internet; ECS Security Group only receives from ALB SG.

## Estimated cost

- ALB charges by hour and LCU.
- Target group is negligible compared to ALB.
- For a short lab, the cost is much lower than leaving ALB running for many days.

## Cost warning for paid services

ALB incurs charges even without traffic. Delete ALB after the demo is complete.

## Console steps

1. Go to AWS Console -> EC2 -> Load Balancers.
2. Select Create load balancer -> Application Load Balancer.
3. Under Basic configuration:
   - Load balancer name: `learn-devops-demo-alb`.
   - Scheme: select Internet-facing.
   - Load balancer IP address type: select IPv4.
4. Under Network mapping:
   - VPC: select `learn-devops-demo-vpc`.
   - IPAM pools: do not check Use IPAM pool for public IPv4 addresses.
   - Availability Zones and subnets: select 2 Availability Zones.
   - For each Availability Zone, select the corresponding public subnet created in step 04.
5. Under Security groups:
   - Remove the `default` security group if selected.
   - Select `learn-devops-demo-alb-sg`.
6. Under Listeners and routing:
   - Listener protocol: HTTP.
   - Listener port: 80.
   - Default action: Forward to target groups.
7. If no target group exists, select create target group and create:
   - Under Target type: select IP addresses.
   - Target group name: `learn-devops-demo-node-tg`.
   - Protocol: HTTP.
   - Port: 3000.
   - IP address type: IPv4.
   - VPC: select `learn-devops-demo-vpc`.
   - Protocol version: HTTP1.
   - Health check protocol: HTTP.
   - Health check path: `/health`.
   - Advanced health check settings: keep defaults.
   - Target optimizer: select Off - Default.
   - Attributes and Tags: keep defaults, no need to add.
   - Select Next.
   - At the Register targets step: no need to manually register targets yet, because ECS service will auto-register the task into the target group after attaching.
   - Select Review and create -> Create target group.
8. Return to the Create Application Load Balancer screen, under Target group select `learn-devops-demo-node-tg`.
9. Optional sections like Load balancer tags, CloudFront/WAF, AWS WAF, and AWS Global Accelerator: keep defaults, do not check anything extra.
10. Review the Review section:
    - Scheme: Internet-facing.
    - IP address type: IPv4.
    - VPC: `learn-devops-demo-vpc`.
    - Security groups: `learn-devops-demo-alb-sg`.
    - Listener: HTTP:80 forward to `learn-devops-demo-node-tg`.
11. Select Create load balancer.
12. Update ECS service to attach the target group:
    - Go to ECS Console -> Clusters -> select `learn-devops-demo-cluster`.
    - Open the Services tab -> select `learn-devops-demo-node-service`.
    - Select Update service.
    - Under Load balancing, select Application Load Balancer.
    - Load balancer: select `learn-devops-demo-alb`.
    - Listener: select HTTP:80.
    - Target group: select `learn-devops-demo-node-tg`.
    - Container to load balance:
      - Container name: `app`.
      - Container port: `3000`.
    - Desired tasks: keep `1`.
    - Keep remaining items as default, select Update.
    - ECS will redeploy the service and auto-register the Fargate task's private IP into the target group.
13. Wait for the target to become healthy.

## CLI check/debug commands

View ALB DNS:

```bash
aws elbv2 describe-load-balancers \
  --names learn-devops-demo-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text
```

Save DNS:

```bash
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names learn-devops-demo-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

curl -i "http://$ALB_DNS/health"
curl -i "http://$ALB_DNS/flow"
curl -i "http://$ALB_DNS/api/demo-order"
curl -i "http://$ALB_DNS/test-error"
curl -i "http://$ALB_DNS/health"
```

`/test-error` returns intentional HTTP `500` to generate 5xx data for step 10, but the app remains alive so `/health` must continue returning HTTP `200`.

The PostgreSQL endpoints already exist in the image but don't need to return HTTP 200 at this step. After injecting `DATABASE_URL` in step 09, test additionally:

```bash
curl -i "http://$ALB_DNS/api/db/health"
curl -i "http://$ALB_DNS/api/orders"
```

View target health:

```bash
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
  --names learn-devops-demo-node-tg \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

aws elbv2 describe-target-health \
  --target-group-arn "$TARGET_GROUP_ARN" \
  --output table
```

## Expected result

- ALB DNS returns HTTP 200 for `/health`.
- Target group health is `healthy`.
- `/flow` shows the entry layer that can simulate ALB.
- `/test-error` returns intentional HTTP 500 and does not make the target unhealthy.
- No need to modify server code when attaching ALB.

## Cleanup

- If continuing immediately to steps 09 and 10: keep ALB, target group, and ECS service. The next two steps use ALB to test the app.
- If pausing or not continuing: delete ALB because ALB charges by the hour even without traffic. Can scale ECS service to `0` per step 07.

ALB deletion order:

1. Update ECS service to detach the target group or delete the service.
2. Delete ALB.
3. Delete target group.

CLI:

```bash
aws elbv2 describe-load-balancers \
  --names learn-devops-demo-alb \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text
```

Use the returned ARN to delete via CLI:

```bash
aws elbv2 delete-load-balancer --load-balancer-arn YOUR_ALB_ARN
aws elbv2 delete-target-group --target-group-arn YOUR_TARGET_GROUP_ARN
```

## Troubleshooting

- Target unhealthy: check `/health`, port 3000, ECS SG inbound from ALB SG.
- ALB 502: app not listening on the correct port or task restarting.
- ALB timeout: wrong route/Security Group or task not reachable from ALB.