export type PositionedPdfText = {
  str: string;
  x: number;
  y: number;
  isRed?: boolean;
  backgroundColor?: string;
  dutyCellTop?: number;
  dutyCellBottom?: number;
};

type DateCell = {
  item: PositionedPdfText;
  dayNumber: number;
};

const KTA_DATE = /^\d{2}-[A-Z]{3}-\d{2}$/i;
const NUMERIC_TIME_RANGE = /\b(\d{3,5})\s*[-–]\s*(\d{3,5})\b/;
const NLT_TIME = /\bNLT\s*:?[ ]*(\d{3,5})\b/i;
const UNTIL_COMPLETE_TIME = /\b(\d{3,5})\s*[-–]\s*UTC\b/i;
const SINGLE_TIME = /\b(\d{3,4})\b/;
const SPOT_PULL_TIME = /\bSPOT\s*:?\s*(\d{3,4})\s*\/\s*PULL\s*(\d{3,4})\b/i;

const LOCATION_BY_COLOR: Record<string, string> = {
  '#ffc000': 'AUD',
  '#92d050': 'MPR',
  '#a6a6a6': 'DFC',
  '#d9d9d9': 'DFC',
  '#00b0f0': 'PAO',
  '#ffffff': 'ACA'
};

const normalizeTime = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 3) return `0${digits}`;
  if (digits.length === 4) return digits;
  // A few source calendars contain five-digit typos such as 17410.
  if (digits.length === 5) return digits.slice(0, 2) + digits.slice(-2);
  return '';
};

const inferLocation = (eventName: string, backgroundColor?: string) => {
  const room = eventName.match(/\bRM\s*:?\s*(\d{3,4})\b/i);
  if (room) return `RM ${room[1]}`;
  if (/\bMPR\b/i.test(eventName)) return 'MPR';
  if (/\bAUD(?:ITORIUM)?\b/i.test(eventName)) return 'AUD';
  if (/\bFIELD\b/i.test(eventName)) return 'FLD';
  if (backgroundColor && LOCATION_BY_COLOR[backgroundColor.toLowerCase()]) {
    return LOCATION_BY_COLOR[backgroundColor.toLowerCase()];
  }
  return '';
};

const KTA_FOOTER_TEXT = /^(?:ON CALL SENIOR|NCOA STAFF DUTY|LEGEND|CYCLES?\b|WTTs?\b|DTY NCO\b|DUTY NCOs?\b)/i;

