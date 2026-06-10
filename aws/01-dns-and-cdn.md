# AWS DNS & CDN Services

Two core services that put your application on the internet with high speed and reliability: **Route 53** (DNS) and **CloudFront** (CDN).
- DNS: Domain Name System
- CDN: Content Delivery Network

---

## 1. Overview Comparison Table

| Service       | Nature                          | Primary Role                                              | Pricing Model                                        |
|---------------|---------------------------------|-----------------------------------------------------------|------------------------------------------------------|
| Route 53      | DNS Service (Domain Name System)| Resolves domain names to IP addresses, manages domains    | Number of hosted zones + DNS queries + domain fee    |
| CloudFront    | CDN (Content Delivery Network)  | Distributes static/dynamic content globally, reduces latency | Data transfer volume + number of requests         |

---

## 2. Route 53 - AWS DNS Service

### What can Route 53 do?
- **Domain Registration**: Purchase and manage domain names (example.com, myapp.io...)
- **DNS Routing**: Point domains to ALB, CloudFront, S3 static websites, EC2...
- **Health Checks**: Automatically check endpoint health; if down, failover to another endpoint
- **Routing Policies**: Route traffic intelligently using multiple strategies

### Important Routing Policies

| Policy              | Description                                                              | Use case                                              |
|---------------------|--------------------------------------------------------------------------|-------------------------------------------------------|
| Simple Routing       | Points 1 domain → 1 IP address/endpoint directly                         | Simple apps, dev/test                                  |
| Weighted Routing     | Splits % traffic across multiple endpoints (e.g.: 80% v1, 20% v2)       | Canary deployment, A/B testing                        |
| Latency-based        | Routes users to the nearest AWS region (lowest ping)                     | Global applications, multi-region                     |
| Failover             | Automatically switches to backup endpoint when primary is down           | Active-Passive DR (Disaster Recovery)                 |
| Geolocation          | Routes based on user's geographic location                               | Local law compliance, region-specific content         |
| Geoproximity         | Like Geolocation but can "bias" to expand service regions                | Flexible traffic shifting between regions             |
| Multi-Value Answer   | Returns multiple IPs for client-side selection (like DNS round-robin)    | Increase availability, client-side load balancing     |

### Practical Tips
- Always use **Alias Record** (free) instead of CNAME when pointing to AWS resources (ALB, CloudFront, S3)
- Combine Route 53 Health Checks + Failover for automatic recovery when a region goes down
- Route 53 Resolver enables hybrid DNS: on-premise can resolve names in VPC and vice versa

---

## 3. CloudFront - Global Content Delivery Network

### What is CloudFront?
CloudFront is AWS's CDN, consisting of over **450+ Points of Presence (Edge Locations)** worldwide. When a user requests content, CloudFront serves it from the nearest edge location instead of going all the way back to the origin server (which might be in us-east-1).

### Operational Architecture

```
[User in Vietnam]
       ↓
[CloudFront Edge - Singapore]  ← cache hit? Return immediately
       ↓ (cache miss)
[Origin: S3 bucket / ALB / EC2 / API Gateway]
```

### Origin Types CloudFront Supports

| Origin Type              | Example                                          | Use case                                    |
|--------------------------|--------------------------------------------------|---------------------------------------------|
| S3 Bucket                | Static website, images, video, JS/CSS bundles   | Distributing static files, React/Vue frontend |
| ALB / NLB                | Node.js backend, Java Spring                     | Caching API responses, protecting backend   |
| EC2 Instance             | Traditional web server                           | Monolithic applications                     |
| Lambda Function URL      | Serverless function returning HTTP response      | Small APIs, dynamic image processing        |
| Custom Origin (outside AWS)| On-premise server, server on GCP/Azure          | Hybrid cloud, migration                     |
| MediaStore / MediaPackage| Live streaming video                             | Streaming applications                      |

### Core Features to Know

1. **Caching Behavior**: Create multiple cache behaviors for different path patterns
   - `/*` → cache static images, CSS, JS (long TTL: 1 year)
   - `/api/*` → cache API responses (short TTL: 60s or no-cache)
   
2. **Origin Shield**: Adds a central cache layer between Edge and Origin, reducing requests to origin when multiple edges all have cache misses. Very useful when origin is a small EC2 instance.

3. **Lambda@Edge & CloudFront Functions**: Run code right at the Edge Location
   - **CloudFront Functions**: Lightweight JavaScript, used for HTTP→HTTPS redirect, adding CORS headers, URL rewriting (cheap, latency <1ms)
   - **Lambda@Edge**: More powerful Node.js/Python, used for complex A/B testing, token authentication, dynamic content transformation

4. **Signed URL / Signed Cookies**: Restrict who can view content, used for paid video, premium documents.

5. **Field-Level Encryption**: Encrypt sensitive fields (credit card, SSN) in POST requests before reaching the origin.

6. **Origin Access Control (OAC)**: Lock S3 bucket so only CloudFront can access it; no one can access the S3 URL directly.

### Practical Tips
- Always enable **compress objects automatically** (gzip/brotli) to reduce bandwidth
- Use **Cache Policy** instead of only default TTL - can cache based on query strings, headers, cookies
- **Invalidation** to manually clear cache when deploying new code (charged after 1000 paths/month), or use **versioned file names** (app.v2.js) to avoid needing invalidation
- Combine with **AWS WAF** at the CloudFront layer to block SQL injection, XSS, DDoS at the network edge

---

## 4. How Route 53 + CloudFront Work Together?

A common pattern for web applications:

```
User types myapp.com
    ↓
Route 53 (DNS) → Alias points to CloudFront distribution
    ↓
CloudFront:
    /assets/* → S3 bucket (images, css, js) - long-term cache
    /api/*    → ALB → ECS Fargate backend - short or no-cache
    /*        → S3 static website (React/Vue SPA)
```

Result: Users in Vietnam access the website loading in under 100ms because they are served from the Singapore edge. Backend only handles ~20% of original requests thanks to caching.

---

## 5. When to Use Which Service?

| Scenario                                                             | Solution                       |
|----------------------------------------------------------------------|--------------------------------|
| Just bought a domain, need to point to an AWS app                    | Route 53 + Alias Record        |
| React frontend built to `dist/` folder, need to deploy               | S3 + CloudFront                |
| Node.js backend running on ECS, need to reduce load                  | CloudFront cache /api/*         |
| Need multi-region active-active, users auto-routed to nearest region | Route 53 Latency-based + CloudFront |
| Copyrighted video/images, only paid users can view                   | CloudFront Signed URL + Lambda@Edge authentication |
| Want to redirect HTTP → HTTPS before request reaches origin          | CloudFront Functions (cheap, fast) |
| Want to protect against application-layer DDoS                        | CloudFront + AWS WAF + AWS Shield |