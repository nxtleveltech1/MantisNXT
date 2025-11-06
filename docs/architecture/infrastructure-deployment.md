# Infrastructure & Deployment Guide

## Architecture Overview

### Cloud Provider Recommendations

#### AWS (Recommended)
**Pros:**
- Most mature service ecosystem
- Excellent database options (RDS, Aurora)
- Best Redis offering (ElastiCache)
- Comprehensive monitoring (CloudWatch)
- Global infrastructure

**Cons:**
- Can be complex
- Pricing can be opaque

**Estimated Monthly Cost:** $900-1,200

#### Azure
**Pros:**
- Great for Microsoft-heavy organizations
- Good integration with Active Directory
- Competitive pricing
- Strong enterprise support

**Cons:**
- Some services less mature than AWS
- Less third-party tooling

**Estimated Monthly Cost:** $850-1,100

#### Google Cloud Platform (GCP)
**Pros:**
- Best-in-class networking
- Excellent for data analytics
- Clean pricing model
- Great Kubernetes support

**Cons:**
- Smaller ecosystem than AWS
- Fewer regions globally

**Estimated Monthly Cost:** $800-1,000

---

## AWS Infrastructure

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         CloudFront CDN                        │
│                  (Static Assets, API Cache)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Application Load Balancer                    │
│              (SSL Termination, Health Checks)                 │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   ECS Fargate    │ │   ECS Fargate    │ │   ECS Fargate    │
│  (Container 1)   │ │  (Container 2)   │ │  (Container 3)   │
│  2 vCPU, 4GB RAM │ │  2 vCPU, 4GB RAM │ │  2 vCPU, 4GB RAM │
└──────────────────┘ └──────────────────┘ └──────────────────┘
            │                 │                 │
            └─────────────────┼─────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  ElastiCache     │ │   RDS Aurora     │ │   RDS Aurora     │
│  Redis Cluster   │ │   PostgreSQL     │ │   PostgreSQL     │
│    (4GB RAM)     │ │   (Primary)      │ │  (Read Replica)  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
            │                 │                 │
            └─────────────────┼─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   CloudWatch     │
                    │   (Monitoring)   │
                    └──────────────────┘
```

### Infrastructure as Code (Terraform)

#### 1. Provider Configuration

```hcl
# terraform/providers.tf
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "mantisnxt-terraform-state"
    key            = "admin-panel/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "MantisNXT"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
```

#### 2. VPC & Networking

```hcl
# terraform/networking.tf
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "mantisnxt-${var.environment}-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  database_subnets = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]

  enable_nat_gateway = true
  enable_vpn_gateway = false
  enable_dns_hostnames = true
  enable_dns_support   = true

  # VPC Flow Logs
  enable_flow_log                      = true
  create_flow_log_cloudwatch_iam_role  = true
  create_flow_log_cloudwatch_log_group = true
}

# Security Groups
resource "aws_security_group" "app" {
  name_prefix = "mantisnxt-app-"
  description = "Security group for application containers"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = module.vpc.private_subnets_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "mantisnxt-app-sg"
  }
}

resource "aws_security_group" "database" {
  name_prefix = "mantisnxt-db-"
  description = "Security group for RDS database"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  tags = {
    Name = "mantisnxt-db-sg"
  }
}

resource "aws_security_group" "redis" {
  name_prefix = "mantisnxt-redis-"
  description = "Security group for Redis cluster"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  tags = {
    Name = "mantisnxt-redis-sg"
  }
}
```

#### 3. RDS Aurora PostgreSQL

```hcl
# terraform/database.tf
resource "aws_rds_cluster" "main" {
  cluster_identifier      = "mantisnxt-${var.environment}"
  engine                  = "aurora-postgresql"
  engine_version          = "15.4"
  database_name           = "mantisnxt"
  master_username         = var.db_master_username
  master_password         = var.db_master_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]

  backup_retention_period = 7
  preferred_backup_window = "03:00-04:00"

  preferred_maintenance_window = "sun:04:00-sun:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql"]

  deletion_protection = var.environment == "production" ? true : false

  skip_final_snapshot       = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "mantisnxt-final-snapshot" : null

  # Performance Insights
  performance_insights_enabled = true
  performance_insights_retention_period = 7

  tags = {
    Name = "mantisnxt-${var.environment}-cluster"
  }
}

# Primary Instance
resource "aws_rds_cluster_instance" "primary" {
  identifier           = "mantisnxt-${var.environment}-primary"
  cluster_identifier   = aws_rds_cluster.main.id
  instance_class       = var.db_instance_class
  engine               = aws_rds_cluster.main.engine
  engine_version       = aws_rds_cluster.main.engine_version

  publicly_accessible  = false

  performance_insights_enabled = true
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  tags = {
    Name = "mantisnxt-${var.environment}-primary"
  }
}

