#!/bin/bash
# update-dns.sh - Update Route53 DNS records programmatically
# Usage: ./update-dns.sh [command] [options]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
HOSTED_ZONE_ID="${HOSTED_ZONE_ID:-Z1234567890ABC}"
HOSTED_ZONE_NAME="${HOSTED_ZONE_NAME:-teei-platform.com}"
AWS_REGION="${AWS_REGION:-us-east-1}"
CHANGE_BATCH_FILE="/tmp/route53-change-batch.json"

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

# Function to check if AWS CLI is installed
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
}

# Function to list all DNS records
list_records() {
    log_info "Listing all DNS records in hosted zone: $HOSTED_ZONE_NAME ($HOSTED_ZONE_ID)"

    aws route53 list-resource-record-sets \
        --hosted-zone-id "$HOSTED_ZONE_ID" \
        --region "$AWS_REGION" \
        --output table
}

# Function to get a specific DNS record
get_record() {
    local record_name="$1"
    local record_type="${2:-A}"

    log_info "Getting DNS record: $record_name (Type: $record_type)"

    aws route53 list-resource-record-sets \
        --hosted-zone-id "$HOSTED_ZONE_ID" \
        --region "$AWS_REGION" \
        --query "ResourceRecordSets[?Name=='$record_name.' && Type=='$record_type']" \
        --output json
}

# Function to create a new A record with alias to ALB
create_alias_record() {
    local record_name="$1"
    local alb_dns_name="$2"
    local alb_hosted_zone_id="$3"
    local set_identifier="${4:-}"
    local region="${5:-us-east-1}"

    log_info "Creating alias record: $record_name -> $alb_dns_name"

    local change_batch
    if [ -n "$set_identifier" ]; then
        # Latency-based routing
        change_batch=$(cat <<EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "$record_name",
        "Type": "A",
        "SetIdentifier": "$set_identifier",
        "Region": "$region",
        "AliasTarget": {
          "HostedZoneId": "$alb_hosted_zone_id",
          "DNSName": "$alb_dns_name",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
EOF
        )
    else
        # Simple routing
        change_batch=$(cat <<EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "$record_name",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "$alb_hosted_zone_id",
          "DNSName": "$alb_dns_name",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
EOF
        )
    fi

    echo "$change_batch" > "$CHANGE_BATCH_FILE"

    local change_info
    change_info=$(aws route53 change-resource-record-sets \
        --hosted-zone-id "$HOSTED_ZONE_ID" \
        --change-batch file://"$CHANGE_BATCH_FILE" \
        --region "$AWS_REGION" \
        --output json)

    local change_id
    change_id=$(echo "$change_info" | jq -r '.ChangeInfo.Id')

    log_info "Change submitted: $change_id"
    wait_for_change "$change_id"
}

# Function to update an existing record (UPSERT)
upsert_record() {
    local record_name="$1"
    local record_type="$2"
    local record_value="$3"
    local ttl="${4:-60}"

    log_info "Upserting DNS record: $record_name (Type: $record_type, Value: $record_value, TTL: $ttl)"

    local change_batch
    change_batch=$(cat <<EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "$record_name",
        "Type": "$record_type",
        "TTL": $ttl,
        "ResourceRecords": [
          {
            "Value": "$record_value"
          }
        ]
      }
    }
  ]
}
EOF
    )

    echo "$change_batch" > "$CHANGE_BATCH_FILE"

    local change_info
    change_info=$(aws route53 change-resource-record-sets \
        --hosted-zone-id "$HOSTED_ZONE_ID" \
        --change-batch file://"$CHANGE_BATCH_FILE" \
        --region "$AWS_REGION" \
        --output json)

    local change_id
    change_id=$(echo "$change_info" | jq -r '.ChangeInfo.Id')

    log_info "Change submitted: $change_id"
    wait_for_change "$change_id"
}

# Function to delete a DNS record
delete_record() {
    local record_name="$1"
    local record_type="${2:-A}"

    log_info "Deleting DNS record: $record_name (Type: $record_type)"

    # First, get the current record
    local current_record
    current_record=$(get_record "$record_name" "$record_type")

    if [ "$(echo "$current_record" | jq '. | length')" -eq 0 ]; then
        log_error "Record not found: $record_name"
        return 1
    fi

    # Extract record details for deletion
    local change_batch
    change_batch=$(cat <<EOF
{
  "Changes": [
    {
      "Action": "DELETE",
      "ResourceRecordSet": $(echo "$current_record" | jq '.[0]')
    }
  ]
}
EOF
    )

    echo "$change_batch" > "$CHANGE_BATCH_FILE"

    local change_info
    change_info=$(aws route53 change-resource-record-sets \
        --hosted-zone-id "$HOSTED_ZONE_ID" \
        --change-batch file://"$CHANGE_BATCH_FILE" \
        --region "$AWS_REGION" \
        --output json)

    local change_id
    change_id=$(echo "$change_info" | jq -r '.ChangeInfo.Id')

    log_info "Change submitted: $change_id"
    wait_for_change "$change_id"
}

