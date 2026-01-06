import { describe, it, expect } from 'vitest';
import {
  calculateContrastRatio,
  validateContrast,
  validateThemeContrast,
  suggestTextColor,
  isValidHexColor,
} from './contrastValidator';

describe('contrastValidator', () => {
  describe('calculateContrastRatio', () => {
    it('should calculate correct ratio for black on white', () => {
      const ratio = calculateContrastRatio('#FFFFFF', '#000000');
      expect(ratio).toBe(21); // Maximum contrast
    });

    it('should calculate correct ratio for white on black', () => {
      const ratio = calculateContrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBe(21); // Order doesn't matter
    });

    it('should calculate ratio for same colors (minimum contrast)', () => {
      const ratio = calculateContrastRatio('#FFFFFF', '#FFFFFF');
      expect(ratio).toBe(1);
    });

    it('should calculate ratio for blue on white', () => {
      const ratio = calculateContrastRatio('#FFFFFF', '#0066CC');
      expect(ratio).toBeGreaterThan(4.5); // Should pass WCAG AA
    });

    it('should throw error for invalid hex color', () => {
      expect(() => calculateContrastRatio('invalid', '#FFFFFF')).toThrow();
      expect(() => calculateContrastRatio('#FFFFFF', 'rgb(255,0,0)')).toThrow();
    });
  });

  describe('validateContrast', () => {
    it('should pass WCAG AA for black text on white', () => {
      const result = validateContrast('#FFFFFF', '#000000');
      expect(result.isCompliant).toBe(true);
      expect(result.ratio).toBe(21);
      expect(result.warning).toBeUndefined();
    });

    it('should pass WCAG AA for white text on dark blue', () => {
      const result = validateContrast('#003366', '#FFFFFF');
      expect(result.isCompliant).toBe(true);
      expect(result.ratio).toBeGreaterThan(4.5);
    });

    it('should fail WCAG AA for yellow on white', () => {
      const result = validateContrast('#FFFFFF', '#FFFF00');
      expect(result.isCompliant).toBe(false);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('fails WCAG AA');
    });

    it('should warn for large-text-only compliance', () => {
      // Light gray on white - passes 3:1 but not 4.5:1
      const result = validateContrast('#FFFFFF', '#767676');
      expect(result.isCompliant).toBe(false);
      expect(result.isLargeTextCompliant).toBe(true);
      expect(result.warning).toContain('large text');
    });

    it('should return correct ratio value rounded to 2 decimals', () => {
      const result = validateContrast('#FFFFFF', '#0066CC');
      expect(result.ratio).toMatch(/^\d+\.\d{2}$/);
    });
  });

  describe('validateThemeContrast', () => {
    it('should validate compliant theme', () => {
      const colors = {
        primary: '#0066CC',
        secondary: '#1E40AF',
        accent: '#10B981',
        textOnPrimary: '#FFFFFF',
        textOnSecondary: '#FFFFFF',
        textOnAccent: '#FFFFFF',
      };

      const result = validateThemeContrast(colors);
      expect(result.isFullyCompliant).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.validations.primaryText.isCompliant).toBe(true);
      expect(result.validations.secondaryText.isCompliant).toBe(true);
      expect(result.validations.accentText.isCompliant).toBe(true);
    });

    it('should detect non-compliant theme', () => {
      const colors = {
        primary: '#FFFF00', // Yellow
        secondary: '#FF00FF', // Magenta
        accent: '#00FFFF', // Cyan
        textOnPrimary: '#FFFFFF',
        textOnSecondary: '#FFFFFF',
        textOnAccent: '#FFFFFF',
      };

      const result = validateThemeContrast(colors);
      expect(result.isFullyCompliant).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should provide specific warnings for each color', () => {
      const colors = {
        primary: '#FFFF00', // Yellow - fails
        secondary: '#0066CC', // Blue - passes
        accent: '#00FFFF', // Cyan - fails
        textOnPrimary: '#FFFFFF',
        textOnSecondary: '#FFFFFF',
        textOnAccent: '#FFFFFF',
      };

      const result = validateThemeContrast(colors);
      expect(result.warnings.some((w) => w.includes('Primary'))).toBe(true);
      expect(result.warnings.some((w) => w.includes('Accent'))).toBe(true);
      expect(result.warnings.some((w) => w.includes('Secondary'))).toBe(false); // Should pass
    });
  });

  describe('suggestTextColor', () => {
    it('should suggest white for dark backgrounds', () => {
      expect(suggestTextColor('#000000')).toBe('#FFFFFF');
      expect(suggestTextColor('#1E40AF')).toBe('#FFFFFF');
      expect(suggestTextColor('#10B981')).toBe('#FFFFFF');
    });

    it('should suggest black for light backgrounds', () => {
      expect(suggestTextColor('#FFFFFF')).toBe('#000000');
      expect(suggestTextColor('#FFFF00')).toBe('#000000');
      expect(suggestTextColor('#E0E0E0')).toBe('#000000');
    });

    it('should make correct decision for medium colors', () => {
      // Medium blue - should prefer white
      const result1 = suggestTextColor('#0066CC');
      expect(result1).toBe('#FFFFFF');

      // Light blue - should prefer black
      const result2 = suggestTextColor('#87CEEB');
      expect(result2).toBe('#000000');
    });
  });

  describe('isValidHexColor', () => {
    it('should accept valid hex colors', () => {
      expect(isValidHexColor('#000000')).toBe(true);
      expect(isValidHexColor('#FFFFFF')).toBe(true);
      expect(isValidHexColor('#0066CC')).toBe(true);
      expect(isValidHexColor('#abcdef')).toBe(true);
      expect(isValidHexColor('#ABCDEF')).toBe(true);
    });

    it('should reject invalid hex colors', () => {
      expect(isValidHexColor('000000')).toBe(false); // Missing #
      expect(isValidHexColor('#000')).toBe(false); // Too short
      expect(isValidHexColor('#0000000')).toBe(false); // Too long
      expect(isValidHexColor('#GGGGGG')).toBe(false); // Invalid characters
      expect(isValidHexColor('rgb(0,0,0)')).toBe(false); // Not hex
      expect(isValidHexColor('')).toBe(false); // Empty
    });
  });

  describe('WCAG 2.2 AA compliance scenarios', () => {
    it('should validate real-world brand colors', () => {
      const testCases = [
        { bg: '#0066CC', text: '#FFFFFF', shouldPass: true, name: 'Microsoft Blue' },
        { bg: '#1DA1F2', text: '#FFFFFF', shouldPass: true, name: 'Twitter Blue' },
        { bg: '#FF0000', text: '#FFFFFF', shouldPass: true, name: 'Red' },
        { bg: '#FFFF00', text: '#000000', shouldPass: false, name: 'Yellow (low contrast)' },
        { bg: '#34A853', text: '#FFFFFF', shouldPass: true, name: 'Google Green' },
      ];

      testCases.forEach(({ bg, text, shouldPass, name }) => {
        const result = validateContrast(bg, text);
        expect(result.isCompliant).toBe(shouldPass);
      });
    });

    it('should handle edge cases at 4.5:1 boundary', () => {
      // Colors with ratio very close to 4.5:1
      const result1 = validateContrast('#FFFFFF', '#757575');
      expect(result1.ratio).toBeGreaterThanOrEqual(4.5);

      const result2 = validateContrast('#FFFFFF', '#767676');
      expect(result2.ratio).toBeLessThan(4.5);
    });
  });
});