# Read Replica 1
resource "aws_rds_cluster_instance" "replica_1" {
  identifier           = "mantisnxt-${var.environment}-replica-1"
  cluster_identifier   = aws_rds_cluster.main.id
  instance_class       = var.db_replica_instance_class
  engine               = aws_rds_cluster.main.engine
  engine_version       = aws_rds_cluster.main.engine_version

  publicly_accessible  = false

  performance_insights_enabled = true
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  tags = {
    Name = "mantisnxt-${var.environment}-replica-1"
  }
}

# Read Replica 2
resource "aws_rds_cluster_instance" "replica_2" {
  identifier           = "mantisnxt-${var.environment}-replica-2"
  cluster_identifier   = aws_rds_cluster.main.id
  instance_class       = var.db_replica_instance_class
  engine               = aws_rds_cluster.main.engine
  engine_version       = aws_rds_cluster.main.engine_version

  publicly_accessible  = false

  performance_insights_enabled = true
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  tags = {
    Name = "mantisnxt-${var.environment}-replica-2"
  }
}

# Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "mantisnxt-${var.environment}"
  subnet_ids = module.vpc.database_subnets

  tags = {
    Name = "mantisnxt-${var.environment}-subnet-group"
  }
}
```

#### 4. ElastiCache Redis

```hcl
# terraform/redis.tf
resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "mantisnxt-${var.environment}"
  replication_group_description = "Redis cluster for MantisNXT"

  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.redis_node_type
  number_cache_clusters = 2

  parameter_group_name = aws_elasticache_parameter_group.main.name

  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]

  automatic_failover_enabled = true
  multi_az_enabled          = true

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled        = true
  auth_token               = var.redis_auth_token

  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00"

  maintenance_window = "sun:05:00-sun:07:00"

  notification_topic_arn = aws_sns_topic.cache_alerts.arn

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  tags = {
    Name = "mantisnxt-${var.environment}-redis"
  }
}

resource "aws_elasticache_parameter_group" "main" {
  name   = "mantisnxt-${var.environment}"
  family = "redis7"

  # Optimize for caching
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }
}

resource "aws_elasticache_subnet_group" "main" {
  name       = "mantisnxt-${var.environment}"
  subnet_ids = module.vpc.private_subnets
}
```

#### 5. ECS Fargate

```hcl
# terraform/ecs.tf
resource "aws_ecs_cluster" "main" {
  name = "mantisnxt-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "mantisnxt-${var.environment}-cluster"
  }
}

resource "aws_ecs_task_definition" "app" {
  family                   = "mantisnxt-${var.environment}-app"
  requires_compatibilities = ["FARGATE"]
  network_mode            = "awsvpc"
  cpu                     = "2048"
  memory                  = "4096"
  execution_role_arn      = aws_iam_role.ecs_execution.arn
  task_role_arn           = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "${var.ecr_repository_url}:${var.image_tag}"

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${var.db_master_username}:${var.db_master_password}@${aws_rds_cluster.main.endpoint}:5432/mantisnxt"
        },
        {
          name  = "READ_REPLICA_URLS"
          value = join(",", [
            "postgresql://${var.db_master_username}:${var.db_master_password}@${aws_rds_cluster_instance.replica_1.endpoint}:5432/mantisnxt",
            "postgresql://${var.db_master_username}:${var.db_master_password}@${aws_rds_cluster_instance.replica_2.endpoint}:5432/mantisnxt"
          ])
        },
        {
          name  = "REDIS_HOST"
          value = aws_elasticache_replication_group.main.primary_endpoint_address
        },
        {
          name  = "REDIS_PORT"
          value = "6379"
        }
      ]

      secrets = [
        {
          name      = "REDIS_PASSWORD"
          valueFrom = aws_secretsmanager_secret.redis_auth_token.arn
        },
        {
          name      = "STACK_AUTH_SECRET_KEY"
          valueFrom = aws_secretsmanager_secret.stack_auth_secret.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "app"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "mantisnxt-${var.environment}-app"
  }
}

resource "aws_ecs_service" "app" {
  name            = "mantisnxt-${var.environment}-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.app_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 3000
  }

  # Auto-scaling
  depends_on = [aws_lb_listener.https]

  tags = {
    Name = "mantisnxt-${var.environment}-app-service"
  }
}
```

#### 6. Application Load Balancer

```hcl
# terraform/alb.tf
resource "aws_lb" "main" {
  name               = "mantisnxt-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets

  enable_deletion_protection = var.environment == "production" ? true : false
  enable_http2              = true
  enable_cross_zone_load_balancing = true

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    enabled = true
  }

  tags = {
    Name = "mantisnxt-${var.environment}-alb"
  }
}

