---
id: 31
key: deck-composer
name: Deck Composer
category: Platform
status: production
lastReviewed: 2025-01-27
---

# Deck Composer

## 1. Summary

- Presentation deck creation and management system for building executive presentations and impact decks.
- Features slide creation, template system, export functionality, and deck management.
- Provides drag-and-drop interface for creating presentation decks with charts, metrics, and narratives.
- Used by executives and presentation creators for building impact presentations and stakeholder communications.

## 2. Current Status

- Overall status: `production`

- Fully implemented Deck Composer in Corporate Cockpit with deck components (`apps/corp-cockpit-astro/src/components/deck/` with 23 files). Core features include slide creation, template system, export functionality, and deck management. Documentation includes `apps/corp-cockpit-astro/DECK_COMPOSER_IMPLEMENTATION.md` and `packages/shared-types/DECK_*.md` with comprehensive deck documentation.

- UI components provide comprehensive deck creation and management interface with templates and export capabilities.

## 3. What's Next

- Add collaborative editing for real-time deck collaboration.
- Implement deck sharing and permissions.
- Enhance template library with more presentation templates.
- Add deck analytics and usage tracking.

## 4. Code & Files

Backend / services:
- Deck management API (if exists)

Frontend / UI:
- `apps/corp-cockpit-astro/src/components/deck/` - Deck components (23 files)

Shared / schema / docs:
- `apps/corp-cockpit-astro/DECK_COMPOSER_IMPLEMENTATION.md` - Deck docs
- `packages/shared-types/DECK_*.md` - Deck documentation

## 5. Dependencies

Consumes:
- Report Generation for content
- Charts and metrics from Dashboard
- Export functionality for PDF/PPTX

Provides:
- Presentation decks for executives
- Stakeholder communication tools
- Impact presentation templates

## 6. Notes

- Slide creation enables building custom presentations.
- Template system provides pre-built presentation structures.
- Export functionality supports PDF and PPTX formats.
- Deck management allows saving and organizing presentations.
- Integration with dashboard ensures live data in presentations.



