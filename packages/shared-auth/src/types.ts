import { z } from 'zod';

/**
 * User role types for RBAC
 */
export const UserRoleSchema = z.enum([
  'learner',
  'volunteer',
  'mentor',
  'company_admin',
  'teei_staff',
  'super_admin',
]);

export type UserRole = z.infer<typeof UserRoleSchema>;

/**
 * JWT payload structure
 */
export const JWTPayloadSchema = z.object({
  sub: z.string().uuid(), // user ID
  email: z.string().email(),
  name: z.string(),
  roles: z.array(UserRoleSchema),
  companyId: z.string().uuid().optional(), // For company admins
  locale: z.enum(['en', 'no', 'uk']).default('en'),
  iat: z.number(),
  exp: z.number(),
});

export type JWTPayload = z.infer<typeof JWTPayloadSchema>;

/**
 * Session data stored in cookies/database
 */
export const SessionSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
  email: z.string().email(),
  roles: z.array(UserRoleSchema),
  companyId: z.string().uuid().optional(),
  createdAt: z.date(),
  expiresAt: z.date(),
  lastActivity: z.date(),
});

export type Session = z.infer<typeof SessionSchema>;

/**
 * Auth context available in both Astro apps
 */
export interface AuthContext {
  user: {
    id: string;
    email: string;
    name: string;
    roles: UserRole[];
    companyId?: string;
    locale: 'en' | 'no' | 'uk';
  } | null;
  session: Session | null;
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}
