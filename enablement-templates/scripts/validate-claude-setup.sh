#!/bin/bash

# Claude/Agent Setup Validation Script
# Validates a repository for proper Claude/agent setup including CLAUDE.md, AGENTS.md, agent definitions, and security checks
# Usage: validate-claude-setup.sh [repo_path]

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Counters for summary
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# Repo path (default to current directory)
REPO_PATH="${1:-.}"

# Check if repo path exists
if [[ ! -d "$REPO_PATH" ]]; then
    echo -e "${RED}✗ Error: Repository path '$REPO_PATH' does not exist${NC}"
    exit 1
fi

# Function to print header
print_header() {
    echo -e "\n${BOLD}${CYAN}=== $1 ===${NC}\n"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((CHECKS_PASSED++))
}

# Function to print error
print_error() {
    echo -e "${RED}✗${NC} $1"
    ((CHECKS_FAILED++))
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((CHECKS_WARNING++))
}

# Function to print info
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Function to check file exists
check_file_exists() {
    local file=$1
    local description=$2

    if [[ -f "$REPO_PATH/$file" ]]; then
        print_success "$description exists: $file"
        return 0
    else
        print_error "$description missing: $file"
        return 1
    fi
}

# Function to check if file contains text
check_file_contains() {
    local file=$1
    local pattern=$2
    local description=$3

    if [[ -f "$REPO_PATH/$file" ]]; then
        if grep -q "$pattern" "$REPO_PATH/$file"; then
            print_success "$description found in $file"
            return 0
        else
            print_error "$description not found in $file"
            return 1
        fi
    else
        print_error "File not found: $file"
        return 1
    fi
}


# Start validation
echo -e "${BOLD}${CYAN}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║   Claude/Agent Setup Validation Tool                   ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"

print_info "Validating repository: $REPO_PATH"
echo ""

# ============================================================================
# CHECK 1: CLAUDE.md File
# ============================================================================

print_header "1. CLAUDE.md Validation"

if check_file_exists "CLAUDE.md" "CLAUDE.md"; then
    # Check if it references AGENTS.md
    if check_file_contains "CLAUDE.md" "@AGENTS.md" "AGENTS.md reference (@AGENTS.md)"; then
        print_success "CLAUDE.md properly structured"
    fi
fi

# ============================================================================
# CHECK 2: AGENTS.md File
# ============================================================================

print_header "2. AGENTS.md Validation"

if check_file_exists "AGENTS.md" "AGENTS.md"; then

    # Check for key sections in AGENTS.md
    agents_md="$REPO_PATH/AGENTS.md"

    echo "Checking for required sections in AGENTS.md..."
    missing_sections=0

    # Check for essential section patterns
    if grep -q "^## Agent\|^# .*Agent" "$agents_md"; then
        print_success "Agent section found"
    else
        print_warning "Agent section not clearly defined"
        ((missing_sections++))
    fi

    if grep -q "^## Role\|^### Role" "$agents_md"; then
        print_success "Role section found"
    else
        print_warning "Role section not defined"
        ((missing_sections++))
    fi

    if grep -q "When to Invoke" "$agents_md"; then
        print_success "'When to Invoke' section found"
    else
        print_warning "'When to Invoke' section not defined"
        ((missing_sections++))
    fi

    if [[ $missing_sections -gt 2 ]]; then
        print_warning "AGENTS.md may be incomplete (missing $missing_sections key sections)"
    fi
fi

# ============================================================================
# CHECK 3: .claude/agents/ Directory
# ============================================================================

print_header "3. Agent Definitions Directory (.claude/agents/)"

AGENTS_DIR="$REPO_PATH/.claude/agents"

if [[ -d "$AGENTS_DIR" ]]; then
    print_success ".claude/agents/ directory exists"

    # Count agent files
    agent_count=$(find "$AGENTS_DIR" -maxdepth 1 -name "*.md" 2>/dev/null | wc -l)

    if [[ $agent_count -gt 0 ]]; then
        print_success "Found $agent_count agent definition file(s)"
    else
        print_warning "No agent definition files found in .claude/agents/"
    fi
else
    print_warning ".claude/agents/ directory not found"
fi

# ============================================================================
# CHECK 4: List and Validate Agent Definitions
# ============================================================================

print_header "4. Agent Definitions Analysis"

