# PWA Icons

This directory contains icons for the TEEI Corporate Cockpit PWA.

## Generated Icons

All required icons have been generated and optimized. See manifest.json for the complete icon configuration.

### Standard Icons (any purpose)
- icon-72x72.png (841 B)
- icon-96x96.png (1.3 KB)
- icon-128x128.png (1.5 KB)
- icon-144x144.png (2.4 KB)
- icon-152x152.png (2.6 KB)
- icon-192x192.png (3.3 KB)
- icon-384x384.png (9.1 KB)
- icon-512x512.png (25 KB)

### Maskable Icons (Android adaptive icons)
- icon-192x192-maskable.png (8.8 KB) - With 20% padding for safe zone
- icon-512x512-maskable.png (49 KB) - With 20% padding for safe zone

### Shortcut Icons
- shortcut-dashboard.png (96x96, 727 B)
- shortcut-reports.png (96x96, 727 B)
- shortcut-evidence.png (96x96, 727 B)

## Design Specifications

- **Source**: favicon.svg
- **Theme Color**: #0066cc (TEEI Blue)
- **Background**: Linear gradient (blue tones)
- **Logo Design**: Rounded gradient box with smiley face
- **Format**: PNG with transparency (8-bit/RGBA for maskable)
- **Compression**: PNG level 9 (maximum compression)
- **Maskable Padding**: 20% on each side (60% content area)

## Generation Process

Icons were generated using sharp (Node.js image processing library) on 2025-11-14.

**Generator script**: `generate-icons.js` (in project root)

To regenerate icons:
```bash
node generate-icons.js
```

## Verification Checklist

✓ All icon sizes generated correctly
✓ Maskable variants created with proper padding
✓ Shortcut icons with distinct designs
✓ All PNG files optimized and compressed
✓ Manifest references all icons correctly
✓ Icon dimensions verified
✓ RGBA format for maskable icons (Android adaptive icon support)
✓ Reasonable file sizes for web delivery

## Testing Maskable Icons

Test maskable icons using [Maskable.app](https://maskable.app/):
- Upload icon-192x192-maskable.png or icon-512x512-maskable.png
- Verify the logo appears centered with proper padding
- Check that content is not cropped on various mask shapes

## References

- [PWA Icons Specification](https://www.w3.org/TR/appmanifest/#icon-member)
- [Maskable Icons](https://web.dev/maskable-icon/)
- [Web.dev PWA Icon Guidelines](https://web.dev/add-manifest/#icons)
