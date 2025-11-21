/**
 * Color Picker Component
 * Simple color input with label and validation
 */

import React from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-foreground capitalize flex-1">
        {label.replace(/([A-Z])/g, ' $1').trim()}
      </label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 h-10 rounded border border-border cursor-pointer"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 px-2 py-1 border border-border rounded text-sm bg-background text-foreground font-mono"
        placeholder="#000000"
      />
    </div>
  );
}