resource "aws_lb_target_group" "app" {
  name        = "mantisnxt-${var.environment}-app"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/api/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = {
    Name = "mantisnxt-${var.environment}-app-tg"
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_security_group" "alb" {
  name_prefix = "mantisnxt-alb-"
  description = "Security group for ALB"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "mantisnxt-alb-sg"
  }
}
```

#### 7. Auto Scaling

```hcl
# terraform/autoscaling.tf
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = var.app_max_count
  min_capacity       = var.app_min_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# CPU-based scaling
resource "aws_appautoscaling_policy" "cpu" {
  name               = "mantisnxt-${var.environment}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Memory-based scaling
resource "aws_appautoscaling_policy" "memory" {
  name               = "mantisnxt-${var.environment}-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }

    target_value       = 80.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Request count-based scaling
resource "aws_appautoscaling_policy" "requests" {
  name               = "mantisnxt-${var.environment}-request-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.main.arn_suffix}/${aws_lb_target_group.app.arn_suffix}"
    }

    target_value       = 1000.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

#### 8. CloudWatch Monitoring

```hcl
# terraform/monitoring.tf
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/mantisnxt-${var.environment}-app"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "mantisnxt-${var.environment}-app-logs"
  }
}

# API Response Time Alarm
resource "aws_cloudwatch_metric_alarm" "api_response_time" {
  alarm_name          = "mantisnxt-${var.environment}-api-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "0.5"
  alarm_description   = "API response time is too high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.app.arn_suffix
  }
}

# Database CPU Alarm
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "mantisnxt-${var.environment}-database-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Database CPU is too high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.main.cluster_identifier
  }
}

# Redis Cache Hit Rate Alarm
resource "aws_cloudwatch_metric_alarm" "cache_hit_rate" {
  alarm_name          = "mantisnxt-${var.environment}-cache-hit-rate"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CacheHitRate"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Cache hit rate is too low"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.main.id
  }
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "mantisnxt-${var.environment}-alerts"

  tags = {
    Name = "mantisnxt-${var.environment}-alerts"
  }
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}
```

---

## CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS

on:
  push:
    branches:
      - main
      - staging
      - develop

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: mantisnxt
  ECS_SERVICE: mantisnxt-${{ github.ref_name }}-app
  ECS_CLUSTER: mantisnxt-${{ github.ref_name }}
  CONTAINER_NAME: app

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run tests
        run: npm test

      - name: Run E2E tests
        run: npm run test:e2e

  build:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.build-image.outputs.image }}
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image to Amazon ECR
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Fill in the new image ID in the Amazon ECS task definition
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-definition.json
          container-name: ${{ env.CONTAINER_NAME }}
          image: ${{ needs.build.outputs.image }}

      - name: Deploy Amazon ECS task definition
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true

      - name: Run database migrations
        run: |
          aws ecs run-task \
            --cluster ${{ env.ECS_CLUSTER }} \
            --task-definition mantisnxt-${{ github.ref_name }}-migrations \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[${{ secrets.PRIVATE_SUBNET_IDS }}],securityGroups=[${{ secrets.APP_SECURITY_GROUP_ID }}],assignPublicIp=DISABLED}"

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: |
            Deployment to ${{ github.ref_name }} completed!
            Image: ${{ needs.build.outputs.image }}
            Commit: ${{ github.sha }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
        if: always()
```

---

## Deployment Commands

### Initialize Terraform
```bash
cd terraform
terraform init
```

### Plan Changes
```bash
terraform plan -var-file="environments/${ENVIRONMENT}.tfvars"
```

### Apply Changes
```bash
terraform apply -var-file="environments/${ENVIRONMENT}.tfvars"
```

### Destroy Infrastructure
```bash
terraform destroy -var-file="environments/${ENVIRONMENT}.tfvars"
```

---

## Environment Variables

```bash
# .env.production
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@rds-cluster.amazonaws.com:5432/mantisnxt
READ_REPLICA_URLS=postgresql://user:pass@replica1.amazonaws.com:5432/mantisnxt,postgresql://user:pass@replica2.amazonaws.com:5432/mantisnxt

# Redis
REDIS_HOST=redis-cluster.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=<from-secrets-manager>

# Stack Auth
STACK_AUTH_PROJECT_ID=<project-id>
STACK_AUTH_PUBLISHABLE_KEY=<publishable-key>
STACK_AUTH_SECRET_KEY=<from-secrets-manager>

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=<from-secrets-manager>
EMAIL_FROM=noreply@mantisnxt.com

# SMS
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=<from-secrets-manager>
TWILIO_AUTH_TOKEN=<from-secrets-manager>
TWILIO_PHONE_NUMBER=<phone-number>

# Monitoring
SENTRY_DSN=<from-secrets-manager>
DATADOG_API_KEY=<from-secrets-manager>
```

---

## Rollback Procedure

### Automated Rollback (via ECS)
```bash
# Get previous task definition
aws ecs describe-task-definition \
  --task-definition mantisnxt-production-app \
  --query 'taskDefinition.revision' \
  --output text

# Update service to previous revision
aws ecs update-service \
  --cluster mantisnxt-production \
  --service mantisnxt-production-app \
  --task-definition mantisnxt-production-app:PREVIOUS_REVISION
```

### Manual Rollback (via Terraform)
```bash
# Revert to previous commit
git revert HEAD

# Apply changes
terraform apply -var-file="environments/production.tfvars"
```

---

## Disaster Recovery

### Database Backup & Restore

**Automated Backups:**
- Daily automated snapshots (7-day retention)
- Point-in-time recovery (PITR) enabled
- Cross-region replication for critical data

**Manual Backup:**
```bash
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier mantisnxt-production \
  --db-cluster-snapshot-identifier mantisnxt-manual-backup-$(date +%Y%m%d)
```

**Restore from Snapshot:**
```bash
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier mantisnxt-production-restored \
  --snapshot-identifier mantisnxt-manual-backup-20251104 \
  --engine aurora-postgresql
```

### Redis Backup & Restore

**Automated Backups:**
- Daily snapshots (5-day retention)

**Manual Backup:**
```bash
aws elasticache create-snapshot \
  --replication-group-id mantisnxt-production \
  --snapshot-name mantisnxt-redis-backup-$(date +%Y%m%d)
```

**Restore from Snapshot:**
```bash
aws elasticache create-replication-group \
  --replication-group-id mantisnxt-production-restored \
  --snapshot-name mantisnxt-redis-backup-20251104
```

---

## Cost Optimization Tips

1. **Use Spot Instances for Non-Critical Workloads**
   - Background jobs
   - Testing environments

2. **Implement Auto-Scaling**
   - Scale down during off-peak hours
   - Use scheduled scaling

3. **Optimize Database**
   - Use appropriate instance sizes
   - Enable connection pooling
   - Implement read replicas for read-heavy workloads

4. **Use CloudFront CDN**
   - Cache static assets
   - Reduce origin requests

5. **Implement Intelligent Tiering**
   - S3 Intelligent-Tiering for backups
   - Archive old logs to Glacier

6. **Monitor and Alert on Costs**
   - Set up AWS Budgets
   - Monitor cost anomalies
   - Regular cost reviews

---

## Security Best Practices

1. **Network Security**
   - Use VPC with private subnets
   - Enable VPC Flow Logs
   - Use security groups (not NACLs)

2. **Data Encryption**
   - Encrypt data at rest (RDS, Redis, S3)
   - Use SSL/TLS for data in transit
   - Rotate encryption keys regularly

3. **Access Control**
   - Use IAM roles (not access keys)
   - Implement least privilege principle
   - Enable MFA for production access

4. **Secrets Management**
   - Store secrets in AWS Secrets Manager
   - Rotate secrets automatically
   - Never commit secrets to Git

5. **Monitoring & Logging**
   - Enable CloudTrail
   - Centralize logs in CloudWatch
   - Set up security alerts

6. **Regular Updates**
   - Keep dependencies updated
   - Patch security vulnerabilities
   - Regular security audits

---

## Maintenance Windows

**Recommended Schedule:**
- **Database**: Sunday 3:00-5:00 AM UTC
- **Redis**: Sunday 5:00-7:00 AM UTC
- **Application**: Rolling updates (no downtime)

**Maintenance Checklist:**
- [ ] Notify users in advance
- [ ] Take pre-maintenance backup
- [ ] Perform updates
- [ ] Run smoke tests
- [ ] Monitor for issues
- [ ] Document changes

---

## Support & Escalation

**Tier 1: Application Issues**
- Team: DevOps
- Response: 15 minutes

**Tier 2: Infrastructure Issues**
- Team: Infrastructure
- Response: 30 minutes

**Tier 3: Critical Outages**
- Team: On-call Engineer
- Response: 5 minutes
- Escalation: CTO after 30 minutes

**Contact:**
- Slack: #ops-alerts
- PagerDuty: mantisnxt-oncall
- Email: ops@mantisnxt.com