const normalizeDutyNco = (value: string) => {
  const cleaned = value
    .replace(/\bN\s*\/?\s*A\b/gi, '')
    .replace(/[|,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  if (/^(?:ALL(?:\s+HANDS)?\s*)+$/i.test(cleaned)) return 'ALL';

  const words = cleaned.split(' ');
  if (words.length % 2 === 0) {
    const middle = words.length / 2;
    if (words.slice(0, middle).join(' ').toUpperCase() === words.slice(middle).join(' ').toUpperCase()) {
      return words.slice(0, middle).join(' ');
    }
  }
  return words.filter((word, index) => index === 0 || word.toUpperCase() !== words[index - 1].toUpperCase()).join(' ');
};

const extractDayDutyNco = (rows: { items: PositionedPdfText[] }[]) => {
  for (const row of rows) {
    const rowItems = [...row.items].sort((a, b) => a.x - b.x);
    const markerIndex = rowItems.findIndex(item => /\bDTY\s+NCO\b/i.test(item.str));
    if (markerIndex >= 0) {
      const marker = rowItems[markerIndex];
      const inlineNames = marker.str.replace(/^.*?\bDTY\s+NCO\b\s*/i, '').trim();
      const followingNames = rowItems
        .slice(markerIndex + 1)
        .map(item => item.str.trim())
        .filter(Boolean)
        .filter(value => !/^(?:WTTs?|1ST|2ND|3RD|4TH)$/i.test(value));
      const names = [inlineNames, ...followingNames].filter(Boolean);
      if (names.length > 0) return normalizeDutyNco(Array.from(new Set(names)).join(' / '));
    }

    const text = rowItems.map(item => item.str).join(' ').replace(/\s+/g, ' ').trim();
    const match = text.match(/\bDTY\s+NCO\b\s+(.+)$/i);
    if (match?.[1]) return normalizeDutyNco(match[1]);
  }
  return 'UNASSIGNED';
};

const cleanExplicitDutyText = (value: string) => normalizeDutyNco(value
  .replace(/\b(?:ALPHA|BRAVO|1ST|2ND|3RD|4TH)\b/gi, '')
  .replace(/\b(?:ACA|MPR|DFC|AUD(?:ITORIUM)?|PAO|FIELD|FLD|RM\s*:?\s*\d{3,4})\b/gi, '')
  .replace(/\bDTY\s+SEC\s*:\s*\w+.*$/i, '')
  .replace(/\s+/g, ' ')
  .trim());

const getExplicitEventDutyNco = (
  beforeTime: string,
  afterTime: string,
  dayDutyNco: string,
  dutyFragments: string[] = []
) => {
  if (!beforeTime) return null;
  if (/\bALL(?:\s+HANDS)?(?:\s+ALL(?:\s+HANDS)?)?\b/i.test(afterTime)) return 'ALL';
  if (/\bDUTY\s+NCOS?\b/i.test(afterTime)) return dayDutyNco;

  const fragmentNames = dutyFragments
    .map(cleanExplicitDutyText)
    .filter(value => value && /[A-Z]/i.test(value));
  const explicit = fragmentNames.length > 0
    ? Array.from(new Set(fragmentNames)).join(' / ')
    : cleanExplicitDutyText(afterTime);
  if (explicit.replace(/[\s/]+/g, '').toUpperCase() === dayDutyNco.replace(/[\s/]+/g, '').toUpperCase()) {
    return dayDutyNco;
  }
  return explicit && /[A-Z]/i.test(explicit) ? explicit : null;
};

const extractDutyFragments = (rowItems: PositionedPdfText[]) => {
  const timeItemIndex = rowItems.findIndex(item => Boolean(findKtaTime(item.str)));
  if (timeItemIndex < 0) return [];
  const timeItem = rowItems[timeItemIndex];
  const time = findKtaTime(timeItem.str);
  const fragments: string[] = [];
  if (time) {
    const inlineTail = timeItem.str.slice(time.index + time.length).trim();
    if (inlineTail) fragments.push(inlineTail);
  }
  rowItems.slice(timeItemIndex + 1).forEach(item => {
    const value = item.str.trim();
    if (value) fragments.push(value);
  });
  return fragments;
};

const findKtaTime = (text: string) => {
  const spotPull = text.match(SPOT_PULL_TIME);
  if (spotPull?.index != null) {
    return {
      index: spotPull.index,
      length: spotPull[0].length,
      start: normalizeTime(spotPull[1]),
      end: normalizeTime(spotPull[2]),
      qualifier: '',
      displayEnd: undefined as string | undefined
    };
  }

  const range = text.match(NUMERIC_TIME_RANGE);
  if (range?.index != null) {
    return {
      index: range.index,
      length: range[0].length,
      start: normalizeTime(range[1]),
      end: normalizeTime(range[2]),
      qualifier: '',
      displayEnd: undefined as string | undefined
    };
  }

  const untilComplete = text.match(UNTIL_COMPLETE_TIME);
  if (untilComplete?.index != null) {
    return {
      index: untilComplete.index,
      length: untilComplete[0].length,
      start: normalizeTime(untilComplete[1]),
      // The source has no known end, so preserve UTC visually and use a
      // zero-length numeric range to avoid false conflicts with later events.
      end: normalizeTime(untilComplete[1]),
      qualifier: '',
      displayEnd: 'UTC'
    };
  }

  const noLaterThan = text.match(NLT_TIME);
  if (noLaterThan?.index != null) {
    const deadline = normalizeTime(noLaterThan[1]);
    return {
      index: noLaterThan.index,
      length: noLaterThan[0].length,
      start: deadline,
      end: deadline,
      qualifier: ' (NLT)',
      displayEnd: undefined as string | undefined
    };
  }

  const single = text.match(SINGLE_TIME);
  if (single?.index != null) {
    const point = normalizeTime(single[1]);
    return {
      index: single.index,
      length: single[0].length,
      start: point,
      end: point,
      qualifier: '',
      displayEnd: undefined as string | undefined
    };
  }

  return null;
};

/**
 * Converts a KTA calendar's coordinate-based text layer into the line format
 * consumed by the shared import preview. KTA calendars use seven date columns
 * and do not contain BLC's TIME/EVENT/LOC/UNI headers.
 */
export function extractKtaCalendarText(items: PositionedPdfText[]) {
  const dateItems = items.filter(item => KTA_DATE.test(item.str));
  if (dateItems.length === 0) return '';

  const cells: DateCell[] = dateItems.map(item => {
    const nearbyDay = items
      .filter(candidate =>
        /^DAY\s+\d{1,2}$/i.test(candidate.str) &&
        Math.abs(candidate.y - item.y) < 4 &&
        candidate.x > item.x &&
        candidate.x - item.x < 170
      )
      .sort((a, b) => (a.x - item.x) - (b.x - item.x))[0];
    return {
      item,
      dayNumber: Number(nearbyDay?.str.match(/\d+/)?.[0] || 0)
    };
  });

  const dateRows: DateCell[][] = [];
  [...cells]
    .sort((a, b) => b.item.y - a.item.y || a.item.x - b.item.x)
    .forEach(cell => {
      let row = dateRows.find(existing => Math.abs(existing[0].item.y - cell.item.y) < 5);
      if (!row) {
        row = [];
        dateRows.push(row);
      }
      row.push(cell);
    });

  dateRows.forEach(row => row.sort((a, b) => a.item.x - b.item.x));
  dateRows.sort((a, b) => b[0].item.y - a[0].item.y);
  const xGaps = dateRows.flatMap(row => row.slice(1).map((cell, index) => cell.item.x - row[index].item.x));
  const sortedGaps = xGaps.filter(gap => gap > 40).sort((a, b) => a - b);
  const columnWidth = sortedGaps[Math.floor(sortedGaps.length / 2)] || 190;
  const output: string[] = [];

  dateRows.forEach((dateRow, dateRowIndex) => {
    const nextRowY = dateRows[dateRowIndex + 1]?.[0].item.y;
    const rowBottom = nextRowY == null ? 0 : nextRowY + 5;

    dateRow.forEach((cell, columnIndex) => {
      // Date labels begin slightly inside each visual cell. KTA NOTES labels
      // start about 10 points to their left, so an 8-point inset clipped them.
      const left = cell.item.x - 12;
      const right = dateRow[columnIndex + 1]?.item.x - 12 || left + columnWidth;
      const positionedRows: { y: number; items: PositionedPdfText[] }[] = [];

      items.forEach(item => {
        if (item.y >= cell.item.y - 4 || item.y <= rowBottom) return;
        if (item.x < left || item.x >= right) return;
        if (KTA_DATE.test(item.str) || /^DAY\s+\d+$/i.test(item.str)) return;
        let row = positionedRows.find(existing => Math.abs(existing.y - item.y) < 2);
        if (!row) {
          row = { y: item.y, items: [] };
          positionedRows.push(row);
        }
        row.items.push(item);
      });

      output.push(`DAY ${cell.dayNumber}`);
      const sortedRows = positionedRows.sort((a, b) => b.y - a.y);
      const dayDutyNco = extractDayDutyNco(sortedRows);
      const timedDutyRows = sortedRows.flatMap(row => {
        const text = row.items
          .sort((a, b) => a.x - b.x)
          .map(item => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (/\bNOTES?\s*:/i.test(text)) return [];
        const time = findKtaTime(text);
        if (!time) return [];
        const beforeTime = text.slice(0, time.index).trim();
        const afterTime = text.slice(time.index + time.length).trim();
        const explicitDuty = getExplicitEventDutyNco(
          beforeTime,
          afterTime,
          dayDutyNco,
          extractDutyFragments([...row.items].sort((a, b) => a.x - b.x))
        );
        return [{
          y: row.y,
          eventText: beforeTime,
          explicitDuty
        }];
      });

      const rawGeometricAllRanges = sortedRows.flatMap(row => row.items
        .filter(item => /^(?:ALL(?:\s+HANDS)?(?:\s+ALL(?:\s+HANDS)?)?)$/i.test(item.str.trim()))
        .filter(item => Number.isFinite(item.dutyCellTop) && Number.isFinite(item.dutyCellBottom))
        .map(item => ({
          markerY: item.y,
          top: item.dutyCellTop as number,
          bottom: item.dutyCellBottom as number
        }))
      );

      // Some KTA sheets draw short internal lines through the duty column.
      // Those lines cannot be treated as the end of an ALL HANDS assignment.
      // Consecutive ALL markers form one run; the next DUTY NCOs marker is the
      // authoritative transition back to the day's named duty personnel.
      const dutyStatusMarkers = sortedRows
        .flatMap(row => row.items.flatMap<{ y: number; status: 'ALL' | 'DUTY' }>(item => {
          const text = item.str.trim();
          if (/^(?:ALL(?:\s+HANDS)?(?:\s+ALL(?:\s+HANDS)?)?)$/i.test(text)) {
            return [{ y: item.y, status: 'ALL' as const }];
          }
          if (/^DUTY\s+NCOs?$/i.test(text)) return [{ y: item.y, status: 'DUTY' as const }];
          return [];
        }))
        .sort((a, b) => b.y - a.y)
        .filter((marker, index, markers) => index === 0 ||
          marker.status !== markers[index - 1].status || Math.abs(marker.y - markers[index - 1].y) > 2
        );

      const geometricAllRanges: { top: number; bottom: number }[] = [];
      for (let index = 0; index < dutyStatusMarkers.length; index += 1) {
        if (dutyStatusMarkers[index].status !== 'ALL') continue;
        const runStart = index;
        while (index + 1 < dutyStatusMarkers.length && dutyStatusMarkers[index + 1].status === 'ALL') index += 1;
        const runEnd = index;
        const runMarkers = dutyStatusMarkers.slice(runStart, runEnd + 1);
        const runGeometry = rawGeometricAllRanges.filter(range =>
          runMarkers.some(marker => Math.abs(marker.y - range.markerY) < 2)
        );
        if (runGeometry.length === 0) continue;

        const previous = dutyStatusMarkers[runStart - 1];
        const next = dutyStatusMarkers[runEnd + 1];
        geometricAllRanges.push({
          top: previous?.status === 'DUTY'
            ? (previous.y + runMarkers[0].y) / 2
            : Math.max(...runGeometry.map(range => range.top)),
          bottom: next?.status === 'DUTY'
            ? (runMarkers[runMarkers.length - 1].y + next.y) / 2
            : Math.min(...runGeometry.map(range => range.bottom))
        });
      }

      // DAY 1 uses one ALL block from the first morning SPARTAN through the
      // final afternoon/evening SPARTAN. Events before the first and after the
      // last use that day's named Duty NCOs.
      const dayOneAllRows = new Set<number>();
      if (cell.dayNumber === 1) {
        const spartanRows = timedDutyRows.filter(row => /\b(?:A[- ]?)?SPARTAN\b/i.test(row.eventText));
        if (spartanRows.length >= 2) {
          const top = Math.max(...spartanRows.map(row => row.y));
          const bottom = Math.min(...spartanRows.map(row => row.y));
          timedDutyRows
            .filter(row => row.y <= top && row.y >= bottom)
            .forEach(row => dayOneAllRows.add(row.y));
        }
      }

      // ALL HANDS is often centered inside a vertically merged duty cell.
      // Expand from each marker through adjacent rows whose duty cells are
      // blank, stopping immediately before a row with its own duty value.
      const mergedAllHandsRows = new Set<number>();
      timedDutyRows.forEach(row => {
        // DAY 1's PDF grid has nested horizontal lines that visually cross the
        // duty column. Its authoritative ALL boundary is the first-to-last
        // SPARTAN block calculated above, not the nearest-line geometry.
        if (cell.dayNumber === 1) return;
        if (geometricAllRanges.some(range => row.y <= range.top + 0.5 && row.y >= range.bottom - 0.5)) {
          mergedAllHandsRows.add(row.y);
        }
      });
      timedDutyRows.forEach((anchor, anchorIndex) => {
        // Synthetic/manual text has no PDF cell geometry; retain a narrow
        // DAY 0 fallback for that input only.
        if (geometricAllRanges.length > 0) return;
        if (cell.dayNumber !== 0) return;
        if (anchor.explicitDuty !== 'ALL') return;
        mergedAllHandsRows.add(anchor.y);

        for (let index = anchorIndex - 1; index >= 0; index -= 1) {
          const current = timedDutyRows[index];
          const next = timedDutyRows[index + 1];
          if (Math.abs(current.y - next.y) > 8.5 || current.explicitDuty) break;
          mergedAllHandsRows.add(current.y);
        }
        for (let index = anchorIndex + 1; index < timedDutyRows.length; index += 1) {
          const current = timedDutyRows[index];
          const previous = timedDutyRows[index - 1];
          if (Math.abs(current.y - previous.y) > 8.5 || current.explicitDuty) break;
          mergedAllHandsRows.add(current.y);
        }
      });

      const inferMergedDutyNco = (eventY: number, explicitDuty: string | null) => {
        if (dayOneAllRows.has(eventY)) return 'ALL';
        if (explicitDuty) return explicitDuty;
        return mergedAllHandsRows.has(eventY) ? 'ALL' : dayDutyNco;
      };
      let collectingNotes = false;
      sortedRows
        .forEach(row => {
          const rowItems = row.items.sort((a, b) => a.x - b.x);
          let text = rowItems.map(item => item.str).join(' ').replace(/\s+/g, ' ').trim();
          // KTA PDFs can place NOTES on the same PDF text row as a neighboring
          // cell. Capture it even when NOTES is not the first token, and keep
          // duty-section metadata out of the note body.
          const noteMatch = text.match(/\bNOTES?\s*:\s*/i);
          if (noteMatch && noteMatch.index != null) {
            const dutySec = text.match(/\bDTY\s+SEC\s*:\s*(ALPHA|BRAVO)\b/i);
            if (dutySec) output.push(`NOTES: DTY SEC: ${dutySec[1].toUpperCase()}`);
            const noteText = text
              .slice(noteMatch.index + noteMatch[0].length)
              .replace(/\s*DTY\s+SEC\s*:\s*\w+.*$/i, '')
              .trim();
            if (noteText) output.push(`NOTES: ${noteText}`);
            collectingNotes = true;
            text = text.slice(0, noteMatch.index).trim();
            if (!text) return;
          }

          if (collectingNotes && !noteMatch) {
            const continuation = text
              .replace(/\s*DTY\s+SEC\s*:\s*\w+.*$/i, '')
              .trim();
            if (KTA_FOOTER_TEXT.test(continuation)) {
              collectingNotes = false;
            } else if (continuation) {
              output.push(`NOTES: ${continuation}`);
              return;
            }
          }

          const time = findKtaTime(text);
          if (!time) {
            const dutySec = text.match(/\bDTY\s+SEC\s*:\s*(ALPHA|BRAVO)\b/i);
            if (dutySec) output.push(`NOTES: DTY SEC: ${dutySec[1].toUpperCase()}`);
            return;
          }

          const { start, end } = time;
          if (!start || !end) return;

          const beforeTime = text.slice(0, time.index).trim();
          const afterTime = text.slice(time.index + time.length).trim();
          const section = afterTime.match(/\b(ALPHA|BRAVO|1ST|2ND|3RD|4TH)\b/i)?.[1]?.toUpperCase();
          let eventName = `${(beforeTime || afterTime)
            .replace(/^(?:ALL(?:\s+HANDS)?|DUTY NCOS?)\s+/i, '')
            .trim()}${section && !beforeTime.toUpperCase().includes(section) ? ` [${section}]` : ''}${time.qualifier}`;
          if (!eventName || /^(?:DTY NCO|ON CALL SENIOR|NCOA STAFF DUTY)$/i.test(eventName)) return;

          // KTA-specific terminology and cleanup rules.
          eventName = eventName
            .replace(/\bSPOT\s*:?\s*\d{3,4}\b(?:\s*\/\s*PULL\s*\d{3,4}\b)?/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
          const isNonsanPickup = /\bNONSAN\s+PICKUP\b/i.test(eventName);
          const isMermiteSpartan = /\bA[- ]SPARTAN\b/i.test(eventName);
          if (isMermiteSpartan) {
            eventName = eventName.replace(/\bA[- ]SPARTAN\b/gi, 'SPARTAN (MERMITES)');
          }

          const eventBackground = rowItems.find(item =>
            item.backgroundColor && !/^\d{3,5}(?:[-–]\d{3,5})?$/.test(item.str)
          )?.backgroundColor;
          const location = isNonsanPickup || isMermiteSpartan
            ? 'ACA'
            : inferLocation(eventName, eventBackground);
          const parsedExplicitDutyNco = getExplicitEventDutyNco(
            beforeTime,
            afterTime,
            dayDutyNco,
            extractDutyFragments(rowItems)
          );
          const explicitDutyNco = parsedExplicitDutyNco;
          const dutyNco = inferMergedDutyNco(row.y, explicitDutyNco);
          const dutyMarker = `[[KTA_DUTY_NCO=${encodeURIComponent(dutyNco)}]]`;
          const marker = rowItems.some(item => item.isRed) ? '[[PDF_RED_TEXT]] ' : '';
          output.push(`${marker}${start}-${time.displayEnd || end} ${eventName}${location ? ` ${location}` : ''} ${dutyMarker}`);
        });
    });
  });

  return output.join('\n');
}
