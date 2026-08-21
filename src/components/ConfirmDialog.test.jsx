import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from '@/components/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders title and message', () => {
    render(
      <ConfirmDialog
        isOpen
        title="Eliminar tarea"
        message="Esta acción no se puede deshacer"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText('Eliminar tarea')).toBeInTheDocument();
    expect(screen.getByText('Esta acción no se puede deshacer')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ConfirmDialog isOpen={false} title="X" onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(screen.queryByText('X')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    let confirmed = false;
    render(
      <ConfirmDialog isOpen title="?" onConfirm={() => { confirmed = true; }} onCancel={() => {}} />
    );
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    expect(confirmed).toBe(true);
  });

  it('calls onCancel when cancel button is clicked', async () => {
    let cancelled = false;
    render(
      <ConfirmDialog isOpen title="?" onConfirm={() => {}} onCancel={() => { cancelled = true; }} />
    );
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(cancelled).toBe(true);
  });

  it('uses custom labels', () => {
    render(
      <ConfirmDialog
        isOpen
        title="?"
        confirmText="Sí, borrar"
        cancelText="No"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: 'Sí, borrar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument();
  });

  it('has dialog role and aria-modal', () => {
    render(<ConfirmDialog isOpen title="?" onConfirm={() => {}} onCancel={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
