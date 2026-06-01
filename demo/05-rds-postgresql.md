# 05 - RDS PostgreSQL

## Mục tiêu

Tạo Amazon RDS PostgreSQL private để server hoàn chỉnh dùng database managed. Lab này nối tiếp sau khi app đã chạy được PostgreSQL local; không cần sửa source code.

## Prerequisites

- Đã hoàn thành [step 04](04-vpc-network.md).
- VPC `learn-devops-demo-vpc` vẫn tồn tại.
- Có 2 private subnet thuộc 2 Availability Zone khác nhau.
- Security Group `learn-devops-demo-rds-sg` vẫn tồn tại và cho phép PostgreSQL port `5432` từ `learn-devops-demo-ecs-sg`.
- Nếu đã cleanup network ở step 04: chạy lại [step 04](04-vpc-network.md) trước.

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

Làm theo hướng dẫn chi tiết: [Tạo RDS PostgreSQL bằng AWS Console](more/create-database-console.md).

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

Đặt `DB_ID` theo DB instance identifier đã nhập khi tạo RDS. Nếu dùng đúng tên gợi ý của lab:

```bash
DB_ID=learn-devops-demo-postgres
DB_NAME=devops_demo
DB_USERNAME=devops_demo
DB_PASSWORD=YOUR_PASSWORD
```

Xem trạng thái RDS:

```bash
aws rds describe-db-instances \
  --db-instance-identifier "$DB_ID" \
  --query 'DBInstances[0].{Status:DBInstanceStatus,Endpoint:Endpoint.Address,Port:Endpoint.Port,Public:PubliclyAccessible}' \
  --output table
```

Lấy endpoint:

```bash
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_ID" \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "$RDS_ENDPOINT"
```

### Lưu ý khi verify RDS private

Lab này đặt `PubliclyAccessible=false`, nên RDS không có public IP và chỉ nhận kết nối từ resource có đường mạng phù hợp vào VPC. Từ máy local, endpoint private có thể không resolve DNS hoặc không thể kết nối đến port `5432`.

Có thể verify cơ bản ngay trên RDS Console:

- Status là `Available`.
- `Publicly accessible` là `No`.
- VPC, Security Group và endpoint đúng với cấu hình của lab.

Để chạy lệnh SQL, dùng EC2 test host, ECS task, CloudShell VPC environment, VPN hoặc bastion/SSM phù hợp. Không bật public access chỉ để debug.

Hướng dẫn chi tiết: [CloudShell VPC environment](more/cloudshell-vpc.md).

Từ EC2 test host hoặc ECS task trong cùng VPC:

```bash
psql "host=$RDS_ENDPOINT port=5432 dbname=$DB_NAME user=$DB_USERNAME password=$DB_PASSWORD sslmode=require" \
  -c "select now();"
```

Tạo schema demo từ host có `psql`:

```bash
psql "host=$RDS_ENDPOINT port=5432 dbname=$DB_NAME user=$DB_USERNAME password=$DB_PASSWORD sslmode=require" \
  -f server/schema.sql
```

## Expected result

- RDS status là `available`.
- `PubliclyAccessible` là `false`.
- Kết nối PostgreSQL thành công từ EC2 test host hoặc client phù hợp trong cùng VPC.
- Schema `orders` đã được tạo trên RDS.
- Có RDS endpoint để inject vào ECS task qua `DATABASE_URL` ở step 09.

## Cleanup

- Nếu học tiếp: giữ RDS. Step 09 cần endpoint và database để cấu hình `DATABASE_URL` cho ECS task.
- Nếu tạm dừng hoặc không học tiếp: nên xóa RDS để ngừng phí theo giờ. Lệnh dưới đây xóa DB không tạo final snapshot; chỉ dùng khi không cần giữ data.

```bash
aws rds delete-db-instance \
  --db-instance-identifier "$DB_ID" \
  --skip-final-snapshot \
  --delete-automated-backups
```

Kiểm tra đến khi DB biến mất:

```bash
aws rds describe-db-instances \
  --db-instance-identifier "$DB_ID"
```

## Troubleshooting

- `could not translate host name ... to address`: kiểm tra RDS đã có status `available` chưa và lấy lại endpoint bằng lệnh CLI phía trên. Endpoint có thể chưa dùng được khi instance còn đang `creating`.
- Timeout khi connect: RDS SG chưa cho phép source SG, hoặc client không ở cùng VPC/private route.
- Auth fail: kiểm tra username, password, database name.
- SSL issue: thử thêm `sslmode=require`.
