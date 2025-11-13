import { useState, useRef, useEffect } from 'react';
import { SUPPORTED_LOCALES, LOCALE_NAMES, type Locale } from '../utils/i18n';

interface LanguageSwitcherProps {
  currentLocale: Locale;
  currentPath: string;
}

export default function LanguageSwitcher({ currentLocale, currentPath }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const switchLocale = (newLocale: Locale) => {
    const newPath = currentPath.replace(/^\/(en|uk|no)/, `/${newLocale}`);
    window.location.href = newPath.startsWith(`/${newLocale}`) ? newPath : `/${newLocale}${newPath}`;
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 16px',
          backgroundColor: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--border-radius)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.9375rem',
          fontWeight: 500,
        }}
        aria-label="Switch language"
        aria-expanded={isOpen}
      >
        🌐 {LOCALE_NAMES[currentLocale]}
        <span style={{ fontSize: '0.75rem' }}>▼</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--border-radius)',
            boxShadow: 'var(--shadow-lg)',
            minWidth: '150px',
            zIndex: 1000,
          }}
          role="menu"
        >
          {SUPPORTED_LOCALES.map((locale) => (
            <button
              key={locale}
              onClick={() => {
                switchLocale(locale);
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                textAlign: 'left',
                border: 'none',
                backgroundColor: locale === currentLocale ? 'var(--color-bg-secondary)' : 'transparent',
                cursor: 'pointer',
                fontSize: '0.9375rem',
                fontWeight: locale === currentLocale ? 600 : 400,
                color: locale === currentLocale ? 'var(--color-primary)' : 'var(--color-text)',
              }}
              onMouseEnter={(e) => {
                if (locale !== currentLocale) {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                if (locale !== currentLocale) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              role="menuitem"
            >
              {LOCALE_NAMES[locale]}
              {locale === currentLocale && ' ✓'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
