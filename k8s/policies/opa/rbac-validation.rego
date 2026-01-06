package kubernetes.admission

import future.keywords.contains
import future.keywords.if
import future.keywords.in

# =============================================================================
# Tenant Isolation RBAC Policy
# =============================================================================
# Ensures users can only access resources within their assigned tenant.
# Prevents privilege escalation and data leakage across tenant boundaries.
#
# Policy Flow:
# 1. Extract user tenant_id from authentication token/headers
# 2. Extract resource tenant_id from resource labels/annotations
# 3. Deny access if tenant_ids don't match (unless user has global admin role)
#
# Exceptions:
# - cluster-admin role (full access across all tenants)
# - system:serviceaccount:kube-system:* (Kubernetes core components)
# - Global resources without tenant affinity (nodes, namespaces, CRDs)
# =============================================================================

# Default deny - fail closed for security
default allow = false

# Allow cluster admins unrestricted access
allow if {
    is_cluster_admin
}

# Allow Kubernetes system components
allow if {
    is_system_service_account
}

# Allow access to global resources without tenant affinity
allow if {
    is_global_resource
}

# Allow access when user's tenant matches resource's tenant
allow if {
    user_tenant := get_user_tenant
    resource_tenant := get_resource_tenant
    user_tenant == resource_tenant
    user_tenant != ""  # Ensure tenant is actually set
}

# =============================================================================
# Helper Functions
# =============================================================================

# Check if user has cluster-admin role
is_cluster_admin if {
    some role in input.request.userInfo.groups
    role == "system:masters"
}

is_cluster_admin if {
    some binding in data.kubernetes.clusterrolebindings
    binding.roleRef.name == "cluster-admin"
    user_in_binding(binding)
}

# Check if request is from a Kubernetes system service account
is_system_service_account if {
    startswith(input.request.userInfo.username, "system:serviceaccount:kube-system:")
}

is_system_service_account if {
    startswith(input.request.userInfo.username, "system:node:")
}

# Check if resource is global (no tenant affinity)
is_global_resource if {
    input.request.kind.kind in {
        "Namespace",
        "Node",
        "PersistentVolume",
        "ClusterRole",
        "ClusterRoleBinding",
        "CustomResourceDefinition",
        "StorageClass",
        "IngressClass"
    }
}

# Extract tenant ID from user info
get_user_tenant = tenant if {
    # Try to get from user annotations (preferred method)
    tenant := input.request.userInfo.extra["tenant-id"][0]
} else = tenant if {
    # Fallback: extract from username (format: user@tenant-123)
    username := input.request.userInfo.username
    contains(username, "@tenant-")
    parts := split(username, "@tenant-")
    tenant := sprintf("tenant-%s", [parts[1]])
} else = "" {
    # No tenant found - will trigger deny unless global admin
    true
}

# Extract tenant ID from resource
get_resource_tenant = tenant if {
    # Check resource labels first (preferred)
    tenant := input.request.object.metadata.labels["teei.io/tenant-id"]
} else = tenant if {
    # Check resource annotations as fallback
    tenant := input.request.object.metadata.annotations["teei.io/tenant-id"]
} else = tenant if {
    # For namespaced resources, check namespace labels
    namespace := input.request.namespace
    ns_obj := data.kubernetes.namespaces[namespace]
    tenant := ns_obj.metadata.labels["teei.io/tenant-id"]
} else = "" {
    # No tenant found on resource
    true
}

# Check if user is in a role binding
user_in_binding(binding) if {
    some subject in binding.subjects
    subject.kind == "User"
    subject.name == input.request.userInfo.username
}

user_in_binding(binding) if {
    some subject in binding.subjects
    subject.kind == "Group"
    some group in input.request.userInfo.groups
    subject.name == group
}

user_in_binding(binding) if {
    some subject in binding.subjects
    subject.kind == "ServiceAccount"
    sa_name := sprintf("system:serviceaccount:%s:%s", [subject.namespace, subject.name])
    sa_name == input.request.userInfo.username
}

# =============================================================================
# Violation Messages
# =============================================================================

# Generate detailed denial message
deny[msg] if {
    not allow
    user_tenant := get_user_tenant
    resource_tenant := get_resource_tenant
    msg := sprintf(
        "Tenant isolation violation: User tenant '%s' cannot access resource in tenant '%s'. Resource: %s/%s",
        [user_tenant, resource_tenant, input.request.kind.kind, input.request.name]
    )
}

deny[msg] if {
    not allow
    get_user_tenant == ""
    not is_cluster_admin
    not is_system_service_account
    msg := sprintf(
        "Access denied: User '%s' has no tenant assignment. Contact your administrator.",
        [input.request.userInfo.username]
    )
}

# =============================================================================
# Audit Logging
# =============================================================================

# Log all tenant boundary crossings (allowed or denied)
audit_log[entry] if {
    user_tenant := get_user_tenant
    resource_tenant := get_resource_tenant
    user_tenant != resource_tenant
    entry := {
        "timestamp": time.now_ns(),
        "user": input.request.userInfo.username,
        "user_tenant": user_tenant,
        "resource_tenant": resource_tenant,
        "resource_kind": input.request.kind.kind,
        "resource_name": input.request.name,
        "operation": input.request.operation,
        "allowed": allow,
        "reason": "tenant_boundary_crossing"
    }
}
