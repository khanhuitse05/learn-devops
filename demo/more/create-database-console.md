# Tạo RDS PostgreSQL bằng AWS Console

Hướng dẫn này tạo database private cho bài [05 - RDS PostgreSQL](../05-rds-postgresql.md).

## Kết quả cần tạo

```text
RDS PostgreSQL: learn-devops-demo-postgres
├── Database: devops_demo
├── Master username: devops_demo
├── Port: 5432
├── Deployment: Single-AZ
├── Public access: No
└── VPC: learn-devops-demo-vpc
```

Database chạy trong private subnets và chỉ nhận kết nối từ Security Group của ECS task.

## Điều kiện trước khi tạo

Hoàn thành bài [04 - VPC Network](../04-vpc-network.md) trước. Cần có:

- VPC `learn-devops-demo-vpc`.
- Hai private subnet thuộc hai Availability Zone khác nhau.
- Security Group `learn-devops-demo-rds-sg`.
- Rule inbound PostgreSQL port `5432` của RDS SG chỉ nhận traffic từ `learn-devops-demo-ecs-sg`.

## Mở màn hình tạo database

1. Đăng nhập AWS Console.
2. Tìm service `Aurora and RDS`.
3. Vào `Databases`.
4. Nhấn `Create database` → `Full configuration`.

## Chọn engine và deployment

| Field | Giá trị cần chọn hoặc nhập | Giải thích |
| --- | --- | --- |
| `Engine type` | `PostgreSQL` | Dùng RDS PostgreSQL tiêu chuẩn, không chọn Aurora. |
| `Choose a database creation method` | `Full configuration` | Cho phép cấu hình private network và chi phí. |
| `Template` | `Free tier` nếu khả dụng | Dùng cấu hình nhỏ cho lab. |
| `Deployment options` | `Single-AZ DB instance deployment (1 instance)` | Không tạo standby instance có tính phí. |
| `Engine version` | Giữ phiên bản PostgreSQL mặc định đang được AWS đề xuất | Schema của demo chỉ dùng tính năng PostgreSQL cơ bản. |
| `Enable RDS Extended Support` | Không bật | Lab không cần dịch vụ hỗ trợ mở rộng có tính phí. |

`Free tier` là tên template cấu hình nhỏ. Hóa đơn thực tế còn phụ thuộc điều kiện ưu đãi hoặc credit của account. RDS vẫn có thể tính phí theo instance giờ, storage, backup và data transfer.

## Điền settings và credentials

| Field | Giá trị cần chọn hoặc nhập |
| --- | --- |
| `DB instance identifier` | `learn-devops-demo-postgres` |
| `Master username` | `devops_demo` |
| `Credentials management` | `Self managed` |
| `Master password` | Tự nhập password mạnh hoặc bật `Auto generate a password` |
| `Database authentication options` | `Password authentication` |

Không lưu password trong Git. Nếu bật `Auto generate a password`, AWS chỉ hiển thị password một lần sau khi tạo database. Cần lưu password vào password manager trước khi đóng hộp thoại.

## Điền instance và storage

| Field | Giá trị cần chọn hoặc nhập | Giải thích |
| --- | --- | --- |
| `DB instance class` | `Burstable classes (includes t classes)` | Phù hợp với tải nhỏ của lab. |
| `Instance type` | `db.t4g.micro` nếu khả dụng | Chọn instance nhỏ để tiết kiệm chi phí. |
| `Storage type` | `General Purpose SSD (gp2)` | Đủ dùng cho lab. |
| `Allocated storage` | `20 GiB` | Mức tối thiểu phù hợp với lab. |
| `Enable storage autoscaling` | Không bật | Tránh storage tự tăng ngoài dự kiến. |

## Điền connectivity

| Field | Giá trị cần chọn hoặc nhập |
| --- | --- |
| `Compute resource` | `Don't connect to an EC2 compute resource` |
| `Virtual private cloud (VPC)` | `learn-devops-demo-vpc` |
| `Public access` | `No` |
| `VPC security group (firewall)` | `Choose existing` |
| `Existing VPC security groups` | `learn-devops-demo-rds-sg` |
| `Availability Zone` | `No preference` |
| `Create an RDS Proxy` | Không bật |
| `Certificate authority` | Giữ mặc định |

### Tạo DB subnet group nếu danh sách đang trống

Nếu mục `DB subnet group` chỉ hiển thị `Create new DB Subnet Group`, chọn mục đó và điền:

| Field | Giá trị cần chọn hoặc nhập |
| --- | --- |
| `Name` | `learn-devops-demo-rds-subnet-group` |
| `Description` | `Private subnets for RDS demo` |
| `VPC` | `learn-devops-demo-vpc` |

Thêm đúng hai private subnet thuộc hai Availability Zone khác nhau:

- Private subnet A: `10.0.11.0/24`.
- Private subnet B: `10.0.12.0/24`.

Không chọn public subnet `10.0.1.0/24` hoặc `10.0.2.0/24`. Nếu đã dùng CIDR khác khi tạo VPC, chọn hai private subnet tương ứng thay vì đối chiếu theo CIDR mẫu.

## Điền additional configuration

Mở `Additional configuration` và điền:

| Field | Giá trị cần chọn hoặc nhập |
| --- | --- |
| `Initial database name` | `devops_demo` |
| `Backup retention period` | Mức thấp nhất phù hợp lab |
| `Enable deletion protection` | Không bật |

Giữ `Database Insights - Standard`. Để lab tối giản chi phí:

- Không chọn `Database Insights - Advanced`.
- Có thể tắt `Enable Performance Insights`.
- Không bật `Enhanced Monitoring`.
- Không bật `Log exports`.

Nhấn `Create database`.

### Lưu password được AWS tự tạo

Nếu đã bật `Auto generate a password`, vào trang `Databases` và nhấn `View credential details` ngay sau khi tạo database. Trong hộp thoại `Connection details to your database`:

1. Xác nhận `Master username` là `devops_demo`.
2. Copy `Master password`.
3. Lưu password vào password manager.
4. Chỉ đóng hộp thoại sau khi đã lưu password.

AWS không cho xem lại password tự tạo sau khi đóng hộp thoại này. Nếu làm mất password, chờ database chuyển sang `Available`, vào database → `Modify` và đặt master password mới.

Sau đó chờ status chuyển thành `Available`.

## Kiểm tra sau khi tạo

Vào database `learn-devops-demo-postgres` và xác nhận:

- `Status` là `Available`.
- `Publicly accessible` là `No`.
- VPC là `learn-devops-demo-vpc`.
- Port là `5432`.
- Security Group là `learn-devops-demo-rds-sg`.
- Endpoint đã xuất hiện để dùng cho các bước tiếp theo.

## Lưu ý chi phí

RDS có thể phát sinh phí ngay cả khi không có request. Nếu tạm dừng lab hoặc không học tiếp, xóa database theo phần cleanup của bài [05 - RDS PostgreSQL](../05-rds-postgresql.md).
