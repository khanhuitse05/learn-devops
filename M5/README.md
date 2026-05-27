# M5: Entry Layer with ALB, ACM, Route 53, and API Gateway

M5 covers how user traffic enters the system. You will learn how a domain uses
HTTPS to reach an ALB or API Gateway and how traffic is routed to backend
services.

## Learning Goals

- Request and validate ACM certificates.
- Configure ALB listeners, target groups, listener rules, and health checks.
- Point Route 53 DNS records to ALB/API Gateway.
- Understand when API Gateway fits in front of backend services.
- Debug common `502`, `503`, DNS, and TLS problems.

## Target Flow

```text
Client
  -> Route 53 DNS
  -> HTTPS 443
  -> ACM certificate on ALB
  -> ALB listener rule
  -> Target group
  -> ECS task or EC2 target
```

## Core Topics

### ACM

- Public certificate for internet-facing HTTPS.
- DNS validation is preferred because renewal can be automatic.
- Certificate region must match the service using it.

### ALB

- Listener: accepts traffic on `80` or `443`.
- Rule: routes by host/path/header.
- Target group: list of ECS tasks, EC2 instances, or IP targets.
- Health check: decides whether targets can receive traffic.

### Route 53

- Hosted zone stores DNS records.
- Alias `A` record can point apex or subdomain to an ALB.
- TTL affects rollback speed for non-alias records.

### API Gateway

- Useful for API throttling, auth integration, custom domains, and lightweight
  request routing.
- HTTP API is simpler and often cheaper than REST API.

## Hands-On Lab

1. Request an ACM certificate for a test subdomain.
2. Validate it with Route 53 DNS.
3. Create an ALB in public subnets.
4. Create target group for the demo app.
5. Add HTTP listener first, then HTTPS listener.
6. Create a Route 53 alias record to the ALB.
7. Test `/health` through the domain.

## Useful Commands

```bash
aws acm list-certificates --output table
aws elbv2 describe-load-balancers --output table
aws elbv2 describe-target-health --target-group-arn TARGET_GROUP_ARN
dig A api.example.com
curl -i https://api.example.com/health
```

## Production Notes

- Wrong health check path can make healthy apps look unhealthy.
- ALB must live in at least two subnets across Availability Zones.
- ECS security group should allow inbound app port only from ALB security group.
- Redirect HTTP to HTTPS only after HTTPS works.
- Prepare DNS rollback before switching real traffic.

## Troubleshooting

- `502`: target port/protocol mismatch, app crashed, or bad response.
- `503`: no healthy targets or listener rule points to empty target group.
- TLS error: wrong certificate, missing SAN, expired cert, or DNS still points
  elsewhere.
- Domain does not resolve: check hosted zone, nameservers, and record name.
