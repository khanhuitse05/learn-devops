output "alb_url" {
  description = "Public URL for the demo app."
  value       = "http://${aws_lb.app.dns_name}"
}

output "cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.app.name
}

output "service_name" {
  description = "ECS service name."
  value       = aws_ecs_service.app.name
}

output "target_group_arn" {
  description = "ALB target group ARN for health checks."
  value       = aws_lb_target_group.app.arn
}

output "log_group_name" {
  description = "CloudWatch log group for app logs."
  value       = aws_cloudwatch_log_group.app.name
}

output "rds_endpoint" {
  description = "Private RDS endpoint."
  value       = aws_db_instance.app.address
}

output "database_url_parameter_name" {
  description = "SSM parameter name used by the ECS task."
  value       = aws_ssm_parameter.database_url.name
}

output "redis_endpoint" {
  description = "Private Redis endpoint."
  value       = aws_elasticache_serverless_cache.app.endpoint[0].address
}