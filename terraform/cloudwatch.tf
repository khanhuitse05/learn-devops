resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.demo_prefix}"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${var.demo_prefix}-ecs-logs"
  }
}