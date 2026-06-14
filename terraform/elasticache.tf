resource "aws_elasticache_serverless_cache" "app" {
  engine = "redis"
  name   = "${var.demo_prefix}-redis"

  subnet_ids         = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.redis.id]

  tags = {
    Name = "${var.demo_prefix}-redis"
  }
}