#!/bin/bash
# seal-secret.sh - Helper script for creating sealed secrets
#
# Usage:
#   ./scripts/seal-secret.sh <service-name> <namespace>
#   ./scripts/seal-secret.sh api-gateway staging
#   ./scripts/seal-secret.sh q2q-ai production
#
# Prerequisites:
#   - kubeseal CLI installed (brew install kubeseal)
#   - kubectl configured to access the cluster
#   - Sealed Secrets controller deployed in the cluster
#
# This script:
#   1. Fetches the public cert from the Sealed Secrets controller
#   2. Creates a temporary secret from the template
#   3. Prompts you to fill in actual secret values
#   4. Seals the secret
#   5. Saves it to the appropriate overlay directory
#   6. Cleans up temporary files

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TEMPLATES_DIR="${PROJECT_ROOT}/k8s/base/secrets/templates"
CONTROLLER_NAMESPACE="${CONTROLLER_NAMESPACE:-kube-system}"
CONTROLLER_NAME="${CONTROLLER_NAME:-sealed-secrets-controller}"

# Functions
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

usage() {
    cat << EOF
Usage: $0 <service-name> <namespace>

Arguments:
  service-name    Name of the service (api-gateway, unified-profile, q2q-ai,
                  analytics, discord-bot, corp-cockpit)
  namespace       Target namespace (staging, production, or custom namespace name)

Examples:
  $0 api-gateway staging
  $0 q2q-ai production
  $0 analytics teei-staging

Environment Variables:
  CONTROLLER_NAMESPACE    Namespace where Sealed Secrets controller is running (default: kube-system)
  CONTROLLER_NAME         Name of the Sealed Secrets controller (default: sealed-secrets-controller)
  EDITOR                  Editor to use for editing secrets (default: vi)

EOF
}

check_prerequisites() {
    print_info "Checking prerequisites..."

    # Check kubeseal
    if ! command -v kubeseal &> /dev/null; then
        print_error "kubeseal CLI not found"
        echo "Install it with: brew install kubeseal"
        echo "Or download from: https://github.com/bitnami-labs/sealed-secrets/releases"
        exit 1
    fi
    print_success "kubeseal CLI found"

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl not found"
        exit 1
    fi
    print_success "kubectl found"

    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        echo "Configure kubectl with: kubectl config use-context <context-name>"
        exit 1
    fi
    print_success "Connected to cluster: $(kubectl config current-context)"

    # Check if Sealed Secrets controller is running
    if ! kubectl get deployment "${CONTROLLER_NAME}" -n "${CONTROLLER_NAMESPACE}" &> /dev/null; then
        print_warning "Sealed Secrets controller not found in namespace: ${CONTROLLER_NAMESPACE}"
        echo "Install it with: kubectl apply -f k8s/base/secrets/sealed-secrets-controller.yaml"
        echo "Or specify correct namespace: export CONTROLLER_NAMESPACE=<namespace>"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "Sealed Secrets controller is running"
    fi
}

fetch_public_cert() {
    local cert_file="$1"

    print_info "Fetching public certificate from cluster..."

    if kubeseal --fetch-cert \
        --controller-namespace="${CONTROLLER_NAMESPACE}" \
        --controller-name="${CONTROLLER_NAME}" \
        > "${cert_file}" 2>/dev/null; then
        print_success "Public certificate fetched"
        return 0
    else
        print_error "Failed to fetch public certificate"
        echo "This usually means:"
        echo "  1. Sealed Secrets controller is not running"
        echo "  2. Controller is in a different namespace"
        echo "  3. kubectl is not configured correctly"
        return 1
    fi
}

get_namespace() {
    local env="$1"
    case "$env" in
        staging)
            echo "teei-staging"
            ;;
        production|prod)
            echo "teei-production"
            ;;
        *)
            echo "$env"
            ;;
    esac
}

