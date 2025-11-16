# Route53 & WAF Infrastructure Documentation

**GA Cutover: Multi-Region Traffic Management**

**Last Updated:** 2025-11-16
**Owner:** Network Engineering Team

---

## Table of Contents

1. [Overview](#overview)
2. [Route53 Configuration](#route53-configuration)
3. [WAF Rules](#waf-rules)
4. [CloudFront CDN](#cloudfront-cdn)
5. [Deployment Procedures](#deployment-procedures)
6. [Monitoring & Alerts](#monitoring--alerts)
7. [Troubleshooting](#troubleshooting)

---

## Overview

Multi-region traffic management infrastructure for GA cutover, ensuring:
- Latency-based routing (US/EU)
- Automatic failover with health checks
- WAF protection (OWASP Top 10)
- TLS 1.3 enforcement
- GDPR-compliant geo-routing

**Architecture:**
```
Internet
    │
    ├─> CloudFront (Global CDN)
    │       │
    │       ├─> WAF (OWASP + Rate Limiting)
    │       │
    │       └─> Origin Groups (failover)
    │
    └─> Route53 (Latency-based)
            │
            ├─> us-east-1 ALB (Americas)
            └─> eu-central-1 ALB (Europe/Asia/Africa)
```

---

## Route53 Configuration

### Hosted Zone

**Zone ID:** `Z1234567890ABC`
**Domain:** `teei.cloud`

### DNS Records

#### 1. Latency-Based Routing (US)

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://route53-us-east-1.json
```

**route53-us-east-1.json:**
```json
{
  "Comment": "Latency-based routing to US region",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.teei.cloud",
        "Type": "A",
        "SetIdentifier": "us-east-1-primary",
        "Region": "us-east-1",
        "HealthCheckId": "hc-us-east-1",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "teei-us-east-1-alb-123456789.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "cockpit.teei.cloud",
        "Type": "A",
        "SetIdentifier": "us-east-1-primary",
        "Region": "us-east-1",
        "HealthCheckId": "hc-us-east-1",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "teei-us-east-1-alb-123456789.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
```

#### 2. Latency-Based Routing (EU)

**route53-eu-central-1.json:**
```json
{
  "Comment": "Latency-based routing to EU region",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.teei.cloud",
        "Type": "A",
        "SetIdentifier": "eu-central-1-primary",
        "Region": "eu-central-1",
        "HealthCheckId": "hc-eu-central-1",
        "AliasTarget": {
          "HostedZoneId": "Z215JYRZR1TBD5",
          "DNSName": "teei-eu-central-1-alb-987654321.eu-central-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.eu.teei.cloud",
        "Type": "A",
        "SetIdentifier": "eu-central-1-geo",
        "Region": "eu-central-1",
        "HealthCheckId": "hc-eu-central-1",
        "AliasTarget": {
          "HostedZoneId": "Z215JYRZR1TBD5",
          "DNSName": "teei-eu-central-1-alb-987654321.eu-central-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
```

### Health Checks

#### US Health Check

```bash
aws route53 create-health-check --health-check-config file://health-check-us.json
```

**health-check-us.json:**
```json
{
  "Type": "HTTPS",
  "ResourcePath": "/health",
  "FullyQualifiedDomainName": "teei-us-east-1-alb-123456789.us-east-1.elb.amazonaws.com",
  "Port": 443,
  "RequestInterval": 30,
  "FailureThreshold": 3,
  "MeasureLatency": true,
  "EnableSNI": true
}
```

#### EU Health Check

**health-check-eu.json:**
```json
{
  "Type": "HTTPS",
  "ResourcePath": "/health",
  "FullyQualifiedDomainName": "teei-eu-central-1-alb-987654321.eu-central-1.elb.amazonaws.com",
  "Port": 443,
  "RequestInterval": 30,
  "FailureThreshold": 3,
  "MeasureLatency": true,
  "EnableSNI": true
}
```

**Monitoring:**
- Check interval: 30 seconds
- Failure threshold: 3 consecutive failures (90s)
- Auto-failover: Triggered on health check failure

---

## WAF Rules

### WAF Web ACL

**Name:** `teei-production-waf`
**Scope:** `CLOUDFRONT`
**Capacity:** 1500 WCUs (Web ACL Capacity Units)

### Rule Groups

#### 1. AWS Managed Rules - Core Rule Set (CRS)

Protects against OWASP Top 10:
- SQL injection
- Cross-site scripting (XSS)
- Local file inclusion (LFI)
- Remote file inclusion (RFI)

```bash
aws wafv2 create-web-acl \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --name teei-production-waf \
  --default-action Block={} \
  --rules file://waf-rules.json
```

**waf-rules.json:**
```json
{
  "Name": "teei-production-waf",
  "Scope": "CLOUDFRONT",
  "DefaultAction": {"Allow": {}},
  "Rules": [
    {
      "Name": "AWS-AWSManagedRulesCommonRuleSet",
      "Priority": 1,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet",
          "ExcludedRules": []
        }
      },
      "OverrideAction": {"None": {}},
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "AWS-AWSManagedRulesCommonRuleSet"
      }
    },
    {
      "Name": "AWS-AWSManagedRulesKnownBadInputsRuleSet",
      "Priority": 2,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesKnownBadInputsRuleSet"
        }
      },
      "OverrideAction": {"None": {}},
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "AWS-AWSManagedRulesKnownBadInputsRuleSet"
      }
    },
    {
      "Name": "RateLimitRule",
      "Priority": 3,
      "Statement": {
        "RateBasedStatement": {
          "Limit": 1000,
          "AggregateKeyType": "IP"
        }
      },
      "Action": {"Block": {}},
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "RateLimitRule"
      }
    },
    {
      "Name": "GeoBlockingRule",
      "Priority": 4,
      "Statement": {
        "GeoMatchStatement": {
          "CountryCodes": ["CN", "RU", "KP"]
        }
      },
      "Action": {"Block": {}},
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "GeoBlockingRule"
      }
    },
    {
      "Name": "SQLInjectionRule",
      "Priority": 5,
      "Statement": {
        "SqliMatchStatement": {
          "FieldToMatch": {
            "QueryString": {}
          },
          "TextTransformations": [
            {
              "Priority": 0,
              "Type": "URL_DECODE"
            },
            {
              "Priority": 1,
              "Type": "HTML_ENTITY_DECODE"
            }
          ]
        }
      },
      "Action": {"Block": {}},
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "SQLInjectionRule"
      }
    },
    {
      "Name": "XSSRule",
      "Priority": 6,
      "Statement": {
        "XssMatchStatement": {
          "FieldToMatch": {
            "AllQueryArguments": {}
          },
          "TextTransformations": [
            {
              "Priority": 0,
              "Type": "URL_DECODE"
            },
            {
              "Priority": 1,
              "Type": "HTML_ENTITY_DECODE"
            }
          ]
        }
      },
      "Action": {"Block": {}},
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "XSSRule"
      }
    }
  ],
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "teei-production-waf"
  }
}
```

### WAF Logging

```bash
aws wafv2 put-logging-configuration \
  --logging-configuration file://waf-logging.json
