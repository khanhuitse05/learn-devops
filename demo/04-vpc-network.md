# 04 - VPC Network

## Mục tiêu

Tạo network tối giản để chuẩn bị cho RDS, ECS và ALB. Ưu tiên tiết kiệm chi phí, nên bước đầu không tạo NAT Gateway nếu chưa cần.

## Kiến thức cần hiểu

- ALB cần public subnet.
- ECS task và RDS nên chạy private subnet.
- Security Group là firewall chính ở cấp resource.
- RDS không cần public access nếu app chạy trong cùng VPC.

## Chi phí ước lượng

- VPC, subnet, route table, security group: miễn phí.
- Internet Gateway: miễn phí.
- NAT Gateway: tốn phí theo giờ và data. Không tạo NAT Gateway trong lab tối giản trừ khi thật sự cần outbound internet từ private subnet.

## Cảnh báo service tốn tiền

NAT Gateway là resource dễ quên và tốn phí. Với lab tiết kiệm, tránh tạo NAT Gateway hoặc xóa ngay sau khi test.

## Các bước làm bằng Console

### Phần 1: Tạo network bằng wizard

1. Vào VPC Console.
2. Làm theo hướng dẫn: [Tạo VPC bằng AWS Console](more/create-vpc-console.md).

Wizard `VPC and more` sẽ tạo các resource sau trong một lần. Không cần tạo lại thủ công:

- VPC `learn-devops-demo-vpc`: `10.0.0.0/16`.
- 2 public subnets:
  - Public subnet A: `10.0.1.0/24`.
  - Public subnet B: `10.0.2.0/24`.
- 2 private subnets:
  - Private subnet A: `10.0.11.0/24`.
  - Private subnet B: `10.0.12.0/24`.
- Internet Gateway đã attach vào VPC.
- Public route table có route `0.0.0.0/0` tới Internet Gateway và đã associate với 2 public subnets.
- Private route table chỉ có local route vì lab này không tạo NAT Gateway.

Wizard tự sinh Name tag cho subnet. Dùng CIDR để nhận diện chính xác từng subnet. Nếu muốn, có thể đổi Name tag sau khi tạo:

- `learn-devops-demo-public-a`: `10.0.1.0/24`.
- `learn-devops-demo-public-b`: `10.0.2.0/24`.
- `learn-devops-demo-private-a`: `10.0.11.0/24`.
- `learn-devops-demo-private-b`: `10.0.12.0/24`.

### Phần 2: Tạo Security Groups thủ công

`Security Group` là firewall của resource. `Inbound rule` quy định nguồn nào được phép kết nối vào resource và qua port nào.

Trong lab này, traffic đi theo đường:

```text
Internet
  └── HTTP port 80 → ALB
                       └── app port 3000 → ECS task
                                              └── PostgreSQL port 5432 → RDS
```

Tạo Security Group theo đúng thứ tự dưới đây, vì Security Group tạo sau cần tham chiếu đến Security Group tạo trước.

#### 2.1. Tạo Security Group cho ALB

1. Vào `VPC Console` → `Security groups`.
2. Nhấn `Create security group`.
3. Điền phần `Basic details`:

| Field | Giá trị |
| --- | --- |
| `Security group name` | `learn-devops-demo-alb-sg` |
| `Description` | `Allow HTTP traffic from internet to ALB` |
| `VPC` | Chọn `learn-devops-demo-vpc` |

4. Trong `Inbound rules`, nhấn `Add rule` và điền:

| Type | Port range | Source |
| --- | --- | --- |
| `HTTP` | `80` | `Anywhere-IPv4` (`0.0.0.0/0`) |

5. Giữ nguyên `Outbound rules`.
6. Nhấn `Create security group`.

Ý nghĩa: người dùng từ Internet được phép gửi HTTP request tới ALB.

#### 2.2. Tạo Security Group cho ECS task

1. Quay lại `Security groups`.
2. Nhấn `Create security group`.
3. Điền phần `Basic details`:

| Field | Giá trị |
| --- | --- |
| `Security group name` | `learn-devops-demo-ecs-sg` |
| `Description` | `Allow app traffic from ALB to ECS` |
| `VPC` | Chọn `learn-devops-demo-vpc` |

4. Trong `Inbound rules`, nhấn `Add rule` và điền:

| Type | Port range | Source |
| --- | --- | --- |
| `Custom TCP` | `3000` | Chọn Security Group `learn-devops-demo-alb-sg` |

5. Giữ nguyên `Outbound rules`.
6. Nhấn `Create security group`.

Ý nghĩa: chỉ ALB được phép gửi request tới app chạy trên ECS task. Không chọn `Anywhere-IPv4` cho rule này.

#### 2.3. Tạo Security Group cho RDS PostgreSQL

1. Quay lại `Security groups`.
2. Nhấn `Create security group`.
3. Điền phần `Basic details`:

| Field | Giá trị |
| --- | --- |
| `Security group name` | `learn-devops-demo-rds-sg` |
| `Description` | `Allow PostgreSQL traffic from ECS to RDS` |
| `VPC` | Chọn `learn-devops-demo-vpc` |

4. Trong `Inbound rules`, nhấn `Add rule` và điền:

| Type | Port range | Source |
| --- | --- | --- |
| `PostgreSQL` | `5432` | Chọn Security Group `learn-devops-demo-ecs-sg` |

