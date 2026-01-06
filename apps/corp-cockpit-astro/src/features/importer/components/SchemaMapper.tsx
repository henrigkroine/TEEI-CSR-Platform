import React, { useState } from 'react';
import type { InferredSchema, MappingConfig, FieldMapping, EventContractTarget } from '@teei/shared-types';

interface SchemaMapperProps {
  inferredSchema: InferredSchema;
  onSave: (mapping: MappingConfig) => void;
  onBack: () => void;
  loading: boolean;
}

const EVENT_CONTRACTS: { value: EventContractTarget; label: string }[] = [
  { value: 'volunteer.event', label: 'Volunteer Event' },
  { value: 'donation.event', label: 'Donation Event' },
  { value: 'program.enrollment', label: 'Program Enrollment' },
  { value: 'program.completion', label: 'Program Completion' },
  { value: 'buddy.event.logged', label: 'Buddy Event' },
  { value: 'kintell.session.completed', label: 'Kintell Session' },
  { value: 'kintell.user.import', label: 'Kintell User Import (LFU/MFU)' },
  { value: 'user.profile', label: 'User Profile' },
];

export function SchemaMapper({ inferredSchema, onSave, onBack, loading }: SchemaMapperProps) {
  const [targetContract, setTargetContract] = useState<EventContractTarget>('volunteer.event');
  const [mappings, setMappings] = useState<FieldMapping[]>([]);

  const handleAddMapping = () => {
    setMappings([
      ...mappings,
      {
        sourceColumn: inferredSchema.columns[0]?.name || '',
        targetField: '',
        required: false,
      },
    ]);
  };

  const handleRemoveMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const handleMappingChange = (index: number, field: keyof FieldMapping, value: any) => {
    const updated = [...mappings];
    updated[index] = { ...updated[index], [field]: value };
    setMappings(updated);
  };

  const handleSave = () => {
    const config: MappingConfig = {
      targetContract,
      fieldMappings: mappings,
    };
    onSave(config);
  };

  return (
    <div className="schema-mapper">
      <h2>Map Source Fields to Target Contract</h2>

      <div className="contract-selector">
        <label>Target Contract:</label>
        <select value={targetContract} onChange={(e) => setTargetContract(e.target.value as EventContractTarget)}>
          {EVENT_CONTRACTS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="schema-info">
        <h3>Detected Schema ({inferredSchema.columns.length} columns, {inferredSchema.rowCount} rows)</h3>
        <div className="columns-list">
          {inferredSchema.columns.map((col) => (
            <div key={col.name} className="column-chip">
              {col.name} <span className="type-badge">{col.type}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mappings-section">
        <div className="mappings-header">
          <h3>Field Mappings</h3>
          <button onClick={handleAddMapping}>+ Add Mapping</button>
        </div>

        {mappings.length === 0 ? (
          <div className="no-mappings">No mappings yet. Click "Add Mapping" to start.</div>
        ) : (
          <div className="mappings-list">
            {mappings.map((mapping, index) => (
              <div key={index} className="mapping-row">
                <select
                  value={mapping.sourceColumn}
                  onChange={(e) => handleMappingChange(index, 'sourceColumn', e.target.value)}
                >
                  <option value="">Select Source Column</option>
                  {inferredSchema.columns.map((col) => (
                    <option key={col.name} value={col.name}>{col.name}</option>
                  ))}
                </select>
                <span className="arrow">→</span>
                <input
                  type="text"
                  placeholder="Target Field (e.g., eventId, hours, amount)"
                  value={mapping.targetField}
                  onChange={(e) => handleMappingChange(index, 'targetField', e.target.value)}
                />
                <button onClick={() => handleRemoveMapping(index)} className="remove-btn">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mapper-actions">
        <button onClick={onBack}>Back</button>
        <button onClick={handleSave} disabled={loading || mappings.length === 0} className="primary">
          {loading ? 'Saving...' : 'Save & Preview'}
        </button>
      </div>

      <style>{`
        .schema-mapper {
          background: white;
          border-radius: 0.5rem;
          padding: 2rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .schema-mapper h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
        }

        .contract-selector {
          margin-bottom: 2rem;
        }

        .contract-selector label {
          display: block;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }

        .contract-selector select {
          width: 100%;
          max-width: 400px;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
        }

        .schema-info {
          margin-bottom: 2rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 0.375rem;
        }

        .schema-info h3 {
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .columns-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .column-chip {
          background: white;
          padding: 0.5rem 1rem;
          border-radius: 1rem;
          border: 1px solid #d1d5db;
          font-size: 0.875rem;
        }

        .type-badge {
          background: #e0e7ff;
          color: #3730a3;
          padding: 0.125rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          margin-left: 0.5rem;
        }

        .mappings-section {
          margin-bottom: 2rem;
        }

        .mappings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .mappings-header h3 {
          font-weight: 600;
        }

        .mappings-header button {
          padding: 0.5rem 1rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
        }

        .no-mappings {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .mappings-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .mapping-row {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .mapping-row select,
        .mapping-row input {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
        }

        .arrow {
          font-size: 1.5rem;
          color: #6b7280;
        }

        .remove-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid #ef4444;
          background: white;
          color: #ef4444;
          cursor: pointer;
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mapper-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .mapper-actions button {
          padding: 0.75rem 1.5rem;
          border-radius: 0.375rem;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid #d1d5db;
          background: white;
        }

        .mapper-actions button.primary {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }

        .mapper-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
