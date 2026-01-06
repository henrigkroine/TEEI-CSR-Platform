---
id: 32
key: publications
name: Publications
category: Platform
status: production
lastReviewed: 2025-01-27
---

# Publications

## 1. Summary

- Public impact pages and publications system for sharing impact stories and metrics publicly.
- Features public pages, embed integration with SDK, share links, and publication management.
- Provides public-facing interface for showcasing CSR impact to external stakeholders.
- Used by companies for public impact communication and stakeholder engagement.

## 2. Current Status

- Overall status: `production`

- Fully implemented Publications feature in Corporate Cockpit with publication components (`apps/corp-cockpit-astro/src/components/publications/` with 6 files), embed SDK (`packages/sdk/embeds/`), and comprehensive documentation (`docs/publications/` with 5 markdown files). Core features include public pages, embed integration, share links, and publication management.

- Documentation includes publication guides, embed SDK documentation, and security guides for public sharing.

## 3. What's Next

- Add publication analytics and view tracking.
- Implement publication scheduling and auto-publishing.
- Enhance embed customization options.
- Add publication templates for different use cases.

## 4. Code & Files

Backend / services:
- Publication API (if exists)

Frontend / UI:
- `apps/corp-cockpit-astro/src/components/publications/` - Publication components (6 files)
- `packages/sdk/embeds/` - Embed SDK

Shared / schema / docs:
- `docs/publications/` - Publication documentation (5 *.md files)

## 5. Dependencies

Consumes:
- Report Generation for content
- Dashboard metrics for public display
- Share link generation for public access

Provides:
- Public impact pages for external stakeholders
- Embed integration for websites
- Share links for social media

## 6. Notes

- Public pages enable external sharing of impact stories.
- Embed integration allows embedding impact metrics on external websites.
- Share links provide easy sharing via social media and email.
- Publication management allows controlling public content visibility.
- Security features ensure appropriate data exposure in public pages.