5. Giữ nguyên `Outbound rules`.
6. Nhấn `Create security group`.

Ý nghĩa: chỉ ECS task được phép kết nối tới database. Không mở port `5432` cho `0.0.0.0/0`.

#### 2.4. Kết quả cần kiểm tra

| Security Group | Nhận traffic từ | Port |
| --- | --- | --- |
| `learn-devops-demo-alb-sg` | Internet: `0.0.0.0/0` | `80` |
| `learn-devops-demo-ecs-sg` | `learn-devops-demo-alb-sg` | `3000` |
| `learn-devops-demo-rds-sg` | `learn-devops-demo-ecs-sg` | `5432` |

## Lệnh CLI kiểm tra/debug

AWS CLI chỉ tìm thấy resource trong region được chỉ định. Trước tiên, đặt `AWS_REGION` giống region đang chọn ở góc trên bên phải AWS Console. Ví dụ, Singapore là `ap-southeast-1`:

```bash
AWS_REGION=ap-southeast-1
```

### 1. Lấy VPC ID

```bash
VPC_ID=$(aws ec2 describe-vpcs \
  --region "$AWS_REGION" \
  --filters "Name=tag:Name,Values=learn-devops-demo-vpc" \
  --query 'Vpcs[0].VpcId' \
  --output text)

echo "$VPC_ID"
```

Kết quả mong đợi có dạng `vpc-...`. Nếu kết quả là `None`, xem mục troubleshooting bên dưới.

### 2. Kiểm tra VPC

```bash
aws ec2 describe-vpcs \
  --region "$AWS_REGION" \
  --vpc-ids "$VPC_ID" \
  --query 'Vpcs[].{VpcId:VpcId,Cidr:CidrBlock}' \
  --output table
```

Kết quả mong đợi: có 1 VPC với CIDR `10.0.0.0/16`.

### 3. Kiểm tra subnet

```bash
aws ec2 describe-subnets \
  --region "$AWS_REGION" \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'Subnets[].{Name:Tags[?Key==`Name`]|[0].Value,SubnetId:SubnetId,Cidr:CidrBlock,Az:AvailabilityZone}' \
  --output table
```

Kết quả mong đợi: có 4 subnet thuộc 2 Availability Zone khác nhau. Nếu đã customize CIDR theo hướng dẫn, kết quả gồm:

- `10.0.1.0/24`
- `10.0.2.0/24`
- `10.0.11.0/24`
- `10.0.12.0/24`

Nếu giữ mặc định trong wizard, AWS sẽ tự chia CIDR khác, ví dụ `/20`. Điều này vẫn đúng nếu các CIDR không trùng nhau và đều thuộc VPC `10.0.0.0/16`.

### 4. Kiểm tra Security Group

```bash
aws ec2 describe-security-groups \
  --region "$AWS_REGION" \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'SecurityGroups[].{GroupName:GroupName,GroupId:GroupId,VpcId:VpcId}' \
  --output table
```

Kết quả mong đợi:

- `default`
- `learn-devops-demo-alb-sg`
- `learn-devops-demo-ecs-sg`
- `learn-devops-demo-rds-sg`

### Troubleshooting

Nếu `$VPC_ID` là `None` hoặc kết quả trả về bảng rỗng:

1. Kiểm tra `echo "$AWS_REGION"` và xác nhận region giống AWS Console.
2. Chạy `aws sts get-caller-identity` để xác nhận CLI đang dùng đúng AWS account.
3. Liệt kê VPC trong region hiện tại:

```bash
aws ec2 describe-vpcs \
  --region "$AWS_REGION" \
  --query 'Vpcs[].{Name:Tags[?Key==`Name`]|[0].Value,VpcId:VpcId,Cidr:CidrBlock}' \
  --output table
```

Tìm VPC có CIDR `10.0.0.0/16`. Nếu VPC có Name tag khác, gán ID thực tế:

```bash
VPC_ID=vpc-xxxxxxxxxxxxxxxxx
```

## Expected result

- Có VPC và 4 subnet không trùng CIDR, thuộc đúng 2 Availability Zone.
- Public subnet có route ra Internet Gateway.
- Private subnet không public trực tiếp ra internet.
- Security Group RDS chỉ nhận traffic từ ECS SG, không mở `0.0.0.0/0`.

## Cleanup

- Nếu học tiếp: giữ VPC, subnet, route table, Internet Gateway và 3 Security Group. Step 05 dùng private subnet và RDS SG; step 07 dùng private subnet và ECS SG; step 08 dùng public subnet và ALB SG.
- Nếu dừng tại đây: có thể xóa network vì chưa có RDS, ECS hoặc ALB phụ thuộc vào nó. Làm cleanup tổng hợp theo [step 11](11-cleanup-cost-control.md).
- Không xóa network giữa chừng sau khi đã tạo RDS, ECS hoặc ALB. Phải xóa các resource phụ thuộc trước.

## Troubleshooting

- Không delete được VPC: còn ENI, RDS, ALB hoặc ECS resource trong VPC.
- ECS không connect RDS: kiểm tra inbound rule của RDS SG có source là ECS SG.
- ALB không tới ECS: kiểm tra ECS SG có inbound port 3000 từ ALB SG.