if [[ -d "$AGENTS_DIR" ]]; then
    echo "Analyzing agent definition files..."
    echo ""

    valid_agents=0
    invalid_agents=0
    agent_list=()

    while IFS= read -r agent_file; do
        agent_name=$(basename "$agent_file" .md)
        agent_list+=("$agent_name")

        # Validate structure
        issues=0
        if ! grep -q "^## Role\|^### Role" "$agent_file"; then
            ((issues++))
        fi
        if ! grep -q "When to Invoke" "$agent_file"; then
            ((issues++))
        fi
        if ! grep -q "Capabilities" "$agent_file"; then
            ((issues++))
        fi

        if [[ $issues -eq 0 ]]; then
            print_success "Agent '$agent_name' structure validated"
            ((valid_agents++))
        else
            print_warning "Agent '$agent_name' has $issues structural issues"
            ((invalid_agents++))
        fi

    done < <(find "$AGENTS_DIR" -maxdepth 1 -name "*.md" 2>/dev/null | sort)

    # Display agent list
    if [[ ${#agent_list[@]} -gt 0 ]]; then
        echo ""
        print_info "Agent definitions found:"
        for agent in "${agent_list[@]}"; do
            echo "    • $agent"
        done
    fi
else
    print_warning "Cannot validate agent definitions - .claude/agents/ directory not found"
fi

# ============================================================================
# CHECK 5: Security - Check for Secrets in .md Files
# ============================================================================

print_header "5. Security Check - Secrets in .md Files"

echo "Scanning Markdown files for potential secrets..."

TOTAL_MD_FILES=0
SUSPICIOUS_FILES=0

while IFS= read -r md_file; do
    TOTAL_MD_FILES=$((TOTAL_MD_FILES + 1))
    issue_count=0

    # Check for common secret patterns
    if grep -iE "(api[_-]?key|password|secret|token|PRIVATE[_-]KEY|BEGIN RSA)" "$md_file" 2>/dev/null | grep -v "example\|Example\|EXAMPLE\|dummy\|test\|Test" > /dev/null; then
        issue_count=$((issue_count + 1))
        rel_path=${md_file#$REPO_PATH/}
        print_warning "File '$rel_path' contains potential secret pattern(s)"
        SUSPICIOUS_FILES=$((SUSPICIOUS_FILES + 1))
    fi
done < <(find "$REPO_PATH" -maxdepth 2 -name "*.md" -type f 2>/dev/null)

if [[ $SUSPICIOUS_FILES -eq 0 ]]; then
    print_success "No obvious secrets detected in $TOTAL_MD_FILES Markdown files"
else
    print_warning "Reviewed $TOTAL_MD_FILES Markdown files; $SUSPICIOUS_FILES file(s) need review"
fi

# ============================================================================
# CHECK 6: Directory Structure
# ============================================================================

print_header "6. Directory Structure Validation"

# Check for common directories
dirs_to_check=(".claude" "docs" "reports")

for dir in "${dirs_to_check[@]}"; do
    if [[ -d "$REPO_PATH/$dir" ]]; then
        print_success "Directory exists: $dir/"
    else
        print_warning "Directory not found: $dir/"
    fi
done

# ============================================================================
# CHECK 7: Documentation Files
# ============================================================================

print_header "7. Documentation Files Check"

doc_files=("README.md" "CHANGELOG.md" ".github/CONTRIBUTING.md")

for doc_file in "${doc_files[@]}"; do
    if [[ -f "$REPO_PATH/$doc_file" ]]; then
        print_success "Documentation file exists: $doc_file"
    else
        print_info "Optional documentation file not found: $doc_file"
    fi
done

# ============================================================================
# SUMMARY REPORT
# ============================================================================

print_header "Summary Report"

total_checks=$((CHECKS_PASSED + CHECKS_FAILED + CHECKS_WARNING))

echo "Repository: $REPO_PATH"
echo ""
echo "Validation Results:"
echo -e "  ${GREEN}✓ Passed:${NC}   $CHECKS_PASSED"
echo -e "  ${YELLOW}⚠ Warnings:${NC} $CHECKS_WARNING"
echo -e "  ${RED}✗ Failed:${NC}   $CHECKS_FAILED"
echo "  ─────────────────────"
echo "  Total:    $total_checks"
echo ""

# Determine overall status
if [[ $CHECKS_FAILED -eq 0 ]]; then
    if [[ $CHECKS_WARNING -eq 0 ]]; then
        echo -e "${GREEN}${BOLD}✓ All checks passed! Repository is properly configured.${NC}"
        EXIT_CODE=0
    else
        echo -e "${YELLOW}${BOLD}⚠ Setup is mostly complete, but review $CHECKS_WARNING warning(s).${NC}"
        EXIT_CODE=0
    fi
else
    echo -e "${RED}${BOLD}✗ Setup is incomplete. Please address $CHECKS_FAILED failure(s).${NC}"
    EXIT_CODE=1
fi

echo ""
print_header "Next Steps"

if [[ $CHECKS_FAILED -gt 0 ]]; then
    echo -e "${BOLD}Required:${NC}"
    echo "  1. Review failed checks above"
    echo "  2. Create missing CLAUDE.md or AGENTS.md files"
    echo "  3. Ensure .claude/agents/ directory is populated"
    echo "  4. Address any security warnings"
else
    echo -e "${BOLD}Optional Improvements:${NC}"
    echo "  1. Ensure all agents have detailed 'Examples' sections"
    echo "  2. Add 'Blocked By' sections to agent definitions"
    echo "  3. Create CONTRIBUTING.md with agent setup guidelines"
    echo "  4. Add automation to validate agent definitions in CI/CD"
fi

echo ""

exit $EXIT_CODE
