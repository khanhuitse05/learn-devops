# 09 - Secrets And Environment Variables

## Mục tiêu

Inject RDS connection string vào server image có sẵn mà không sửa code hoặc rebuild image. Ưu tiên SSM Parameter Store; dùng Secrets Manager khi muốn quản lý secret đúng nghĩa hơn.

## Prerequisites

- Đã hoàn thành [step 05](05-rds-postgresql.md): RDS vẫn tồn tại và có endpoint.
- Đã hoàn thành [step 07](07-ecs-fargate-service.md): ECS service và task definition vẫn tồn tại.
- Nên giữ ALB từ [step 08](08-alb-public-entry.md) để test API từ bên ngoài.
- ECS task execution role có thể được cập nhật quyền đọc SSM parameter hoặc Secrets Manager secret.
- Nếu đã cleanup RDS: chạy lại [step 05](05-rds-postgresql.md). Nếu đã cleanup ECS service: chạy lại [step 07](07-ecs-fargate-service.md).

## Kiến thức cần hiểu

- Env var thường hiện trong task definition revision, không nên chứa password plain text.
- SSM Parameter Store SecureString có thể đủ cho lab tiết kiệm.
- Secrets Manager có tính năng secret lifecycle/rotation tốt hơn nhưng tính phí theo secret.
- ECS task execution role cần quyền đọc secret/parameter.
- App đã đọc `DATABASE_URL`; bước này chỉ cấu hình runtime.

## Chi phí ước lượng

- SSM Parameter Store standard parameter thường là lựa chọn tiết kiệm.
- Secrets Manager tính phí theo secret/tháng và API calls.

## Cảnh báo service tốn tiền

Secrets Manager có phí định kỳ theo secret. Với lab tiết kiệm, dùng SSM Parameter Store nếu không cần rotation.

## Các bước làm bằng Console

Phương án tiết kiệm với SSM:

1. Vào Systems Manager -> Parameter Store.
2. Create parameter.
3. Name: `/learn-devops-demo/db-url`.
4. Type: SecureString.
5. Value: PostgreSQL connection string tới RDS.
6. Save.
7. Vào IAM, thêm quyền đọc parameter cho ECS task execution role.
8. Update ECS task definition để inject secret vào env var `DATABASE_URL`.
9. Deploy revision mới.

Phương án Secrets Manager:

1. Vào Secrets Manager.
2. Store a new secret.
3. Secret type: Other type of secret.
4. Key/value hoặc plain text chứa `DATABASE_URL`.
5. Secret name: `learn-devops-demo/db-url`.
6. Update ECS task definition để dùng secret.

## Lệnh CLI kiểm tra/debug

Tạo SecureString SSM:

```bash
aws ssm put-parameter \
  --name /learn-devops-demo/db-url \
  --type SecureString \
  --value "postgres://devops_demo:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/devops_demo?sslmode=require" \
  --overwrite
```

Đọc parameter để kiểm tra quyền local:

```bash
aws ssm get-parameter \
  --name /learn-devops-demo/db-url \
  --with-decryption \
  --query 'Parameter.Name' \
  --output text
```

Sau khi deploy task definition revision mới, test qua ALB:

```bash
curl -i "http://$ALB_DNS/api/db/health"
curl -i "http://$ALB_DNS/api/orders"
```

Policy tối thiểu cho role đọc parameter:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters"
      ],
      "Resource": "arn:aws:ssm:ap-southeast-1:ACCOUNT_ID:parameter/learn-devops-demo/*"
    }
  ]
}
```

## Expected result

- Task definition không chứa DB password plain text.
- ECS task nhận `DATABASE_URL` từ SSM hoặc Secrets Manager.
- App kết nối RDS thành công sau deploy revision mới.
- `/api/db/health` và `/api/orders` trả HTTP 200 qua ALB.

## Cleanup

- Nếu học tiếp step 10: giữ SSM parameter hoặc secret để ECS task tiếp tục kết nối RDS.
- Nếu dừng lab: xóa parameter hoặc secret sau khi xóa ECS service. Secrets Manager có thể phát sinh phí theo thời gian lưu trữ secret.

Xóa SSM parameter nếu đã tạo:

```bash
aws ssm delete-parameter --name /learn-devops-demo/db-url
```

Xóa secret Secrets Manager nếu đã tạo:

```bash
aws secretsmanager delete-secret \
  --secret-id learn-devops-demo/db-url \
  --force-delete-without-recovery
```

## Troubleshooting

- Task không start vì secret access denied: kiểm tra execution role permission.
- App nhận env rỗng: kiểm tra mapping secret trong task definition.
- RDS auth fail: secret value sai password, host hoặc database name.
