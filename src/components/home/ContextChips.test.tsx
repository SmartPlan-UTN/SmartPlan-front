import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PlanRequestContext } from '@/types';
import { ContextChips } from './ContextChips';

function Harness() {
  const [value, setValue] = useState<PlanRequestContext>({ budget: 5000 });
  return <><ContextChips value={value} onChange={setValue} /><output aria-label="Contexto de búsqueda">{JSON.stringify(value)}</output></>;
}

afterEach(() => vi.unstubAllGlobals());

describe('Generation constraints (CU17)', () => {
  it('sends duration and radius only when explicitly selected and preserves budget', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Duración' }));
    await user.type(screen.getByLabelText('Tiempo total disponible (minutos)'), '90');
    await user.click(screen.getByRole('button', { name: 'Distancia' }));
    await user.type(screen.getByLabelText('Distancia máxima (km)'), '5');
    expect(JSON.parse(screen.getByLabelText('Contexto de búsqueda').textContent ?? '{}')).toMatchObject({ budget: 5000, availableDuration: 90, maxDistanceKm: 5 });
  });

  it('selects walking without changing the other constraints', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Traslados' }));
    await user.click(screen.getByRole('option', { name: 'Caminando' }));
    expect(JSON.parse(screen.getByLabelText('Contexto de búsqueda').textContent ?? '{}')).toEqual({ budget: 5000, travelMode: 'walk' });
  });

  it('requests device location only after the user asks for it', async () => {
    const locate = vi.fn((success: PositionCallback) => success({ coords: { latitude: -32.9, longitude: -68.8 }, timestamp: Date.now() } as GeolocationPosition));
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: locate } });
    const user = userEvent.setup();
    render(<Harness />);
    expect(locate).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    expect(JSON.parse(screen.getByLabelText('Contexto de búsqueda').textContent ?? '{}')).toMatchObject({ budget: 5000, latitude: -32.9, longitude: -68.8 });
    await user.click(screen.getByRole('button', { name: 'Ubicación actual' }));
    expect(JSON.parse(screen.getByLabelText('Contexto de búsqueda').textContent ?? '{}')).toEqual({ budget: 5000 });
  });

  it('toggles "En casa" and "Gratis" as atHome and freeOnly (#210)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const read = () => JSON.parse(screen.getByLabelText('Contexto de búsqueda').textContent ?? '{}');
    await user.click(screen.getByRole('button', { name: 'En casa' }));
    await user.click(screen.getByRole('button', { name: 'Gratis' }));
    expect(read()).toEqual({ budget: 5000, atHome: true, freeOnly: true });
    expect(screen.getByRole('button', { name: 'En casa' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'En casa' }));
    expect(read()).toEqual({ budget: 5000, freeOnly: true });
  });
});
