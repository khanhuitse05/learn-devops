resource "aws_db_subnet_group" "app" {
  name        = "${var.demo_prefix}-db-subnet-group"
  description = "Private subnets for the demo PostgreSQL database."
  subnet_ids  = aws_subnet.private[*].id

  tags = {
    Name = "${var.demo_prefix}-db-subnet-group"
  }
}

resource "aws_db_instance" "app" {
  identifier = "${var.demo_prefix}-postgres"

  engine         = "postgres"
  engine_version = "16"
  instance_class = "db.t4g.micro"

  allocated_storage = 20
  storage_type      = "gp3"

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.app.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  backup_retention_period = 0
  deletion_protection     = false
  skip_final_snapshot     = true

  tags = {
    Name = "${var.demo_prefix}-postgres"
  }
}