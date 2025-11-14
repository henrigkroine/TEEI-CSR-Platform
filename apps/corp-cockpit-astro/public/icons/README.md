# PWA Icons

This directory contains icons for the TEEI Corporate Cockpit PWA.

## Required Icons

Generate the following icon sizes from the TEEI logo:

### Standard Icons (any purpose)
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

### Maskable Icons (Android adaptive icons)
- icon-192x192-maskable.png
- icon-512x512-maskable.png

**Note**: Maskable icons should have the logo centered with padding to ensure it's not cropped on all devices.

### Shortcuts Icons
- shortcut-dashboard.png (96x96)
- shortcut-reports.png (96x96)
- shortcut-evidence.png (96x96)

## Generation Tools

Recommended tools for icon generation:
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Maskable.app](https://maskable.app/) - For testing maskable icons

## Quick Generation Command

```bash
# Using pwa-asset-generator
npx pwa-asset-generator logo.svg ./public/icons --icon-only --background "#0066cc" --padding "10%"
```

## Design Guidelines

- **Theme Color**: #0066cc (TEEI Blue)
- **Background**: White (#ffffff) or transparent
- **Logo**: High contrast, readable at small sizes
- **Padding**: 10-15% for maskable icons
- **Format**: PNG with transparency
