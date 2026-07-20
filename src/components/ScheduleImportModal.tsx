import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { DailySchedule } from '../types/schedule';

// Correct PDF worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

type PdfTextItem = {
  str: string;
  x: number;
  y: number;
  isRed?: boolean;
};

type PdfDayLabel = {
  text: string;
  x: number;
  y: number;
};

interface Props {
  onClose: () => void;
  onImport: (schedules: DailySchedule[]) => void;
  locations: string[];
  uniforms: string[];
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PDF_RED_MARKER = '[[PDF_RED_TEXT]]';

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const isRedPdfColor = (value: any) => {
  const source = Array.isArray(value) && Array.isArray(value[0]) ? value[0] : value;
  if (Array.isArray(source) && typeof source[0] === 'string') {
    const color = source[0].trim().toLowerCase();
    return color === '#ff0000' || color === 'rgb(255,0,0)' || color === 'red';
  }

  if (typeof source === 'string') {
    const color = source.trim().toLowerCase();
    return color === '#ff0000' || color === 'rgb(255,0,0)' || color === 'red';
  }

  const rgb = Array.isArray(source) ? source : Array.from(source || []);
  if (rgb.length < 3) return false;

  const [rawR, rawG, rawB] = rgb;
  const scale = Math.max(rawR, rawG, rawB) <= 1 ? 1 : 255;
  const r = rawR / scale;
  const g = rawG / scale;
  const b = rawB / scale;

  return r > 0.45 && g < 0.35 && b < 0.35 && r > g * 1.5 && r > b * 1.5;
};

const normalizePdfMatchText = (value: string) => value.replace(/\s+/g, '').toUpperCase();

const getPdfGlyphText = (args: any[]) => {
  const glyphs = Array.isArray(args?.[0]) ? args[0] : [];
  return glyphs
    .map(glyph => {
      if (typeof glyph === 'string') return glyph;
      if (typeof glyph === 'object' && glyph) return glyph.unicode || '';
      return ' ';
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractPdfTextItems = async (page: any): Promise<PdfTextItem[]> => {
  const [content, operatorList] = await Promise.all([
    page.getTextContent(),
    page.getOperatorList()
  ]);

  const redTexts: string[] = [];
  const ops = pdfjsLib.OPS as any;
  let currentFill: any = [0, 0, 0];

  operatorList.fnArray.forEach((fn: number, index: number) => {
    const args = operatorList.argsArray[index];

    if (fn === ops.setFillRGBColor || fn === ops.setFillColor || fn === ops.setFillColorN) {
      currentFill = args;
      return;
    }

    if (fn === ops.setFillGray) {
      currentFill = [args?.[0] || 0, args?.[0] || 0, args?.[0] || 0];
      return;
    }

    if (fn === ops.showText || fn === ops.showSpacedText || fn === ops.nextLineShowText || fn === ops.nextLineSetSpacingShowText) {
      if (isRedPdfColor(currentFill)) {
        const text = normalizePdfMatchText(getPdfGlyphText(args));
        if (text.length >= 3) redTexts.push(text);
      }
    }
  });

  let redTextIndex = 0;
  return (content.items as any[])
    .map(item => {
      const str = String(item.str || '').trim();
      if (!str) return null;
      const matchText = normalizePdfMatchText(str);
      let isRed = false;

      while (redTextIndex < redTexts.length) {
        const redText = redTexts[redTextIndex];
        if (redText.length < 3) {
          redTextIndex += 1;
          continue;
        }

        if (matchText.includes(redText) || (matchText.length >= 3 && redText.includes(matchText))) {
          isRed = true;
          redTextIndex += 1;
        }
        break;
      }

      const pdfItem: PdfTextItem = {
        str,
        x: item.transform[4] as number,
        y: item.transform[5] as number,
        isRed
      };
      return pdfItem;
    })
    .filter(Boolean) as PdfTextItem[];
};

const isSunday = (date: Date) => date.getDay() === 0;

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ScheduleImportModal({ onClose, onImport, locations, uniforms }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [parsedSchedules, setParsedSchedules] = useState<DailySchedule[]>([]);
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [cycleName, setCycleName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- NEW: Structural Parser Logic ---
  const parseTextToEvents = useCallback((text: string) => {
    if (!text) {
      setParsedSchedules([]);
      return;
    }

    const lines = text.split('\n');
    const schedulesMap: { [date: string]: DailySchedule } = {};
    let currentDayLabel = "PICK-UP DAY";
    let currentOffset = 0;
    let hasSeenCalendarMarker = false;
    let isCollectingDayNotes = false;

    const getDateFromOffset = (offset: number) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + offset);
      return d.toISOString().split('T')[0];
    };

    const getNextDisplayedDate = (dateStr: string) => {
      const d = new Date(dateStr);
      do {
        d.setDate(d.getDate() + 1);
      } while (isSunday(d));
      return d.toISOString().split('T')[0];
    };

    let currentDate = getDateFromOffset(0);

    const ensureCurrentSchedule = () => {
      if (!schedulesMap[currentDate]) {
        schedulesMap[currentDate] = {
          date: currentDate,
          dayLabel: currentDayLabel,
          cycleName: cycleName,
          events: []
        };
      }

      return schedulesMap[currentDate];
    };

    const appendCurrentDayNotes = (noteText: string, highlighted = false) => {
      const normalizedNote = noteText
        .replace(/^NOTES?\s*[:-]?\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!normalizedNote) return;

      const schedule = ensureCurrentSchedule();
      schedule.notes = [schedule.notes, normalizedNote].filter(Boolean).join('\n');
      schedule.notesHighlighted = Boolean(schedule.notesHighlighted || highlighted);
    };

    // More aggressive Regex: allow noise, common OCR artifacts, and wide spacing
    const dayMarkerRegex = /^(?:\d{1,2}\s+[A-Z]{3}\s+)?(PICK\s*-\s*UP\s*DAY|DAY\s*[#\- ]?\s*(\d{1,2})|FEDERAL\s+HOLIDAY(?:\s*-\s*[A-Z\s]+)?)\b/i;
    // Flexible time: handle spaces around dash, O instead of 0, etc.
    const timePattern = /([0-9OoIil]{1,2}[:\s]?[0-9Oo]{2})\s*[-–—~_ ]+\s*([0-9OoIil]{1,2}[:\s]?[0-9Oo]{2})/g;

    lines.forEach((line, lineIdx) => {
      // 1. Heavy Cleanup
      let cleanLine = line.trim();
      if (!cleanLine || cleanLine.length < 3) return;
      const lineHighlighted = cleanLine.includes(PDF_RED_MARKER);
      cleanLine = cleanLine.split(PDF_RED_MARKER).join('').trim();
      cleanLine = cleanLine.replace(/\b(TIME|EVENT|LOC|UNI|CLASS|SCHEDULE)\b/gi, '').trim();

      // 2. Scan for all Day Markers and Time Patterns in this line
      const timeMatches = Array.from(cleanLine.matchAll(timePattern));
      const firstTimeIndex = timeMatches[0]?.index ?? Number.POSITIVE_INFINITY;
      const dayMatches = Array.from(cleanLine.matchAll(new RegExp(dayMarkerRegex.source, 'gi')))
        // DAY followed by a number is also valid event text, for example
        // "TM - LEADER STAKES DAY 1 (CRAWL)". A real calendar marker appears
        // before the first time range on a line; anything after it belongs to
        // the event description and must not advance the current date.
        .filter(match => (match.index ?? 0) < firstTimeIndex);

      if (dayMatches.length === 0 && timeMatches.length === 0) {
        if (/^NOTES?\s*[:-]?/i.test(cleanLine)) {
          appendCurrentDayNotes(cleanLine, lineHighlighted);
          isCollectingDayNotes = true;
        } else if (isCollectingDayNotes) {
          appendCurrentDayNotes(cleanLine, lineHighlighted);
        }
        return;
      }

      // 3. Intelligent Header Filtering
      // If multiple days are found but NO events, it's a header list (e.g., "DAY 1 DAY 2...")
      // In this case, we skip updating to avoid jumping to the end of the cycle.
      if (dayMatches.length > 1 && timeMatches.length === 0) {
        console.log("Skipping header list:", cleanLine);
        return;
      }

      // 4. Process the line content in order
      // We combine all tokens (days and times) and sort them by position
      const tokens: { type: 'DAY' | 'TIME', match: any }[] = [
        ...dayMatches.map(m => ({ type: 'DAY' as const, match: m })),
        ...timeMatches.map(m => ({ type: 'TIME' as const, match: m }))
      ].sort((a, b) => (a.match.index || 0) - (b.match.index || 0));

      tokens.forEach((token, tIdx) => {
        if (token.type === 'DAY') {
          isCollectingDayNotes = false;
          const m = token.match;
          if (m[2]) {
            currentOffset = parseInt(m[2]);
          } else if (m[0].toUpperCase().includes('PICK')) {
            currentOffset = 0;
          }
          currentDayLabel = m[0].toUpperCase().replace(/\s+/g, ' ');

          if (!hasSeenCalendarMarker) {
            currentDate = m[0].toUpperCase().includes('PICK') || !m[2]
              ? getDateFromOffset(currentOffset)
              : getDateFromOffset(parseInt(m[2]));
            hasSeenCalendarMarker = true;
          } else {
            currentDate = getNextDisplayedDate(currentDate);
          }

          if (!schedulesMap[currentDate]) {
            schedulesMap[currentDate] = {
              date: currentDate,
              dayLabel: currentDayLabel,
              cycleName: cycleName,
              events: []
            };
          } else {
            schedulesMap[currentDate].dayLabel = currentDayLabel;
            schedulesMap[currentDate].cycleName = cycleName;
          }
        } else {
          isCollectingDayNotes = false;
          // It's a TIME token (Event)
          const m = token.match;
          const normalizeTime = (t: string) => {
            return t.replace(/[Oo]/g, '0').replace(/[Iil]/g, '1').replace(/[^0-9]/g, '').padStart(4, '0').slice(-4);
          };

          const startTime = normalizeTime(m[1]);
          const endTime = normalizeTime(m[2]);
          if (startTime === "0000" && endTime === "0000") return;

          // Extract content until next token or end of line
          const startIdx = (m.index || 0) + m[0].length;
          const nextToken = tokens[tIdx + 1];
          const endIdx = nextToken ? nextToken.match.index : cleanLine.length;
          let content = cleanLine.substring(startIdx, endIdx).trim();

          if (content.length < 2) return;

          let foundLoc = "";
          let foundUni = "";
          const sortedUnis = [...uniforms].sort((a,b) => b.length - a.length);
          // RNG is a schedule location used for range events. Keep it as an
          // import fallback so parsing does not depend on the locations list
          // having finished syncing before a file is processed.
          const sortedLocs = Array.from(new Set([...locations, 'RNG'])).sort((a,b) => b.length - a.length);

          // Reverse matching
          for (const uni of sortedUnis) {
            const uniRegex = new RegExp(`\\b${escapeRegex(uni)}\\b\\s*$`, 'i');
            if (content.match(uniRegex)) {
              foundUni = uni;
              content = content.replace(uniRegex, '').trim();
              break;
            }
          }
          for (const loc of sortedLocs) {
            const locRegex = new RegExp(`\\b${escapeRegex(loc)}\\b\\s*$`, 'i');
            if (content.match(locRegex)) {
              foundLoc = loc;
              content = content.replace(locRegex, '').trim();
              break;
            }
          }

          // Fuzzy fallback
          if (!foundUni) {
            for (const uni of sortedUnis) {
              if (content.toUpperCase().includes(uni.toUpperCase())) {
                foundUni = uni;
                content = content.replace(new RegExp(escapeRegex(uni), 'gi'), '').trim();
                break;
              }
            }
          }
          if (!foundLoc) {
            for (const loc of sortedLocs) {
              if (content.toUpperCase().includes(loc.toUpperCase())) {
                foundLoc = loc;
                content = content.replace(new RegExp(escapeRegex(loc), 'gi'), '').trim();
                break;
              }
            }
          }

          const inlineNoteMatch = content.match(/\bNOTES?\s*[:-]\s*/i);
          if (inlineNoteMatch && typeof inlineNoteMatch.index === 'number') {
            appendCurrentDayNotes(content.substring(inlineNoteMatch.index), lineHighlighted);
            isCollectingDayNotes = true;
            content = content.substring(0, inlineNoteMatch.index).trim();
          }

          const eventName = content.replace(/^[:\s-]+|[:\s-]+$/g, '').replace(/\s+/g, ' ') || "UNNAMED EVENT";

          const schedule = ensureCurrentSchedule();
          schedule.events.push({
            id: `imp-${lineIdx}-${tIdx}-${Date.now()}`,
            time: `${startTime}-${endTime}`,
            eventName: eventName.toUpperCase(),
            location: foundLoc || (locations[0] || "MPR"),
            uniform: foundUni || (uniforms[0] || "ACU"),
            highlighted: lineHighlighted
          });
        }
      });
    });

    setParsedSchedules(Object.values(schedulesMap).sort((a, b) => a.date.localeCompare(b.date)));
  }, [startDate, cycleName, locations, uniforms]);

  useEffect(() => {
    parseTextToEvents(extractedText);
  }, [extractedText, parseTextToEvents]);

  // --- NEW: Adaptive Image Pre-processing ---
  const processImage = async (file: File | string | Blob) => {
    const worker = await createWorker('eng', 1);
    let source: string | File | Blob = file;

    if (file instanceof File || file instanceof Blob || typeof file === 'string') {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = typeof file === 'string' ? file : URL.createObjectURL(file);
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      // Scale up significantly for OCR
      const scale = 3;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      // Image enhancement: Grayscale -> High Contrast -> Sharpen
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        // Simple thresholding for cleaner text
        const v = avg > 160 ? 255 : 0;
        data[i] = data[i+1] = data[i+2] = v;
      }
      ctx.putImageData(imageData, 0, 0);
      source = canvas.toDataURL('image/png');
      if (typeof file !== 'string') URL.revokeObjectURL(img.src);
    }

    const { data: { text } } = await worker.recognize(source);
    await worker.terminate();
    setExtractedText(prev => prev + "\n" + text);
  };

  const extractStructuredPdfText = async (pdf: any) => {
    const pages: string[] = [];

    for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex++) {
      const page = await pdf.getPage(pageIndex);
      const items = await extractPdfTextItems(page);

      const timeHeaderXs = Array.from(new Set(
        items
          .filter(item => /^TIME$/i.test(item.str))
          .map(item => Math.round(item.x * 10) / 10)
      )).sort((a, b) => a - b);

      if (timeHeaderXs.length < 2) continue;

      const columnWidth = median(timeHeaderXs.slice(1).map((x, idx) => x - timeHeaderXs[idx]));
      if (!columnWidth) continue;

      const labels: PdfDayLabel[] = [];

      items.forEach(item => {
        const dayMatch = item.str.match(/^DAY\s+(\d{1,2})$/i);
        if (dayMatch) {
          labels.push({ text: `DAY ${dayMatch[1]}`, x: item.x, y: item.y });
          return;
        }

        if (/^FEDERAL\s+HOLIDAY$/i.test(item.str)) {
          const columnWidthEstimate = columnWidth || 190;
          const memorialDay = items.find(candidate =>
            /MEMORIAL\s+DAY/i.test(candidate.str) &&
            Math.abs(candidate.x - item.x) < columnWidthEstimate / 2 &&
            candidate.y < item.y
          );
          labels.push({
            text: memorialDay ? 'FEDERAL HOLIDAY - MEMORIAL DAY' : 'FEDERAL HOLIDAY',
            x: item.x,
            y: item.y
          });
          return;
        }

        if (/^PICK$/i.test(item.str)) {
          const upDay = items.find(candidate =>
            /UP\s*DAY/i.test(candidate.str) &&
            Math.abs(candidate.y - item.y) < 2 &&
            candidate.x > item.x &&
            candidate.x < item.x + 80
          );
          if (upDay) labels.push({ text: 'PICK-UP DAY', x: item.x, y: item.y });
        }
      });

      labels.sort((a, b) => b.y - a.y || a.x - b.x);
      if (labels.length === 0) continue;

      const labelRows = Array.from(new Set(labels.map(label => Math.round(label.y * 10) / 10)))
        .sort((a, b) => b - a);
      const labelColumnLefts = new Map<PdfDayLabel, number>();

      // Some schedule cells (especially the Saturday cells in 08-26) omit the
      // TIME/EVENT header even though they contain events. Map labels against
      // the page-wide column grid instead of requiring a TIME header in the
      // same row. A day label is right-aligned inside its schedule column.
      labels.forEach(label => {
        const headerX = [...timeHeaderXs]
          .reverse()
          .find(x => x <= label.x && label.x - x < columnWidth);
        if (headerX != null) labelColumnLefts.set(label, headerX - 16);
      });

      const pageLines: string[] = [];

      labels.forEach(label => {
        const nextLabelRow = labelRows.find(rowY => rowY < label.y - 10);
        const rowBottom = nextLabelRow == null ? 0 : nextLabelRow + 5;
        const columnLeft = labelColumnLefts.get(label);
        if (columnLeft == null) {
          pageLines.push(label.text);
          return;
        }
        const columnRight = columnLeft + columnWidth;
        const rows: { y: number; items: PdfTextItem[] }[] = [];

        items.forEach(item => {
          if (item.y >= label.y - 3 || item.y <= rowBottom) return;
          if (item.x < columnLeft + 4 || item.x > columnRight + 8) return;
          if (/^(TIME|EVENT|LOC|UNI)$/i.test(item.str)) return;
          if (/^DAY\s+\d{1,2}$/i.test(item.str) || /^PICK$/i.test(item.str) || /UP\s*DAY/i.test(item.str)) return;

          let row = rows.find(existing => Math.abs(existing.y - item.y) < 2);
          if (!row) {
            row = { y: item.y, items: [] };
            rows.push(row);
          }
          row.items.push(item);
        });

        pageLines.push(label.text);
        rows
          .sort((a, b) => b.y - a.y)
          .forEach(row => {
            const rowItems = row.items.sort((a, b) => a.x - b.x);
            const time = rowItems
              .filter(item => item.x < columnLeft + 48)
              .map(item => item.str)
              .join('');

            if (!/^\d{3,4}-\d{3,4}$/.test(time)) {
              const rowText = rowItems
                .map(item => item.str)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
              const noteMatch = rowText.match(/\bNOTES?\s*:\s*/i);
              const rowMarker = rowItems.some(item => item.isRed) ? `${PDF_RED_MARKER} ` : '';

              if (noteMatch && typeof noteMatch.index === 'number') {
                pageLines.push(`${rowMarker}NOTES: ${rowText.substring(noteMatch.index + noteMatch[0].length).trim()}`);
              } else if (rowText && !/\d{3,4}-\d{3,4}/.test(rowText) && !/^(TIME|EVENT|LOC|UNI)$/i.test(rowText)) {
                pageLines.push(`${rowMarker}${rowText}`);
              }
              return;
            }

            const eventItems = rowItems.filter(item => item.x >= columnLeft + 48 && item.x < columnLeft + 155);
            const locationItems = rowItems.filter(item => item.x >= columnLeft + 155 && item.x < columnLeft + 184);
            const uniformItems = rowItems.filter(item => item.x >= columnLeft + 184);
            const event = eventItems
              .map(item => item.str)
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
            const location = locationItems
              .map(item => item.str)
              .join(' ')
              .trim();
            const uniform = uniformItems
              .map(item => item.str)
              .join(' ')
              .trim();

            const rowMarker = eventItems.some(item => item.isRed) ? `${PDF_RED_MARKER} ` : '';
            pageLines.push(`${rowMarker}${[time, event, location, uniform].filter(Boolean).join(' ')}`);
          });
      });

      pages.push(pageLines.join('\n'));
    }

    return pages.join('\n\n').trim();
  };

  const processPDF = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const structuredText = await extractStructuredPdfText(pdf);
    if (structuredText.trim().length > 100) {
      setExtractedText(structuredText);
      return;
    }

    let fullText = "";
    // Try text layer first, preserving visual lines instead of flattening the whole page.
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const items = (await extractPdfTextItems(page))
        .sort((a, b) => b.y - a.y || a.x - b.x);

      const rows: { y: number; items: PdfTextItem[] }[] = [];
      items.forEach(item => {
        let row = rows.find(existing => Math.abs(existing.y - item.y) < 2);
        if (!row) {
          row = { y: item.y, items: [] };
          rows.push(row);
        }
        row.items.push(item);
      });

      const pageText = rows
        .sort((a, b) => b.y - a.y)
        .map(row => {
          const rowItems = row.items.sort((a, b) => a.x - b.x);
          const marker = rowItems.some(item => item.isRed) ? `${PDF_RED_MARKER} ` : '';
          return marker + rowItems.map(item => item.str).join(' ');
        })
        .join('\n');

      if (pageText.trim().length > 50) fullText += pageText + "\n";
    }

    if (fullText.trim().length > 100) {
      setExtractedText(fullText);
      return;
    }

    // Scanned PDF fallback
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await (page as any).render({ canvasContext: ctx, viewport }).promise;
      await processImage(canvas.toDataURL('image/png'));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert("Please select a PDF file. PNG and JPG imports are not supported.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsProcessing(true);
    try {
      await processPDF(file);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirmImport = () => {
    onImport(parsedSchedules);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-2 sm:p-4 z-[100] backdrop-blur-sm">
      <div className="soft-modal bg-white w-full max-w-4xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        <div className="soft-modal-header bg-blue-900 p-4 sm:p-6 text-white shrink-0">
          <div>
            <h3 className="text-xl sm:text-2xl font-black">Smart Schedule Import</h3>
            <p className="text-blue-200 text-sm">PDF schedule parsing</p>
          </div>
        </div>

        <div className="p-3 sm:p-4 md:p-6 overflow-y-auto space-y-4 sm:space-y-6 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 md:p-6 rounded-2xl border-2 border-dashed border-gray-200">
            <div className="min-w-0 overflow-hidden">
              <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Cycle Number</label>
              <input type="text" value={cycleName} onChange={e => setCycleName(e.target.value)} placeholder="00-00" className="schedule-import-control bg-white border-2 border-gray-100 rounded-xl p-3 font-bold text-blue-900 placeholder:text-gray-300 focus:border-blue-500 outline-none transition-all" />
            </div>
            <div className="min-w-0 overflow-hidden">
              <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">First Schedule Date (PICK-UP / DAY 0)</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="schedule-import-control schedule-import-date bg-white border-2 border-gray-100 rounded-xl p-3 font-bold focus:border-blue-500 outline-none transition-all" />
            </div>
            <div className="flex items-end min-w-0 overflow-hidden">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="application/pdf,.pdf" />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className={`schedule-import-control py-3.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 ${
                  isProcessing ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-0.5'
                }`}
              >
                {isProcessing ? `Processing...` : "Select File"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Raw OCR Output (Editable)</label>
              <textarea 
                value={extractedText} 
                onChange={e => setExtractedText(e.target.value)}
                className="w-full h-[240px] lg:h-[400px] bg-gray-900 text-green-400 p-4 font-mono text-xs rounded-2xl border-none focus:ring-4 focus:ring-blue-500/20 outline-none resize-none leading-relaxed"
                placeholder="OCR text will appear here. You can also paste manually."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex justify-between">
                <span>Parsing Preview</span>
                <span className="text-blue-600">{parsedSchedules.length} Days Found</span>
              </label>
              <div className="h-[240px] lg:h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {parsedSchedules.map((day, idx) => (
                  <div key={idx} className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-4 py-2 border-b-2 border-gray-100 flex justify-between items-center">
                      <span className="font-black text-[10px] text-blue-900">{day.date}</span>
                      <span className="font-black text-[10px] text-gray-400">{day.dayLabel}</span>
                    </div>
                    <div className="p-3 space-y-2">
                      {day.events.map((ev, eIdx) => (
                        <div key={eIdx} className={`flex items-center gap-3 text-[10px] p-2 rounded-lg ${ev.highlighted ? 'bg-red-50' : 'bg-blue-50/50'}`}>
                          <span className="font-black text-blue-700 w-16 shrink-0">{ev.time}</span>
                          <span className={`flex-1 min-w-0 font-bold ${ev.highlighted ? 'text-red-700' : 'text-gray-700'}`}>
                            <span className="block truncate">{ev.eventName}</span>
                          </span>
                          {ev.highlighted && <span className="text-red-500" title="Highlighted from red PDF text">*</span>}
                          <div className="flex gap-1">
                            <span className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-500">{ev.location}</span>
                            <span className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-500">{ev.uniform}</span>
                          </div>
                        </div>
                      ))}
                      {day.notes && (
                        <div className={`rounded-lg border p-2 text-[10px] font-semibold whitespace-pre-wrap ${day.notesHighlighted ? 'border-red-100 bg-red-50 text-red-700' : 'border-blue-100 bg-blue-50 text-gray-600'}`}>
                          <span className={`font-black ${day.notesHighlighted ? 'text-red-800' : 'text-blue-800'}`}>NOTES: </span>
                          {day.notesHighlighted && <span className="text-red-500">* </span>}
                          {day.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {parsedSchedules.length === 0 && (
                  <div className="h-full flex items-center justify-center text-gray-300 font-bold italic">
                    Waiting for valid data...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-6 bg-gray-50 flex gap-3 sm:gap-4 border-t border-gray-200 shrink-0">
          <button onClick={onClose} className="flex-1 py-3 sm:py-4 bg-white text-gray-500 font-black text-xs sm:text-sm uppercase tracking-wide sm:tracking-widest rounded-xl sm:rounded-2xl border-2 border-gray-200 hover:bg-gray-100 transition-all">Cancel</button>
          <button 
            onClick={handleConfirmImport}
            disabled={parsedSchedules.length === 0}
            className={`flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wide sm:tracking-widest shadow-xl transition-all ${
              parsedSchedules.length === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-900 text-white hover:bg-blue-800 active:scale-95'
            }`}
          >
            Confirm Import
          </button>
        </div>
      </div>
    </div>
  );
}
