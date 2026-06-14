resource "aws_ssm_parameter" "database_url" {
  name  = "/${var.demo_prefix}/database-url"
  type  = "String"
  value = "postgres://${var.db_username}:${var.db_password}@${aws_db_instance.app.address}:${aws_db_instance.app.port}/${var.db_name}?sslmode=require"

  tags = {
    Name = "${var.demo_prefix}-database-url"
  }
}