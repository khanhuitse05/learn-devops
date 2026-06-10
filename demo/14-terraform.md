# 14 - Terraform

## Objective

Learn Terraform with the AWS provider: init, plan, apply, inspect state, and destroy using a small, easy-to-cleanup resource.

## What is Terraform?

Terraform is an Infrastructure as Code tool used to describe infrastructure using config files. You declare the desired resources, Terraform previews changes with `plan`, creates/updates with `apply`, and stores the mapping between code and real resources in a state file.

## Prerequisites

- Completed [step 00](00-prerequisites.md): AWS CLI running on the correct account/region.
- Terraform installed locally.
- Should have done [step 13](13-cloudformation.md) to compare CloudFormation with Terraform.

## Knowledge to understand

- Terraform uses a provider to manage resources.
- `plan` shows changes before applying.
- State file is the mapping source between code and real resources.
- `destroy` is very important in labs to avoid charges.

## Estimated cost

Terraform does not charge separately, but resources created by Terraform still incur charges. The first lab uses SSM Parameters to keep costs low.

## Cost warning for paid services

Always run `terraform plan` before `apply` and `terraform destroy` after the lab. Do not commit secrets or state with sensitive values.

## CLI steps

Create a temporary lab directory:

```bash
mkdir -p /tmp/learn-devops-demo-terraform
cd /tmp/learn-devops-demo-terraform
```

Create Terraform file:

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

Run Terraform:

```bash
terraform init
terraform fmt
terraform validate
terraform plan
terraform apply
```

Check Terraform state:

```bash
terraform state list
```

Check resource with AWS CLI:

```bash
aws ssm get-parameter \
  --name /learn-devops-demo/terraform-note \
  --query 'Parameter.{Name:Name,Value:Value}'
```

## Console verification

After `terraform apply` succeeds, use the Console to check the resource:

1. Ensure the Console is in the correct region from the Terraform file, default `ap-southeast-1`.
2. Go to Systems Manager Parameter Store.
3. Find `/learn-devops-demo/terraform-note`.
4. Confirm tag `Project=learn-devops-demo`.

Destroy after the lab:

```bash
terraform destroy
```

After `terraform destroy`, refresh the Console and confirm the parameter has disappeared.

## Expected result

- `terraform plan` shows the resources to be created.
- `terraform apply` creates the SSM parameter.
- `terraform state list` shows the resources managed by Terraform.
- `terraform destroy` deletes the resources.

## Cleanup

- Run `terraform destroy` in the correct state directory.
- Delete the `/tmp/learn-devops-demo-terraform` directory if you don't need to keep notes.
- If finishing the entire demo: move to [step 15](15-cleanup-cost-control.md).

## Troubleshooting

- Provider download error: check network and version constraint.
- Apply error because name exists: resource may have been created from a previous run, delete the parameter or change the name.
- Destroy doesn't delete everything: run `terraform state list` and check resources still in state.