# Function to wait for a DNS change to propagate
wait_for_change() {
    local change_id="$1"

    log_info "Waiting for DNS change to propagate..."

    while true; do
        local status
        status=$(aws route53 get-change \
            --id "$change_id" \
            --region "$AWS_REGION" \
            --query 'ChangeInfo.Status' \
            --output text)

        if [ "$status" == "INSYNC" ]; then
            log_info "DNS change propagated successfully!"
            break
        fi

        echo -n "."
        sleep 2
    done
    echo ""
}

# Function to update health check configuration
update_health_check() {
    local health_check_id="$1"
    local failure_threshold="${2:-3}"
    local interval="${3:-30}"

    log_info "Updating health check: $health_check_id (Threshold: $failure_threshold, Interval: $interval)"

    aws route53 update-health-check \
        --health-check-id "$health_check_id" \
        --failure-threshold "$failure_threshold" \
        --request-interval "$interval" \
        --region "$AWS_REGION" \
        --output json

    log_info "Health check updated successfully!"
}

# Function to create a health check
create_health_check() {
    local fqdn="$1"
    local resource_path="${2:-/health/ready}"
    local port="${3:-443}"
    local interval="${4:-30}"
    local failure_threshold="${5:-3}"

    log_info "Creating health check for: $fqdn$resource_path"

    local health_check_config
    health_check_config=$(cat <<EOF
{
  "Type": "HTTPS",
  "ResourcePath": "$resource_path",
  "FullyQualifiedDomainName": "$fqdn",
  "Port": $port,
  "RequestInterval": $interval,
  "FailureThreshold": $failure_threshold,
  "MeasureLatency": true,
  "EnableSNI": true
}
EOF
    )

    aws route53 create-health-check \
        --caller-reference "$(date +%s)" \
        --health-check-config "$health_check_config" \
        --region "$AWS_REGION" \
        --output json

    log_info "Health check created successfully!"
}

# Function to list all health checks
list_health_checks() {
    log_info "Listing all health checks"

    aws route53 list-health-checks \
        --region "$AWS_REGION" \
        --output table
}

# Function to get health check status
get_health_check_status() {
    local health_check_id="$1"

    log_info "Getting health check status: $health_check_id"

    aws route53 get-health-check-status \
        --health-check-id "$health_check_id" \
        --region "$AWS_REGION" \
        --output json
}

# Function to enable/disable DNSSEC
configure_dnssec() {
    local action="$1"  # enable or disable

    log_info "${action^}ing DNSSEC for hosted zone: $HOSTED_ZONE_NAME"

    if [ "$action" == "enable" ]; then
        aws route53 enable-hosted-zone-dnssec \
            --hosted-zone-id "$HOSTED_ZONE_ID" \
            --region "$AWS_REGION" \
            --output json
    else
        aws route53 disable-hosted-zone-dnssec \
            --hosted-zone-id "$HOSTED_ZONE_ID" \
            --region "$AWS_REGION" \
            --output json
    fi

    log_info "DNSSEC ${action}d successfully!"
}

# Function to export DNS records to JSON
export_records() {
    local output_file="${1:-dns-records-$(date +%Y%m%d-%H%M%S).json}"

    log_info "Exporting DNS records to: $output_file"

    aws route53 list-resource-record-sets \
        --hosted-zone-id "$HOSTED_ZONE_ID" \
        --region "$AWS_REGION" \
        --output json > "$output_file"

    log_info "DNS records exported successfully!"
}

