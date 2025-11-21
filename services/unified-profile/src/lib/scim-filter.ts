/**
 * SCIM 2.0 Filter Parser (RFC 7644 Section 3.4.2.2)
 * Parses and evaluates SCIM filter expressions
 *
 * Supported operators:
 * - eq, ne, co, sw, ew, gt, ge, lt, le, pr (present)
 * - and, or, not
 *
 * Examples:
 * - userName eq "john@example.com"
 * - active eq true
 * - emails[type eq "work" and value co "@example.com"]
 */

import { UserRecord, GroupRecord } from '../types/scim.js';

export type FilterOperator = 'eq' | 'ne' | 'co' | 'sw' | 'ew' | 'gt' | 'ge' | 'lt' | 'le' | 'pr';
export type LogicalOperator = 'and' | 'or' | 'not';

export interface FilterExpression {
  attribute: string;
  operator: FilterOperator;
  value?: any;
}

export interface LogicalExpression {
  operator: LogicalOperator;
  left?: FilterNode;
  right?: FilterNode;
}

export type FilterNode = FilterExpression | LogicalExpression;

/**
 * Simple SCIM filter parser
 * Production implementation should use a proper parser library
 */
export class ScimFilterParser {
  parse(filter: string): FilterNode | null {
    if (!filter || filter.trim() === '') {
      return null;
    }

    // Remove outer parentheses
    filter = filter.trim();
    if (filter.startsWith('(') && filter.endsWith(')')) {
      filter = filter.slice(1, -1);
    }

    // Check for logical operators
    if (filter.includes(' and ')) {
      const parts = this.splitByLogical(filter, 'and');
      return {
        operator: 'and',
        left: this.parse(parts[0]),
        right: this.parse(parts[1]),
      } as LogicalExpression;
    }

    if (filter.includes(' or ')) {
      const parts = this.splitByLogical(filter, 'or');
      return {
        operator: 'or',
        left: this.parse(parts[0]),
        right: this.parse(parts[1]),
      } as LogicalExpression;
    }

    if (filter.startsWith('not ')) {
      return {
        operator: 'not',
        left: this.parse(filter.substring(4)),
      } as LogicalExpression;
    }

    // Parse comparison expression
    const match = filter.match(/^(\w+(?:\.\w+)*)\s+(eq|ne|co|sw|ew|gt|ge|lt|le|pr)(?:\s+(.+))?$/i);
    if (!match) {
      throw new Error(`Invalid filter expression: ${filter}`);
    }

    const [, attribute, operator, rawValue] = match;
    let value: any = rawValue?.trim();

    // Parse value type
    if (value) {
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1); // String
      } else if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else if (value === 'null') {
        value = null;
      } else if (!isNaN(Number(value))) {
        value = Number(value);
      }
    }

    return {
      attribute,
      operator: operator.toLowerCase() as FilterOperator,
      value,
    } as FilterExpression;
  }

  private splitByLogical(filter: string, operator: string): [string, string] {
    const regex = new RegExp(`\\s+${operator}\\s+`, 'i');
    const match = filter.match(regex);
    if (!match) {
      throw new Error(`Failed to split by ${operator}`);
    }
    const index = match.index!;
    return [
      filter.substring(0, index),
      filter.substring(index + match[0].length),
    ];
  }
}

/**
 * Evaluate filter against a user record
 */
export function evaluateUserFilter(user: UserRecord, filter: FilterNode | null): boolean {
  if (!filter) {
    return true;
  }

  if ('operator' in filter && ['and', 'or', 'not'].includes(filter.operator)) {
    const logical = filter as LogicalExpression;
    switch (logical.operator) {
      case 'and':
        return evaluateUserFilter(user, logical.left || null) && evaluateUserFilter(user, logical.right || null);
      case 'or':
        return evaluateUserFilter(user, logical.left || null) || evaluateUserFilter(user, logical.right || null);
      case 'not':
        return !evaluateUserFilter(user, logical.left || null);
    }
  }

  const expr = filter as FilterExpression;
  const actualValue = getUserAttribute(user, expr.attribute);

  return evaluateComparison(actualValue, expr.operator, expr.value);
}

/**
 * Evaluate filter against a group record
 */
export function evaluateGroupFilter(group: GroupRecord, filter: FilterNode | null): boolean {
  if (!filter) {
    return true;
  }

  if ('operator' in filter && ['and', 'or', 'not'].includes(filter.operator)) {
    const logical = filter as LogicalExpression;
    switch (logical.operator) {
      case 'and':
        return evaluateGroupFilter(group, logical.left || null) && evaluateGroupFilter(group, logical.right || null);
      case 'or':
        return evaluateGroupFilter(group, logical.left || null) || evaluateGroupFilter(group, logical.right || null);
      case 'not':
        return !evaluateGroupFilter(group, logical.left || null);
    }
  }

  const expr = filter as FilterExpression;
  const actualValue = getGroupAttribute(group, expr.attribute);

  return evaluateComparison(actualValue, expr.operator, expr.value);
}

function getUserAttribute(user: UserRecord, path: string): any {
  const parts = path.split('.');
  let value: any = user;

  for (const part of parts) {
    if (part === 'userName') {
      value = user.userName;
    } else if (part === 'name') {
      value = { givenName: user.givenName, familyName: user.familyName };
    } else if (part === 'givenName') {
      value = user.givenName;
    } else if (part === 'familyName') {
      value = user.familyName;
    } else if (part === 'displayName') {
      value = user.displayName;
    } else if (part === 'active') {
      value = user.active;
    } else if (part === 'externalId') {
      value = user.externalId;
    } else {
      value = value?.[part];
    }
  }

  return value;
}

function getGroupAttribute(group: GroupRecord, path: string): any {
  const parts = path.split('.');
  let value: any = group;

  for (const part of parts) {
    if (part === 'displayName') {
      value = group.displayName;
    } else if (part === 'externalId') {
      value = group.externalId;
    } else {
      value = value?.[part];
    }
  }

  return value;
}

function evaluateComparison(actualValue: any, operator: FilterOperator, expectedValue: any): boolean {
  switch (operator) {
    case 'eq':
      return actualValue === expectedValue;
    case 'ne':
      return actualValue !== expectedValue;
    case 'co':
      return typeof actualValue === 'string' && actualValue.includes(expectedValue);
    case 'sw':
      return typeof actualValue === 'string' && actualValue.startsWith(expectedValue);
    case 'ew':
      return typeof actualValue === 'string' && actualValue.endsWith(expectedValue);
    case 'gt':
      return actualValue > expectedValue;
    case 'ge':
      return actualValue >= expectedValue;
    case 'lt':
      return actualValue < expectedValue;
    case 'le':
      return actualValue <= expectedValue;
    case 'pr':
      return actualValue !== null && actualValue !== undefined;
    default:
      return false;
  }
}
