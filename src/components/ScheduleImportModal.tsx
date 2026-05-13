import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { TrainingEvent, DailySchedule } from '../types/schedule';

// PDF worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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

    // More flexible regexes: handle spaces, missing dashes, and OCR errors (O/o/I/l)
    // Supports formats like "0900-1000", "0900 1000", "09:00 - 10:00", etc.
    const timeRegex = /([0-9OoIil]{1,2}[:\s]?[0-9Oo]{2})\s*[-–—~_ ]+\s*([0-9OoIil]{1,2}[:\s]?[0-9Oo]{2})/;
    const dayLabelRegex = /(PICK[-]?UP\s*DAY|DAY\s*[#\-]?\s*(\d+))/i;
    const dateRegex = /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/;

    let currentDate = getDateFromOffset(0);

    lines.forEach((line, index) => {
      // Cleanup line: remove extra spaces
      const cleanLine = line.trim();
      if (!cleanLine) return;
      
      // 1. Check for Date/Day Header
      const dayMatch = cleanLine.match(dayLabelRegex);
      const dateMatch = cleanLine.match(dateRegex);

      if (dayMatch) {
        currentDayLabel = dayMatch[1].toUpperCase();
        if (dayMatch[2]) {
          const dayNum = parseInt(dayMatch[2]);
          currentOffset = dayNum; 
          currentDate = getDateFromOffset(currentOffset);
        } else {
          currentOffset = 0;
          currentDate = getDateFromOffset(0);
        }
      } else if (dateMatch) {
        currentDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
        currentDayLabel = `DATE: ${currentDate}`;
      }

      // 2. Check for Event line
      const timeMatch = cleanLine.match(timeRegex);
      if (timeMatch) {
        // Advanced normalization: O/o -> 0, I/l -> 1, then strip non-digits
        const normalizeTime = (t: string) => {
          return t.replace(/[Oo]/g, '0')
                  .replace(/[Iil]/g, '1')
                  .replace(/[^0-9]/g, '')
                  .padStart(4, '0')
                  .slice(-4); // Keep only last 4 digits
        };
        
        const startTime = normalizeTime(timeMatch[1]);
        const endTime = normalizeTime(timeMatch[2]);
        
        // Skip if it doesn't look like a valid time after normalization
        if (startTime === "0000" && endTime === "0000") return;
        
        const formattedTime = `${startTime}-${endTime}`;
        
        let remaining = cleanLine.replace(timeMatch[0], '').trim();
        
        let foundLocation = "";
        let foundUniform = "";
        
        locations.forEach(loc => {
          if (remaining.toUpperCase().includes(loc.toUpperCase())) {
            foundLocation = loc;
            const regex = new RegExp(loc, 'gi');
            remaining = remaining.replace(regex, '').trim();
          }
        });
        
        uniforms.forEach(uni => {
          if (remaining.toUpperCase().includes(uni.toUpperCase())) {
            foundUniform = uni;
            const regex = new RegExp(uni, 'gi');
            remaining = remaining.replace(regex, '').trim();
          }
        });

        // Final cleanup of remaining text
        remaining = remaining.replace(/^[:\s-]+|[:\s-]+$/g, '');

        const newEvent: TrainingEvent = {
          id: `imported-${Date.now()}-${index}`,
          time: formattedTime,
          eventName: remaining || "Unnamed Event",
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
      }
    });

    setParsedSchedules(Object.values(schedulesMap).sort((a, b) => a.date.localeCompare(b.date)));
  }, [startDate, cycleName, locations, uniforms]);

  // Update parsing when dependencies change
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
    } catch (err) {
      console.error("OCR Error:", err);
      alert("Failed to process file. Please try again or paste text manually.");
    } finally {
      setIsProcessing(false);
    }
  };

  const processImage = async (file: File | string | Blob) => {
    const worker = await createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') setProgress(Math.floor(m.progress * 100));
      }
    });
    
    const { data: { text } } = await worker.recognize(file);
    await worker.terminate();
    
    setExtractedText(prev => prev + (prev ? "\n" : "") + text);
  };

  const processPDF = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
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