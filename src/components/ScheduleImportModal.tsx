import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { TrainingEvent, DailySchedule } from '../types/schedule';

// Correct PDF worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface Props {
  onClose: () => void;
  onImport: (schedules: DailySchedule[]) => void;
  locations: string[];
  uniforms: string[];
}

export default function ScheduleImportModal({ onClose, onImport, locations, uniforms }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState("");
  const [parsedSchedules, setParsedSchedules] = useState<DailySchedule[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [cycleName, setCycleName] = useState("06-26");
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

    const getDateFromOffset = (offset: number) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + offset);
      return d.toISOString().split('T')[0];
    };

    let currentDate = getDateFromOffset(0);

    // More aggressive Regex: allow noise and common OCR artifacts
    const dayMarkerRegex = /(PICK[- ]?UP\s*DAY|DAY\s*[#\- ]?\s*(\d{1,2}))/i;
    // Flexible time: 4 digits, optional colon, separator (dash, tilde, space), 4 digits
    const timePattern = /([0-9OoIil]{1,2}[:\s]?[0-9Oo]{2})\s*[-–—~_ ]+\s*([0-9OoIil]{1,2}[:\s]?[0-9Oo]{2})/g;

    lines.forEach((line, lineIdx) => {
      const cleanLine = line.trim();
      if (!cleanLine || cleanLine.length < 5) return;

      // 1. Detect Day Transitions
      const dayMatch = cleanLine.match(dayMarkerRegex);
      if (dayMatch) {
        if (dayMatch[2]) {
          currentOffset = parseInt(dayMatch[2]);
        } else if (dayMatch[1].toUpperCase().includes('PICK')) {
          currentOffset = 0;
        }
        currentDayLabel = dayMatch[1].toUpperCase();
        currentDate = getDateFromOffset(currentOffset);
      }

      // 2. Extract Events using structural matching
      const matches = Array.from(cleanLine.matchAll(timePattern));
      
      matches.forEach((match, mIdx) => {
        const normalizeTime = (t: string) => {
          return t.replace(/[Oo]/g, '0').replace(/[Iil]/g, '1').replace(/[^0-9]/g, '').padStart(4, '0').slice(-4);
        };

        const startTime = normalizeTime(match[1]);
        const endTime = normalizeTime(match[2]);
        if (startTime === "0000" && endTime === "0000") return;

        // Take text until the next time match or end of line
        const startIdx = (match.index || 0) + match[0].length;
        const nextMatch = matches[mIdx + 1];
        const endIdx = nextMatch ? nextMatch.index : cleanLine.length;
        let content = cleanLine.substring(startIdx, endIdx).trim();

        // Fuzzy search for Location and Uniform
        let foundLoc = "";
        let foundUni = "";

        // Sort by length descending to match longer strings first (e.g., 'DFC' before 'D')
        [...locations].sort((a,b) => b.length - a.length).forEach(loc => {
          if (!foundLoc && content.toUpperCase().includes(loc.toUpperCase())) {
            foundLoc = loc;
            content = content.replace(new RegExp(loc, 'gi'), '').trim();
          }
        });

        [...uniforms].sort((a,b) => b.length - a.length).forEach(uni => {
          if (!foundUni && content.toUpperCase().includes(uni.toUpperCase())) {
            foundUni = uni;
            content = content.replace(new RegExp(uni, 'gi'), '').trim();
          }
        });

        // Cleanup noise (common OCR artifacts)
        const eventName = content.replace(/^[:\s\-]+|[:\s\-]+$/g, '') || "Unnamed Event";

        if (!schedulesMap[currentDate]) {
          schedulesMap[currentDate] = {
            date: currentDate,
            dayLabel: currentDayLabel,
            cycleName: cycleName,
            events: []
          };
        }

        schedulesMap[currentDate].events.push({
          id: `imp-${lineIdx}-${mIdx}-${Date.now()}`,
          time: `${startTime}-${endTime}`,
          eventName: eventName.toUpperCase(),
          location: foundLoc || (locations[0] || "MPR"),
          uniform: foundUni || (uniforms[0] || "ACU")
        });
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

  const processPDF = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = "";
    // Try text layer first
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const items = (content.items as any[]).sort((a,b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);
      const pageText = items.map(it => it.str).join(' ');
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
    setIsProcessing(true);
    setProgress(0);
    try {
      if (file.type === 'application/pdf') await processPDF(file);
      else await processImage(file);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-blue-900 p-6 text-white flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black">Smart Schedule Import</h3>
            <p className="text-blue-200 text-sm">AI-powered PDF & Image parsing</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200">
            <div>
              <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Cycle ID</label>
              <input type="text" value={cycleName} onChange={e => setCycleName(e.target.value)} className="w-full bg-white border-2 border-gray-100 rounded-xl p-3 font-bold text-blue-900 focus:border-blue-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Start Date (PICK-UP)</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-white border-2 border-gray-100 rounded-xl p-3 font-bold focus:border-blue-500 outline-none transition-all" />
            </div>
            <div className="flex items-end">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 ${
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
                          <span className="flex-1 font-bold text-gray-700 truncate">{ev.eventName}</span>
                          <div className="flex gap-1">
                            <span className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-500">{ev.location}</span>
                            <span className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-500">{ev.uniform}</span>
                          </div>
                        </div>
                      ))}
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
            onClick={() => onImport(parsedSchedules)}
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
