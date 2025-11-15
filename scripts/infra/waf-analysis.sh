#!/bin/bash
# waf-analysis.sh - Analyze WAF logs for false positives and security insights
# Usage: ./waf-analysis.sh [options]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
WAF_LOG_GROUP="${WAF_LOG_GROUP:-/aws/wafv2/teei-platform}"
AWS_REGION="${AWS_REGION:-us-east-1}"
TIME_RANGE="${TIME_RANGE:-1h}"
OUTPUT_DIR="${OUTPUT_DIR:-./waf-analysis}"
S3_BUCKET="${S3_BUCKET:-teei-waf-logs-us-east-1}"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo -e "\n${BLUE}===========================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===========================================================${NC}\n"
}

# Function to check if required tools are installed
check_dependencies() {
    local missing_deps=()

    if ! command -v aws &> /dev/null; then
        missing_deps+=("aws-cli")
    fi

    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi

    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        exit 1
    fi
}

# Function to convert time range to seconds
time_range_to_seconds() {
    local time_range="$1"

    if [[ "$time_range" =~ ^([0-9]+)([smhd])$ ]]; then
        local value="${BASH_REMATCH[1]}"
        local unit="${BASH_REMATCH[2]}"

        case "$unit" in
            s) echo "$value" ;;
            m) echo $((value * 60)) ;;
            h) echo $((value * 3600)) ;;
            d) echo $((value * 86400)) ;;
        esac
    else
        log_error "Invalid time range format: $time_range (use: 1h, 30m, 7d, etc.)"
        exit 1
    fi
}

# Function to fetch WAF logs from CloudWatch
fetch_cloudwatch_logs() {
    local time_range="$1"
    local filter_pattern="${2:-}"

    log_info "Fetching WAF logs from CloudWatch Logs..."

    local seconds
    seconds=$(time_range_to_seconds "$time_range")
    local start_time
    start_time=$(($(date +%s) - seconds))
    local end_time
    end_time=$(date +%s)

    # Convert to milliseconds
    start_time=$((start_time * 1000))
    end_time=$((end_time * 1000))

    local output_file="$OUTPUT_DIR/waf-logs-$(date +%Y%m%d-%H%M%S).json"

    if [ -n "$filter_pattern" ]; then
        aws logs filter-log-events \
            --log-group-name "$WAF_LOG_GROUP" \
            --start-time "$start_time" \
            --end-time "$end_time" \
            --filter-pattern "$filter_pattern" \
            --region "$AWS_REGION" \
            --output json > "$output_file"
    else
        aws logs filter-log-events \
            --log-group-name "$WAF_LOG_GROUP" \
            --start-time "$start_time" \
            --end-time "$end_time" \
            --region "$AWS_REGION" \
            --output json > "$output_file"
    fi

    log_info "Logs saved to: $output_file"
    echo "$output_file"
}

