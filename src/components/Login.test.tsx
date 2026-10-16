import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Login from './Login';

describe('Login access-code visibility', () => {
  it('unlocks the form after a rejected login and allows retry', async () => {
    const onLogin = jest.fn(async () => { throw new Error('Unavailable'); });
    render(<Login onLogin={onLogin} />);
    fireEvent.change(screen.getByPlaceholderText('Enter Access Code'), { target: { value: 'test-input' } });
    fireEvent.click(screen.getByRole('button', { name: 'ENTER' }));
    await screen.findByRole('alert');
    expect((screen.getByRole('button', { name: 'ENTER' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByPlaceholderText('Enter Access Code') as HTMLInputElement).value).toBe('test-input');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'ENTER' })); });
    expect(onLogin).toHaveBeenCalledTimes(2);
  });

  it('submits only once while a login is pending', async () => {
    let finish!: (value: boolean) => void;
    const onLogin = jest.fn(() => new Promise<boolean>(resolve => { finish = resolve; }));
    render(<Login onLogin={onLogin} />);
    const input = screen.getByPlaceholderText('Enter Access Code');
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onLogin).toHaveBeenCalledTimes(1);
    await act(async () => { finish(true); });
  });
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
