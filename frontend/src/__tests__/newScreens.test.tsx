import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../services/api', () => ({
  itemsApi: { getHistory: vi.fn() },
  compartmentsApi: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  roomsApi: { update: vi.fn() },
  apiErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

import { itemsApi, compartmentsApi } from '../services/api';
import ItemHistoryModal from '../components/ItemHistoryModal';
import CompartmentsPanel from '../components/CompartmentsPanel';

describe('ItemHistoryModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows readable moves, who moved and why', async () => {
    vi.mocked(itemsApi.getHistory).mockResolvedValue([
      {
        id: 'm1', item_id: 'i1', user_id: 'u1', from_storage_unit_id: 'a', from_compartment_id: null,
        to_storage_unit_id: null, to_compartment_id: 'c', reason: 'into drawer',
        created_at: '2026-01-01T10:00:00Z', username: 'dana',
        from_location: 'Lab > Cabinet', to_location: 'Lab > Cabinet > Drawer 1',
      },
    ]);
    render(<ItemHistoryModal item={{ id: 'i1', name: 'Scope', created_at: '2025-12-01T10:00:00Z' }} onClose={() => {}} />);
    expect(await screen.findByText('Lab > Cabinet > Drawer 1')).toBeInTheDocument();
    expect(screen.getByText('Lab > Cabinet')).toBeInTheDocument();
    expect(screen.getByText('into drawer')).toBeInTheDocument();
    expect(screen.getByText(/dana/)).toBeInTheDocument();
  });

  it('says so when the item was never moved', async () => {
    vi.mocked(itemsApi.getHistory).mockResolvedValue([]);
    render(<ItemHistoryModal item={{ id: 'i1', name: 'Scope', created_at: '2025-12-01T10:00:00Z' }} onClose={() => {}} />);
    expect(await screen.findByText(/has not been moved/)).toBeInTheDocument();
  });
});

describe('CompartmentsPanel', () => {
  const compartments = [
    { id: 'c1', storage_unit_id: 'u1', name: 'Drawer 1', index_order: 0, created_at: '', updated_at: '' },
  ];
  const items = [{ id: 'i1', compartment_id: 'c1' }, { id: 'i2', compartment_id: null }] as never[];

  beforeEach(() => vi.clearAllMocks());

  it('lists compartments with item counts', () => {
    render(<CompartmentsPanel unitId="u1" compartments={compartments} items={items} canEdit canDelete onChanged={() => {}} />);
    expect(screen.getByText('Compartments (1)')).toBeInTheDocument();
    expect(screen.getByText('(1 item)')).toBeInTheDocument();
  });

  it('adds a compartment with the next order number', async () => {
    vi.mocked(compartmentsApi.create).mockResolvedValue({} as never);
    const onChanged = vi.fn();
    render(<CompartmentsPanel unitId="u1" compartments={compartments} items={[]} canEdit canDelete={false} onChanged={onChanged} />);
    fireEvent.change(screen.getByLabelText('New compartment name'), { target: { value: 'Drawer 2' } });
    fireEvent.click(screen.getByText('Add'));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(compartmentsApi.create).toHaveBeenCalledWith({ storage_unit_id: 'u1', name: 'Drawer 2', index_order: 1 });
  });

  it('hides Delete for non-admins and editing for viewers', () => {
    const { rerender } = render(
      <CompartmentsPanel unitId="u1" compartments={compartments} items={[]} canEdit canDelete={false} onChanged={() => {}} />
    );
    expect(screen.queryByText('Delete')).toBeNull();
    expect(screen.getByText('Rename')).toBeInTheDocument();
    rerender(<CompartmentsPanel unitId="u1" compartments={compartments} items={[]} canEdit={false} canDelete={false} onChanged={() => {}} />);
    expect(screen.queryByText('Rename')).toBeNull();
    expect(screen.queryByLabelText('New compartment name')).toBeNull();
  });
});
