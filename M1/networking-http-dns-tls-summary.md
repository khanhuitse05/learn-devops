# M1 Summary: Networking, HTTP, DNS, and TLS

M1 is about understanding how a user request reaches your backend and where it
can fail. In DevOps work, many production incidents are network problems:
wrong DNS, closed port, bad TLS certificate, blocked firewall rule, slow
upstream service, or failing health check.

## Request Flow

Typical production flow:

```text
Mobile app / browser
  -> DNS resolves domain
  -> HTTPS connection starts on port 443
  -> TLS certificate is checked
  -> ALB or API Gateway receives request
  -> ECS service receives request
  -> app talks to RDS / Redis / EFS
  -> response goes back through the same path
```

When debugging, check each hop in order.

## Core Concepts

### HTTP

HTTP is the request and response protocol between client and server.

Important parts:

- Method: `GET`, `POST`, `PUT`, `DELETE`
- URL/path: `/health`, `/api/users`
- Headers: metadata such as `Host`, `Authorization`, `Content-Type`
- Body: JSON/form data sent by the client
- Status code: result from the server

Common status codes:

| Code | Meaning | DevOps clue |
| --- | --- | --- |
| `200` | OK | Request worked |
| `301/302` | Redirect | Check HTTP to HTTPS redirect or wrong URL |
| `400` | Bad request | Client sent invalid input |
| `401/403` | Unauthorized/forbidden | Auth, token, IAM, or policy issue |
| `404` | Not found | Wrong route, listener rule, or app path |
| `500` | App error | Check application logs |
| `502` | Bad gateway | ALB cannot talk correctly to target |
| `503` | Service unavailable | No healthy targets, app down, overload |
| `504` | Gateway timeout | App, database, or network path too slow |

### DNS

DNS maps names to network targets.

Common record types:

- `A`: domain to IPv4 address.
- `AAAA`: domain to IPv6 address.
- `CNAME`: domain alias to another domain.
- `ALIAS`: provider-specific alias, often used for AWS ALB/CloudFront apex domains.

Key idea: DNS has cache. `TTL` controls how long clients/resolvers may cache a
record. Before changing production DNS, reduce TTL first and prepare rollback.

### TLS and HTTPS

TLS protects HTTP traffic. HTTPS means HTTP over TLS.

TLS checks:

- The certificate matches the domain.
- The certificate is not expired.
- The certificate chain is trusted.
- The client and server can agree on TLS settings.

In AWS, common TLS places are ACM certificates on ALB, CloudFront, or API
Gateway.

### Ports, Protocols, and Firewalls

Common ports:

| Port | Protocol | Use |
| --- | --- | --- |
| `22` | TCP | SSH |
| `80` | TCP | HTTP |
| `443` | TCP | HTTPS |
| `3000` | TCP | Common local Node.js app |
| `5432` | TCP | PostgreSQL |
| `6379` | TCP | Redis |

Firewall-style checks:

- Is the app listening on the expected port?
- Does the security group allow inbound traffic from the right source?
- Does the target service allow outbound traffic?
- Is the service in a public or private subnet?
- Does the route table have the needed route?

## Practice Commands

Run these from macOS host or Ubuntu VM unless noted.

### Check HTTP Status and Headers

```bash
curl -i http://localhost:3000/health
```

Only show status and timing:

```bash
curl -o /dev/null -s -w "status=%{http_code} time=%{time_total}s\n" http://localhost:3000/health
```

Set a timeout so the command does not hang forever:

```bash
curl --connect-timeout 3 --max-time 5 -i http://localhost:3000/health
```

### Check DNS

```bash
dig example.com
```

Check a specific record:

```bash
dig A example.com
dig CNAME www.example.com
```

Alternative command:

```bash
nslookup example.com
```

### Check TLS Certificate

```bash
openssl s_client -connect example.com:443 -servername example.com
```

Useful lines to inspect:

- `subject=`: certificate domain.
- `issuer=`: certificate authority.
- `Verify return code: 0 (ok)`: certificate chain is valid.

### Check Listening Ports on Ubuntu

Run on Ubuntu VM:

```bash
ss -tulpn
```

Find a specific port:

```bash
ss -tulpn | grep ':3000'
```

## Debugging Checklist

When a web service is not reachable:

1. Is the domain resolving to the expected target?
2. Is the client using the right protocol: `http` or `https`?
3. Is the TLS certificate valid for the domain?
4. Is the load balancer listener open on `80` or `443`?
5. Is the target group healthy?
6. Is the app listening on the expected port?
7. Do security groups allow the path?
8. Can the app reach its database/cache/storage?
9. Do logs show app errors, timeouts, or dependency failures?

## M1 Exercises

1. Draw the request flow:

```text
Mobile app -> DNS -> ALB/API Gateway -> ECS -> RDS/Redis/EFS
```

2. Start the demo Node.js service and test it with `curl`.
3. Use `dig` or `nslookup` on a real domain.
4. Use `openssl s_client` to inspect a real HTTPS certificate.
5. Explain one possible failure at each hop in the request flow.

