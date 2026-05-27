# M1: Networking, HTTP, DNS, and TLS

M1 teaches how requests travel from a client to a backend service and where
they commonly fail. Most AWS incidents involve DNS, TLS, firewall rules,
timeouts, routing, or health checks.

## Learning Goals

- Explain the request path from mobile app or browser to backend.
- Debug HTTP status codes, headers, timeouts, and redirects.
- Understand DNS records, TTL, propagation, and rollback.
- Understand TLS certificates, HTTPS, and certificate validation.
- Connect these concepts to ALB, API Gateway, ECS, RDS, Redis, and EFS.

## Request Flow

```text
Mobile app or browser
  -> DNS resolves domain
  -> HTTPS connection on port 443
  -> TLS certificate validation
  -> ALB or API Gateway
  -> ECS service
  -> RDS / Redis / EFS
  -> response returns to client
```

## Core Topics

### HTTP

- Methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- Status codes: `200`, `301`, `400`, `401`, `403`, `404`, `500`, `502`,
  `503`, `504`.
- Headers: `Host`, `Authorization`, `Content-Type`, `X-Forwarded-For`.
- Health checks and timeout behavior.

### DNS

- `A`, `AAAA`, `CNAME`, and AWS Alias records.
- TTL and resolver cache.
- Hosted zones and subdomain delegation.
- DNS rollback planning.

### TLS

- Certificate subject and SAN.
- Certificate chain and issuer.
- ACM certificates on ALB, CloudFront, and API Gateway.
- Domain validation by DNS.

### Network Basics

- Ports and protocols.
- CIDR ranges.
- Public and private subnets.
- Firewall/security group direction.

## Hands-On Lab

1. Draw the request flow from mobile app to API and data layer.
2. Run the demo Node.js app and test `/health` with `curl`.
3. Use `dig` or `nslookup` against a real domain.
4. Use `openssl s_client` to inspect a real certificate.
5. Explain one possible failure at each hop.

## Useful Commands

```bash
curl -i http://localhost:3000/health
curl --connect-timeout 3 --max-time 5 -i https://example.com
dig A example.com
dig CNAME www.example.com
nslookup example.com
openssl s_client -connect example.com:443 -servername example.com
ss -tulpn
```

## Production Notes

- Lower DNS TTL before planned migrations.
- Test certificates before switching production traffic.
- Keep health check paths simple and independent of slow dependencies.
- ALB `502` often means the target responded incorrectly or closed the
  connection.
- ALB `503` often means no healthy targets.

## Extra Notes

- See `networking-http-dns-tls-summary.md` for a compact cheat sheet.
- See `mobile-dns-alb-ecs-rds-redis-efs-flow.md` for the architecture flow.