seal_secret() {
    local service_name="$1"
    local namespace_arg="$2"
    local namespace
    namespace=$(get_namespace "$namespace_arg")

    print_info "Sealing secret for service: ${service_name} in namespace: ${namespace}"

    # Determine service and template names
    local service_prefix
    case "$service_name" in
        api-gateway|gateway)
            service_prefix="teei-api-gateway"
            ;;
        unified-profile|profile)
            service_prefix="teei-unified-profile"
            ;;
        q2q-ai|q2q)
            service_prefix="teei-q2q-ai"
            ;;
        analytics)
            service_prefix="teei-analytics"
            ;;
        discord-bot|discord)
            service_prefix="teei-discord-bot"
            ;;
        corp-cockpit|cockpit)
            service_prefix="teei-corp-cockpit"
            ;;
        *)
            print_error "Unknown service: $service_name"
            echo "Valid services: api-gateway, unified-profile, q2q-ai, analytics, discord-bot, corp-cockpit"
            exit 1
            ;;
    esac

    local template_file="${TEMPLATES_DIR}/${service_prefix}-secrets.yaml"
    if [[ ! -f "$template_file" ]]; then
        print_error "Template not found: $template_file"
        exit 1
    fi

    # Create temp directory
    local temp_dir
    temp_dir=$(mktemp -d)
    trap "rm -rf ${temp_dir}" EXIT

    local temp_secret="${temp_dir}/secret.yaml"
    local cert_file="${temp_dir}/pub-cert.pem"
    local sealed_file="${temp_dir}/sealed-secret.yaml"

    # Fetch certificate
    if ! fetch_public_cert "${cert_file}"; then
        exit 1
    fi

    # Copy template and update namespace
    sed "s/NAMESPACE_PLACEHOLDER/${namespace}/g" "${template_file}" > "${temp_secret}"

    print_warning "You need to edit the secret and replace PLACEHOLDER values with actual secrets"
    echo ""
    echo "Tips:"
    echo "  - Generate random secrets: openssl rand -hex 32"
    echo "  - Never use the same secrets in staging and production"
    echo "  - Store a backup of your secrets in a password manager"
    echo ""
    read -p "Press Enter to open editor..."

    # Open editor
    "${EDITOR:-vi}" "${temp_secret}"

    # Check if user replaced placeholders
    if grep -q "PLACEHOLDER" "${temp_secret}"; then
        print_warning "Detected PLACEHOLDER values in the secret"
        read -p "Continue with sealing? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Cancelled"
            exit 0
        fi
    fi

    # Seal the secret
    print_info "Sealing secret..."
    if ! kubeseal --format=yaml --cert="${cert_file}" \
        < "${temp_secret}" > "${sealed_file}"; then
        print_error "Failed to seal secret"
        exit 1
    fi

    # Determine output directory
    local output_dir="${PROJECT_ROOT}/k8s/overlays/${namespace_arg}/sealed-secrets"
    mkdir -p "${output_dir}"

    local output_file="${output_dir}/${service_name}-sealed.yaml"
    cp "${sealed_file}" "${output_file}"

    print_success "Sealed secret created: ${output_file}"
    echo ""
    print_info "Next steps:"
    echo "  1. Review the sealed secret: cat ${output_file}"
    echo "  2. Commit to Git: git add ${output_file}"
    echo "  3. Apply to cluster: kubectl apply -f ${output_file}"
    echo "  4. Verify: kubectl get secret ${service_prefix}-secrets -n ${namespace}"
    echo ""
    print_warning "IMPORTANT: Delete any temporary files with actual secret values!"
}

# Main script
main() {
    if [[ $# -lt 2 ]]; then
        usage
        exit 1
    fi

    local service_name="$1"
    local namespace_arg="$2"

    echo ""
    print_info "TEEI CSR Platform - Sealed Secret Generator"
    echo ""

    check_prerequisites
    seal_secret "$service_name" "$namespace_arg"

    print_success "Done!"
}

# Run main function
main "$@"
