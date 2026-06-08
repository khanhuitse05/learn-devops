# 14 - Terraform

## Mục tiêu

Học Terraform với AWS provider: init, plan, apply, inspect state và destroy bằng một resource nhỏ, dễ cleanup.

## Terraform là gì?

Terraform là công cụ Infrastructure as Code dùng để mô tả hạ tầng bằng file config. Bạn khai báo resource mong muốn, Terraform preview thay đổi bằng `plan`, tạo/cập nhật bằng `apply`, và lưu mapping giữa code với resource thật trong state file.

## Prerequisites

- Đã hoàn thành [step 00](00-prerequisites.md): AWS CLI chạy đúng account/region.
- Đã cài Terraform local.
- Nên đã làm [step 13](13-cloudformation.md) để so sánh CloudFormation với Terraform.

## Kiến thức cần hiểu

- Terraform dùng provider để quản lý resource.
- `plan` cho biết thay đổi trước khi apply.
- State file là nguồn mapping giữa code và resource thật.
- `destroy` rất quan trọng trong lab để tránh phí.

## Chi phí ước lượng

Terraform không tính phí riêng, nhưng resource được tạo bởi Terraform vẫn tính phí. Lab đầu dùng SSM Parameter để giữ chi phí thấp.

## Cảnh báo service tốn tiền

Luôn chạy `terraform plan` trước `apply` và `terraform destroy` sau lab. Không commit secret hoặc state có sensitive value.

## Các bước làm bằng CLI

Tạo thư mục lab tạm:

```bash
mkdir -p /tmp/learn-devops-demo-terraform
cd /tmp/learn-devops-demo-terraform
```

Tạo file Terraform:

```bash
cat > main.tf <<'HCL'
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "ap-southeast-1"
}

resource "aws_ssm_parameter" "demo_note" {
  name  = "/learn-devops-demo/terraform-note"
  type  = "String"
  value = "hello-terraform"

  tags = {
    Project = "learn-devops-demo"
  }
}
HCL
```

Chạy Terraform:

```bash
terraform init
terraform fmt
terraform validate
terraform plan
terraform apply
```

Kiểm tra state Terraform:

```bash
terraform state list
```

Kiểm tra resource bằng AWS CLI:

```bash
aws ssm get-parameter \
  --name /learn-devops-demo/terraform-note \
  --query 'Parameter.{Name:Name,Value:Value}'
```

## Kiểm tra bằng Console

Sau khi `terraform apply` thành công, dùng Console để kiểm tra resource:

1. Đảm bảo Console đang ở đúng region trong file Terraform, mặc định là `ap-southeast-1`.
2. Vào Systems Manager Parameter Store.
3. Tìm `/learn-devops-demo/terraform-note`.
4. Xác nhận tag `Project=learn-devops-demo`.

Destroy sau lab:

```bash
terraform destroy
```

Sau `terraform destroy`, refresh Console và xác nhận parameter đã biến mất.

## Expected result

- `terraform plan` hiển thị resource sẽ tạo.
- `terraform apply` tạo SSM parameter.
- `terraform state list` thấy resource Terraform quản lý.
- `terraform destroy` xóa resource.

## Cleanup

- Chạy `terraform destroy` trong đúng thư mục state.
- Xóa thư mục `/tmp/learn-devops-demo-terraform` nếu không cần giữ note.
- Nếu kết thúc toàn bộ demo: chuyển sang [step 15](15-cleanup-cost-control.md).

## Troubleshooting

- Provider download fail: kiểm tra network và version constraint.
- Apply fail vì name tồn tại: resource có thể đã được tạo từ lần trước, xóa parameter hoặc đổi name.
- Destroy không xóa hết: chạy `terraform state list` và kiểm tra resource còn trong state.
