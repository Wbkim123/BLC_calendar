import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import Login from './Login';

describe('Login access-code visibility', () => {
  it('keeps the code hidden by default and toggles visibility with the eye button', () => {
    render(<Login onLogin={jest.fn(async () => false)} />);

    const input = screen.getByPlaceholderText('Enter Access Code');
    expect((input as HTMLInputElement).type).toBe('password');

    fireEvent.click(screen.getByRole('button', { name: 'Show access code' }));
    expect((input as HTMLInputElement).type).toBe('text');

    fireEvent.click(screen.getByRole('button', { name: 'Hide access code' }));
    expect((input as HTMLInputElement).type).toBe('password');
  });
});
