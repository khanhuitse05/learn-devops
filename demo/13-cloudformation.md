# 13 - CloudFormation

## Mục tiêu

Học Infrastructure as Code native của AWS bằng CloudFormation: viết template nhỏ, deploy stack, update stack và delete stack.

## Prerequisites

- Đã hoàn thành [step 00](00-prerequisites.md): AWS CLI chạy đúng account/region.
- Nên đã đi qua các step manual trước để hiểu resource trước khi viết IaC.
- Tạo resource nhỏ, rẻ và dễ xóa cho lab đầu tiên.

## Kiến thức cần hiểu

- Template mô tả desired state của resource AWS.
- Stack là đơn vị deploy/update/delete.
- Parameters, Outputs và Tags giúp template reusable và dễ cleanup.
- CloudFormation tốt để học AWS-native dependency và rollback.

## Chi phí ước lượng

CloudFormation không tính phí riêng cho stack cơ bản, nhưng resource được stack tạo vẫn tính phí. Lab đầu nên tạo resource miễn phí hoặc rất rẻ như SSM Parameter.

## Cảnh báo service tốn tiền

Không bắt đầu bằng RDS/ECS/ALB trong CloudFormation nếu chưa tự tin delete stack. Dùng resource nhỏ trước.

## Các bước làm bằng Console

1. Vào CloudFormation.
2. Create stack.
3. Upload template hoặc dùng template editor.
4. Tạo stack name: `learn-devops-demo-cfn`.
5. Dùng parameter prefix `learn-devops-demo`.
6. Review resource sẽ tạo trước khi submit.
7. Chờ stack status `CREATE_COMPLETE`.
8. Update stack để đổi một tag/value nhỏ.
9. Delete stack sau khi xem xong.

## Lệnh CLI kiểm tra/debug

Ví dụ template nhỏ tạo SSM parameter:

```bash
cat > /tmp/learn-devops-demo-cfn.yml <<'YAML'
AWSTemplateFormatVersion: '2010-09-09'
Description: Small CloudFormation lab for learn-devops
Resources:
  DemoParameter:
    Type: AWS::SSM::Parameter
    Properties:
      Name: /learn-devops-demo/cfn-note
      Type: String
      Value: hello-cloudformation
      Tags:
        Project: learn-devops-demo
YAML
```

Deploy stack:

```bash
aws cloudformation deploy \
  --stack-name learn-devops-demo-cfn \
  --template-file /tmp/learn-devops-demo-cfn.yml
```

Describe stack:

```bash
aws cloudformation describe-stacks \
  --stack-name learn-devops-demo-cfn \
  --query 'Stacks[0].{Name:StackName,Status:StackStatus}'
```

Delete stack:

```bash
aws cloudformation delete-stack \
  --stack-name learn-devops-demo-cfn
```

## Expected result

- Stack deploy thành công.
- Biết xem Events, Resources và Outputs.
- Biết update/delete stack và hiểu rollback cơ bản.

## Cleanup

- Delete stack sau lab.
- Nếu kết thúc toàn bộ demo: chuyển sang [step 15](15-cleanup-cost-control.md).

## Troubleshooting

- Stack rollback: mở tab Events để xem resource lỗi đầu tiên.
- Delete stack kẹt: resource có dependency hoặc deletion protection.
- Name đã tồn tại: xóa stack cũ hoặc đổi resource name có prefix demo.