```

**waf-logging.json:**
```json
{
  "ResourceArn": "arn:aws:wafv2:us-east-1:123456789012:global/webacl/teei-production-waf/abc123",
  "LogDestinationConfigs": [
    "arn:aws:s3:::teei-waf-logs"
  ],
  "RedactedFields": [
    {
      "SingleHeader": {
        "Name": "authorization"
      }
    },
    {
      "SingleHeader": {
        "Name": "cookie"
      }
    }
  ]
}
```

---

## CloudFront CDN

### Distribution Configuration

**Distribution ID:** `EDFDVBD632BHDS5`

```bash
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

**cloudfront-config.json:**
```json
{
  "CallerReference": "teei-production-2025-11-16",
  "Comment": "TEEI CSR Platform - Multi-region CDN",
  "Enabled": true,
  "DefaultCacheBehavior": {
    "TargetOriginId": "teei-origin-group",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "OriginRequestPolicyId": "216adef6-5c7f-47e4-b989-5492eafa07d3",
    "Compress": true,
    "MinTTL": 0,
    "DefaultTTL": 300,
    "MaxTTL": 3600
  },
  "Origins": {
    "Quantity": 2,
    "Items": [
      {
        "Id": "teei-us-east-1",
        "DomainName": "teei-us-east-1-alb-123456789.us-east-1.elb.amazonaws.com",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only",
          "OriginSslProtocols": {
            "Quantity": 1,
            "Items": ["TLSv1.3"]
          },
          "OriginReadTimeout": 30,
          "OriginKeepaliveTimeout": 5
        }
      },
      {
        "Id": "teei-eu-central-1",
        "DomainName": "teei-eu-central-1-alb-987654321.eu-central-1.elb.amazonaws.com",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only",
          "OriginSslProtocols": {
            "Quantity": 1,
            "Items": ["TLSv1.3"]
          },
          "OriginReadTimeout": 30,
          "OriginKeepaliveTimeout": 5
        }
      }
    ]
  },
  "OriginGroups": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "teei-origin-group",
        "FailoverCriteria": {
          "StatusCodes": {
            "Quantity": 4,
            "Items": [500, 502, 503, 504]
          }
        },
        "Members": {
          "Quantity": 2,
          "Items": [
            {"OriginId": "teei-us-east-1"},
            {"OriginId": "teei-eu-central-1"}
          ]
        }
      }
    ]
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.3_2021"
  },
  "WebACLId": "arn:aws:wafv2:us-east-1:123456789012:global/webacl/teei-production-waf/abc123"
}
```

### Cache Behaviors

