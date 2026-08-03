import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button, EmptyState, Modal, Pagination, StatusBadge } from '.';

describe('shared UI components', () => {
  it('represents a status with readable text and an icon', () => {
    const { container } = render(<StatusBadge status="InTransit" />);
    expect(screen.getByText('In Transit')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('disables a loading button', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('closes a modal with Escape', async () => {
    const onClose = vi.fn();
    render(<Modal open title="Confirmation" onClose={onClose}>Content</Modal>);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('moves pagination forward', async () => {
    const change = vi.fn();
    render(<Pagination page={1} pageSize={5} total={12} onPageChange={change} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(change).toHaveBeenCalledWith(2);
  });

  it('exposes empty-state content', () => {
    render(<EmptyState title="Nothing here" description="Create the first item." />);
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument();
  });
});
