import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProfileForm } from './ProfileForm';

describe('ProfileForm', () => {
  it('shows organization fields for donors and volunteer fields after changing role', async () => {
    render(<ProfileForm submitLabel="Continue" onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/Organization name/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /VolunteerMove food safely/ }));
    expect(screen.getByLabelText(/Full name/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Tax or registration ID/)).not.toBeInTheDocument();
  });

  it('reports required volunteer fields', async () => {
    render(<ProfileForm submitLabel="Continue" onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /VolunteerMove food safely/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Enter your full name.')).toBeInTheDocument();
    expect(screen.getByText('Describe when you are available.')).toBeInTheDocument();
  });
});
