/**
 * Item History Modal
 *
 * Shows the movement history (audit trail) of one item: when it was moved,
 * from where, to where, by whom and why.
 */
import { useEffect, useState } from 'react';
import { itemsApi, apiErrorMessage } from '../services/api';
import type { Item, ItemMovement } from '../types';

interface ItemHistoryModalProps {
  item: Pick<Item, 'id' | 'name' | 'created_at'>;
  onClose: () => void;
}

function ItemHistoryModal({ item, onClose }: ItemHistoryModalProps) {
  const [movements, setMovements] = useState<ItemMovement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    itemsApi.getHistory(item.id)
      .then(setMovements)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load the history.')));
  }, [item.id]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-1">Movement History</h2>
        <p className="text-sm text-gray-600 mb-4">{item.name}</p>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{error}</div>}

        {!error && movements === null && <p className="text-gray-500 text-sm">Loading...</p>}

        {movements && movements.length === 0 && (
          <p className="text-gray-500 text-sm">This item has not been moved since it was added.</p>
        )}

        {movements && movements.length > 0 && (
          <ol className="space-y-3" data-testid="history-list">
            {movements.map((m) => (
              <li key={m.id} className="border-l-4 border-primary-200 pl-3 py-1">
                <p className="text-xs text-gray-500">
                  {new Date(m.created_at).toLocaleString()}
                  {m.username ? ` · ${m.username}` : ''}
                </p>
                <p className="text-sm">
                  <span className="text-gray-600">{m.from_location || '—'}</span>
                  <span className="mx-1 text-gray-400">→</span>
                  <span className="font-medium">{m.to_location || '—'}</span>
                </p>
                {m.reason && <p className="text-xs text-gray-500 italic">{m.reason}</p>}
              </li>
            ))}
          </ol>
        )}

        <p className="text-xs text-gray-400 mt-4">
          Added on {new Date(item.created_at).toLocaleString()}
        </p>

        <div className="flex justify-end mt-4">
          <button type="button" onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}

export default ItemHistoryModal;
