import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminActivityDialog } from './AdminActivityDialog';

describe('Activity compatibility metadata (CU53)', () => {
  it('saves per-person prices, availability and group bounds explicitly', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AdminActivityDialog activity={null} categories={[]} places={[]} saving={false} error={null} onClose={vi.fn()} onSave={onSave} />);
    await user.type(screen.getByLabelText('Nombre'), 'Museum');
    await user.type(screen.getByLabelText('Descripción'), 'A guided visit');
    await user.selectOptions(screen.getByLabelText('Tipo de precio'), 'FIXED');
    await user.type(screen.getByLabelText('Monto (ARS)'), '100');
    await user.type(screen.getByLabelText('Duración en minutos'), '60');
    await user.type(screen.getByLabelText('Mínimo de personas (opcional)'), '2');
    await user.type(screen.getByLabelText('Máximo de personas (opcional)'), '8');
    await user.click(screen.getByRole('checkbox', { name: 'Mañana' }));
    await user.click(screen.getByRole('button', { name: /crear|guardar/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ costBasis: 'per_person', availableTimesOfDay: ['morning'], minPeople: 2, maxPeople: 8 }));
  });
});
