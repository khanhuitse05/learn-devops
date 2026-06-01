# CloudShell VPC environment

Hướng dẫn này giới thiệu CloudShell VPC environment và dùng database private của bài [05 - RDS PostgreSQL](../05-rds-postgresql.md) làm ví dụ kết nối.

## CloudShell VPC environment là gì

CloudShell thông thường là terminal chạy trên trình duyệt và đã được AWS xác thực sẵn. CloudShell VPC environment là một environment CloudShell được đặt trong VPC, subnet và Security Group do bạn chọn.

Environment này phù hợp để debug resource private trong VPC mà không cần bật public access hoặc tạo EC2 test host. Trong ví dụ bên dưới, CloudShell VPC environment được dùng để kết nối RDS PostgreSQL có `PubliclyAccessible=false`.

## Điều kiện cho ví dụ test RDS

Cần có:

- RDS PostgreSQL đã có status `Available`.
- VPC `learn-devops-demo-vpc`.
- Một private subnet của lab.
- Security Group `learn-devops-demo-ecs-sg`.
- RDS Security Group `learn-devops-demo-rds-sg` có inbound rule PostgreSQL port `5432` từ `learn-devops-demo-ecs-sg`.
- DB instance endpoint, database name, username và password.

## Tạo CloudShell VPC environment

1. Mở AWS Console và chọn đúng region đang chứa RDS, ví dụ Singapore là `ap-southeast-1`.
2. Mở `CloudShell`.
3. Nhấn dấu `+` → `Create VPC environment`.
4. Điền:

| Field | Giá trị cần chọn hoặc nhập |
| --- | --- |
| `Name` | `learn-devops-demo-shell` |
| `VPC` | `learn-devops-demo-vpc` |
| `Subnet` | Chọn một private subnet của lab |
| `Security group` | `learn-devops-demo-ecs-sg` |

5. Nhấn `Create`.

Chọn `learn-devops-demo-ecs-sg` vì RDS SG của lab chỉ cho phép kết nối port `5432` từ SG này.

## Ví dụ: kết nối RDS PostgreSQL private

### Kiểm tra psql

Trong CloudShell VPC environment, chạy:

```bash
psql --version
```

Nếu đã có `psql`, tiếp tục phần bên dưới.

Lab tối giản không tạo NAT Gateway, nên CloudShell VPC environment không có Internet outbound để cài package hoặc tải file từ Internet. Nếu `psql` chưa có sẵn, dùng ECS task, EC2 test host có cấu hình phù hợp hoặc cân nhắc tạo NAT Gateway tạm thời rồi xóa ngay sau khi test để tránh phí.

### Kết nối RDS PostgreSQL

Đặt biến theo database đã tạo. Không lưu password vào Git:

```bash
RDS_ENDPOINT=YOUR_RDS_ENDPOINT
DB_NAME=devops_demo
DB_USERNAME=devops_demo
```

Test DNS:

```bash
nslookup "$RDS_ENDPOINT"
```

Kết nối PostgreSQL:

```bash
psql "host=$RDS_ENDPOINT port=5432 dbname=$DB_NAME user=$DB_USERNAME sslmode=require"
```

Nhập password khi `psql` yêu cầu. Không đặt password trực tiếp trong lệnh để tránh lưu secret vào shell history.

Trong PostgreSQL prompt, chạy:

```sql
select now();
```

Thoát:

```sql
\q
```

### Xác minh TLS đầy đủ nếu đã có CA bundle

RDS Console có thể sinh lệnh mẫu dùng `sslmode=verify-full`. Chế độ này mã hóa kết nối, xác minh certificate và hostname.

Nếu CloudShell VPC environment đã có file `global-bundle.pem`, chạy:

```bash
psql "host=$RDS_ENDPOINT port=5432 dbname=$DB_NAME user=$DB_USERNAME sslmode=verify-full sslrootcert=./global-bundle.pem"
```

Không chạy `curl` tải CA bundle trong private subnet của lab nếu chưa có NAT Gateway hoặc đường Internet outbound phù hợp.

## Troubleshooting

- `could not translate host name ... to address`: xác nhận endpoint được copy trực tiếp từ RDS Console và RDS đã có status `Available`.
- Timeout khi connect: xác nhận CloudShell VPC environment dùng `learn-devops-demo-ecs-sg` và RDS SG cho phép inbound port `5432` từ SG đó.
- `password authentication failed`: kiểm tra username, password và database name.
- `psql: command not found`: CloudShell VPC environment hiện tại chưa có PostgreSQL client. Không tạo NAT Gateway chỉ để test nếu không cần thiết.

## Cleanup

Sau khi test, xóa CloudShell VPC environment nếu không còn dùng:

1. Mở menu của CloudShell VPC environment.
2. Chọn `Delete`.
3. Xác nhận xóa environment.

CloudShell không tính thêm phí, nhưng nên xóa environment tạm để workspace gọn và tránh nhầm lẫn.

Tham khảo tài liệu AWS: [Connect to Private Amazon RDS PostgreSQL Database Using AWS CloudShell](https://docs.aws.amazon.com/hands-on/latest/connect-to-private-amazon-rds-for-postgresql-from-aws-cloudshell/connect-to-private-amazon-rds-postgresql-database-using-aws-cloudshell.html).