# Function to fetch WAF logs from S3
fetch_s3_logs() {
    local date_prefix="${1:-$(date +%Y/%m/%d)}"

    log_info "Fetching WAF logs from S3..."

    local output_dir="$OUTPUT_DIR/s3-logs-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$output_dir"

    aws s3 sync "s3://$S3_BUCKET/global-waf/$date_prefix/" "$output_dir/" \
        --region "$AWS_REGION" \
        --exclude "*" \
        --include "*.gz"

    log_info "Logs downloaded to: $output_dir"

    # Decompress logs
    log_info "Decompressing logs..."
    gunzip "$output_dir"/*.gz 2>/dev/null || true

    echo "$output_dir"
}

# Function to analyze blocked requests
analyze_blocked_requests() {
    local log_file="$1"

    log_section "Analyzing Blocked Requests"

    # Extract blocked requests
    local blocked_count
    blocked_count=$(jq '[.events[] | select(.message | contains("\"action\":\"BLOCK\""))] | length' "$log_file")

    log_info "Total blocked requests: $blocked_count"

    if [ "$blocked_count" -eq 0 ]; then
        log_info "No blocked requests found"
        return
    fi

    # Top blocked rules
    log_info "\nTop 10 Rules Blocking Requests:"
    jq -r '.events[] | select(.message | contains("\"action\":\"BLOCK\"")) | .message | fromjson | .ruleGroupList[]? | .terminatingRule.ruleId' "$log_file" 2>/dev/null | \
        sort | uniq -c | sort -rn | head -10 | \
        awk '{printf "  %5d  %s\n", $1, $2}'

    # Top blocked IPs
    log_info "\nTop 10 Blocked IP Addresses:"
    jq -r '.events[] | select(.message | contains("\"action\":\"BLOCK\"")) | .message | fromjson | .httpRequest.clientIp' "$log_file" 2>/dev/null | \
        sort | uniq -c | sort -rn | head -10 | \
        awk '{printf "  %5d  %s\n", $1, $2}'

    # Top blocked URIs
    log_info "\nTop 10 Blocked URIs:"
    jq -r '.events[] | select(.message | contains("\"action\":\"BLOCK\"")) | .message | fromjson | .httpRequest.uri' "$log_file" 2>/dev/null | \
        sort | uniq -c | sort -rn | head -10 | \
        awk '{printf "  %5d  %s\n", $1, $2}'

    # Top blocked countries
    log_info "\nTop 10 Blocked Countries:"
    jq -r '.events[] | select(.message | contains("\"action\":\"BLOCK\"")) | .message | fromjson | .httpRequest.country' "$log_file" 2>/dev/null | \
        sort | uniq -c | sort -rn | head -10 | \
        awk '{printf "  %5d  %s\n", $1, $2}'

    # Blocked requests by time (hourly distribution)
    log_info "\nBlocked Requests by Hour:"
    jq -r '.events[] | select(.message | contains("\"action\":\"BLOCK\"")) | (.timestamp / 1000 | strftime("%Y-%m-%d %H:00"))' "$log_file" 2>/dev/null | \
        sort | uniq -c | sort | \
        awk '{printf "  %s  %5d requests\n", $2" "$3, $1}'
}

# Function to identify potential false positives
identify_false_positives() {
    local log_file="$1"

    log_section "Identifying Potential False Positives"

    # Criteria for false positives:
    # 1. Blocked requests from authenticated users
    # 2. Blocked requests to legitimate endpoints (e.g., /api/v1/reports)
    # 3. Repeated blocks from same user/session

    log_info "Analyzing for potential false positives..."

    # Blocked requests with authentication headers
    log_info "\n1. Blocked Authenticated Requests:"
    local auth_blocked
    auth_blocked=$(jq '[.events[] | select(.message | contains("\"action\":\"BLOCK\"")) | .message | fromjson | select(.httpRequest.headers[]? | select(.name == "authorization"))] | length' "$log_file" 2>/dev/null || echo "0")

    if [ "$auth_blocked" -gt 0 ]; then
        log_warn "  Found $auth_blocked blocked requests with authentication headers (potential false positives)"

        # Show examples
        jq -r '.events[] | select(.message | contains("\"action\":\"BLOCK\"")) | .message | fromjson | select(.httpRequest.headers[]? | select(.name == "authorization")) | "\(.httpRequest.clientIp) - \(.httpRequest.uri) - Rule: \(.ruleGroupList[]?.terminatingRule.ruleId)"' "$log_file" 2>/dev/null | \
            head -5 | \
            awk '{print "    " $0}'
    else
        log_info "  No blocked requests with authentication headers"
    fi

    # Blocked requests to /api/v1/* endpoints
    log_info "\n2. Blocked API Requests:"
    local api_blocked
    api_blocked=$(jq '[.events[] | select(.message | contains("\"action\":\"BLOCK\"")) | .message | fromjson | select(.httpRequest.uri | startswith("/api/v1/"))] | length' "$log_file" 2>/dev/null || echo "0")

    if [ "$api_blocked" -gt 0 ]; then
        log_warn "  Found $api_blocked blocked requests to /api/v1/* endpoints"

        # Group by URI
        jq -r '.events[] | select(.message | contains("\"action\":\"BLOCK\"")) | .message | fromjson | select(.httpRequest.uri | startswith("/api/v1/")) | .httpRequest.uri' "$log_file" 2>/dev/null | \
            sort | uniq -c | sort -rn | head -5 | \
            awk '{printf "    %5d  %s\n", $1, $2}'
    else
        log_info "  No blocked requests to /api/v1/* endpoints"
    fi

    # Repeated blocks from same IP (potential legitimate user)
    log_info "\n3. IPs with High Block Count (>10):"
    jq -r '.events[] | select(.message | contains("\"action\":\"BLOCK\"")) | .message | fromjson | .httpRequest.clientIp' "$log_file" 2>/dev/null | \
        sort | uniq -c | sort -rn | awk '$1 > 10 {printf "  %5d blocks  %s\n", $1, $2}' | \
        head -10

    # Generate false positive candidates report
    local fp_report="$OUTPUT_DIR/false-positives-$(date +%Y%m%d-%H%M%S).json"
    jq '[.events[] | select(.message | contains("\"action\":\"BLOCK\"")) | .message | fromjson | select((.httpRequest.headers[]? | select(.name == "authorization")) or (.httpRequest.uri | startswith("/api/v1/")))] | group_by(.httpRequest.clientIp) | map({ip: .[0].httpRequest.clientIp, count: length, uris: [.[].httpRequest.uri] | unique, rules: [.[].ruleGroupList[]?.terminatingRule.ruleId] | unique})' "$log_file" > "$fp_report" 2>/dev/null || echo "[]" > "$fp_report"

    local fp_count
    fp_count=$(jq '. | length' "$fp_report")

    if [ "$fp_count" -gt 0 ]; then
        log_warn "\nFound $fp_count potential false positive candidates"
        log_info "Details saved to: $fp_report"
    else
        log_info "\nNo potential false positives identified"
    fi
}

# Function to analyze rate limiting events
analyze_rate_limiting() {
    local log_file="$1"

    log_section "Analyzing Rate Limiting Events"

    # Count rate limiting blocks
    local rate_limit_blocks
    rate_limit_blocks=$(jq '[.events[] | select(.message | contains("\"action\":\"BLOCK\"")) | .message | fromjson | select(.ruleGroupList[]?.terminatingRule.ruleId | contains("RateLimit"))] | length' "$log_file" 2>/dev/null || echo "0")

    log_info "Total rate limit blocks: $rate_limit_blocks"

    if [ "$rate_limit_blocks" -eq 0 ]; then
        log_info "No rate limiting events found"
        return
    fi

    # Top rate-limited IPs
    log_info "\nTop 10 Rate-Limited IP Addresses:"
    jq -r '.events[] | select(.message | contains("\"action\":\"BLOCK\"")) | .message | fromjson | select(.ruleGroupList[]?.terminatingRule.ruleId | contains("RateLimit")) | .httpRequest.clientIp' "$log_file" 2>/dev/null | \
        sort | uniq -c | sort -rn | head -10 | \
        awk '{printf "  %5d  %s\n", $1, $2}'

    # Rate limiting by rule
    log_info "\nRate Limiting by Rule:"
    jq -r '.events[] | select(.message | contains("\"action\":\"BLOCK\"")) | .message | fromjson | select(.ruleGroupList[]?.terminatingRule.ruleId | contains("RateLimit")) | .ruleGroupList[]?.terminatingRule.ruleId' "$log_file" 2>/dev/null | \
        sort | uniq -c | sort -rn | \
        awk '{printf "  %5d  %s\n", $1, $2}'
}

# Function to analyze security threats
analyze_security_threats() {
    local log_file="$1"

    log_section "Analyzing Security Threats"

    # SQL Injection attempts
    log_info "SQL Injection Attempts:"
    local sqli_blocks
    sqli_blocks=$(jq '[.events[] | select(.message | contains("\"action\":\"BLOCK\"")) | .message | fromjson | select(.ruleGroupList[]?.terminatingRule.ruleId | contains("SQLi"))] | length' "$log_file" 2>/dev/null || echo "0")
    echo "  $sqli_blocks blocked requests"

    # XSS attempts
    log_info "\nXSS Attempts:"
    local xss_blocks
    xss_blocks=$(jq '[.events[] | select(.message | contains("\"action\":\"BLOCK\"")) | .message | fromjson | select(.ruleGroupList[]?.terminatingRule.ruleId | contains("XSS"))] | length' "$log_file" 2>/dev/null || echo "0")
    echo "  $xss_blocks blocked requests"

    # Path traversal attempts
    log_info "\nPath Traversal Attempts:"
    local path_blocks
    path_blocks=$(jq '[.events[] | select(.message | contains("\"action\":\"BLOCK\"")) | .message | fromjson | select(.ruleGroupList[]?.terminatingRule.ruleId | contains("PathTraversal"))] | length' "$log_file" 2>/dev/null || echo "0")
    echo "  $path_blocks blocked requests"

    # Malicious IPs (from reputation list)
    log_info "\nBlocked Malicious IPs (Reputation List):"
    local reputation_blocks
    reputation_blocks=$(jq '[.events[] | select(.message | contains("\"action\":\"BLOCK\"")) | .message | fromjson | select(.ruleGroupList[]?.terminatingRule.ruleId | contains("IPReputation"))] | length' "$log_file" 2>/dev/null || echo "0")
    echo "  $reputation_blocks blocked requests"

    # Generate threat summary
    local total_threats=$((sqli_blocks + xss_blocks + path_blocks + reputation_blocks))

    if [ "$total_threats" -gt 0 ]; then
        log_warn "\nTotal security threats detected: $total_threats"

        # Top attacking IPs
        log_info "\nTop 5 Attacking IPs:"
        jq -r '.events[] | select(.message | contains("\"action\":\"BLOCK\"")) | .message | fromjson | select(.ruleGroupList[]?.terminatingRule.ruleId | contains("SQLi") or contains("XSS") or contains("PathTraversal")) | .httpRequest.clientIp' "$log_file" 2>/dev/null | \
            sort | uniq -c | sort -rn | head -5 | \
            awk '{printf "  %5d attacks  %s\n", $1, $2}'
    else
        log_info "\nNo security threats detected"
    fi
}

# Function to generate WAF summary statistics
generate_summary() {
    local log_file="$1"

    log_section "WAF Summary Statistics"

    # Total requests
    local total_requests
    total_requests=$(jq '.events | length' "$log_file")
    log_info "Total requests analyzed: $total_requests"

    # Blocked vs allowed
    local blocked_requests
    blocked_requests=$(jq '[.events[] | select(.message | contains("\"action\":\"BLOCK\""))] | length' "$log_file" 2>/dev/null || echo "0")
    local allowed_requests=$((total_requests - blocked_requests))
    local block_rate=0
    if [ "$total_requests" -gt 0 ]; then
        block_rate=$(awk "BEGIN {printf \"%.2f\", ($blocked_requests / $total_requests) * 100}")
    fi

    log_info "\nRequests by Action:"
    printf "  Allowed: %d (%.2f%%)\n" "$allowed_requests" "$(awk "BEGIN {printf \"%.2f\", 100 - $block_rate}")"
    printf "  Blocked: %d (%.2f%%)\n" "$blocked_requests" "$block_rate"

    # Requests by HTTP method
    log_info "\nRequests by HTTP Method:"
    jq -r '.events[] | .message | fromjson | .httpRequest.httpMethod' "$log_file" 2>/dev/null | \
        sort | uniq -c | sort -rn | \
        awk '{printf "  %-8s: %5d\n", $2, $1}'

    # Requests by country
    log_info "\nTop 10 Countries by Request Count:"
    jq -r '.events[] | .message | fromjson | .httpRequest.country' "$log_file" 2>/dev/null | \
        sort | uniq -c | sort -rn | head -10 | \
        awk '{printf "  %-3s: %5d\n", $2, $1}'

    # Average request size
    log_info "\nRequest Size Statistics:"
    local avg_size
    avg_size=$(jq '[.events[] | .message | fromjson | .httpRequest.size] | add / length' "$log_file" 2>/dev/null || echo "0")
    printf "  Average: %.0f bytes\n" "$avg_size"
}

# Function to export analysis report
export_report() {
    local log_file="$1"
    local output_file="$OUTPUT_DIR/waf-analysis-report-$(date +%Y%m%d-%H%M%S).html"

    log_section "Generating HTML Report"

    cat > "$output_file" <<'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WAF Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        h1 { color: #333; }
        h2 { color: #555; margin-top: 30px; border-bottom: 2px solid #007bff; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; background-color: white; }
        th, td { padding: 12px; text-align: left; border: 1px solid #ddd; }
        th { background-color: #007bff; color: white; }
        tr:hover { background-color: #f1f1f1; }
        .stat { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .warning { color: #ff6b6b; font-weight: bold; }
        .success { color: #51cf66; font-weight: bold; }
    </style>
</head>
<body>
    <h1>WAF Analysis Report</h1>
    <div class="stat">
        <strong>Generated:</strong> $(date)<br>
        <strong>Time Range:</strong> $TIME_RANGE<br>
        <strong>Log Group:</strong> $WAF_LOG_GROUP
    </div>
EOF

    # Add summary statistics
    echo "<h2>Summary Statistics</h2>" >> "$output_file"
    echo "<div class='stat'>" >> "$output_file"

    local total_requests
    total_requests=$(jq '.events | length' "$log_file")
    local blocked_requests
    blocked_requests=$(jq '[.events[] | select(.message | contains("\"action\":\"BLOCK\""))] | length' "$log_file" 2>/dev/null || echo "0")

    echo "<p>Total Requests: <strong>$total_requests</strong></p>" >> "$output_file"
    echo "<p>Blocked Requests: <strong class='warning'>$blocked_requests</strong></p>" >> "$output_file"
    echo "</div>" >> "$output_file"

    echo "</body></html>" >> "$output_file"

    log_info "HTML report saved to: $output_file"
}

# Function to whitelist an IP (add to IP allowlist)
whitelist_ip() {
    local ip_address="$1"
    local ip_set_name="${2:-teei-internal-ips}"
    local ip_set_id="${3:-}"

    log_info "Adding IP to allowlist: $ip_address"

    if [ -z "$ip_set_id" ]; then
        log_error "IP Set ID is required"
        return 1
    fi

    # Get current IP set
    local lock_token
    lock_token=$(aws wafv2 get-ip-set \
        --scope CLOUDFRONT \
        --id "$ip_set_id" \
        --name "$ip_set_name" \
        --region "$AWS_REGION" \
        --query 'LockToken' \
        --output text)

    # Update IP set
    aws wafv2 update-ip-set \
        --scope CLOUDFRONT \
        --id "$ip_set_id" \
        --name "$ip_set_name" \
        --addresses "$ip_address/32" \
        --lock-token "$lock_token" \
        --region "$AWS_REGION"

    log_info "✓ IP address whitelisted successfully"
}

# Function to show usage
usage() {
    cat <<EOF
Usage: $0 [command] [options]

Commands:
  analyze [time-range]               Analyze WAF logs (default: 1h)
  blocked                            Analyze blocked requests
  false-positives                    Identify potential false positives
  rate-limiting                      Analyze rate limiting events
  threats                            Analyze security threats
  summary                            Generate summary statistics
  export                             Export analysis as HTML report
  whitelist <ip>                     Add IP to allowlist

Options:
  -r, --region REGION                AWS region (default: us-east-1)
  -l, --log-group GROUP              CloudWatch log group (default: /aws/wafv2/teei-platform)
  -o, --output DIR                   Output directory (default: ./waf-analysis)
  -s, --s3                           Fetch logs from S3 instead of CloudWatch
  -t, --time-range RANGE             Time range (e.g., 1h, 24h, 7d)

Environment Variables:
  WAF_LOG_GROUP                      CloudWatch log group name
  AWS_REGION                         AWS region
  OUTPUT_DIR                         Output directory for reports
  S3_BUCKET                          S3 bucket for WAF logs
  TIME_RANGE                         Time range for analysis

Examples:
  # Analyze last hour of WAF logs
  $0 analyze 1h

  # Identify false positives
  $0 false-positives

  # Analyze security threats
  $0 threats

  # Export HTML report
  $0 export

  # Whitelist an IP
  $0 whitelist 203.0.113.45

  # Analyze logs from S3
  $0 --s3 analyze 24h
EOF
}

# Main script
main() {
    check_dependencies

    mkdir -p "$OUTPUT_DIR"

    if [ $# -eq 0 ]; then
        usage
        exit 1
    fi

    local command="$1"
    shift

    # Parse options
    local use_s3=false
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -r|--region)
                AWS_REGION="$2"
                shift 2
                ;;
            -l|--log-group)
                WAF_LOG_GROUP="$2"
                shift 2
                ;;
            -o|--output)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            -s|--s3)
                use_s3=true
                shift
                ;;
            -t|--time-range)
                TIME_RANGE="$2"
                shift 2
                ;;
            *)
                TIME_RANGE="$1"
                shift
                ;;
        esac
    done

    # Fetch logs
    local log_file
    if [ "$use_s3" = true ]; then
        local log_dir
        log_dir=$(fetch_s3_logs)
        # Combine all JSON logs into one file
        log_file="$OUTPUT_DIR/combined-logs-$(date +%Y%m%d-%H%M%S).json"
        jq -s 'add' "$log_dir"/*.json > "$log_file" 2>/dev/null || echo '{"events":[]}' > "$log_file"
    else
        log_file=$(fetch_cloudwatch_logs "$TIME_RANGE")
    fi

    # Execute command
    case "$command" in
        analyze)
            generate_summary "$log_file"
            analyze_blocked_requests "$log_file"
            identify_false_positives "$log_file"
            analyze_rate_limiting "$log_file"
            analyze_security_threats "$log_file"
            ;;
        blocked)
            analyze_blocked_requests "$log_file"
            ;;
        false-positives)
            identify_false_positives "$log_file"
            ;;
        rate-limiting)
            analyze_rate_limiting "$log_file"
            ;;
        threats)
            analyze_security_threats "$log_file"
            ;;
        summary)
            generate_summary "$log_file"
            ;;
        export)
            export_report "$log_file"
            ;;
        whitelist)
            whitelist_ip "$@"
            ;;
        *)
            log_error "Unknown command: $command"
            usage
            exit 1
            ;;
    esac

    log_info "\nAnalysis complete!"
}

main "$@"
