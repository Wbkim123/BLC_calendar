// src/components/ScheduleImportModal.tsx
import React, { useState, useRef } from 'react';
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
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    setExtractedText(prev => prev + "\n" + text);
    parseTextToEvents(text);
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

  const parseTextToEvents = (text: string) => {
    const lines = text.split('\n');
    const events: TrainingEvent[] = [];
    
    // Simple parsing logic: 
    // Look for patterns like "0900-1000 EVENT NAME LOCATION UNIFORM"
    // or separate lines
    
    const timeRegex = /(\d{4})\s*[-–—]\s*(\d{4})/;
    
    lines.forEach((line, index) => {
      const timeMatch = line.match(timeRegex);
      if (timeMatch) {
        const time = `${timeMatch[1]}-${timeMatch[2]}`;
        let remaining = line.replace(timeMatch[0], '').trim();
        
        // Try to extract location and uniform from the line
        let foundLocation = "";
        let foundUniform = "";
        
        locations.forEach(loc => {
          if (remaining.includes(loc)) {
            foundLocation = loc;
            remaining = remaining.replace(loc, '').trim();
          }
        });
        
        uniforms.forEach(uni => {
          if (remaining.includes(uni)) {
            foundUniform = uni;
            remaining = remaining.replace(uni, '').trim();
          }
        });

        events.push({
          id: `imported-${Date.now()}-${index}`,
          time,
          eventName: remaining || "Unnamed Event",
          location: foundLocation || (locations[0] || "MPR"),
          uniform: foundUniform || (uniforms[0] || "ACU")
        });
      }
    });

    if (events.length > 0) {
      setParsedSchedules([{
        date: targetDate,
        dayLabel: "IMPORTED SCHEDULE",
        events
      }]);
    }
  };

  const handleImport = () => {
    onImport(parsedSchedules);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[60] backdrop-blur-md">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-blue-900 p-6 text-white flex justify-between items-center">
          <div>
            <h3 className="font-black text-2xl tracking-tight">Import Schedule</h3>
            <p className="text-blue-200 text-sm">Upload PDF/Image or Paste Text</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-blue-200 transition-colors">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Target Date</label>
              <input 
                type="date" 
                value={targetDate} 
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full border-2 border-gray-100 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  isProcessing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                {isProcessing ? `Processing (${progress}%)` : "Upload PDF / Image"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Raw Extracted Text</label>
            <textarea 
              value={extractedText}
              onChange={(e) => {
                setExtractedText(e.target.value);
                parseTextToEvents(e.target.value);
              }}
              placeholder="Paste schedule text here or upload a file..."
              className="w-full h-32 border-2 border-gray-100 rounded-xl p-4 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {parsedSchedules.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-bold text-gray-700 border-b pb-2">Parsed Events Preview</h4>
              <div className="space-y-2">
                {parsedSchedules[0].events.map((ev, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                    <span className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">{ev.time}</span>
                    <span className="flex-1 font-medium">{ev.eventName}</span>
                    <span className="text-gray-500">📍 {ev.location}</span>
                    <span className="text-gray-500">👕 {ev.uniform}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 bg-white text-gray-600 font-bold rounded-2xl border-2 border-gray-200 hover:bg-gray-100 transition-colors">Cancel</button>
          <button 
            onClick={handleImport}
            disabled={parsedSchedules.length === 0}
            className={`flex-1 py-4 rounded-2xl font-bold shadow-lg transition-all ${
              parsedSchedules.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-900 text-white hover:bg-blue-800 active:scale-[0.98]'
            }`}
          >
            Import {parsedSchedules[0]?.events.length || 0} Events
          </button>
        </div>
      </div>
    </div>
  );
}