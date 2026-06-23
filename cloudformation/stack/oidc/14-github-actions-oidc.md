# 14 - Setting Up GitHub Actions with AWS OIDC

When deploying infrastructure or applications from GitHub Actions to AWS, you need a way to authenticate. The legacy approach is to create an IAM User and store its long-lived Access Key ID and Secret Access Key as GitHub Secrets. However, long-lived credentials are a security risk if they are leaked.

A more secure, modern approach is to use **OpenID Connect (OIDC)**. OIDC allows your GitHub Actions workflows to request a short-lived access token directly from AWS.

## How it works

1. **Identity Provider in AWS**: You configure AWS IAM to trust GitHub's OIDC endpoint.
2. **IAM Role**: You create an IAM Role that specifies exactly which GitHub organization and repository can assume it.
3. **Assume Role via Action**: The GitHub Actions workflow uses the `aws-actions/configure-aws-credentials` action. It requests a JWT (JSON Web Token) from GitHub and exchanges it with AWS for short-lived AWS credentials.

## Step 1: Deploy the CloudFormation Template

We have provided a CloudFormation template that sets up the OIDC Provider and the IAM Role.

1. Navigate to the CloudFormation console or use the AWS CLI.
2. Deploy the template located at `cloudformation/stack/oidc/github-oidc.yml`.

```bash
aws cloudformation deploy \
  --template-file github-oidc.yml \
  --stack-name github-actions-oidc-role \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides GitHubOrg=khanhuitse05 GitHubRepo=learn-devops
```

Once deployed, retrieve the Output named `RoleArn`. It will look something like this:
`arn:aws:iam::123456789012:role/khanhuitse05-learn-devops-github-actions-role`

## Step 2: Configure the GitHub Actions Workflow

A demo workflow file is already created for you at `.github/workflows/demo-oidc.yml`.

To use it:
1. Open `.github/workflows/demo-oidc.yml`.
2. Replace `<ACCOUNT_ID>` in the `role-to-assume` with your actual AWS Account ID.
3. Commit and push your changes to the `main` branch.

## Step 3: Verify the Action

1. Go to your repository on GitHub.
2. Navigate to the **Actions** tab.
3. You can either wait for a push to the `main` branch to trigger the action automatically, or click **Run workflow** manually since `workflow_dispatch` is enabled.
4. Check the logs of the run. You should see the output of the `aws sts get-caller-identity` command showing the assumed role!

## Security Best Practices

- Always restrict the `StringLike` condition in the IAM Role Trust Policy to your specific `repo:owner/repo:*`.
- You can even restrict it to specific branches or tags (e.g., `repo:owner/repo:ref:refs/heads/main`).
- Only grant the IAM role the minimum permissions necessary to complete the GitHub Action's tasks.
