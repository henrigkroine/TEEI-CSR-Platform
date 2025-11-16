# Multi-region Route53 configuration with latency-based routing
# Supports automatic failover between US and EU regions

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Primary hosted zone
resource "aws_route53_zone" "main" {
  name    = "teei.example.com"
  comment = "TEEI Platform multi-region DNS"

  tags = {
    Environment     = "production"
    ManagedBy       = "terraform"
    CostCenter      = "platform"
    Compliance      = "soc2,gdpr"
  }
}

# Health check for US region
resource "aws_route53_health_check" "us_east_1" {
  fqdn              = "us.api.teei.example.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30
  measure_latency   = true

  tags = {
    Name        = "teei-us-east-1-health"
    Region      = "us-east-1"
    Environment = "production"
  }
}

# Health check for EU region
resource "aws_route53_health_check" "eu_central_1" {
  fqdn              = "eu.api.teei.example.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30
  measure_latency   = true

  tags = {
    Name        = "teei-eu-central-1-health"
    Region      = "eu-central-1"
    Environment = "production"
  }
}

# CloudWatch alarm for US health check
resource "aws_cloudwatch_metric_alarm" "us_health_alarm" {
  alarm_name          = "route53-health-us-east-1"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "Alert when US region health check fails"
  treat_missing_data  = "breaching"

  dimensions = {
    HealthCheckId = aws_route53_health_check.us_east_1.id
  }

  alarm_actions = [aws_sns_topic.dr_alerts.arn]
}

# CloudWatch alarm for EU health check
resource "aws_cloudwatch_metric_alarm" "eu_health_alarm" {
  alarm_name          = "route53-health-eu-central-1"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "Alert when EU region health check fails"
  treat_missing_data  = "breaching"

  dimensions = {
    HealthCheckId = aws_route53_health_check.eu_central_1.id
  }

  alarm_actions = [aws_sns_topic.dr_alerts.arn]
}

# SNS topic for DR alerts
resource "aws_sns_topic" "dr_alerts" {
  name = "teei-dr-alerts"

  tags = {
    Environment = "production"
    Purpose     = "disaster-recovery"
  }
}

# API endpoint - latency-based routing with failover
resource "aws_route53_record" "api_us" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.teei.example.com"
  type    = "A"

  set_identifier = "us-east-1"
  latency_routing_policy {
    region = "us-east-1"
  }

  health_check_id = aws_route53_health_check.us_east_1.id

  alias {
    name                   = aws_lb.us_east_1.dns_name
    zone_id                = aws_lb.us_east_1.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_eu" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.teei.example.com"
  type    = "A"

  set_identifier = "eu-central-1"
  latency_routing_policy {
    region = "eu-central-1"
  }

  health_check_id = aws_route53_health_check.eu_central_1.id

  alias {
    name                   = aws_lb.eu_central_1.dns_name
    zone_id                = aws_lb.eu_central_1.zone_id
    evaluate_target_health = true
  }
}

# Cockpit endpoint - latency-based routing
resource "aws_route53_record" "cockpit_us" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "cockpit.teei.example.com"
  type    = "A"

  set_identifier = "us-east-1"
  latency_routing_policy {
    region = "us-east-1"
  }

  health_check_id = aws_route53_health_check.us_east_1.id

  alias {
    name                   = aws_lb.us_east_1.dns_name
    zone_id                = aws_lb.us_east_1.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "cockpit_eu" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "cockpit.teei.example.com"
  type    = "A"

  set_identifier = "eu-central-1"
  latency_routing_policy {
    region = "eu-central-1"
  }

  health_check_id = aws_route53_health_check.eu_central_1.id

  alias {
    name                   = aws_lb.eu_central_1.dns_name
    zone_id                = aws_lb.eu_central_1.zone_id
    evaluate_target_health = true
  }
}

# Regional load balancers (placeholders - update with actual values)
resource "aws_lb" "us_east_1" {
  name               = "teei-us-east-1-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_us.id]
  subnets            = data.aws_subnets.us_public.ids

  enable_deletion_protection = true
  enable_http2               = true
  enable_waf_fail_open       = false

  tags = {
    Region      = "us-east-1"
    Environment = "production"
    CostCenter  = "us-operations"
  }
}

resource "aws_lb" "eu_central_1" {
  name               = "teei-eu-central-1-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_eu.id]
  subnets            = data.aws_subnets.eu_public.ids

  enable_deletion_protection = true
  enable_http2               = true
  enable_waf_fail_open       = false

  tags = {
    Region         = "eu-central-1"
    Environment    = "production"
    CostCenter     = "eu-operations"
    GDPRCompliant  = "true"
  }
}

# Security groups for ALBs
resource "aws_security_group" "alb_us" {
  name_prefix = "teei-alb-us-"
  description = "Security group for US ALB"
  vpc_id      = data.aws_vpc.us.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from internet"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound"
  }

  tags = {
    Name   = "teei-alb-us-sg"
    Region = "us-east-1"
  }
}

resource "aws_security_group" "alb_eu" {
  name_prefix = "teei-alb-eu-"
  description = "Security group for EU ALB"
  vpc_id      = data.aws_vpc.eu.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from internet"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound"
  }

  tags = {
    Name          = "teei-alb-eu-sg"
    Region        = "eu-central-1"
    GDPRCompliant = "true"
  }
}

# Data sources for VPCs and subnets (update with actual values)
data "aws_vpc" "us" {
  provider = aws
  tags = {
    Name = "teei-us-east-1-vpc"
  }
}

data "aws_vpc" "eu" {
  provider = aws.eu
  tags = {
    Name = "teei-eu-central-1-vpc"
  }
}

data "aws_subnets" "us_public" {
  provider = aws
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.us.id]
  }
  filter {
    name   = "tag:Tier"
    values = ["public"]
  }
}

data "aws_subnets" "eu_public" {
  provider = aws.eu
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.eu.id]
  }
  filter {
    name   = "tag:Tier"
    values = ["public"]
  }
}

# Outputs
output "route53_zone_id" {
  value       = aws_route53_zone.main.zone_id
  description = "Route53 hosted zone ID"
}

output "nameservers" {
  value       = aws_route53_zone.main.name_servers
  description = "Route53 nameservers"
}

output "us_health_check_id" {
  value       = aws_route53_health_check.us_east_1.id
  description = "US region health check ID"
}

output "eu_health_check_id" {
  value       = aws_route53_health_check.eu_central_1.id
  description = "EU region health check ID"
}
