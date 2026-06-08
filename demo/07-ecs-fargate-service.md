# 07 - ECS Fargate Service

## Mục tiêu

Deploy image server hoàn chỉnh lên ECS/Fargate. Ban đầu chạy app health độc lập với DB, sau đó gắn ALB và inject RDS secret ở các step tiếp theo.

## Prerequisites

- Đã hoàn thành [step 04](04-vpc-network.md): VPC, subnet và `learn-devops-demo-ecs-sg` vẫn tồn tại.
- Đã hoàn thành [step 06](06-ecr-image-registry.md): ECR repository còn image tag `demo-001`.
- Có ECS task execution role cho phép pull image từ ECR và ghi CloudWatch Logs. Nếu chưa có, ECS Console có thể tạo default role trong lúc tạo task definition.
- Account có ECS service-linked role `AWSServiceRoleForECS`, hoặc IAM user/role hiện tại có quyền `iam:CreateServiceLinkedRole` để ECS tự tạo role này.
- Nếu đã cleanup network: chạy lại [step 04](04-vpc-network.md).
- Nếu đã cleanup ECR repository: chạy lại [step 06](06-ecr-image-registry.md).

## Kiến thức cần hiểu

- ECS cluster là nơi quản lý task/service.
- Task definition mô tả container, CPU, memory, env, log config.
- Fargate tính phí theo vCPU, memory và thời gian task chạy.
- Execution role dùng để pull image và ghi log; task role dùng cho app gọi AWS service.
- Image đã hỗ trợ PostgreSQL. Không thêm code server trong bước ECS.

## Chi phí ước lượng

- Fargate task tính phí khi chạy.
- Chọn CPU/memory nhỏ nhất cho lab, ví dụ `0.25 vCPU` và `0.5 GB`.
- Desired count nên để `1`.

## Cảnh báo service tốn tiền

ECS service sẽ tự giữ task chạy liên tục theo desired count. Sau lab hãy set desired count về 0 hoặc delete service.

## Các bước làm bằng Console

Trước khi tạo cluster, kiểm tra ECS service-linked role:

1. Vào **IAM Console** -> **Roles**.
2. Tìm role `AWSServiceRoleForECS`.
3. Nếu role đã tồn tại, tiếp tục tạo cluster.
4. Nếu chưa có role, tạo bằng một trong hai cách:
   - Cách Console: **Create role** -> chọn **AWS service** -> chọn use case cho **Elastic Container Service** nếu Console hiển thị lựa chọn service-linked role.
   - Cách nhanh hơn: mở **CloudShell** và chạy lệnh ở phần CLI bên dưới để tạo `AWSServiceRoleForECS`.
5. Nếu không tạo được role, IAM user/role hiện tại thiếu quyền `iam:CreateServiceLinkedRole`; cần dùng admin role hoặc nhờ admin tạo giúp một lần cho account.

Tạo cluster:

1. Vào **ECS Console** ở đúng region đang dùng cho lab, ví dụ `ap-southeast-1`.
2. Trong menu trái, chọn **Clusters** -> **Create cluster**.
3. Ở **Cluster configuration**:
   - Cluster name: `learn-devops-demo-cluster`.
   - **Service Connect defaults - optional**: để trống.
4. Ở **Infrastructure - advanced**:
   - Chọn **Fargate only**.
   - Không chọn thêm Amazon EC2 instances.
5. Ở **Monitoring - optional**:
   - **Container Insights**: chọn **Turned off** để tiết kiệm chi phí cho lab.
   - **ECS Exec encryption and logging**: giữ **Default**.
   - **KMS Key ID for ECS Exec session**: để trống.
6. Ở **Encryption - optional**:
   - **Managed storage**: để trống, dùng AWS managed key mặc định.
   - **Fargate ephemeral storage**: để trống, dùng AWS managed key mặc định.
7. Ở **Tags - optional**: không cần thêm tag cho lab này.
8. Chọn **Create**.

