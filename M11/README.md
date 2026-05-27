# M11: CloudFormation Infrastructure as Code

M11 teaches how to describe AWS infrastructure as versioned templates and deploy
changes through stacks, change sets, and rollback-aware workflows.

## Learning Goals

- Write CloudFormation YAML templates.
- Use parameters, resources, outputs, mappings, conditions, and exports.
- Create, update, delete, and inspect stacks.
- Use change sets before production updates.
- Split infrastructure into nested stacks.

## Core Topics

### Template Anatomy

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Description: Example stack
Parameters: {}
Resources: {}
Outputs: {}
```

### Stack Lifecycle

- Create stack.
- Update stack.
- Review change set.
- Rollback on failure.
- Delete stack.
- Detect drift from manual changes.

### Nested Stack Build Order

```text
network stack
  -> security groups
  -> data stack
  -> ecr stack
  -> alb stack
  -> ecs service stack
  -> autoscaling/events/alarms
```

## Hands-On Lab

1. Write a template that creates an ECR repository.
2. Write a network stack with VPC and subnet outputs.
3. Write a security group stack.
4. Write an ECS service stack that accepts `ImageUri`.
5. Create a root stack that composes child stacks.
6. Update a stack through a change set.
7. Run drift detection after making a small manual change in dev.

## Useful Commands

```bash
aws cloudformation validate-template --template-body file://template.yml

aws cloudformation create-stack \
  --stack-name learn-devops-demo-ecr \
  --template-body file://template.yml

aws cloudformation describe-stacks \
  --stack-name learn-devops-demo-ecr \
  --output table

aws cloudformation create-change-set \
  --stack-name STACK_NAME \
  --change-set-name preview \
  --template-body file://template.yml \
  --change-set-type UPDATE

aws cloudformation describe-change-set \
  --stack-name STACK_NAME \
  --change-set-name preview
```

## Production Notes

- Always inspect change sets before production updates.
- Watch for replacement of stateful resources such as RDS, EFS, ALB, and VPC
  resources.
- Use `DeletionPolicy: Retain` for important data resources when appropriate.
- Do not mix too many manual console edits with IaC-managed resources.
- Keep stack outputs stable for downstream stacks.

## Troubleshooting

- Stack rollback: inspect stack events from oldest failure upward.
- Resource already exists: import it or use a different name.
- Circular dependency: simplify references or split stacks.
- Delete stuck: retained resource, dependency, or custom resource issue.
