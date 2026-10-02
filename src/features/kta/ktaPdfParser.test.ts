import { describe, expect, it } from '@jest/globals';
import { extractKtaCalendarText, PositionedPdfText } from './ktaPdfParser';

describe('extractKtaCalendarText', () => {
  it('matches each date with the nearest DAY label regardless of PDF item order', () => {
    const items: PositionedPdfText[] = [
      { str: '05-Apr-26', x: 648, y: 574 },
      { str: 'DAY 3', x: 705, y: 574 },
      { str: 'DAY 2', x: 600, y: 574 },
      { str: '04-Apr-26', x: 542, y: 574 },
      { str: 'DTY NCO', x: 550, y: 560 },
      { str: 'HUGHES', x: 575, y: 560 },
      { str: 'SPARTAN', x: 550, y: 540 },
      { str: '1030-1145', x: 590, y: 540 }
    ];

    const result = extractKtaCalendarText(items);
    expect(result).toMatch(/DAY 2\n[\s\S]*1030-1145 SPARTAN/);
  });

  it('extracts independent day columns from a KTA calendar text layer', () => {
    const items: PositionedPdfText[] = [
      { str: '05-Mar-26', x: 100, y: 700 },
      { str: 'DAY 0', x: 180, y: 700 },
      { str: '06-Mar-26', x: 300, y: 700 },
      { str: 'DAY 1', x: 380, y: 700 },
      { str: 'DTY NCO', x: 105, y: 680 },
      { str: 'KIM', x: 155, y: 680 },
      { str: 'WHENMAN', x: 205, y: 680 },
      { str: 'NONSAN PICKUP', x: 105, y: 650 },
      { str: '0650-0700', x: 180, y: 650 },
      { str: 'PRT/PD/ASSESSMENT', x: 305, y: 650 },
      { str: '0500-0600', x: 400, y: 650 },
      { str: 'WTT RM: 1165', x: 305, y: 620 },
      { str: '0825-1600', x: 400, y: 620 },
      { str: 'WTT RM: 1157', x: 305, y: 610 },
      { str: '0825-1600', x: 400, y: 610 },
      { str: 'CHIEF/SENIOR BRIEF', x: 105, y: 600 },
      { str: 'NLT 1900', x: 180, y: 600 },
      { str: 'ROOM CHECK', x: 105, y: 590 },
      { str: '1900-1930', x: 180, y: 590 },
      { str: 'ALL HANDS', x: 240, y: 590 },
      { str: 'AAR', x: 305, y: 580 },
      { str: '1300-UTC', x: 400, y: 580 }
    ];

    const result = extractKtaCalendarText(items);
    expect(result).toContain('DAY 0');
    expect(result).toContain('0650-0700 NONSAN PICKUP');
    expect(result).toContain('DAY 1');
    expect(result).toContain('0500-0600 PRT/PD/ASSESSMENT');
    expect(result).toContain('0825-1600 WTT RM: 1165 RM 1165');
    expect(result).toContain('0825-1600 WTT RM: 1157 RM 1157');
    expect(result).toContain('1900-1900 CHIEF/SENIOR BRIEF (NLT)');
    expect(result).toContain('CHIEF/SENIOR BRIEF (NLT) [[KTA_DUTY_NCO=KIM%20%2F%20WHENMAN]]');
    expect(result).toContain('1900-1930 ROOM CHECK [[KTA_DUTY_NCO=ALL]]');
    expect(result).toContain('1300-UTC AAR');
  });

  it('keeps parallel events and maps KTA cell colors to locations', () => {
    const items: PositionedPdfText[] = [
      { str: '05-Mar-26', x: 100, y: 700 },
      { str: 'DAY 0', x: 180, y: 700 },
      { str: 'CI BRIEF', x: 105, y: 650, backgroundColor: '#ffc000' },
      { str: '1300-1400', x: 180, y: 650 },
      { str: 'MPR SET UP', x: 105, y: 640, backgroundColor: '#92d050' },
      { str: '1300-1400', x: 180, y: 640 },
      { str: 'ELT TRAINING', x: 105, y: 630 },
      { str: '0825-1600', x: 180, y: 630 },
      { str: 'ALPHA', x: 230, y: 630 },
      { str: 'ELT TRAINING', x: 105, y: 620 },
      { str: '0825-1600', x: 180, y: 620 },
      { str: 'BRAVO', x: 230, y: 620 }
    ];

    const result = extractKtaCalendarText(items);
    expect(result).toContain('1300-1400 CI BRIEF AUD');
    expect(result).toContain('1300-1400 MPR SET UP MPR');
    expect(result).toContain('0825-1600 ELT TRAINING [ALPHA]');
    expect(result).toContain('0825-1600 ELT TRAINING [BRAVO]');
  });

  it('applies KTA pickup, white-cell, chow, and mermite rules', () => {
    const items: PositionedPdfText[] = [
      { str: '05-Mar-26', x: 100, y: 700 },
      { str: 'DAY 0', x: 180, y: 700 },
      { str: 'NONSAN PICKUP', x: 105, y: 660, backgroundColor: '#ffffff' },
      { str: 'SPOT: 0650 / PULL 0700', x: 170, y: 660 },
      { str: 'ROOM CHECK', x: 105, y: 650, backgroundColor: '#ffffff' },
      { str: '1900-1930', x: 180, y: 650 },
      { str: 'A-SPARTAN', x: 105, y: 640, backgroundColor: '#a6a6a6' },
      { str: '0630-0745', x: 180, y: 640 },
      { str: 'MEDICATION', x: 105, y: 630, backgroundColor: '#a6a6a6' },
      { str: '0745-0800', x: 180, y: 630 }
    ];

    const result = extractKtaCalendarText(items);
    expect(result).toContain('0650-0700 NONSAN PICKUP ACA');
    expect(result).not.toContain('SPOT');
    expect(result).toContain('1900-1930 ROOM CHECK ACA');
    expect(result).toContain('0630-0745 SPARTAN (MERMITES) ACA');
    expect(result).toContain('0745-0800 MEDICATION DFC');
  });

  it('extracts KTA notes even when a neighboring cell shares the PDF row', () => {
    const items: PositionedPdfText[] = [
      { str: '05-Mar-26', x: 100, y: 700 },
      { str: 'DAY 0', x: 180, y: 700 },
      { str: 'CLEAN ROOMS 1500-1600 NOTES: MPR setup the morning of pickup DTY SEC: BRAVO', x: 105, y: 650 },
      { str: 'Bring setup roster 0900-1000.', x: 105, y: 640 }
    ];

    const result = extractKtaCalendarText(items);
    expect(result).toContain('NOTES: MPR setup the morning of pickup');
    expect(result).toContain('NOTES: Bring setup roster 0900-1000.');
    expect(result).not.toContain('NOTES: MPR setup the morning of pickup DTY SEC');
  });

  it('keeps notes whose label starts at the visual left edge of a KTA day cell', () => {
    const items: PositionedPdfText[] = [
      { str: '09-Mar-26', x: 100, y: 700 },
      { str: 'DAY 4', x: 180, y: 700 },
      { str: 'NOTES: SHORT POI - RSG CDR BRIEF', x: 89, y: 600 }
    ];

    expect(extractKtaCalendarText(items)).toContain('NOTES: SHORT POI - RSG CDR BRIEF');
  });

  it('propagates a merged ALL HANDS duty cell across adjacent event rows', () => {
    const items: PositionedPdfText[] = [
      { str: '05-Mar-26', x: 100, y: 700 },
      { str: 'DAY 0', x: 180, y: 700 },
      { str: 'DTY NCO', x: 105, y: 680 },
      { str: 'KIM', x: 155, y: 680 },
      { str: 'WHENMAN', x: 205, y: 680 },
      { str: 'BRIEF A', x: 105, y: 650 },
      { str: '1200-1230', x: 180, y: 650 },
      { str: 'BRIEF B', x: 105, y: 645 },
      { str: '1230-1300', x: 180, y: 645 },
      { str: 'ALL HANDS', x: 240, y: 645, dutyCellTop: 665, dutyCellBottom: 638 },
      { str: 'BRIEF C', x: 105, y: 640 },
      { str: '1300-1330', x: 180, y: 640 },
      { str: 'MEDICATION', x: 105, y: 630 },
      { str: '1330-1400', x: 180, y: 630 },
      { str: 'DUTY NCOs', x: 240, y: 630 },
      { str: 'HYGIENE', x: 105, y: 625 },
      { str: '1400-1430', x: 180, y: 625 }
    ];

    const result = extractKtaCalendarText(items);
    expect(result).toContain('1200-1230 BRIEF A [[KTA_DUTY_NCO=ALL]]');
    expect(result).toContain('1230-1300 BRIEF B [[KTA_DUTY_NCO=ALL]]');
    expect(result).toContain('1300-1330 BRIEF C [[KTA_DUTY_NCO=ALL]]');
    expect(result).toContain('1330-1400 MEDICATION [[KTA_DUTY_NCO=KIM%20%2F%20WHENMAN]]');
    expect(result).toContain('1400-1430 HYGIENE [[KTA_DUTY_NCO=KIM%20%2F%20WHENMAN]]');
  });

  it('uses explicit duty as a boundary and applies ALL HANDS from RSOI through roll call', () => {
    const items: PositionedPdfText[] = [
      { str: '05-Mar-26', x: 100, y: 700 },
      { str: 'DAY 0', x: 180, y: 700 },
      { str: 'DTY NCO', x: 105, y: 680 },
      { str: 'KIM', x: 155, y: 680 },
      { str: 'WHENMAN', x: 205, y: 680 },
      { str: 'MPR SET UP', x: 105, y: 650 },
      { str: '0800-1200', x: 180, y: 650 },
      { str: 'DESCARGAR', x: 240, y: 650 },
      { str: 'N/A', x: 270, y: 650 },
      { str: 'RSOI', x: 105, y: 645 },
      { str: '1200-1900', x: 180, y: 645 },
      { str: 'CHIEF/SENIOR BRIEF', x: 105, y: 640 },
      { str: 'NLT 1900', x: 180, y: 640 },
      { str: 'ROOM CHECK', x: 105, y: 635 },
      { str: '1900-1930', x: 180, y: 635 },
      { str: 'ALL ALL', x: 240, y: 635 },
      { str: 'HYGIENE', x: 105, y: 630 },
      { str: '1930-1940', x: 180, y: 630 },
      { str: 'ROLL CALL - L/O', x: 105, y: 625 },
      { str: '1940-2000', x: 180, y: 625 }
    ];

    const result = extractKtaCalendarText(items);
    expect(result).toContain('0800-1200 MPR SET UP MPR [[KTA_DUTY_NCO=DESCARGAR]]');
    expect(result).toContain('1200-1900 RSOI [[KTA_DUTY_NCO=ALL]]');
    expect(result).toContain('CHIEF/SENIOR BRIEF (NLT) [[KTA_DUTY_NCO=ALL]]');
    expect(result).toContain('1900-1930 ROOM CHECK [[KTA_DUTY_NCO=ALL]]');
    expect(result).toContain('1930-1940 HYGIENE [[KTA_DUTY_NCO=ALL]]');
    expect(result).toContain('1940-2000 ROLL CALL - L/O [[KTA_DUTY_NCO=ALL]]');
  });

  it('applies DAY 1 ALL from the first SPARTAN through the final SPARTAN only', () => {
    const items: PositionedPdfText[] = [
      { str: '06-Mar-26', x: 100, y: 700 },
      { str: 'DAY 1', x: 180, y: 700 },
      { str: 'DTY NCO', x: 105, y: 680 },
      { str: 'LEE', x: 155, y: 680 },
      { str: 'PALLAN', x: 205, y: 680 },
      { str: 'PRT/PD/ASSESSMENT', x: 105, y: 665, backgroundColor: '#92d050' },
      { str: '0500-0600', x: 180, y: 665 },
      { str: 'ALL HANDS', x: 240, y: 665 },
      { str: 'DNC TRAINING', x: 105, y: 660, backgroundColor: '#92d050' },
      { str: '0600-0630', x: 180, y: 660 },
      { str: 'ALL', x: 240, y: 660 },
      { str: 'A-SPARTAN', x: 105, y: 655 },
      { str: '0630-0745', x: 180, y: 655 },
      { str: 'MEDICATION', x: 105, y: 650 },
      { str: '0745-0800', x: 180, y: 650 },
      { str: 'PC FOR SEWING', x: 105, y: 645 },
      { str: '1145-1230', x: 180, y: 645 },
      { str: 'ALL HANDS', x: 240, y: 645, dutyCellTop: 665, dutyCellBottom: 638 },
      { str: 'SPARTAN', x: 105, y: 640 },
      { str: '1600-1710', x: 180, y: 640 },
      { str: 'MEDICATION', x: 105, y: 635 },
      { str: '1710-1725', x: 180, y: 635 },
      { str: 'ROLL CALL - L/O', x: 105, y: 630 },
      { str: '1940-2000', x: 180, y: 630 }
    ];

    const result = extractKtaCalendarText(items);
    expect(result).toContain('0500-0600 PRT/PD/ASSESSMENT MPR [[KTA_DUTY_NCO=ALL]]');
    expect(result).toContain('0600-0630 DNC TRAINING MPR [[KTA_DUTY_NCO=ALL]]');
    expect(result).toContain('0630-0745 SPARTAN (MERMITES) ACA [[KTA_DUTY_NCO=ALL]]');
    expect(result).toContain('0745-0800 MEDICATION [[KTA_DUTY_NCO=ALL]]');
    expect(result).toContain('1145-1230 PC FOR SEWING [[KTA_DUTY_NCO=ALL]]');
    expect(result).toContain('1600-1710 SPARTAN [[KTA_DUTY_NCO=ALL]]');
    expect(result).toContain('1710-1725 MEDICATION [[KTA_DUTY_NCO=LEE%20%2F%20PALLAN]]');
    expect(result).toContain('1940-2000 ROLL CALL - L/O [[KTA_DUTY_NCO=LEE%20%2F%20PALLAN]]');
  });

  it('uses a PDF merged ALL cell on DAY 2 instead of event-name exceptions', () => {
    const items: PositionedPdfText[] = [
      { str: '07-Mar-26', x: 100, y: 700 },
      { str: 'DAY 2', x: 180, y: 700 },
      { str: 'DTY NCO', x: 105, y: 680 },
      { str: 'HUGHES', x: 155, y: 680 },
      { str: 'GONZALEZ', x: 205, y: 680 },
      { str: 'DNC TRAINING', x: 105, y: 665 },
      { str: '0600-0630', x: 180, y: 665 },
      { str: 'A-SPARTAN', x: 105, y: 655 },
      { str: '0630-0745', x: 180, y: 655 },
      { str: 'ALL', x: 240, y: 650, dutyCellTop: 660, dutyCellBottom: 642 },
      { str: 'MEDICATION', x: 105, y: 645 },
      { str: '0745-0800', x: 180, y: 645 },
      { str: 'ALCPT', x: 105, y: 635 },
      { str: '0800-1030', x: 180, y: 635 }
    ];

    const result = extractKtaCalendarText(items);
    expect(result).toContain('0600-0630 DNC TRAINING [[KTA_DUTY_NCO=HUGHES%20%2F%20GONZALEZ]]');
    expect(result).toContain('0630-0745 SPARTAN (MERMITES) ACA [[KTA_DUTY_NCO=ALL]]');
    expect(result).toContain('0745-0800 MEDICATION [[KTA_DUTY_NCO=ALL]]');
    expect(result).toContain('0800-1030 ALCPT [[KTA_DUTY_NCO=HUGHES%20%2F%20GONZALEZ]]');
  });

  it('preserves separate NCO name cells with a slash', () => {
    const items: PositionedPdfText[] = [
      { str: '07-Mar-26', x: 100, y: 700 },
      { str: 'DAY 2', x: 180, y: 700 },
      { str: 'DTY NCO', x: 105, y: 680 },
      { str: 'HUGHES', x: 155, y: 680 },
      { str: 'GONZALEZ', x: 205, y: 680 },
      { str: 'HSD/CD1/CD2', x: 105, y: 650 },
      { str: '0800-1030', x: 180, y: 650 },
      { str: 'KOSTIK', x: 240, y: 650 },
      { str: 'KIM', x: 275, y: 650 },
      { str: 'WTT', x: 105, y: 640 },
      { str: '1030-1145', x: 180, y: 640 },
      { str: 'LEE MK', x: 240, y: 640 }
    ];

    const result = extractKtaCalendarText(items);
    expect(result).toContain('0800-1030 HSD/CD1/CD2 [[KTA_DUTY_NCO=KOSTIK%20%2F%20KIM]]');
    expect(result).toContain('1030-1145 WTT [[KTA_DUTY_NCO=LEE%20MK]]');
  });

  it('joins consecutive ALL cells and stops at the next DUTY NCOs block', () => {
    const items: PositionedPdfText[] = [
      { str: '07-Mar-26', x: 100, y: 700 },
      { str: 'DAY 2', x: 180, y: 700 },
      { str: 'DTY NCO', x: 105, y: 680 },
      { str: 'HUGHES', x: 155, y: 680 },
      { str: 'GONZALEZ', x: 205, y: 680 },
      { str: 'A-SPARTAN', x: 105, y: 655 },
      { str: '0630-0745', x: 180, y: 655 },
      { str: 'ALL HANDS', x: 240, y: 650, dutyCellTop: 660, dutyCellBottom: 642 },
      { str: 'MEDICATION', x: 105, y: 645 },
      { str: '0745-0800', x: 180, y: 645 },
      { str: 'SPARTAN', x: 105, y: 630 },
      { str: '1030-1145', x: 180, y: 630 },
      { str: 'ALL HANDS', x: 240, y: 625, dutyCellTop: 627, dutyCellBottom: 560 },
      { str: 'PHONE USE BRIEF', x: 105, y: 620 },
      { str: '1200-1300', x: 180, y: 620 },
      { str: 'PHONE CALLS', x: 105, y: 610 },
      { str: '1300-1500', x: 180, y: 610 },
      { str: 'DUTY NCOs', x: 240, y: 605 },
      { str: 'ROLL CALL - L/O', x: 105, y: 590 },
      { str: '1940-2000', x: 180, y: 590 }
    ];

    const result = extractKtaCalendarText(items);
    expect(result).toContain('0630-0745 SPARTAN (MERMITES) ACA [[KTA_DUTY_NCO=ALL]]');
    expect(result).toContain('0745-0800 MEDICATION [[KTA_DUTY_NCO=ALL]]');
    expect(result).toContain('1030-1145 SPARTAN [[KTA_DUTY_NCO=ALL]]');
    expect(result).toContain('1200-1300 PHONE USE BRIEF [[KTA_DUTY_NCO=ALL]]');
    expect(result).toContain('1300-1500 PHONE CALLS [[KTA_DUTY_NCO=HUGHES%20%2F%20GONZALEZ]]');
    expect(result).toContain('1940-2000 ROLL CALL - L/O [[KTA_DUTY_NCO=HUGHES%20%2F%20GONZALEZ]]');
  });
});
