# AWS DNS & CDN Services

Hai dịch vụ cốt lõi giúp ứng dụng của bạn có mặt trên internet với tốc độ cao và độ tin cậy lớn: **Route 53** (DNS) và **CloudFront** (CDN).
- DNS: Domain name system
- CDN: Content delivery network

---

## 1. Bảng so sánh tổng quan

| Dịch vụ       | Bản chất                        | Vai trò chính                                         | Tính phí theo                                     |
|---------------|----------------------------------|-------------------------------------------------------|---------------------------------------------------|
| Route 53      | DNS Service (Domain Name System) | Biến tên miền thành địa chỉ IP, quản lý domain        | Số lượng hosted zone + số query DNS + domain fee   |
| CloudFront    | CDN (Content Delivery Network)   | Phân phối nội dung tĩnh/động toàn cầu, giảm latency   | Dung lượng data transfer + số request              |

---

## 2. Route 53 - Dịch vụ DNS của AWS

### Route 53 làm được gì?
- **Domain Registration**: Mua và quản lý tên miền (example.com, myapp.io...)
- **DNS Routing**: Trỏ tên miền về ALB, CloudFront, S3 static website, EC2...
- **Health Checks**: Tự động kiểm tra sức khỏe endpoint, nếu chết thì failover sang endpoint khác
- **Routing Policies**: Điều hướng traffic thông minh theo nhiều chiến lược

### Các Routing Policy quan trọng

| Policy              | Mô tả                                                                 | Use case                                              |
|---------------------|-----------------------------------------------------------------------|-------------------------------------------------------|
| Simple Routing       | Trỏ thẳng 1 domain → 1 địa chỉ IP/endpoint                            | App đơn giản, dev/test                                 |
| Weighted Routing     | Chia % traffic giữa nhiều endpoint (vd: 80% v1, 20% v2)              | Canary deployment, A/B testing                        |
| Latency-based        | Điều hướng user đến region AWS gần nhất (ping thấp nhất)              | Ứng dụng toàn cầu, multi-region                       |
| Failover             | Tự động chuyển sang backup endpoint khi primary chết                  | Active-Passive DR (Disaster Recovery)                  |
| Geolocation          | Điều hướng theo vị trí địa lý của user                                | Tuân thủ luật pháp địa phương, nội dung theo vùng      |
| Geoproximity         | Như Geolocation nhưng có thể "bias" (lệch) để mở rộng vùng phục vụ    | Traffic shifting linh hoạt giữa các region             |
| Multi-Value Answer   | Trả về nhiều IP cho client tự chọn (giống DNS round-robin)            | Tăng availability, client-side load balancing          |

### Mẹo thực tế
- Luôn dùng **Alias Record** (miễn phí) thay vì CNAME khi trỏ đến AWS resources (ALB, CloudFront, S3)
- Kết hợp Route 53 Health Checks + Failover để tự động phục hồi khi một region sập
- Route 53 Resolver cho phép hybrid DNS: on-premise có thể resolve tên trong VPC và ngược lại

---

## 3. CloudFront - Mạng phân phối nội dung toàn cầu

### CloudFront là gì?
CloudFront là CDN của AWS, gồm hơn **450+ điểm hiện diện (Edge Locations)** trên toàn cầu. Khi user request nội dung, CloudFront phục vụ từ edge location gần nhất thay vì phải về origin server (có thể ở tận us-east-1).

### Kiến trúc hoạt động

```
[User ở Việt Nam]
      ↓
[CloudFront Edge - Singapore]  ← cache hit? Trả luôn
      ↓ (cache miss)
[Origin: S3 bucket / ALB / EC2 / API Gateway]
```

### Các loại Origin CloudFront hỗ trợ

