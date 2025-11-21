/**
 * Org Tree Editor Component
 *
 * Drag-and-drop tree editor for organizational hierarchies
 */

import React, { useState, useEffect } from 'react';
import type { OrgUnit, OrgUnitTreeNode } from '@teei/shared-types';

interface OrgTreeEditorProps {
  orgId: string;
  onSave?: (units: OrgUnit[]) => void;
  readOnly?: boolean;
}

export function OrgTreeEditor({ orgId, onSave, readOnly = false }: OrgTreeEditorProps) {
  const [units, setUnits] = useState<OrgUnitTreeNode[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<OrgUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load org units on mount
  useEffect(() => {
    loadOrgUnits();
  }, [orgId]);

  async function loadOrgUnits() {
    try {
      setLoading(true);
      const response = await fetch(`/api/hierarchies/orgs/${orgId}/units`);

      if (!response.ok) {
        throw new Error('Failed to load org units');
      }

      const data = await response.json();
      const tree = buildTree(data.data);
      setUnits(tree);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  function buildTree(flatUnits: OrgUnit[]): OrgUnitTreeNode[] {
    const unitsById = new Map(flatUnits.map(u => [u.id, { ...u, children: [] }]));
    const roots: OrgUnitTreeNode[] = [];

    for (const unit of flatUnits) {
      const node = unitsById.get(unit.id)!;

      if (!unit.parentId) {
        roots.push(node);
      } else {
        const parent = unitsById.get(unit.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      }
    }

    return roots;
  }

  function handleUnitClick(unit: OrgUnit) {
    if (!readOnly) {
      setSelectedUnit(unit);
    }
  }

  function renderTree(nodes: OrgUnitTreeNode[], depth = 0) {
    return (
      <ul className={`tree-level depth-${depth}`}>
        {nodes.map(node => (
          <li key={node.id} className="tree-node">
            <div
              className={`unit-card ${selectedUnit?.id === node.id ? 'selected' : ''} ${!node.active ? 'inactive' : ''}`}
              onClick={() => handleUnitClick(node)}
            >
              <div className="unit-header">
                <span className="unit-name">{node.name}</span>
                <span className="unit-code">{node.code}</span>
              </div>
              {node.description && (
                <div className="unit-description">{node.description}</div>
              )}
              {node.currency && (
                <div className="unit-currency">Currency: {node.currency}</div>
              )}
              {node.memberCount !== undefined && (
                <div className="unit-members">
                  {node.memberCount} member{node.memberCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            {node.children && node.children.length > 0 && renderTree(node.children, depth + 1)}
          </li>
        ))}
      </ul>
    );
  }

  if (loading) {
    return <div className="loading">Loading organizational hierarchy...</div>;
  }

  if (error) {
    return (
      <div className="error" role="alert">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  return (
    <div className="org-tree-editor">
      <div className="tree-container">
        <h2>Organizational Hierarchy</h2>
        {units.length === 0 ? (
          <div className="empty-state">
            <p>No organizational units defined.</p>
            {!readOnly && (
              <button type="button" onClick={() => {}}>
                Create First Unit
              </button>
            )}
          </div>
        ) : (
          <div className="tree-view" role="tree">
            {renderTree(units)}
          </div>
        )}
      </div>

      {selectedUnit && !readOnly && (
        <div className="unit-editor">
          <h3>Edit Unit: {selectedUnit.name}</h3>
          {/* TODO: Add unit editing form */}
          <p>Unit editing form would go here</p>
        </div>
      )}

      <style>{`
        .org-tree-editor {
          display: flex;
          gap: 2rem;
          padding: 1rem;
        }

        .tree-container {
          flex: 2;
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .tree-view {
          margin-top: 1rem;
        }

        .tree-level {
          list-style: none;
          padding-left: 2rem;
          margin: 0;
        }

        .tree-level.depth-0 {
          padding-left: 0;
        }

        .tree-node {
          margin: 0.5rem 0;
        }

        .unit-card {
          background: #f8f9fa;
          border: 2px solid #e9ecef;
          border-radius: 6px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .unit-card:hover {
          border-color: #0066cc;
          box-shadow: 0 2px 8px rgba(0, 102, 204, 0.1);
        }

        .unit-card.selected {
          border-color: #0066cc;
          background: #e7f3ff;
        }

        .unit-card.inactive {
          opacity: 0.6;
          background: #f1f1f1;
        }

        .unit-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .unit-name {
          font-weight: 600;
          font-size: 1.1rem;
          color: #212529;
        }

        .unit-code {
          font-family: monospace;
          font-size: 0.9rem;
          color: #6c757d;
          background: white;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .unit-description {
          color: #6c757d;
          font-size: 0.9rem;
          margin-top: 0.5rem;
        }

        .unit-currency,
        .unit-members {
          font-size: 0.85rem;
          color: #6c757d;
          margin-top: 0.25rem;
        }

        .unit-editor {
          flex: 1;
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .loading,
        .error,
        .empty-state {
          padding: 2rem;
          text-align: center;
        }

        .error {
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 6px;
          color: #856404;
        }

        .empty-state button {
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }

        .empty-state button:hover {
          background: #0052a3;
        }
      `}</style>
    </div>
  );
}
