#!/bin/bash
# test-dns-routing.sh - Test latency-based DNS routing from different regions
# Usage: ./test-dns-routing.sh [domain]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="${1:-api.teei-platform.com}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ITERATIONS="${ITERATIONS:-10}"
TIMEOUT="${TIMEOUT:-5}"

# Test locations (public DNS resolvers from different regions)
declare -A DNS_RESOLVERS=(
    # US East
    ["US-East-Google"]="8.8.8.8"
    ["US-East-Cloudflare"]="1.1.1.1"
    ["US-East-Quad9"]="9.9.9.9"

    # US West
    ["US-West-OpenDNS"]="208.67.222.222"

    # Europe
    ["EU-Cloudflare"]="1.0.0.1"
    ["EU-Google"]="8.8.4.4"

    # Asia
    ["Asia-Google"]="8.8.8.8"
)

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

    if ! command -v dig &> /dev/null; then
        missing_deps+=("dig")
    fi

    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi

    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi

    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_info "Install them with: apt-get install dnsutils curl jq (Debian/Ubuntu)"
        exit 1
    fi
}

# Function to resolve DNS from a specific nameserver
resolve_dns() {
    local domain="$1"
    local nameserver="$2"
    local record_type="${3:-A}"

    dig @"$nameserver" "$domain" "$record_type" +short +time="$TIMEOUT" 2>/dev/null || echo "TIMEOUT"
}

# Function to measure DNS query latency
measure_dns_latency() {
    local domain="$1"
    local nameserver="$2"

    local start
    start=$(date +%s%N)

    dig @"$nameserver" "$domain" +short +time="$TIMEOUT" > /dev/null 2>&1

    local end
    end=$(date +%s%N)

    local latency_ns=$((end - start))
    local latency_ms=$((latency_ns / 1000000))

    echo "$latency_ms"
}

# Function to test DNS resolution from all resolvers
test_dns_resolution() {
    local domain="$1"

    log_section "Testing DNS Resolution for: $domain"

    echo -e "Resolver Location\t\tNameserver\t\tResolved IP(s)\t\t\tLatency (ms)"
    echo -e "----------------\t\t----------\t\t--------------\t\t\t------------"

    for location in "${!DNS_RESOLVERS[@]}"; do
        local nameserver="${DNS_RESOLVERS[$location]}"

        # Resolve DNS
        local resolved_ips
        resolved_ips=$(resolve_dns "$domain" "$nameserver")

        # Measure latency
        local latency
        latency=$(measure_dns_latency "$domain" "$nameserver")

        # Format output
        printf "%-24s\t%-16s\t%-32s\t%s\n" \
            "$location" \
            "$nameserver" \
            "$(echo "$resolved_ips" | tr '\n' ',' | sed 's/,$//')" \
            "${latency}ms"
    done
}

