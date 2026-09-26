import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, within } from '@testing-library/react';
import TvScheduleControls from './TvScheduleControls';

describe('TV schedule controls', () => {
  it('offers every cycle but only dates in the selected cycle, without calendar navigation', () => {
    const onCycleChange = jest.fn();
    const onDateChange = jest.fn();
    render(<TvScheduleControls
      schedules={[
        { date: '2026-10-01', cycleName: 'A', dayLabel: '', events: [] },
        { date: '2026-10-02', cycleName: 'A', dayLabel: '', events: [] },
        { date: '2026-11-01', cycleName: 'B', dayLabel: '', events: [] }
      ]}
      cycle="A" date="2026-10-01" onCycleChange={onCycleChange} onDateChange={onDateChange}
      settings={<button>Settings</button>}
    />);
    expect(within(screen.getByLabelText('Cycle')).getAllByRole('option')).toHaveLength(3);
    expect(within(screen.getByLabelText('Date')).getAllByRole('option')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Cycle'), { target: { value: 'B' } });
    expect(onCycleChange).toHaveBeenCalledWith('B');
    fireEvent.change(screen.getByLabelText('Cycle'), { target: { value: '__AUTO_CYCLE__' } });
    expect(onCycleChange).toHaveBeenCalledWith(null);
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-02' } });
    expect(onDateChange).toHaveBeenCalledWith('2026-10-02');
    expect(screen.queryByRole('button', { name: /calendar/i })).toBeNull();
  });
});
