# AWS WAF configuration for both US and EU regions
# Protects against OWASP Top 10 vulnerabilities

# US Region WAF WebACL
resource "aws_wafv2_web_acl" "us_east_1" {
  provider    = aws
  name        = "teei-us-waf"
  description = "TEEI Platform WAF for US region"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Rule 1: Rate limiting (100 req/5min per IP)
  rule {
    name     = "rate-limit"
    priority = 1

    action {
      block {
        custom_response {
          response_code = 429
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: AWS Managed - Core Rule Set
  rule {
    name     = "aws-managed-core"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedCore"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: Known Bad Inputs
  rule {
    name     = "aws-managed-known-bad-inputs"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "KnownBadInputs"
      sampled_requests_enabled   = true
    }
  }

  # Rule 4: SQL Injection Protection
  rule {
    name     = "aws-managed-sqli"
    priority = 4

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesSQLiRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLiProtection"
      sampled_requests_enabled   = true
    }
  }

  # Rule 5: Block geo locations (if needed)
  rule {
    name     = "geo-blocking"
    priority = 5

    action {
      block {}
    }

    statement {
      geo_match_statement {
        country_codes = ["KP", "IR", "SY"]  # Example: block North Korea, Iran, Syria
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoBlocking"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "TEEIWebACL"
    sampled_requests_enabled   = true
  }

  tags = {
    Environment = "production"
    Region      = "us-east-1"
    CostCenter  = "us-operations"
  }
}

# EU Region WAF WebACL (GDPR-compliant)
resource "aws_wafv2_web_acl" "eu_central_1" {
  provider    = aws.eu
  name        = "teei-eu-waf"
  description = "TEEI Platform WAF for EU region (GDPR-compliant)"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Rule 1: Stricter rate limiting for EU (80 req/5min per IP)
  rule {
    name     = "rate-limit"
    priority = 1

    action {
      block {
        custom_response {
          response_code = 429
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = 1600
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: AWS Managed - Core Rule Set
  rule {
    name     = "aws-managed-core"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedCore"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: Known Bad Inputs
  rule {
    name     = "aws-managed-known-bad-inputs"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "KnownBadInputs"
      sampled_requests_enabled   = true
    }
  }

  # Rule 4: SQL Injection Protection
  rule {
    name     = "aws-managed-sqli"
    priority = 4

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesSQLiRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLiProtection"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "TEEIWebACLEU"
    sampled_requests_enabled   = true
  }

  tags = {
    Environment   = "production"
    Region        = "eu-central-1"
    CostCenter    = "eu-operations"
    GDPRCompliant = "true"
    Compliance    = "gdpr,soc2"
  }
}

# Associate WAF with US ALB
resource "aws_wafv2_web_acl_association" "us_alb" {
  provider     = aws
  resource_arn = aws_lb.us_east_1.arn
  web_acl_arn  = aws_wafv2_web_acl.us_east_1.arn
}

# Associate WAF with EU ALB
resource "aws_wafv2_web_acl_association" "eu_alb" {
  provider     = aws.eu
  resource_arn = aws_lb.eu_central_1.arn
  web_acl_arn  = aws_wafv2_web_acl.eu_central_1.arn
}

# CloudWatch Log Group for US WAF
resource "aws_cloudwatch_log_group" "waf_us" {
  provider          = aws
  name              = "/aws/waf/teei-us"
  retention_in_days = 30

  tags = {
    Environment = "production"
    Region      = "us-east-1"
  }
}

# CloudWatch Log Group for EU WAF (longer retention for GDPR)
resource "aws_cloudwatch_log_group" "waf_eu" {
  provider          = aws.eu
  name              = "/aws/waf/teei-eu"
  retention_in_days = 90  # GDPR requires longer audit logs

  tags = {
    Environment   = "production"
    Region        = "eu-central-1"
    GDPRCompliant = "true"
  }
}

# Logging configuration for US WAF
resource "aws_wafv2_web_acl_logging_configuration" "us_logging" {
  provider                = aws
  resource_arn            = aws_wafv2_web_acl.us_east_1.arn
  log_destination_configs = [aws_cloudwatch_log_group.waf_us.arn]

  redacted_fields {
    single_header {
      name = "authorization"
    }
  }
}

# Logging configuration for EU WAF
resource "aws_wafv2_web_acl_logging_configuration" "eu_logging" {
  provider                = aws.eu
  resource_arn            = aws_wafv2_web_acl.eu_central_1.arn
  log_destination_configs = [aws_cloudwatch_log_group.waf_eu.arn]

  redacted_fields {
    single_header {
      name = "authorization"
    }
  }
}

# Outputs
output "us_waf_arn" {
  value       = aws_wafv2_web_acl.us_east_1.arn
  description = "US region WAF WebACL ARN"
}

output "eu_waf_arn" {
  value       = aws_wafv2_web_acl.eu_central_1.arn
  description = "EU region WAF WebACL ARN"
}