| Origin Type              | Ví dụ                                          | Use case                                    |
|--------------------------|------------------------------------------------|---------------------------------------------|
| S3 Bucket                | Static website, ảnh, video, JS/CSS bundle     | Phân phối file tĩnh, frontend React/Vue      |
| ALB / NLB                | Backend Node.js, Java Spring                  | Caching API response, bảo vệ backend         |
| EC2 Instance             | Web server truyền thống                        | Ứng dụng monolithic                          |
| Lambda Function URL      | Serverless function trả HTTP response          | API nhỏ, xử lý ảnh động                      |
| Custom Origin (ngoài AWS)| On-premise server, server ở GCP/Azure          | Hybrid cloud, migration                      |
| MediaStore / MediaPackage| Live streaming video                           | Ứng dụng streaming                           |

### Các tính năng cốt lõi cần biết

1. **Caching Behavior**: Tạo nhiều cache behavior cho từng path pattern khác nhau
   - `/*` → cache static ảnh, CSS, JS (TTL dài: 1 năm)
   - `/api/*` → cache response API (TTL ngắn: 60s hoặc no-cache)
   
2. **Origin Shield**: Thêm 1 layer cache trung tâm giữa Edge và Origin, giảm số request về origin khi nhiều edge cùng cache miss. Rất hữu ích khi origin là EC2 yếu.

3. **Lambda@Edge & CloudFront Functions**: Chạy code ngay tại Edge Location
   - **CloudFront Functions**: JavaScript nhẹ, dùng cho redirect HTTP→HTTPS, thêm header CORS, rewrite URL (rẻ, latency <1ms)
   - **Lambda@Edge**: Node.js/Python mạnh hơn, dùng cho A/B testing phức tạp, xác thực token, dynamic content transformation

4. **Signed URL / Signed Cookies**: Giới hạn ai được xem nội dung, dùng cho video trả phí, tài liệu premium.

5. **Field-Level Encryption**: Mã hóa các trường nhạy cảm (credit card, SSN) trong POST request trước khi về origin.

6. **Origin Access Control (OAC)**: Khóa S3 bucket chỉ cho CloudFront truy cập, không cho ai truy cập trực tiếp S3 URL.

### Mẹo thực tế
- Luôn bật **compress objects automatically** (gzip/brotli) để giảm bandwidth
- Dùng **Cache Policy** thay vì chỉ dùng TTL mặc định - có thể cache dựa trên query string, header, cookie
- **Invalidation** xóa cache thủ công khi deploy code mới (mất phí sau 1000 paths/tháng), hoặc dùng **versioned file name** (app.v2.js) để tránh cần invalidate
- Kết hợp với **AWS WAF** ở layer CloudFront để chặn SQL injection, XSS, DDoS ngay từ biên mạng

---

## 4. Route 53 + CloudFront kết hợp như thế nào?

Một pattern phổ biến cho web application:

```
User gõ myapp.com
    ↓
Route 53 (DNS) → Alias trỏ đến CloudFront distribution
    ↓
CloudFront:
    /assets/* → S3 bucket (ảnh, css, js) - cache dài hạn
    /api/*    → ALB → ECS Fargate backend - cache ngắn hoặc no-cache
    /*        → S3 static website (React/Vue SPA)
```

Kết quả: User Việt Nam truy cập web load dưới 100ms vì được phục vụ từ edge Singapore, backend chỉ chịu ~20% request gốc nhờ cache.

---

## 5. Khi nào dùng dịch vụ nào?

| Tình huống                                                          | Giải pháp                      |
|----------------------------------------------------------------------|--------------------------------|
| Mới mua domain, cần trỏ về app AWS                                   | Route 53 + Alias Record        |
| Frontend React build ra folder `dist/`, muốn deploy                  | S3 + CloudFront                |
| Backend Node.js chạy ECS, muốn giảm tải                              | CloudFront cache /api/*         |
| Cần multi-region active-active, user auto đến region gần nhất        | Route 53 Latency-based + CloudFront |
| Video/ảnh có bản quyền, chỉ user trả phí mới xem                    | CloudFront Signed URL + Lambda@Edge xác thực |
| Muốn redirect HTTP → HTTPS trước khi request đến origin              | CloudFront Functions (rẻ, nhanh) |
| Muốn chống DDoS tầng ứng dụng                                        | CloudFront + AWS WAF + AWS Shield |