# 13 - CloudFormation

## Objective

Learn AWS-native Infrastructure as Code with CloudFormation: write a small template, deploy a stack, update a stack, and delete a stack.

## Prerequisites

- Completed [step 00](00-prerequisites.md): AWS CLI running on the correct account/region.
- Should have gone through the earlier manual steps to understand resources before writing IaC.
- Create small, cheap, and easy-to-delete resources for the first lab.

## Knowledge to understand

- Template describes the desired state of AWS resources.
- Stack is the unit of deploy/update/delete.
- Parameters, Outputs, and Tags help make templates reusable and easy to clean up.
- CloudFormation is good for learning AWS-native dependencies and rollback.

## Estimated cost

CloudFormation does not charge separately for basic stacks, but resources created by the stack still incur charges. The first lab should create free or very cheap resources like SSM Parameters.

## Cost warning for paid services

Don't start with RDS/ECS/ALB in CloudFormation if not yet confident in deleting stacks. Use small resources first.

## Console steps

1. Go to CloudFormation.
2. Create stack.
3. Upload template or use the template editor.
4. Create stack name: `learn-devops-demo-cfn`.
5. Use parameter prefix `learn-devops-demo`.
6. Review resources to be created before submitting.
7. Wait for stack status `CREATE_COMPLETE`.
8. Update stack to change a small tag/value.
9. Delete stack after reviewing.

## CLI check/debug commands

Example small template creating an SSM parameter:

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

- Stack deployed successfully.
- Know how to view Events, Resources, and Outputs.
- Know how to update/delete stacks and understand basic rollback.

## Cleanup

- Delete stack after the lab.
- If finishing the entire demo: move to [step 15](15-cleanup-cost-control.md).

## Troubleshooting

- Stack rollback: open the Events tab to see the first failing resource.
- Delete stack stuck: resource has a dependency or deletion protection.
- Name already exists: delete the old stack or change the resource name with the demo prefix.