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

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
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

    const appendCurrentDayNotes = (noteText: string) => {
      const normalizedNote = noteText
        .replace(/^NOTES?\s*[:-]?\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!normalizedNote) return;

      const schedule = ensureCurrentSchedule();
      schedule.notes = [schedule.notes, normalizedNote].filter(Boolean).join('\n');
    };

    // More aggressive Regex: allow noise, common OCR artifacts, and wide spacing
    const dayMarkerRegex = /\b(PICK\s*-\s*UP\s*DAY|DAY\s*[#\- ]?\s*(\d{1,2})|FEDERAL\s+HOLIDAY(?:\s*-\s*[A-Z\s]+)?)\b/i;
    // Flexible time: handle spaces around dash, O instead of 0, etc.
    const timePattern = /([0-9OoIil]{1,2}[:\s]?[0-9Oo]{2})\s*[-–—~_ ]+\s*([0-9OoIil]{1,2}[:\s]?[0-9Oo]{2})/g;

    lines.forEach((line, lineIdx) => {
      // 1. Heavy Cleanup
      let cleanLine = line.trim();
      if (!cleanLine || cleanLine.length < 3) return;
      cleanLine = cleanLine.replace(/\b(TIME|EVENT|LOC|UNI|CLASS|SCHEDULE)\b/gi, '').trim();

      // 2. Scan for all Day Markers and Time Patterns in this line
      const dayMatches = Array.from(cleanLine.matchAll(new RegExp(dayMarkerRegex, 'g')));
      const timeMatches = Array.from(cleanLine.matchAll(timePattern));

      if (dayMatches.length === 0 && timeMatches.length === 0) {
        if (/^NOTES?\s*[:-]?/i.test(cleanLine)) {
          appendCurrentDayNotes(cleanLine);
          isCollectingDayNotes = true;
        } else if (isCollectingDayNotes) {
          appendCurrentDayNotes(cleanLine);
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
          const sortedLocs = [...locations].sort((a,b) => b.length - a.length);

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
            appendCurrentDayNotes(content.substring(inlineNoteMatch.index));
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
            uniform: foundUni || (uniforms[0] || "ACU")
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
      const content = await page.getTextContent();
      const items: PdfTextItem[] = (content.items as any[])
        .map(item => ({
          str: String(item.str || '').trim(),
          x: item.transform[4] as number,
          y: item.transform[5] as number
        }))
        .filter(item => item.str.length > 0);

      const timeHeaderXs = Array.from(new Set(
        items
          .filter(item => /^TIME$/i.test(item.str))
          .map(item => Math.round(item.x * 10) / 10)
      )).sort((a, b) => a - b);

      if (timeHeaderXs.length < 2) continue;

      const columnWidth = median(timeHeaderXs.slice(1).map((x, idx) => x - timeHeaderXs[idx]));
      if (!columnWidth) continue;

      const leftEdge = timeHeaderXs[0] - 16;
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

      const pageLines: string[] = [];

      labels.forEach(label => {
        const columnIndex = Math.max(0, Math.floor((label.x - leftEdge) / columnWidth));
        const columnLeft = leftEdge + columnIndex * columnWidth;
        const columnRight = columnLeft + columnWidth;
        const nextLabelRow = labelRows.find(rowY => rowY < label.y - 10);
        const rowBottom = nextLabelRow == null ? 0 : nextLabelRow + 5;
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

              if (noteMatch && typeof noteMatch.index === 'number') {
                pageLines.push(`NOTES: ${rowText.substring(noteMatch.index + noteMatch[0].length).trim()}`);
              } else if (rowText && !/\d{3,4}-\d{3,4}/.test(rowText) && !/^(TIME|EVENT|LOC|UNI)$/i.test(rowText)) {
                pageLines.push(rowText);
              }
              return;
            }

            const event = rowItems
              .filter(item => item.x >= columnLeft + 48 && item.x < columnLeft + 155)
              .map(item => item.str)
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
            const location = rowItems
              .filter(item => item.x >= columnLeft + 155 && item.x < columnLeft + 184)
              .map(item => item.str)
              .join(' ')
              .trim();
            const uniform = rowItems
              .filter(item => item.x >= columnLeft + 184)
              .map(item => item.str)
              .join(' ')
              .trim();

            pageLines.push([time, event, location, uniform].filter(Boolean).join(' '));
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
      const content = await page.getTextContent();
      const items = (content.items as any[])
        .map(item => ({
          str: String(item.str || '').trim(),
          x: item.transform[4] as number,
          y: item.transform[5] as number
        }))
        .filter(item => item.str.length > 0)
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
        .map(row => row.items.sort((a, b) => a.x - b.x).map(item => item.str).join(' '))
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-blue-900 p-6 text-white">
          <div>
            <h3 className="text-2xl font-black">Smart Schedule Import</h3>
            <p className="text-blue-200 text-sm">PDF schedule parsing</p>
          </div>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 md:p-6 rounded-2xl border-2 border-dashed border-gray-200">
            <div className="min-w-0 overflow-hidden">
              <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Cycle Number</label>
              <input type="text" value={cycleName} onChange={e => setCycleName(e.target.value)} placeholder="00-00" className="schedule-import-control bg-white border-2 border-gray-100 rounded-xl p-3 font-bold text-blue-900 placeholder:text-gray-300 focus:border-blue-500 outline-none transition-all" />
            </div>
            <div className="min-w-0 overflow-hidden">
              <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Start Date (PICK-UP)</label>
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
                className="w-full h-[400px] bg-gray-900 text-green-400 p-4 font-mono text-xs rounded-2xl border-none focus:ring-4 focus:ring-blue-500/20 outline-none resize-none leading-relaxed"
                placeholder="OCR text will appear here. You can also paste manually."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex justify-between">
                <span>Parsing Preview</span>
                <span className="text-blue-600">{parsedSchedules.length} Days Found</span>
              </label>
              <div className="h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {parsedSchedules.map((day, idx) => (
                  <div key={idx} className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-4 py-2 border-b-2 border-gray-100 flex justify-between items-center">
                      <span className="font-black text-[10px] text-blue-900">{day.date}</span>
                      <span className="font-black text-[10px] text-gray-400">{day.dayLabel}</span>
                    </div>
                    <div className="p-3 space-y-2">
                      {day.events.map((ev, eIdx) => (
                        <div key={eIdx} className="flex items-center gap-3 text-[10px] bg-blue-50/50 p-2 rounded-lg">
                          <span className="font-black text-blue-700 w-16 shrink-0">{ev.time}</span>
                          <span className="flex-1 min-w-0 font-bold text-gray-700">
                            <span className="block truncate">{ev.eventName}</span>
                          </span>
                          <div className="flex gap-1">
                            <span className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-500">{ev.location}</span>
                            <span className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-500">{ev.uniform}</span>
                          </div>
                        </div>
                      ))}
                      {day.notes && (
                        <div className="rounded-lg border border-blue-100 bg-blue-50 p-2 text-[10px] font-semibold text-gray-600 whitespace-pre-wrap">
                          <span className="font-black text-blue-800">NOTES: </span>
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

        <div className="p-6 bg-gray-50 flex gap-4 border-t border-gray-200">
          <button onClick={onClose} className="flex-1 py-4 bg-white text-gray-500 font-black text-sm uppercase tracking-widest rounded-2xl border-2 border-gray-200 hover:bg-gray-100 transition-all">Cancel</button>
          <button 
            onClick={handleConfirmImport}
            disabled={parsedSchedules.length === 0}
            className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all ${
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