# Function to import DNS records from JSON
import_records() {
    local input_file="$1"

    if [ ! -f "$input_file" ]; then
        log_error "Input file not found: $input_file"
        return 1
    fi

    log_info "Importing DNS records from: $input_file"

    # Read and process each record
    jq -c '.ResourceRecordSets[]' "$input_file" | while read -r record; do
        local record_name
        record_name=$(echo "$record" | jq -r '.Name')

        # Skip system records (SOA, NS for apex)
        if echo "$record" | jq -e '.Type == "SOA" or .Type == "NS"' > /dev/null; then
            log_warn "Skipping system record: $record_name"
            continue
        fi

        log_info "Importing record: $record_name"

        local change_batch
        change_batch=$(cat <<EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": $record
    }
  ]
}
EOF
        )

        echo "$change_batch" > "$CHANGE_BATCH_FILE"

        aws route53 change-resource-record-sets \
            --hosted-zone-id "$HOSTED_ZONE_ID" \
            --change-batch file://"$CHANGE_BATCH_FILE" \
            --region "$AWS_REGION" \
            --output json || log_error "Failed to import: $record_name"
    done

    log_info "DNS records imported successfully!"
}

# Function to test DNS resolution
test_dns() {
    local record_name="$1"

    log_info "Testing DNS resolution for: $record_name"

    dig "$record_name" +short

    log_info "Testing from different DNS servers:"

    # Google DNS
    echo -n "Google DNS (8.8.8.8): "
    dig @8.8.8.8 "$record_name" +short

    # Cloudflare DNS
    echo -n "Cloudflare DNS (1.1.1.1): "
    dig @1.1.1.1 "$record_name" +short

    # Route53 DNS
    local route53_ns
    route53_ns=$(aws route53 get-hosted-zone \
        --id "$HOSTED_ZONE_ID" \
        --region "$AWS_REGION" \
        --query 'DelegationSet.NameServers[0]' \
        --output text)
    echo -n "Route53 DNS ($route53_ns): "
    dig "@$route53_ns" "$record_name" +short
}

# Function to show usage
usage() {
    cat <<EOF
Usage: $0 [command] [options]

Commands:
  list                                List all DNS records
  get <name> [type]                   Get a specific DNS record
  create-alias <name> <alb-dns> <alb-zone-id> [set-id] [region]
                                      Create alias record to ALB
  upsert <name> <type> <value> [ttl]  Create or update a DNS record
  delete <name> [type]                Delete a DNS record
  export [file]                       Export DNS records to JSON
  import <file>                       Import DNS records from JSON
  test <name>                         Test DNS resolution

  Health Checks:
  list-health-checks                  List all health checks
  get-health-check <id>               Get health check status
  create-health-check <fqdn> [path] [port] [interval] [threshold]
                                      Create a new health check
  update-health-check <id> [threshold] [interval]
                                      Update health check configuration

  DNSSEC:
  enable-dnssec                       Enable DNSSEC for hosted zone
  disable-dnssec                      Disable DNSSEC for hosted zone

Environment Variables:
  HOSTED_ZONE_ID                      Route53 hosted zone ID (default: Z1234567890ABC)
  HOSTED_ZONE_NAME                    Hosted zone name (default: teei-platform.com)
  AWS_REGION                          AWS region (default: us-east-1)

Examples:
  # List all DNS records
  $0 list

  # Create alias record for API with latency-based routing
  $0 create-alias api.teei-platform.com \\
    teei-api-us-alb-1234567890.us-east-1.elb.amazonaws.com \\
    Z1234567890ABC us-api-latency us-east-1

  # Update CNAME record
  $0 upsert www.teei-platform.com CNAME teei-platform.com 300

  # Delete a record
  $0 delete old.teei-platform.com A

  # Test DNS resolution
  $0 test api.teei-platform.com

  # Create health check
  $0 create-health-check api.us.teei-platform.com /health/ready 443 30 3

  # Export DNS records
  $0 export backup-$(date +%Y%m%d).json
EOF
}

# Main script
main() {
    check_aws_cli

    if [ $# -eq 0 ]; then
        usage
        exit 1
    fi

    local command="$1"
    shift

    case "$command" in
        list)
            list_records
            ;;
        get)
            get_record "$@"
            ;;
        create-alias)
            create_alias_record "$@"
            ;;
        upsert)
            upsert_record "$@"
            ;;
        delete)
            delete_record "$@"
            ;;
        export)
            export_records "$@"
            ;;
        import)
            import_records "$@"
            ;;
        test)
            test_dns "$@"
            ;;
        list-health-checks)
            list_health_checks
            ;;
        get-health-check)
            get_health_check_status "$@"
            ;;
        create-health-check)
            create_health_check "$@"
            ;;
        update-health-check)
            update_health_check "$@"
            ;;
        enable-dnssec)
            configure_dnssec enable
            ;;
        disable-dnssec)
            configure_dnssec disable
            ;;
        *)
            log_error "Unknown command: $command"
            usage
            exit 1
            ;;
    esac
}

main "$@"
