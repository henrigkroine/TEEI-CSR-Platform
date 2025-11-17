/**
 * SCIM 2.0 Type Definitions (RFC 7644)
 * Complete type safety for SCIM resources and operations
 */

export const SCIM_SCHEMAS = {
  USER: 'urn:ietf:params:scim:schemas:core:2.0:User',
  GROUP: 'urn:ietf:params:scim:schemas:core:2.0:Group',
  LIST_RESPONSE: 'urn:ietf:params:scim:api:messages:2.0:ListResponse',
  PATCH_OP: 'urn:ietf:params:scim:api:messages:2.0:PatchOp',
  ERROR: 'urn:ietf:params:scim:api:messages:2.0:Error',
} as const;

export interface ScimMeta {
  resourceType: string;
  created: string;
  lastModified: string;
  version: string;
  location: string;
}

export interface ScimName {
  formatted?: string;
  givenName?: string;
  familyName?: string;
  middleName?: string;
  honorificPrefix?: string;
  honorificSuffix?: string;
}

export interface ScimEmail {
  value: string;
  type?: string;
  primary?: boolean;
  display?: string;
}

export interface ScimRole {
  value: string;
  display?: string;
  type?: string;
  primary?: boolean;
}

export interface ScimUser {
  schemas: string[];
  id?: string;
  externalId?: string;
  userName: string;
  name?: ScimName;
  displayName?: string;
  emails?: ScimEmail[];
  active?: boolean;
  roles?: ScimRole[];
  groups?: Array<{
    value: string;
    $ref: string;
    display?: string;
  }>;
  meta?: ScimMeta;
}

export interface ScimGroupMember {
  value: string;
  $ref: string;
  display?: string;
  type?: 'User' | 'Group';
}

export interface ScimGroup {
  schemas: string[];
  id?: string;
  externalId?: string;
  displayName: string;
  members?: ScimGroupMember[];
  meta?: ScimMeta;
}

export interface ScimListResponse<T = ScimUser | ScimGroup> {
  schemas: string[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: T[];
}

export interface ScimPatchOperation {
  op: 'add' | 'remove' | 'replace';
  path?: string;
  value?: any;
}

export interface ScimPatchRequest {
  schemas: string[];
  Operations: ScimPatchOperation[];
}

export interface ScimError {
  schemas: string[];
  scimType?: string;
  detail?: string;
  status: number;
}

export interface ScimFilterOptions {
  filter?: string;
  startIndex?: number;
  count?: number;
  sortBy?: string;
  sortOrder?: 'ascending' | 'descending';
}

// Internal database models
export interface UserRecord {
  id: string;
  externalId?: string;
  userName: string;
  givenName?: string;
  familyName?: string;
  displayName?: string;
  emails: string[];
  primaryEmail: string;
  active: boolean;
  roles: string[];
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  version: string;
}

export interface GroupRecord {
  id: string;
  externalId?: string;
  displayName: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  version: string;
}

export interface GroupMembershipRecord {
  groupId: string;
  userId: string;
  tenantId: string;
  createdAt: Date;
}

// Audit event for SCIM operations
export interface ScimAuditEvent {
  timestamp: Date;
  tenantId: string;
  operation: 'create' | 'update' | 'delete' | 'read';
  resourceType: 'User' | 'Group';
  resourceId: string;
  actor: {
    id: string;
    ip?: string;
  };
  changes?: Record<string, any>;
}
