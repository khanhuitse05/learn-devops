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

### 1. Create workspace - Specify workspace details

1. Go to Amazon Managed Grafana -> Workspaces.
2. Select Create workspace.
3. Workspace name: `learn-devops-demo-grafana`.
4. Grafana version: keep the default version selected by AWS.
5. Click Next.

### 2. Configure settings

1. Authentication access:
   - Select `AWS IAM Identity Center` if your account has it enabled.
   - If IAM Identity Center is not available, select SAML only if you already have an identity provider to configure.
2. Permission type: Select Service managed.
3. Outbound VPC connection:
   - For this lab, leave VPC unconfigured.
4. Workspace configuration options:
   - Leave Turn plugin management on unchecked.
5. Network access control:
   - Select Open access for a quick lab.
   - Use Restricted access only if you already know the IP ranges or VPC endpoints that should reach the Grafana workspace URL.
6. IP Address Type:
   - Select IPv4 only.
7. Encryption:
   - Leave Customize encryption settings unchecked.
8. Click Next.

### 3. Service managed permission settings

1. Account access: select Current account.
2. Data sources: select CloudWatch.
3. Notification channels: optional, can leave unselected for this lab.
4. Click Next.

### 4. Review and create

1. Review the workspace name, authentication method, permission type, and CloudWatch data source.
2. Click Create workspace.

### 5. Wait until the workspace status becomes Active.

1. If using IAM Identity Center, assign your user or group to the workspace:
   - Go to Authentication or Users and user groups.
   - Select Assign new user or group.
   - Select your IAM Identity Center user or group.
   - Assign a role such as Admin for the lab user.

2. Add the CloudWatch data source:
   - Open the Data sources tab.
   - Select Amazon CloudWatch.
   - If the service managed policy shows Not attached, choose Actions -> Enable service-managed policy.
   > If the service managed policy already shows Attached, skip the Actions menu

### 6 Open the Grafana workspace URL again and log in.
1. Open the Grafana workspace URL.
   - Click the Applications tab.
2. Confirm the data source:
   - In Grafana, go to Connections -> Data sources.
   - Open the CloudWatch data source and choose Save & test.
3. Create a dashboard with panels:
   - ECS CPU utilization.
   - ECS memory utilization.
   - ALB healthy host count.
   - ALB HTTP 5xx count.
4. Save dashboard named `learn-devops-demo-ops`.

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
- AWS access portal shows `AWS accounts (0)`: click Applications. If Grafana is not listed there, assign your IAM Identity Center user or group to the Grafana workspace and give it a workspace role.
- Cannot find Connections or Data sources in Grafana: check that your Grafana workspace user role is Admin, then use AWS Console -> Amazon Managed Grafana -> Workspaces -> Data sources -> Configure in Grafana for Amazon CloudWatch.
- Configure in Grafana opens the Home page: use Grafana search for `Data sources` or open `/connections/datasources` on the workspace URL. If that page is not available, assign your user the Admin role in the Grafana workspace.
- No metrics visible: check region, namespace, and that resources are still running.
- Data source permission error: check workspace role has permission to read CloudWatch.
