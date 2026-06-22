# AWS CloudFormation Command Cheatsheet

A quick reference guide for the most commonly used AWS CloudFormation CLI commands.

## Validation & Deployment

**Validate a Template**
Check your template for syntax and validation errors before deploying.
```bash
aws cloudformation validate-template \
  --template-body file://demo-stack.yml
```

**Deploy a Stack (Create or Update)**
Deploys the template. If the stack doesn't exist, it creates it. If it does, it updates it.
```bash
aws cloudformation deploy \
  --template-file demo-stack.yml \
  --stack-name learn-devops-demo-stack \
  --capabilities CAPABILITY_NAMED_IAM
```

## Previewing Changes (Change Sets)

**Create a Preview (Change Set) without Executing**
Useful for seeing what changes will occur before applying them (similar to `terraform plan`).
```bash
aws cloudformation deploy \
  --template-file demo-stack.yml \
  --stack-name learn-devops-demo-stack \
  --no-execute-changeset
```

**View Change Set Details**
Review the planned additions, modifications, and deletions.
```bash
aws cloudformation describe-change-set \
  --stack-name learn-devops-demo-stack \
  --change-set-name $CHANGE_SET
```

**Execute a Change Set**
Apply the previously created change set.
```bash
aws cloudformation execute-change-set \
  --stack-name learn-devops-demo-stack \
  --change-set-name $CHANGE_SET
```

## Stack Management

**List All Stacks**
Get a list of all stacks in your AWS account for the current region.
```bash
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE
```

**Describe a Stack**
Get detailed information about a specific stack, including its outputs.
```bash
aws cloudformation describe-stacks \
  --stack-name learn-devops-demo-stack
```

**View Stack Events**
Check the logs of resource creation/update/deletion for troubleshooting.
```bash
aws cloudformation describe-stack-events \
  --stack-name learn-devops-demo-stack
```

**Delete a Stack**
Tear down the stack and all its managed resources.
```bash
aws cloudformation delete-stack \
  --stack-name learn-devops-demo-stack
```

## Stack Outputs & Resources

**List Resources in a Stack**
See all AWS resources (with their physical IDs) managed by the stack.
```bash
aws cloudformation describe-stack-resources \
  --stack-name learn-devops-demo-stack
```

**Get Stack Outputs**
Retrieve just the outputs defined in your template.
```bash
aws cloudformation describe-stacks \
  --stack-name learn-devops-demo-stack \
  --query 'Stacks[0].Outputs' \
  --output table
```
