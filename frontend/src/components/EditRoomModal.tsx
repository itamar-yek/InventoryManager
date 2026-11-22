/**
 * Edit Room Modal
 *
 * Change a room's name, building, size, notes and shape after it was created.
 * (The door is still placed by dragging it on the room layout.)
 */
import { useState } from 'react';
import { roomsApi, apiErrorMessage } from '../services/api';
import LShapeEditor from './LShapeEditor';
import type { RoomWithUnits, RoomUpdate } from '../types';
import { footprint } from './RoomCanvas';

interface EditRoomModalProps {
  room: RoomWithUnits;
  onClose: () => void;
  /** Called after a successful save */
  onSaved: () => void;
}

function EditRoomModal({ room, onClose, onSaved }: EditRoomModalProps) {
  const [data, setData] = useState<RoomUpdate>({
    name: room.name,
    building: room.building || '',
    width: room.width || 10,
    height: room.height || 10,
    notes: room.notes || '',
    shape: room.shape || 'rectangle',
    shape_cutout_width: room.shape_cutout_width,
    shape_cutout_height: room.shape_cutout_height,
    shape_cutout_corner: room.shape_cutout_corner,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const width = data.width || 10;
  const height = data.height || 10;

  // Units/blocks that would end up (partly) outside the new outer size
  const outside = [...room.storage_units, ...(room.blocks || [])].filter((e) => {
    const f = footprint(e.x, e.y, e.width, e.height, e.rotation);
    return f.x + f.w > width + 1e-6 || f.y + f.h > height + 1e-6;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const payload: RoomUpdate = {
      ...data,
      name: (data.name || '').trim(),
      building: data.building?.trim() || null,
      notes: data.notes?.trim() || null,
    };
    if (payload.shape !== 'l_shape') {
      payload.shape_cutout_width = null;
      payload.shape_cutout_height = null;
      payload.shape_cutout_corner = null;
    }
    try {
      await roomsApi.update(room.id, payload);
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the room. Please check the values.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Edit Room</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="editRoomName" className="label">Name *</label>
            <input
              id="editRoomName"
              type="text"
              value={data.name || ''}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              className="input"
              required
              maxLength={100}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="editRoomBuilding" className="label">Building</label>
            <input
              id="editRoomBuilding"
              type="text"
              value={data.building || ''}
              onChange={(e) => setData({ ...data, building: e.target.value })}
              className="input"
              maxLength={100}
            />
          </div>

          {/* Shape */}
          <div>
            <label className="label mb-2">Room Shape</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setData({ ...data, shape: 'rectangle' })}
                className={`px-4 py-2 rounded-lg border-2 text-sm ${
                  data.shape !== 'l_shape' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200'
                }`}
              >
                Rectangle
              </button>
              <button
                type="button"
                onClick={() => setData({
                  ...data,
                  shape: 'l_shape',
                  shape_cutout_corner: data.shape_cutout_corner || 'bottom_right',
                  shape_cutout_width: data.shape_cutout_width || Math.floor(width * 0.4),
                  shape_cutout_height: data.shape_cutout_height || Math.floor(height * 0.4),
                })}
                className={`px-4 py-2 rounded-lg border-2 text-sm ${
                  data.shape === 'l_shape' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200'
                }`}
              >
                L-Shape
              </button>
            </div>
          </div>

          {data.shape === 'l_shape' ? (
            <LShapeEditor
              totalWidth={width}
              totalHeight={height}
              cutoutCorner={data.shape_cutout_corner || null}
              cutoutWidth={data.shape_cutout_width || null}
              cutoutHeight={data.shape_cutout_height || null}
              onChange={(d) => setData({
                ...data,
                width: d.width,
                height: d.height,
                shape_cutout_corner: d.shape_cutout_corner,
                shape_cutout_width: d.shape_cutout_width,
                shape_cutout_height: d.shape_cutout_height,
              })}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="editRoomWidth" className="label">Width (m)</label>
                <input
                  id="editRoomWidth"
                  type="number"
                  min="0.5"
                  step="0.1"
                  value={data.width ?? ''}
                  onChange={(e) => setData({ ...data, width: Number(e.target.value) })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label htmlFor="editRoomHeight" className="label">Height (m)</label>
                <input
                  id="editRoomHeight"
                  type="number"
                  min="0.5"
                  step="0.1"
                  value={data.height ?? ''}
                  onChange={(e) => setData({ ...data, height: Number(e.target.value) })}
                  className="input"
                  required
                />
              </div>
            </div>
          )}

          {outside.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
              With this size, {outside.length} unit(s)/block(s) would be outside the room
              ({outside.map((e) => e.label).join(', ')}). You can still save and drag them back inside afterwards.
            </div>
          )}

          <div>
            <label htmlFor="editRoomNotes" className="label">Notes</label>
            <textarea
              id="editRoomNotes"
              value={data.notes || ''}
              onChange={(e) => setData({ ...data, notes: e.target.value })}
              className="input"
              rows={3}
            />
          </div>

          <p className="text-xs text-gray-500">The door is moved by dragging it on the room layout.</p>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditRoomModal;
