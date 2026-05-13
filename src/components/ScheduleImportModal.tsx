import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { TrainingEvent, DailySchedule } from '../types/schedule';

// Correct PDF worker setup for pdfjs-dist 4.x/5.x
// Using the locally hosted worker in the public folder for maximum reliability
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

    // Regex for splitting days
    const dayLabelRegex = /(PICK[-]?UP\s*DAY|DAY\s*[#\-]?\s*(\d+))/i;
    const dateMarkerRegex = /(\d{1,2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i;
    const timeRegex = /([0-9OoIil]{1,2}[:\s]?[0-9Oo]{2})\s*[-–—~_ ]+\s*([0-9OoIil]{1,2}[:\s]?[0-9Oo]{2})/;

    lines.forEach((line, index) => {
      const cleanLine = line.trim();
      if (!cleanLine) return;

      // 1. Check for Day/Date markers in the line
      const dayMatch = cleanLine.match(dayLabelRegex);
      const dateMarkerMatch = cleanLine.match(dateMarkerRegex);

      if (dayMatch) {
        currentDayLabel = dayMatch[1].toUpperCase();
        if (dayMatch[2]) {
          currentOffset = parseInt(dayMatch[2]);
        } else {
          currentOffset = 0;
        }
        currentDate = getDateFromOffset(currentOffset);
      } else if (dateMarkerMatch) {
        // If we see "22 MAY", try to adjust our offset if it's near the current one
        // For now, we trust the "DAY X" sequence more, but we can use this to sync
        console.log("Detected date marker:", dateMarkerMatch[0]);
      }

      // 2. Extract multiple events from a single line if they exist
      // Some OCR results put multiple events on one line
      const timeMatches = Array.from(cleanLine.matchAll(new RegExp(timeRegex, 'g')));
      
      if (timeMatches.length > 0) {
        timeMatches.forEach((timeMatch, mIdx) => {
          const normalizeTime = (t: string) => {
            return t.replace(/[Oo]/g, '0')
                    .replace(/[Iil]/g, '1')
                    .replace(/[^0-9]/g, '')
                    .padStart(4, '0')
                    .slice(-4);
          };
          
          const startTime = normalizeTime(timeMatch[1]);
          const endTime = normalizeTime(timeMatch[2]);
          if (startTime === "0000" && endTime === "0000") return;
          
          const formattedTime = `${startTime}-${endTime}`;
          
          // Try to isolate the event name/loc/uni for this specific time match
          const nextMatchStart = timeMatches[mIdx + 1] ? timeMatches[mIdx + 1].index : cleanLine.length;
          let eventPart = cleanLine.substring((timeMatch.index || 0) + timeMatch[0].length, nextMatchStart).trim();
          
          let foundLocation = "";
          let foundUniform = "";
          
          locations.forEach(loc => {
            if (eventPart.toUpperCase().includes(loc.toUpperCase())) {
              foundLocation = loc;
              const regex = new RegExp(loc, 'gi');
              eventPart = eventPart.replace(regex, '').trim();
            }
          });
          
          uniforms.forEach(uni => {
            if (eventPart.toUpperCase().includes(uni.toUpperCase())) {
              foundUniform = uni;
              const regex = new RegExp(uni, 'gi');
              eventPart = eventPart.replace(regex, '').trim();
            }
          });

          eventPart = eventPart.replace(/^[:\s-]+|[:\s-]+$/g, '');

          const newEvent: TrainingEvent = {
            id: `imported-${Date.now()}-${index}-${mIdx}`,
            time: formattedTime,
            eventName: eventPart || "Unnamed Event",
            location: foundLocation || (locations[0] || "MPR"),
            uniform: foundUniform || (uniforms[0] || "ACU")
          };

          if (!schedulesMap[currentDate]) {
            schedulesMap[currentDate] = {
              date: currentDate,
              dayLabel: currentDayLabel,
              cycleName: cycleName,
              events: []
            };
          }
          schedulesMap[currentDate].events.push(newEvent);
        });
      }
    });

    setParsedSchedules(Object.values(schedulesMap).sort((a, b) => a.date.localeCompare(b.date)));
  }, [startDate, cycleName, locations, uniforms]);

  useEffect(() => {
    parseTextToEvents(extractedText);
  }, [extractedText, parseTextToEvents]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setExtractedText("");

    try {
      if (file.type === 'application/pdf') {
        await processPDF(file);
      } else if (file.type.startsWith('image/')) {
        await processImage(file);
      } else {
        alert("Please upload a PDF or an Image file.");
      }
    } catch (err: any) {
      console.error("File Processing Error:", err);
      alert(`Failed to process file: ${err.message || 'Unknown error'}. Please try pasting text manually.`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const processImage = async (file: File | string | Blob) => {
    const worker = await createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') setProgress(Math.floor(m.progress * 100));
      }
    });

    let targetSource: string | File | Blob = file;

    if (file instanceof File || typeof file === 'string' || file instanceof Blob) {
      const img = new Image();
      const loadPromise = new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = typeof file === 'string' ? file : URL.createObjectURL(file);
      });
      await loadPromise;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const scale = 2;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.filter = 'contrast(1.2) brightness(1.1)';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        targetSource = canvas.toDataURL('image/png');
        if (typeof file !== 'string') URL.revokeObjectURL(img.src);
      }
    }
    
    const { data: { text } } = await worker.recognize(targetSource);
    await worker.terminate();
    
    const normalizedText = text
      .replace(/[O0o]{1,2}[:\s]*[O0o]{2}/g, m => m.replace(/[Oo]/g, '0'))
      .replace(/\n\s*\n/g, '\n');

    setExtractedText(prev => prev + (prev ? "\n" : "") + normalizedText);
  };

  const processPDF = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = "";
    let isScanned = true;

    // 1. Try Direct Text Extraction
    try {
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Sort items by vertical then horizontal position
        const items = (textContent.items as any[]).sort((a, b) => {
          if (Math.abs(a.transform[5] - b.transform[5]) < 5) {
            return a.transform[4] - b.transform[4];
          }
          return b.transform[5] - a.transform[5];
        });

        const pageText = items.map(item => item.str).join(' ');
        if (pageText.trim().length > 50) {
          isScanned = false;
          fullText += pageText + "\n";
        }
      }
    } catch (err) {
      console.warn("Direct extraction failed:", err);
    }

    if (!isScanned && fullText.trim().length > 100) {
      setExtractedText(fullText);
      return;
    }

    // 2. OCR Fallback for Scanned PDF
    console.log("PDF appears to be scanned, using OCR...");
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 3.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await (page as any).render({ canvasContext: context, viewport }).promise;
        const imageData = canvas.toDataURL('image/png');
        await processImage(imageData);
      }
    }
  };

  const handleImport = () => {
    onImport(parsedSchedules);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[60] backdrop-blur-md">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="bg-blue-900 p-6 text-white flex justify-between items-center">
          <div>
            <h3 className="font-black text-2xl tracking-tight">Full Cycle Import</h3>
            <p className="text-blue-200 text-sm">Upload PICK-UP to DAY 22 Schedule</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-blue-200 transition-colors">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <div>
              <label className="block text-xs font-bold text-blue-900 mb-2 uppercase tracking-widest">Cycle Name (e.g. 06-26)</label>
              <input 
                type="text" 
                value={cycleName} 
                onChange={(e) => setCycleName(e.target.value)}
                placeholder="06-26"
                className="w-full border-2 border-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-bold text-blue-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-900 mb-2 uppercase tracking-widest">PICK-UP Date</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border-2 border-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              />
            </div>
            <div className="flex flex-col justify-end">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept="image/*,application/pdf"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
                  isProcessing ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                {isProcessing ? `OCR (${progress}%)` : "Upload File"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest flex justify-between">
              <span>Extracted Text</span>
              <span className="text-blue-600 text-[10px]">Tip: Text must include "DAY X" to split dates.</span>
            </label>
            <textarea 
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              placeholder="Paste schedule text here or upload files..."
              className="w-full h-32 border-2 border-gray-100 rounded-xl p-4 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {parsedSchedules.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-bold text-gray-800 border-b-2 border-gray-100 pb-2 flex justify-between items-center">
                <span>Parsed Multi-Day Preview</span>
                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">{parsedSchedules.length} Days Detected</span>
              </h4>
              <div className="space-y-4">
                {parsedSchedules.map((day, dIdx) => (
                  <div key={dIdx} className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-gray-100 px-4 py-2 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-gray-700">{day.date}</span>
                        <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 rounded font-bold">CYCLE: {day.cycleName}</span>
                      </div>
                      <span className="text-xs font-bold text-blue-600">{day.dayLabel}</span>
                    </div>
                    <div className="p-3 space-y-2 bg-white">
                      {day.events.map((ev, eIdx) => (
                        <div key={eIdx} className="flex items-center gap-3 text-[11px]">
                          <span className="font-bold text-blue-800 w-16 shrink-0">{ev.time}</span>
                          <span className="flex-1 truncate">{ev.eventName}</span>
                          <span className="text-gray-400">@{ev.location}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 flex gap-4 border-t border-gray-200">
          <button onClick={onClose} className="flex-1 py-4 bg-white text-gray-600 font-bold rounded-2xl border-2 border-gray-200 hover:bg-gray-100 transition-colors">Cancel</button>
          <button 
            onClick={handleImport}
            disabled={parsedSchedules.length === 0}
            className={`flex-1 py-4 rounded-2xl font-bold shadow-lg transition-all ${
              parsedSchedules.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-900 text-white hover:bg-blue-800 active:scale-[0.98]'
            }`}
          >
            Import {parsedSchedules.reduce((acc, d) => acc + d.events.length, 0)} Events Across {parsedSchedules.length} Days
          </button>
        </div>
      </div>
    </div>
  );
}
