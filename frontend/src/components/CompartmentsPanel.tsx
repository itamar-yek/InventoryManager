/**
 * Compartments Panel
 *
 * Manage the compartments (drawers, shelves, sections) of one storage unit:
 * list with item counts, add, rename and delete (delete is admin-only and only
 * possible when the compartment holds no items).
 */
import { useState } from 'react';
import { compartmentsApi, apiErrorMessage } from '../services/api';
import type { Compartment, Item } from '../types';

interface CompartmentsPanelProps {
  unitId: string;
  compartments: Compartment[];
  /** Items currently shown for the unit (used for per-compartment counts) */
  items: Item[];
  canEdit: boolean;
  canDelete: boolean;
  /** Reload compartments (and items) after a change */
  onChanged: () => void;
}

function CompartmentsPanel({ unitId, compartments, items, canEdit, canDelete, onChanged }: CompartmentsPanelProps) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const countFor = (compartmentId: string) => items.filter((i) => i.compartment_id === compartmentId).length;

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    setError(null);
    setBusy(true);
    try {
      await action();
      onChanged();
      return true;
    } catch (err) {
      setError(apiErrorMessage(err, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const nextOrder = compartments.reduce((m, c) => Math.max(m, c.index_order), -1) + 1;
    if (await run(() => compartmentsApi.create({ storage_unit_id: unitId, name, index_order: nextOrder }), 'Could not add the compartment.')) {
      setNewName('');
    }
  };

  const handleRename = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    if (await run(() => compartmentsApi.update(id, { name }), 'Could not rename the compartment.')) {
      setEditingId(null);
    }
  };

  const handleDelete = async (c: Compartment) => {
    if (!confirm(`Delete compartment "${c.name}"? (Only possible when it holds no items.)`)) return;
    await run(() => compartmentsApi.delete(c.id), 'Could not delete the compartment.');
  };

  return (
    <div className="mt-4 pt-3 border-t border-gray-100" data-testid="compartments-panel">
      <h3 className="font-medium mb-2">Compartments ({compartments.length})</h3>

      {error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">{error}</div>
      )}

      {compartments.length === 0 ? (
        <p className="text-xs text-gray-500 mb-2">No compartments. Add drawers or shelves to organize items inside this unit.</p>
      ) : (
        <ul className="space-y-1 mb-2">
          {compartments.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 text-sm bg-gray-50 rounded px-2 py-1">
              {editingId === c.id ? (
                <form className="flex-1 flex gap-1" onSubmit={(e) => { e.preventDefault(); handleRename(c.id); }}>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input py-0.5 px-1 text-sm flex-1"
                    maxLength={100}
                    autoFocus
                    aria-label="Compartment name"
                  />
                  <button type="submit" className="text-xs text-primary-600" disabled={busy}>Save</button>
                  <button type="button" className="text-xs text-gray-500" onClick={() => setEditingId(null)}>Cancel</button>
                </form>
              ) : (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate" title={c.name}>{c.name}</span>
                    <span className="block text-xs text-gray-400">({countFor(c.id)} item{countFor(c.id) === 1 ? '' : 's'})</span>
                  </span>
                  {canEdit && (
                    <span className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        className="text-xs text-primary-600 hover:text-primary-800"
                        onClick={() => { setEditingId(c.id); setEditName(c.name); setError(null); }}
                      >
                        Rename
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:text-red-800"
                          onClick={() => handleDelete(c)}
                          disabled={busy}
                        >
                          Delete
                        </button>
                      )}
                    </span>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <form onSubmit={handleAdd} className="flex gap-1">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New compartment, e.g. Drawer 1"
            className="input py-1 px-2 text-sm flex-1"
            maxLength={100}
            aria-label="New compartment name"
          />
          <button type="submit" className="btn-secondary text-xs py-1 px-2" disabled={busy || !newName.trim()}>
            Add
          </button>
        </form>
      )}
    </div>
  );
}

export default CompartmentsPanel;
