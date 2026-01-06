# Security Policy

## Reporting Security Vulnerabilities

We take the security of the TEEI CSR Platform seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please send reports to: **security@teei-platform.org**

Include the following in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond to security reports within 48 hours and work to resolve critical issues within 7 days.

## Security Best Practices

### For Contributors

1. **Never commit secrets**
   - Use `.env` files for local development
   - Never commit API keys, passwords, or tokens
   - Use `.env.example` as a template

2. **Input validation**
   - Always validate user inputs with Zod schemas
   - Sanitize data before database operations
   - Use parameterized queries (Drizzle ORM handles this)

3. **Authentication & Authorization**
   - Use JWT tokens for authentication
   - Implement RBAC for authorization
   - Never expose sensitive user data in APIs

4. **Data encryption**
   - Encrypt PII at rest (email, phone numbers)
   - Use HTTPS for all external communication
   - Follow GDPR guidelines for user data

5. **Dependencies**
   - Keep dependencies up to date
   - Review Dependabot alerts promptly
   - Scan for vulnerabilities in CI

## Security Features

### Implemented
- Field-level encryption for PII
- JWT-based authentication
- Input validation with Zod
- Dependency scanning (Dependabot)
- CORS configuration
- Rate limiting in API gateway

### Planned
- Regular security audits
- Penetration testing
- Bug bounty program

## Vulnerability Disclosure Timeline

1. **Day 0**: Vulnerability reported
2. **Day 1-2**: Initial triage and response
3. **Day 3-7**: Fix development and testing
4. **Day 8-14**: Fix deployment and verification
5. **Day 15+**: Public disclosure (if appropriate)

## Security Contacts

- Primary: security@teei-platform.org
- Emergency: (TBD)

---

**Last Updated:** 2025-11-13
