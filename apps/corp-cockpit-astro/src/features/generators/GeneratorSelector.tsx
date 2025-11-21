/**
 * Generator Selector Component
 *
 * UI for selecting and launching case study or methods whitepaper generators
 * Enforces Evidence Gate requirements (≥1 citation per paragraph)
 */

import { useState, useEffect } from 'react';

export type GeneratorType = 'case-study' | 'methods-whitepaper';
export type Locale = 'en' | 'es' | 'fr' | 'uk' | 'no';

interface GeneratorSelectorProps {
  companyId: string;
  onGenerate: (config: GeneratorConfig) => void;
  onCancel: () => void;
}

export interface GeneratorConfig {
  type: GeneratorType;
  companyId: string;
  period: {
    start: string;
    end: string;
  };
  locale: Locale;
  deterministic: boolean;
  temperature?: number;
  maxTokens?: number;
}

const GENERATOR_INFO: Record<GeneratorType, {
  title: string;
  description: string;
  wordCount: string;
  tone: string;
  recommendedTemperature: number;
  recommendedTokens: number;
  estimatedCost: string;
}> = {
  'case-study': {
    title: 'Customer Case Study',
    description: 'Compelling narrative showcasing program impact through baseline→intervention→outcomes→ROI→participant stories. Ideal for marketing materials, investor communications, and board presentations.',
    wordCount: '1800-2200 words',
    tone: 'Inspiring, evidence-based, persuasive',
    recommendedTemperature: 0.7,
    recommendedTokens: 4000,
    estimatedCost: '$0.20-0.40',
  },
  'methods-whitepaper': {
    title: 'VIS/SROI Methods Whitepaper',
    description: 'Technical documentation of VIS and SROI calculation methodologies with full transparency on formulas, validation, data quality, and limitations. Ideal for auditors, academic researchers, and foundation officers.',
    wordCount: '2500-3000 words',
    tone: 'Academic rigor, methodological transparency',
    recommendedTemperature: 0.3,
    recommendedTokens: 6000,
    estimatedCost: '$0.40-0.60',
  },
};

export default function GeneratorSelector({
  companyId,
  onGenerate,
  onCancel,
}: GeneratorSelectorProps) {
  const [selectedType, setSelectedType] = useState<GeneratorType>('case-study');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-03-31');
  const [locale, setLocale] = useState<Locale>('en');
  const [deterministic, setDeterministic] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4000);

  const info = GENERATOR_INFO[selectedType];

  // Auto-adjust temperature and tokens when generator type changes
  useEffect(() => {
    setTemperature(info.recommendedTemperature);
    setMaxTokens(info.recommendedTokens);
  }, [selectedType]);

  const handleGenerate = () => {
    const config: GeneratorConfig = {
      type: selectedType,
      companyId,
      period: { start: startDate, end: endDate },
      locale,
      deterministic,
      temperature: advancedMode ? temperature : info.recommendedTemperature,
      maxTokens: advancedMode ? maxTokens : info.recommendedTokens,
    };
    onGenerate(config);
  };

  return (
    <div className="generator-selector bg-white rounded-lg shadow-md p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Generate Report</h2>

      {/* Generator Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Select Generator Type
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(GENERATOR_INFO) as GeneratorType[]).map((type) => {
            const typeInfo = GENERATOR_INFO[type];
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`
                  p-4 rounded-lg border-2 text-left transition-all
                  ${selectedType === type
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
                  }
                `}
                aria-pressed={selectedType === type}
              >
                <h3 className="font-bold text-gray-800 mb-2">{typeInfo.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{typeInfo.description}</p>
                <div className="flex gap-2 text-xs text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded">{typeInfo.wordCount}</span>
                  <span className="bg-gray-100 px-2 py-1 rounded">{typeInfo.estimatedCost}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Generator Details */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-900 mb-2">{info.title}</h4>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-blue-700 font-medium">Length:</dt>
            <dd className="text-blue-900">{info.wordCount}</dd>
          </div>
          <div>
            <dt className="text-blue-700 font-medium">Tone:</dt>
            <dd className="text-blue-900">{info.tone}</dd>
          </div>
          <div>
            <dt className="text-blue-700 font-medium">Est. Cost:</dt>
            <dd className="text-blue-900">{info.estimatedCost}</dd>
          </div>
          <div>
            <dt className="text-blue-700 font-medium">Citations:</dt>
            <dd className="text-blue-900">≥2 per paragraph (enforced)</dd>
          </div>
        </dl>
      </div>

      {/* Period Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Locale Selection */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Language
        </label>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
          <option value="uk">Українська</option>
          <option value="no">Norsk</option>
        </select>
      </div>

      {/* Advanced Options */}
      <div className="mb-6">
        <button
          onClick={() => setAdvancedMode(!advancedMode)}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-2"
        >
          <span>{advancedMode ? '▼' : '▶'}</span>
          Advanced Options
        </button>

        {advancedMode && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={deterministic}
                  onChange={(e) => setDeterministic(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium text-gray-700">Deterministic Generation</span>
                <span className="text-gray-500">(seed=42, reproducible)</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature: {temperature}
                <span className="text-gray-500 ml-2 font-normal">
                  (0=deterministic, 2=creative)
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Deterministic</span>
                <span>Balanced</span>
                <span>Creative</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Tokens: {maxTokens}
              </label>
              <input
                type="range"
                min="1000"
                max="8000"
                step="100"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1000</span>
                <span>4000</span>
                <span>8000</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Evidence Gate Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <h5 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
          <span className="text-xl">⚠️</span>
          Evidence Gate Enforcement
        </h5>
        <p className="text-sm text-amber-800">
          Generation will <strong>fail</strong> if:
        </p>
        <ul className="list-disc list-inside text-sm text-amber-800 mt-2 space-y-1">
          <li>Any paragraph has &lt;1 citation</li>
          <li>Citation density &lt;0.5 per 100 words</li>
          <li>Citations reference invalid evidence IDs</li>
        </ul>
        <p className="text-xs text-amber-700 mt-2">
          Ensure sufficient evidence exists for the selected period.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleGenerate}
          className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium shadow-sm"
        >
          Generate {info.title}
        </button>
      </div>
    </div>
  );
}