| Path | TTL | Methods | Compression |
|------|-----|---------|-------------|
| `/api/*` | 0s (no cache) | ALL | Yes |
| `/static/*` | 1 day | GET, HEAD | Yes |
| `/*.js` | 1 hour | GET, HEAD | Yes |
| `/*.css` | 1 hour | GET, HEAD | Yes |
| `/` | 5 min | GET, HEAD, POST | Yes |

---

## Deployment Procedures

### 1. Deploy Route53 Configuration

```bash
# Apply US configuration
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://route53-us-east-1.json

# Apply EU configuration
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://route53-eu-central-1.json

# Wait for propagation
aws route53 get-change --id /change/C1234567890ABC
```

### 2. Deploy WAF

```bash
# Create Web ACL
aws wafv2 create-web-acl \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --cli-input-json file://waf-rules.json

# Enable logging
aws wafv2 put-logging-configuration \
  --logging-configuration file://waf-logging.json
```

### 3. Deploy CloudFront

```bash
# Create distribution
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json

# Wait for deployment
aws cloudfront wait distribution-deployed \
  --id EDFDVBD632BHDS5
```

### 4. Verify Deployment

```bash
# Test DNS resolution
dig api.teei.cloud
dig api.eu.teei.cloud

# Test health checks
aws route53 get-health-check-status --health-check-id hc-us-east-1
aws route53 get-health-check-status --health-check-id hc-eu-central-1

# Test WAF
curl -I https://api.teei.cloud
curl -I "https://api.teei.cloud?test=<script>alert(1)</script>"  # Should be blocked

# Test CloudFront
curl -I https://d123456789.cloudfront.net
```

---

## Monitoring & Alerts

### CloudWatch Metrics

**Route53 Health Checks:**
- `HealthCheckStatus`
- `HealthCheckPercentageHealthy`
- `ChildHealthCheckHealthyCount`

**WAF:**
- `AllowedRequests`
- `BlockedRequests`
- `CountedRequests`
- `SampledRequests`

**CloudFront:**
- `Requests`
- `BytesDownloaded`
- `BytesUploaded`
- `4xxErrorRate`
- `5xxErrorRate`
- `TotalErrorRate`

### CloudWatch Alarms

```bash
# Route53 health check alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "Route53-HealthCheck-US-Failed" \
  --alarm-description "US health check failed" \
  --metric-name HealthCheckStatus \
  --namespace AWS/Route53 \
  --statistic Minimum \
  --period 60 \
  --threshold 1 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:prod-alerts

# WAF blocked requests spike
aws cloudwatch put-metric-alarm \
  --alarm-name "WAF-BlockedRequests-Spike" \
  --alarm-description "WAF blocking unusually high traffic" \
  --metric-name BlockedRequests \
  --namespace AWS/WAFV2 \
  --statistic Sum \
  --period 300 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:prod-alerts
```

---

## Troubleshooting

### Issue: DNS Not Resolving

**Diagnosis:**
```bash
dig api.teei.cloud +trace
nslookup api.teei.cloud 8.8.8.8
```

**Resolution:**
- Check hosted zone exists
- Verify NS records propagated
- Wait up to 48h for full propagation (typically < 1h)

### Issue: Health Check Failing

**Diagnosis:**
```bash
aws route53 get-health-check-status --health-check-id hc-us-east-1
curl -I https://<alb-endpoint>/health
```

**Resolution:**
- Verify ALB is healthy
- Check security group allows Route53 health checks (IPs: 15.177.0.0/18)
- Verify `/health` endpoint returns 200

### Issue: WAF Blocking Legitimate Traffic

**Diagnosis:**
```bash
aws wafv2 get-sampled-requests \
  --web-acl-arn <arn> \
  --rule-metric-name <rule> \
  --scope CLOUDFRONT \
  --time-window StartTime=<start>,EndTime=<end> \
  --max-items 100
```

**Resolution:**
- Review blocked request samples
- Add rule exclusions for false positives
- Adjust rate limiting threshold

### Issue: CloudFront Origin Errors

**Diagnosis:**
```bash
aws cloudfront get-distribution --id EDFDVBD632BHDS5
aws cloudfront list-invalidations --distribution-id EDFDVBD632BHDS5
```

**Resolution:**
- Verify origin ALB is responding
- Check origin failover configuration
- Invalidate cache if stale: `aws cloudfront create-invalidation --distribution-id EDFDVBD632BHDS5 --paths "/*"`

---

## Cost Optimization

| Resource | Monthly Cost (Est.) | Optimization |
|----------|---------------------|--------------|
| Route53 Hosted Zone | $0.50 | N/A |
| Route53 Health Checks (2) | $1.00 | Reduce check frequency to 60s if acceptable |
| WAF Web ACL | $5.00 | Review rule count, remove unused rules |
| WAF Requests | $0.60/million | Use caching to reduce requests |
| CloudFront Requests | $0.0075/10k | Enable compression, optimize caching |
| CloudFront Data Transfer | $0.085/GB | Use regional S3 where possible |

**Total:** ~$50-100/month (depending on traffic)

---

**END OF DOCUMENT**
