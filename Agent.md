# Agent Context

This repository is my DevOps learning workspace. I am learning from
`devops_aws_ecs_learning_roadmap.docx.md`, module by module, with a focus on
AWS ECS and practical operations.

## Learner Setup

- Main machine: macOS on Apple Silicon/M2.
- Ubuntu server: a VM created with UTM.
- Development flow:
  - Use macOS for coding and editing this repository.
  - The Ubuntu server VM pulls this repository and runs the server/app examples.
  - Prefer commands that work clearly on Ubuntu server, and mention macOS-specific differences when relevant.

## Repository Structure

- `devops_aws_ecs_learning_roadmap.docx.md`: main learning roadmap.
- `server/`: demo Node.js service used for DevOps practice.
- `M0/`, `M1/`, `M2/`, etc.: module notes and cheat sheets.

## Learning Workflow

When helping me, assume I am studying one roadmap module at a time.

For each module:

1. Explain concepts simply and practically.
2. Prefer hands-on commands and small exercises.
3. Connect the lesson to real DevOps operations: deploy, debug, logs, services, networking, Docker, AWS, CI/CD, monitoring, and security.
4. Help me write or update notes/cheat sheets inside the matching module folder:
   - Module 0 notes go in `M0/`
   - Module 1 notes go in `M1/`
   - Module 2 notes go in `M2/`
   - Continue with `M${module_number}/`

## Learning Progress Checklist

Use this checklist to understand what I have finished, what I am learning now,
and what I should learn next. Update it whenever I finish a module or move to a
new module.

Legend:

- `[ ]`: not started
- `[~]`: learning now
- `[x]`: done

Current focus: M1

- `[x]` M0: Linux, Terminal, Git, and server operations mindset.
- `[~]` M1: Networking, HTTP, DNS, and TLS.
- `[ ]` M2: Docker and containerization.
- `[ ]` M3: AWS account, AWS CLI, and IAM.
- `[ ]` M4: VPC, Subnet, Security Group, NAT Gateway, and EC2.
- `[ ]` M5: Entry layer: ALB, ACM, Route 53, and API Gateway.
- `[ ]` M6: Amazon ECR image registry.
- `[ ]` M7: Amazon ECS/Fargate: cluster, task definition, and service.
- `[ ]` M8: Data layer: RDS, ElastiCache Redis, and EFS.
- `[ ]` M9: Auto Scaling for ECS services.
- `[ ]` M10: EventBridge and SNS.
- `[ ]` M11: CloudFormation and Infrastructure as Code.
- `[ ]` M12: CI/CD: build, push ECR, and deploy ECS.
- `[ ]` M13: Observability: CloudWatch Logs/Metrics/Alarms, CloudTrail, and dashboards.
- `[ ]` M14: Security, secrets, encryption, backup/DR, and cost optimization.
- `[ ]` M15: Capstone project: build a mini architecture similar to the roadmap diagram.

Next learning target: M2 after M1 is complete.

When I ask for help, check this section first. If I complete a topic, update
this checklist and suggest the next practical exercise.

## Note Style

When creating notes or cheat sheets:

- Use Markdown.
- Keep examples copy-paste friendly.
- Include short explanations before commands.
- Separate macOS commands from Ubuntu commands if they differ.
- Include troubleshooting checks where useful.
- Prefer practical command blocks over long theory.

## Roadmap Modules

- M0: Linux, Terminal, Git, and server operations mindset.
- M1: Networking, HTTP, DNS, and TLS.
- M2: Docker and containerization.
- M3: AWS account, AWS CLI, and IAM.
- M4: VPC, Subnet, Security Group, NAT Gateway, and EC2.
- M5: Entry layer: ALB, ACM, Route 53, and API Gateway.
- M6: Amazon ECR image registry.
- M7: Amazon ECS/Fargate: cluster, task definition, and service.
- M8: Data layer: RDS, ElastiCache Redis, and EFS.
- M9: Auto Scaling for ECS services.
- M10: EventBridge and SNS.
- M11: CloudFormation and Infrastructure as Code.
- M12: CI/CD: build, push ECR, and deploy ECS.
- M13: Observability: CloudWatch Logs/Metrics/Alarms, CloudTrail, and dashboards.
- M14: Security, secrets, encryption, backup/DR, and cost optimization.
- M15: Capstone project: build a mini architecture similar to the roadmap diagram.

## Agent Instructions

- Before changing files, inspect the current repo structure and existing notes.
- Do not overwrite user notes without checking the existing file content.
- If a module folder does not exist, create it when adding notes for that module.
- Keep changes small and focused on the current learning module unless asked otherwise.
- When adding commands, indicate where they should run: macOS host or Ubuntu VM.
