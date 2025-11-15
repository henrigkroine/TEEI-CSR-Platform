# OPA Admission Control Policies for Production
# Enforces security, compliance, and operational best practices

package kubernetes.admission

import future.keywords.contains
import future.keywords.if
import future.keywords.in

# Default deny
default allow = false

# Allow if all checks pass
allow {
    not deny_unsigned_images
    not deny_privileged_containers
    not deny_missing_security_context
    not deny_excessive_resources
    not deny_missing_labels
}

# Deny unsigned container images in production
deny_unsigned_images if {
    input.request.kind.kind == "Pod"
    input.request.namespace == "teei-production"
    some container in input.request.object.spec.containers
    not is_signed_image(container.image)
}

is_signed_image(image) {
    # Image must be from approved registry and include digest
    startswith(image, "ghcr.io/teei/")
    contains(image, "@sha256:")
}

# Deny privileged containers
deny_privileged_containers if {
    input.request.kind.kind == "Pod"
    input.request.namespace == "teei-production"
    some container in input.request.object.spec.containers
    container.securityContext.privileged == true
}

# Deny pods without proper security context
deny_missing_security_context if {
    input.request.kind.kind == "Pod"
    input.request.namespace == "teei-production"
    not has_security_context(input.request.object)
}

has_security_context(pod) {
    pod.spec.securityContext.runAsNonRoot == true
    every container in pod.spec.containers {
        container.securityContext.readOnlyRootFilesystem == true
        container.securityContext.allowPrivilegeEscalation == false
        "ALL" in container.securityContext.capabilities.drop
    }
}

# Deny excessive resource requests
deny_excessive_resources if {
    input.request.kind.kind == "Pod"
    input.request.namespace == "teei-production"
    some container in input.request.object.spec.containers
    is_excessive_resources(container.resources)
}

is_excessive_resources(resources) {
    # Max 8 CPU cores or 16Gi memory per container
    to_number(trim_suffix(resources.limits.cpu, "m")) > 8000
} else {
    to_number(trim_suffix(resources.limits.memory, "Gi")) > 16
}

# Require production labels
deny_missing_labels if {
    input.request.kind.kind == "Pod"
    input.request.namespace == "teei-production"
    not has_required_labels(input.request.object.metadata.labels)
}

has_required_labels(labels) {
    labels.app
    labels.component
    labels.tier
    labels["app.kubernetes.io/name"]
    labels["app.kubernetes.io/part-of"]
}

# Deny secrets in environment variables
deny_secrets_in_env if {
    input.request.kind.kind == "Pod"
    some container in input.request.object.spec.containers
    some env in container.env
    contains(lower(env.name), "password")
    env.value  # Direct value, not from secret
}

deny_secrets_in_env if {
    input.request.kind.kind == "Pod"
    some container in input.request.object.spec.containers
    some env in container.env
    contains(lower(env.name), "token")
    env.value
}

# Violation messages
violation[{"msg": msg}] {
    deny_unsigned_images
    msg := "Container images must be signed and referenced by digest in production"
}

violation[{"msg": msg}] {
    deny_privileged_containers
    msg := "Privileged containers are not allowed in production"
}

violation[{"msg": msg}] {
    deny_missing_security_context
    msg := "Pods must have proper security context (runAsNonRoot, readOnlyRootFilesystem, drop ALL capabilities)"
}

violation[{"msg": msg}] {
    deny_excessive_resources
    msg := "Container resource limits exceed maximum allowed (8 CPU, 16Gi memory)"
}

violation[{"msg": msg}] {
    deny_missing_labels
    msg := "Pods must have required labels: app, component, tier, app.kubernetes.io/name, app.kubernetes.io/part-of"
}

violation[{"msg": msg}] {
    deny_secrets_in_env
    msg := "Secrets must not be stored in environment variables. Use Kubernetes Secrets with envFrom or volumeMounts"
}