# Function to test HTTP/HTTPS connectivity
test_http_connectivity() {
    local domain="$1"
    local protocol="${2:-https}"
    local endpoint="${3:-/health/ready}"

    log_section "Testing HTTP/HTTPS Connectivity: $protocol://$domain$endpoint"

    local url="$protocol://$domain$endpoint"

    # Test with curl
    local http_code
    local total_time
    local result

    result=$(curl -s -o /dev/null -w "%{http_code}|%{time_total}" "$url" --max-time "$TIMEOUT" 2>/dev/null || echo "TIMEOUT|0")

    http_code=$(echo "$result" | cut -d'|' -f1)
    total_time=$(echo "$result" | cut -d'|' -f2)

    if [ "$http_code" == "TIMEOUT" ]; then
        log_error "Connection timeout"
        return 1
    elif [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        log_info "✓ HTTP $http_code - Response time: ${total_time}s"
        return 0
    else
        log_warn "HTTP $http_code - Response time: ${total_time}s"
        return 1
    fi
}

# Function to test latency-based routing
test_latency_routing() {
    local domain="$1"

    log_section "Testing Latency-Based Routing"

    log_info "Performing $ITERATIONS DNS queries and measuring distribution..."

    declare -A region_counts
    local total=0

    for ((i=1; i<=ITERATIONS; i++)); do
        # Resolve DNS
        local resolved_ip
        resolved_ip=$(dig "$domain" +short | head -n1)

        if [ -z "$resolved_ip" ]; then
            log_warn "Iteration $i: No IP resolved"
            continue
        fi

        # Determine region based on IP (simplified)
        local region
        if [[ "$resolved_ip" =~ ^54\. ]] || [[ "$resolved_ip" =~ ^3\. ]]; then
            region="us-east-1"
        elif [[ "$resolved_ip" =~ ^52\. ]]; then
            region="eu-central-1"
        else
            region="unknown"
        fi

        region_counts["$region"]=$((${region_counts[$region]:-0} + 1))
        total=$((total + 1))

        echo -n "."
        sleep 0.5
    done
    echo ""

    log_info "\nResults after $ITERATIONS iterations:"
    for region in "${!region_counts[@]}"; do
        local count="${region_counts[$region]}"
        local percentage=$((count * 100 / total))
        printf "  %-15s: %3d queries (%3d%%)\n" "$region" "$count" "$percentage"
    done
}

# Function to test geolocation routing
test_geolocation_routing() {
    local domain="$1"

    log_section "Testing Geolocation Routing"

    # Use public VPN endpoints to test from different geolocations (if available)
    # This is a simplified test - in production, use actual VPN or cloud instances

    log_info "Testing DNS resolution with geolocation headers..."

    # Simulate requests from different countries using CloudFlare EDNS Client Subnet
    declare -A geo_tests=(
        ["US"]="192.0.2.1/24"
        ["DE"]="198.51.100.1/24"
        ["GB"]="203.0.113.1/24"
        ["FR"]="198.18.0.1/24"
    )

    for country in "${!geo_tests[@]}"; do
        local client_subnet="${geo_tests[$country]}"

        log_info "Testing from $country (ECS: $client_subnet)..."

        # Use dig with EDNS Client Subnet
        local result
        result=$(dig +subnet="$client_subnet" "$domain" +short 2>/dev/null || echo "FAILED")

        echo "  Result: $result"
    done

    log_warn "Note: Geolocation testing requires actual VPN/proxy connections for accurate results"
}

# Function to test health check failover
test_health_check_failover() {
    local domain="$1"
    local primary_endpoint="$2"
    local secondary_endpoint="$3"

    log_section "Testing Health Check Failover"

    log_info "Step 1: Verify primary endpoint is healthy"
    if test_http_connectivity "$primary_endpoint" "https" "/health/ready"; then
        log_info "✓ Primary endpoint is healthy"
    else
        log_error "✗ Primary endpoint is unhealthy (expected to be healthy)"
        return 1
    fi

    log_info "Step 2: Resolve DNS (should point to primary)"
    local current_target
    current_target=$(dig "$domain" +short | head -n1)
    echo "  Current target: $current_target"

    log_info "Step 3: Simulate primary endpoint failure"
    log_warn "Manual step: Block traffic to primary endpoint or stop the service"
    read -p "Press Enter after stopping primary endpoint..."

    log_info "Step 4: Wait for health check to detect failure (3 x 30s = 90s)"
    for ((i=90; i>=0; i--)); do
        echo -ne "  Waiting... ${i}s remaining\r"
        sleep 1
    done
    echo ""

    log_info "Step 5: Verify DNS now points to secondary"
    local new_target
    new_target=$(dig "$domain" +short | head -n1)
    echo "  New target: $new_target"

    if [ "$current_target" != "$new_target" ]; then
        log_info "✓ Failover successful! DNS changed from $current_target to $new_target"
    else
        log_error "✗ Failover failed! DNS still points to $current_target"
        return 1
    fi

    log_info "Step 6: Verify secondary endpoint is responding"
    if test_http_connectivity "$secondary_endpoint" "https" "/health/ready"; then
        log_info "✓ Secondary endpoint is healthy"
    else
        log_error "✗ Secondary endpoint is unhealthy"
        return 1
    fi
}

# Function to test weighted routing
test_weighted_routing() {
    local domain="$1"
    local expected_us_pct="${2:-60}"
    local expected_eu_pct="${3:-40}"

    log_section "Testing Weighted Routing (Expected: ${expected_us_pct}% US, ${expected_eu_pct}% EU)"

    declare -A region_counts
    local total=0

    log_info "Performing $ITERATIONS DNS queries..."

    for ((i=1; i<=ITERATIONS; i++)); do
        local resolved_ip
        resolved_ip=$(dig "$domain" +short | head -n1)

        if [ -z "$resolved_ip" ]; then
            continue
        fi

        # Determine region (simplified based on IP prefix)
        local region
        if [[ "$resolved_ip" =~ ^54\. ]] || [[ "$resolved_ip" =~ ^3\. ]]; then
            region="us"
        elif [[ "$resolved_ip" =~ ^52\. ]]; then
            region="eu"
        else
            region="unknown"
        fi

        region_counts["$region"]=$((${region_counts[$region]:-0} + 1))
        total=$((total + 1))

        echo -n "."
        sleep 0.1
    done
    echo ""

    log_info "\nWeighted routing results:"
    local us_count="${region_counts[us]:-0}"
    local eu_count="${region_counts[eu]:-0}"
    local us_pct=$((us_count * 100 / total))
    local eu_pct=$((eu_count * 100 / total))

    printf "  US: %3d/%d (%3d%%) - Expected: %d%%\n" "$us_count" "$total" "$us_pct" "$expected_us_pct"
    printf "  EU: %3d/%d (%3d%%) - Expected: %d%%\n" "$eu_count" "$total" "$eu_pct" "$expected_eu_pct"

    # Check if within 10% tolerance
    local us_diff=$((us_pct - expected_us_pct))
    local eu_diff=$((eu_pct - expected_eu_pct))

    if [ ${us_diff#-} -le 10 ] && [ ${eu_diff#-} -le 10 ]; then
        log_info "✓ Weighted routing is within acceptable tolerance (±10%)"
    else
        log_warn "⚠ Weighted routing is outside tolerance (±10%)"
    fi
}

# Function to test DNS propagation
test_dns_propagation() {
    local domain="$1"

    log_section "Testing DNS Propagation Across Global Resolvers"

    declare -a global_resolvers=(
        "8.8.8.8:Google"
        "8.8.4.4:Google-Secondary"
        "1.1.1.1:Cloudflare"
        "1.0.0.1:Cloudflare-Secondary"
        "208.67.222.222:OpenDNS"
        "208.67.220.220:OpenDNS-Secondary"
        "9.9.9.9:Quad9"
        "149.112.112.112:Quad9-Secondary"
    )

    local first_result=""
    local all_consistent=true

    for resolver_info in "${global_resolvers[@]}"; do
        local resolver
        resolver=$(echo "$resolver_info" | cut -d':' -f1)
        local name
        name=$(echo "$resolver_info" | cut -d':' -f2)

        local result
        result=$(dig @"$resolver" "$domain" +short | sort)

        if [ -z "$first_result" ]; then
            first_result="$result"
        fi

        printf "%-25s: %s\n" "$name ($resolver)" "$(echo "$result" | tr '\n' ', ' | sed 's/,$//')"

        if [ "$result" != "$first_result" ]; then
            all_consistent=false
        fi
    done

    if [ "$all_consistent" = true ]; then
        log_info "\n✓ DNS records are consistent across all resolvers"
    else
        log_warn "\n⚠ DNS records are inconsistent across resolvers (may still be propagating)"
    fi
}

# Function to generate comprehensive test report
generate_report() {
    local domain="$1"
    local output_file="dns-test-report-$(date +%Y%m%d-%H%M%S).json"

    log_section "Generating Comprehensive Test Report"

    local report_data="{"
    report_data+="\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
    report_data+="\"domain\":\"$domain\","
    report_data+="\"tests\":{"

    # DNS Resolution Test
    report_data+="\"dns_resolution\":{"
    for location in "${!DNS_RESOLVERS[@]}"; do
        local nameserver="${DNS_RESOLVERS[$location]}"
        local resolved_ips
        resolved_ips=$(resolve_dns "$domain" "$nameserver" | tr '\n' ',' | sed 's/,$//')
        local latency
        latency=$(measure_dns_latency "$domain" "$nameserver")

        report_data+="\"$location\":{"
        report_data+="\"nameserver\":\"$nameserver\","
        report_data+="\"resolved_ips\":\"$resolved_ips\","
        report_data+="\"latency_ms\":$latency"
        report_data+="},"
    done
    report_data="${report_data%,}}"

    report_data+="}"
    report_data+="}"

    echo "$report_data" | jq '.' > "$output_file"

    log_info "Report saved to: $output_file"
}

# Function to show usage
usage() {
    cat <<EOF
Usage: $0 [options] [domain]

Options:
  -h, --help              Show this help message
  -i, --iterations NUM    Number of iterations for routing tests (default: 10)
  -t, --timeout SEC       Timeout for DNS/HTTP queries (default: 5)
  -r, --report            Generate JSON report

Test Modes:
  resolution              Test DNS resolution from multiple resolvers
  latency                 Test latency-based routing
  geolocation             Test geolocation routing
  weighted                Test weighted routing
  failover                Test health check failover
  propagation             Test DNS propagation
  connectivity            Test HTTP/HTTPS connectivity
  all                     Run all tests (default)

Environment Variables:
  ITERATIONS              Number of iterations (default: 10)
  TIMEOUT                 Timeout in seconds (default: 5)
  AWS_REGION              AWS region (default: us-east-1)

Examples:
  # Test DNS resolution for api.teei-platform.com
  $0 api.teei-platform.com

  # Test latency-based routing with 50 iterations
  $0 -i 50 latency api.teei-platform.com

  # Test weighted routing
  $0 weighted reports.teei-platform.com

  # Generate comprehensive report
  $0 --report api.teei-platform.com
EOF
}

# Main script
main() {
    check_dependencies

    local test_mode="all"
    local generate_report_flag=false

    # Parse options
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -h|--help)
                usage
                exit 0
                ;;
            -i|--iterations)
                ITERATIONS="$2"
                shift 2
                ;;
            -t|--timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            -r|--report)
                generate_report_flag=true
                shift
                ;;
            resolution|latency|geolocation|weighted|failover|propagation|connectivity|all)
                test_mode="$1"
                shift
                ;;
            *)
                DOMAIN="$1"
                shift
                ;;
        esac
    done

    log_info "Testing DNS routing for: $DOMAIN"
    log_info "Iterations: $ITERATIONS, Timeout: ${TIMEOUT}s"

    case "$test_mode" in
        resolution)
            test_dns_resolution "$DOMAIN"
            ;;
        latency)
            test_latency_routing "$DOMAIN"
            ;;
        geolocation)
            test_geolocation_routing "$DOMAIN"
            ;;
        weighted)
            test_weighted_routing "$DOMAIN"
            ;;
        failover)
            log_info "Failover test requires manual intervention"
            read -p "Primary endpoint: " primary_endpoint
            read -p "Secondary endpoint: " secondary_endpoint
            test_health_check_failover "$DOMAIN" "$primary_endpoint" "$secondary_endpoint"
            ;;
        propagation)
            test_dns_propagation "$DOMAIN"
            ;;
        connectivity)
            test_http_connectivity "$DOMAIN"
            ;;
        all)
            test_dns_resolution "$DOMAIN"
            test_latency_routing "$DOMAIN"
            test_geolocation_routing "$DOMAIN"
            test_weighted_routing "$DOMAIN"
            test_dns_propagation "$DOMAIN"
            test_http_connectivity "$DOMAIN"
            ;;
        *)
            log_error "Unknown test mode: $test_mode"
            usage
            exit 1
            ;;
    esac

    if [ "$generate_report_flag" = true ]; then
        generate_report "$DOMAIN"
    fi

    log_info "\nAll tests completed!"
}

main "$@"
