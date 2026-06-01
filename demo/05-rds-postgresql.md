# 05 - RDS PostgreSQL

## Mục tiêu

Tạo Amazon RDS PostgreSQL private để server hoàn chỉnh dùng database managed. Lab này nối tiếp sau khi app đã chạy được PostgreSQL local; không cần sửa source code.

## Kiến thức cần hiểu

- RDS là managed database, không SSH vào instance.
- DB subnet group chọn private subnets.
- Security Group kiểm soát ai được vào port 5432.
- Backup, storage, instance class và Multi-AZ ảnh hưởng trực tiếp đến chi phí.
- Cùng một app image dùng được PostgreSQL local và RDS; chỉ connection config thay đổi.

## Chi phí ước lượng

- Nếu account còn Free Tier và chọn cấu hình đủ điều kiện, chi phí có thể rất thấp.
- Nếu không còn Free Tier, RDS tính phí theo instance giờ, storage, backup và I/O.
- Lab tiết kiệm nên dùng instance nhỏ nhất phù hợp, storage thấp nhất được phép và xóa ngay sau khi học.

## Cảnh báo service tốn tiền

RDS tốn phí khi instance còn tồn tại, kể cả không có request. Không bật Multi-AZ cho lab tiết kiệm. Không để RDS chạy qua đêm nếu không cần.

## Các bước làm bằng Console

1. Vào RDS Console.
2. Chọn Create database.
3. Engine: PostgreSQL.
4. Template: Free tier nếu khả dụng; nếu không, chọn Dev/Test cấu hình nhỏ.
5. DB identifier: `learn-devops-demo-postgres`.
6. Master username: `devops_demo`.
7. Password: tạo password mạnh, lưu tạm vào password manager.
8. Instance class: chọn loại nhỏ nhất phù hợp lab.
9. Storage: chọn mức thấp nhất, tắt autoscaling storage nếu muốn kiểm soát chi phí.
10. Connectivity:
    - VPC: `learn-devops-demo-vpc`.
    - Public access: No.
    - DB subnet group: private subnets.
    - Security Group: `learn-devops-demo-rds-sg`.
11. Database authentication: Password authentication.
12. Initial database name: `devops_demo`.
13. Backup retention: thấp nhất phù hợp lab.
14. Create database.

## Lệnh CLI kiểm tra/debug

Xem trạng thái RDS:

```bash
aws rds describe-db-instances \
  --db-instance-identifier learn-devops-demo-postgres \
  --query 'DBInstances[0].{Status:DBInstanceStatus,Endpoint:Endpoint.Address,Port:Endpoint.Port,Public:PubliclyAccessible}' \
  --output table
```

Lấy endpoint:

```bash
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier learn-devops-demo-postgres \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "$RDS_ENDPOINT"
```

Từ EC2 test host hoặc ECS task trong cùng VPC:

```bash
psql "host=$RDS_ENDPOINT port=5432 dbname=devops_demo user=devops_demo password=YOUR_PASSWORD sslmode=require" \
  -c "select now();"
```

Tạo schema demo từ host có `psql`:

```bash
psql "host=$RDS_ENDPOINT port=5432 dbname=devops_demo user=devops_demo password=YOUR_PASSWORD sslmode=require" \
  -f server/schema.sql
```

## Expected result

- RDS status là `available`.
- `PubliclyAccessible` là `false`.
- Kết nối PostgreSQL thành công từ EC2 test host hoặc client phù hợp trong cùng VPC.
- Schema `orders` đã được tạo trên RDS.
- Có RDS endpoint để inject vào ECS task qua `DATABASE_URL` ở step 09.

## Cleanup

Nếu không cần giữ data:

```bash
aws rds delete-db-instance \
  --db-instance-identifier learn-devops-demo-postgres \
  --skip-final-snapshot \
  --delete-automated-backups
```

Kiểm tra đến khi DB biến mất:

```bash
aws rds describe-db-instances \
  --db-instance-identifier learn-devops-demo-postgres
```

## Troubleshooting

- Timeout khi connect: RDS SG chưa cho phép source SG, hoặc client không ở cùng VPC/private route.
- `PubliclyAccessible=false` nên máy local không connect trực tiếp được. Dùng ECS task, EC2 test host, VPN hoặc bastion/SSM.
- Auth fail: kiểm tra username, password, database name.
- SSL issue: thử thêm `sslmode=require`.