Sau khi cluster tạo xong, tạo task definition:

1. Trong ECS Console, chọn **Task definitions** -> **Create new task definition**.
2. Ở **Task definition configuration**:
   - Task definition family: `learn-devops-demo-node`.
3. Ở **Infrastructure requirements**:
   - Launch type: **AWS Fargate**.
   - Operating system: **Linux**.
   - CPU architecture: chọn kiến trúc khớp với image đã build ở step 06, thường là **X86_64**. Nếu bạn build image ARM64 thì chọn **ARM64**.
   - CPU: `0.25 vCPU`.
   - Memory: `0.5 GB`.
   - Task role: để trống ở bước này.
   - Task execution role: nếu dropdown có **Create default role** thì chọn mục này. ECS sẽ tạo execution role mặc định có policy `AmazonECSTaskExecutionRolePolicy`. Nếu account đã có role như `ecsTaskExecutionRole`, chọn role đó. Không chọn **None**.
4. Ở **Container - 1**:
   - Name: `app`.
   - Image URI: ECR image từ step 06, dùng tag cụ thể như `demo-001`.
   - Essential container: bật.
   - Container port: `3000`.
   - Protocol: `TCP`.
   - Port name: có thể nhập `app-3000-tcp` hoặc để Console tự tạo.
5. Ở **Environment variables**:
   - `PORT=3000`
   - `HOST=0.0.0.0`
6. Ở **Log collection**:
   - Bật **Use log collection** nếu chưa bật.
   - Destination: **Amazon CloudWatch**.
   - Giữ **Value type** là **Value** cho tất cả dòng.
   - `awslogs-group`: `/ecs/learn-devops-demo-node`
   - `awslogs-region`: region đang dùng cho lab, ví dụ `ap-southeast-1`.
   - `awslogs-stream-prefix`: `ecs`
   - Nếu Console có dòng `awslogs-create-group`, đặt value là `true` để ECS tự tạo log group khi role có quyền.
7. Chọn **Create**.

Tạo ECS service để chạy task liên tục:

1. Vào **Clusters** -> chọn `learn-devops-demo-cluster`.
2. Trong tab **Services**, chọn **Create**.
3. Ở **Environment**:
   - Compute options: **Launch type**.
   - Launch type: **Fargate**.
   - Platform version: **Latest**.
4. Ở **Deployment configuration**:
   - Application type: **Service**.
   - Task definition family: `learn-devops-demo-node`.
   - Revision: chọn revision mới nhất.
   - Service name: `learn-devops-demo-node-service`.
   - Service type: **Replica**.
   - Desired tasks: `1`.
5. Ở **Networking**:
   - VPC: `learn-devops-demo-vpc`.
   - Subnets: với lab ngắn, chỉ giữ 2 public subnets:
     - `learn-devops-demo-vpc-subnet-public1-ap-southeast-1a`
     - `learn-devops-demo-vpc-subnet-public2-ap-southeast-1b`
   - Bỏ chọn 2 private subnets:
     - `learn-devops-demo-vpc-subnet-private1-ap-southeast-1a`
     - `learn-devops-demo-vpc-subnet-private2-ap-southeast-1b`
   - Bật **Public IP** để task pull image/logs được nếu chưa có NAT gateway hoặc VPC endpoints.
   - Nếu đã có NAT gateway hoặc VPC endpoints phù hợp, có thể chọn private subnets và tắt **Public IP**.
   - Security group: chọn **Existing security group** -> `learn-devops-demo-ecs-sg`.
6. Ở **Load balancing**: chọn **None**. Step 08 sẽ tạo ALB và attach target group sau.
7. Giữ các mục còn lại mặc định, chọn **Create**.
8. Chờ service chuyển sang trạng thái có **Desired tasks = 1** và **Running tasks = 1**.

Chưa inject `DATABASE_URL` plain text trong bước này. `/health` vẫn hoạt động; các endpoint DB sẽ kết nối RDS sau khi cấu hình secret ở step 09.

