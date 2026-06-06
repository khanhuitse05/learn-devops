# 12 - Amazon Managed Grafana

## Mục tiêu

Tạo Amazon Managed Grafana workspace và dùng CloudWatch làm data source để xem dashboard cho ECS, ALB và app logs/metrics.

## Prerequisites

- Đã hoàn thành [step 10](10-observability.md): CloudWatch logs, metrics hoặc alarm đã có dữ liệu.
- Nên giữ ECS service và ALB đang chạy để dashboard có datapoint mới.
- AWS account có quyền tạo Amazon Managed Grafana workspace và IAM role liên quan.

## Kiến thức cần hiểu

- Grafana là dashboard layer; CloudWatch vẫn là nơi lưu logs và metrics trong lab này.
- Amazon Managed Grafana cần workspace, authentication và data source permission.
- Dashboard chỉ có ích khi metric namespace và region đúng.

## Chi phí ước lượng

Amazon Managed Grafana có thể tính phí workspace/user. Xóa workspace sau lab nếu không dùng tiếp.

## Cảnh báo service tốn tiền

Đừng giữ workspace demo lâu nếu chỉ học một buổi. Kiểm tra pricing hiện tại trong account trước khi bật nhiều user.

## Các bước làm bằng Console

1. Vào Amazon Managed Grafana.
2. Create workspace.
3. Workspace name: `learn-devops-demo-grafana`.
4. Authentication: chọn cách đơn giản nhất account bạn hỗ trợ, thường là IAM Identity Center.
5. Permission type: service managed.
6. Data sources: bật CloudWatch.
7. Sau khi workspace active, mở Grafana URL.
8. Add data source CloudWatch nếu chưa có.
9. Tạo dashboard với panels:
   - ECS CPU utilization.
   - ECS memory utilization.
   - ALB healthy host count.
   - ALB HTTP 5xx count.
10. Save dashboard tên `learn-devops-demo-ops`.

## Lệnh CLI kiểm tra/debug

Liệt kê workspace:

```bash
aws grafana list-workspaces \
  --query 'workspaces[?contains(name, `learn-devops-demo`)].{Id:id,Name:name,Status:status,Endpoint:endpoint}' \
  --output table
```

Lấy chi tiết workspace:

```bash
aws grafana describe-workspace \
  --workspace-id "$GRAFANA_WORKSPACE_ID"
```

Kiểm tra CloudWatch metric có dữ liệu trước khi debug Grafana:

```bash
aws cloudwatch list-metrics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --query 'Metrics[0:5]'
```

## Expected result

- Grafana workspace active.
- CloudWatch data source hoạt động đúng region.
- Dashboard hiển thị ít nhất ECS CPU/memory hoặc ALB metrics.

## Cleanup

- Nếu học tiếp IaC: có thể chụp screenshot hoặc note dashboard rồi xóa workspace để giảm phí.
- Nếu kết thúc toàn bộ demo: chuyển sang [step 15](15-cleanup-cost-control.md).

Xóa workspace:

```bash
aws grafana delete-workspace \
  --workspace-id "$GRAFANA_WORKSPACE_ID"
```

## Troubleshooting

- Không login được: kiểm tra authentication/IAM Identity Center user assignment.
- Không thấy metric: kiểm tra region, namespace và resource còn đang chạy.
- Data source lỗi permission: kiểm tra workspace role có quyền đọc CloudWatch.
