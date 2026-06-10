# 12 - Amazon Managed Grafana

## Objective

Create an Amazon Managed Grafana workspace and use CloudWatch as a data source to view dashboards for ECS, ALB, and app logs/metrics.

## Prerequisites

- Completed [step 10](10-observability.md): CloudWatch logs, metrics, or alarms have data.
- Should keep ECS service and ALB running so the dashboard has new datapoints.
- AWS account has permission to create Amazon Managed Grafana workspace and related IAM roles.

## Knowledge to understand

- Grafana is the dashboard layer; CloudWatch is still where logs and metrics are stored in this lab.
- Amazon Managed Grafana needs a workspace, authentication, and data source permission.
- Dashboard is only useful when metric namespace and region are correct.

## Estimated cost

Amazon Managed Grafana can charge per workspace/user. Delete the workspace after the lab if not continuing use.

## Cost warning for paid services

Don't keep the demo workspace for a long time if only learning for one session. Check current pricing in the account before enabling many users.

## Console steps

1. Go to Amazon Managed Grafana.
2. Create workspace.
3. Workspace name: `learn-devops-demo-grafana`.
4. Authentication: choose the simplest method your account supports, usually IAM Identity Center.
5. Permission type: service managed.
6. Data sources: enable CloudWatch.
7. After the workspace is active, open the Grafana URL.
8. Add CloudWatch data source if not already present.
9. Create a dashboard with panels:
   - ECS CPU utilization.
   - ECS memory utilization.
   - ALB healthy host count.
   - ALB HTTP 5xx count.
10. Save dashboard named `learn-devops-demo-ops`.

## CLI check/debug commands

List workspaces:

```bash
aws grafana list-workspaces \
  --query 'workspaces[?contains(name, `learn-devops-demo`)].{Id:id,Name:name,Status:status,Endpoint:endpoint}' \
  --output table
```

Get workspace details:

```bash
aws grafana describe-workspace \
  --workspace-id "$GRAFANA_WORKSPACE_ID"
```

Check CloudWatch metric has data before debugging Grafana:

```bash
aws cloudwatch list-metrics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --query 'Metrics[0:5]'
```

## Expected result

- Grafana workspace active.
- CloudWatch data source works in the correct region.
- Dashboard displays at least ECS CPU/memory or ALB metrics.

## Cleanup

- If continuing to IaC: can take screenshots or note the dashboard then delete the workspace to reduce costs.
- If finishing the entire demo: move to [step 15](15-cleanup-cost-control.md).

Delete workspace:

```bash
aws grafana delete-workspace \
  --workspace-id "$GRAFANA_WORKSPACE_ID"
```

## Troubleshooting

- Cannot login: check authentication/IAM Identity Center user assignment.
- No metrics visible: check region, namespace, and that resources are still running.
- Data source permission error: check workspace role has permission to read CloudWatch.