## Lệnh CLI kiểm tra/debug

Kiểm tra cluster:

```bash
aws ecs describe-clusters \
  --clusters learn-devops-demo-cluster \
  --query 'clusters[].{Name:clusterName,Status:status,Running:runningTasksCount}' \
  --output table
```

Kiểm tra ECS service-linked role:

```bash
aws iam get-role \
  --role-name AWSServiceRoleForECS \
  --query 'Role.Arn' \
  --output text
```

Tạo ECS service-linked role nếu account chưa có:

```bash
aws iam create-service-linked-role \
  --aws-service-name ecs.amazonaws.com
```

Xem service:

```bash
aws ecs describe-services \
  --cluster learn-devops-demo-cluster \
  --services learn-devops-demo-node-service \
  --query 'services[].{Name:serviceName,Status:status,Desired:desiredCount,Running:runningCount,Pending:pendingCount}' \
  --output table
```

Xem stopped reason nếu task fail:

```bash
aws ecs list-tasks \
  --cluster learn-devops-demo-cluster \
  --desired-status STOPPED \
  --query 'taskArns[]' \
  --output text
```

```bash
aws logs tail /ecs/learn-devops-demo-node --since 30m
```

Nếu ECS Console báo CloudFormation stack `UPDATE_FAILED` hoặc resource `ECSService` `CREATE_FAILED`, xem lỗi gốc:

```bash
aws cloudformation describe-stack-events \
  --stack-name ECS-Console-V2-Service-learn-devops-demo-node-service-learn-devops-demo-cluster-YOUR_SUFFIX \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED`].[LogicalResourceId,ResourceStatus,ResourceStatusReason]' \
  --output table
```

## Expected result

- ECS cluster active.
- Service desired count 1, running count 1.
- CloudWatch Logs có dòng `server started`.
- Không cần sửa hoặc rebuild server image.

## Cleanup

- Nếu học tiếp ngay step 08: giữ ECS service với desired count `1`. Step 08 cần task đang chạy để attach vào target group của ALB.
- Nếu tạm dừng nhưng sẽ học tiếp: scale desired count về `0` để ngừng phí Fargate. Trước khi học tiếp step 08, scale lại về `1`.
- Nếu dừng lab: xóa ECS service. Step 15 sẽ cleanup các resource còn lại.

Scale về `0` khi tạm dừng:

```bash
aws ecs update-service \
  --cluster learn-devops-demo-cluster \
  --service learn-devops-demo-node-service \
  --desired-count 0
```

Xóa service khi dừng lab:

```bash
aws ecs delete-service \
  --cluster learn-devops-demo-cluster \
  --service learn-devops-demo-node-service \
  --force
```

## Troubleshooting

- Create cluster báo `Unable to assume the service linked role`: kiểm tra role `AWSServiceRoleForECS`. Nếu chưa có, tạo bằng `aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com`. Nếu lệnh bị `AccessDenied`, IAM user/role hiện tại thiếu quyền `iam:CreateServiceLinkedRole`.
- ECS Console mở CloudFormation và báo `ECSService` `CREATE_FAILED`: đây chưa phải lỗi gốc. Vào tab **Events**, mở dòng `ECSService`, xem **Status reason**. Các nguyên nhân hay gặp: chưa bật **Public IP** khi dùng public subnet, còn chọn nhầm private subnet nhưng không có NAT/VPC endpoints, task execution role thiếu quyền ECR/CloudWatch Logs, hoặc log group chưa tồn tại mà role không có quyền tạo log group.
- Task dừng ngay: xem ECS stopped reason và CloudWatch logs.
- Pull image fail: kiểm tra ECR URI và execution role.
- Không có logs: kiểm tra task execution role và log group.
- App không listen: image phải dùng `HOST=0.0.0.0` và `PORT=3000`.
- `/api/db/health` trả HTTP 503 trước step 09: đây là expected result vì task chưa nhận `DATABASE_URL`.
