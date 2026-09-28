import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ScheduleImportModal, { selectPdfBackgroundColor } from './ScheduleImportModal';

jest.mock('tesseract.js', () => ({ createWorker: () => undefined }));
jest.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  OPS: {}
}));

describe('ScheduleImportModal KTA preview', () => {
  it('does not let an adjacent gray cell override the actual green event cell', () => {
    expect(selectPdfBackgroundColor([
      { x1: 428.2, x2: 491.6, y1: 549.1, y2: 554.5, color: '#a6a6a6' },
      { x1: 428.2, x2: 491.6, y1: 554.4, y2: 559.8, color: '#92d050' }
    ], 438.5, 554.9)).toBe('#92d050');
  });

  it('keeps the merged ALL HANDS value on every event from RSOI through roll call', async () => {
    const { container } = render(
      <ScheduleImportModal
        academy="KTA"
        onClose={() => undefined}
        onImport={() => undefined}
        locations={['ACA', 'MPR', 'TBD']}
        uniforms={['UNASSIGNED']}
      />
    );

    const extractedText = [
      'DAY 0',
      '0800-1200 MPR SET UP MPR [[KTA_DUTY_NCO=DESCARGAR]]',
      '1200-1900 RSOI [[KTA_DUTY_NCO=ALL]]',
      '1900-1900 CHIEF/SENIOR BRIEF (NLT) [[KTA_DUTY_NCO=ALL]]',
      '1900-1930 ROOM CHECK [[KTA_DUTY_NCO=ALL]]',
      '1930-1940 HYGIENE [[KTA_DUTY_NCO=ALL]]',
      '1940-2000 ROLL CALL - L/O [[KTA_DUTY_NCO=ALL]]',
      'NOTES: MPR setup the morning of pickup',
      'NOTES: DTY SEC: BRAVO'
    ].join('\n');

    fireEvent.change(container.querySelector('textarea') as HTMLTextAreaElement, {
      target: { value: extractedText }
    });

    await waitFor(() => expect(screen.queryByText('RSOI')).not.toBeNull());
    for (const eventName of ['RSOI', 'CHIEF/SENIOR BRIEF', 'ROOM CHECK', 'HYGIENE', 'ROLL CALL - L/O']) {
      const eventRow = screen.getByText(eventName).closest('div.flex.items-center');
      expect(eventRow).not.toBeNull();
      expect(within(eventRow as HTMLElement).queryByText('ALL')).not.toBeNull();
    }
    const mprRow = screen.getByText('MPR SET UP').closest('div.flex.items-center');
    expect(within(mprRow as HTMLElement).queryByText('DESCARGAR')).not.toBeNull();
    const notesPanel = Array.from(container.querySelectorAll('div')).find(element =>
      element.className.includes('whitespace-pre-wrap') &&
      element.textContent?.includes('DTY SEC: BRAVO') &&
      element.textContent?.includes('MPR setup the morning of pickup')
    );
    expect(notesPanel?.textContent?.indexOf('DTY SEC: BRAVO')).toBeLessThan(
      notesPanel?.textContent?.indexOf('MPR setup the morning of pickup') ?? -1
    );
  });
});
