variable "aws_region" {
  description = "AWS region for the lab."
  type        = string
  default     = "ap-southeast-1"
}

variable "demo_prefix" {
  description = "Prefix used for named AWS resources."
  type        = string
  default     = "learn-devops-demo"
}

variable "ecr_repository_name" {
  description = "Existing ECR repository name created in step 06."
  type        = string
  default     = "learn-devops-demo-node"
}

variable "image_tag" {
  description = "Container image tag to deploy from ECR."
  type        = string
  default     = "demo-001"
}

variable "app_port" {
  description = "Container port exposed by the Node.js app."
  type        = number
  default     = 3000
}

variable "desired_count" {
  description = "Number of ECS tasks to run."
  type        = number
  default     = 1
}

variable "container_cpu" {
  description = "Fargate CPU units. 256 is 0.25 vCPU."
  type        = number
  default     = 256
}

variable "container_memory" {
  description = "Fargate memory in MiB."
  type        = number
  default     = 512
}

variable "db_name" {
  description = "Initial PostgreSQL database name."
  type        = string
  default     = "devops_demo"
}

variable "db_username" {
  description = "PostgreSQL master username."
  type        = string
  default     = "devops_demo"
}

variable "db_password" {
  description = "PostgreSQL master password."
  type        = string
  sensitive   = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention for ECS app logs."
  type        = number
  default     = 3
}