import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AcademyId } from '../../types/academy';
import { UserRole } from '../../types/schedule';
import { getChatbotAnswer, getChatbotSuggestedQuestions } from './chatbotKnowledge';

type Props = {
  academy: AcademyId;
  role: UserRole;
  cycleName?: string | null;
};

type Message = {
  id: number;
  sender: 'assistant' | 'user';
  text: string;
};

export default function NcoaChatbot({ academy, role, cycleName }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'assistant', text: `Hi! I can help with ${academy} schedules and app features. What do you need?` }
  ]);
  const nextId = useRef(2);
  const endRef = useRef<HTMLDivElement | null>(null);
  const isNative = Capacitor.isNativePlatform();
  const questionHistory = useMemo(
    () => messages.filter(message => message.sender === 'user').map(message => message.text),
    [messages]
  );
  const quickQuestions = useMemo(
    () => getChatbotSuggestedQuestions(questionHistory, { academy, role, cycleName }),
    [questionHistory, academy, role, cycleName]
  );

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const ask = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    const userId = nextId.current++;
    const assistantId = nextId.current++;
    setMessages(current => [
      ...current,
      { id: userId, sender: 'user', text: trimmed },
      { id: assistantId, sender: 'assistant', text: getChatbotAnswer(trimmed, { academy, role, cycleName }) }
    ]);
    setInput('');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    ask(input);
  };

  const bottom = isNative
    ? 'calc(4.75rem + env(safe-area-inset-bottom))'
    : 'calc(1rem + env(safe-area-inset-bottom))';

  return (
    <div className="ncoa-chatbot fixed right-3 z-[70] sm:right-5" style={{ bottom }}>
      {open && (
        <section className="chatbot-panel mb-3 flex h-[min(34rem,72vh)] w-[min(23rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl" role="dialog" aria-label="NCOA Help" aria-modal="false">
          <header className="chatbot-header flex items-center justify-between bg-blue-900 px-4 py-3 text-white">
            <div>
              <div className="text-sm font-black">NCOA Help</div>
              <div className="text-[10px] font-semibold text-blue-200">Basic schedule and app assistance</div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Close NCOA Help">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </header>

          <div className="chatbot-messages min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50 p-3" aria-live="polite">
            {messages.map(message => (
              <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs font-semibold leading-relaxed ${message.sender === 'user' ? 'chatbot-user-message rounded-br-md bg-blue-800 text-white' : 'chatbot-assistant-message rounded-bl-md border border-gray-200 bg-white text-gray-800'}`}>
                  {message.text}
                </div>
              </div>
            ))}
            <div className="pt-1">
              <div className="mb-1.5 text-[9px] font-black uppercase tracking-wider text-gray-400">Suggested questions</div>
              <div className="flex flex-wrap gap-1.5">
                {quickQuestions.map(question => (
                  <button key={question} type="button" onClick={() => ask(question)} className="chatbot-quick-question rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-black text-blue-800">
                    {question}
                  </button>
                ))}
              </div>
            </div>
            <div ref={endRef} />
          </div>

          <form onSubmit={submit} className="chatbot-form flex gap-2 border-t border-gray-200 bg-white p-3">
            <input value={input} onChange={event => setInput(event.target.value)} placeholder="Ask a question..." aria-label="Ask NCOA Help" className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-600" />
            <button type="submit" disabled={!input.trim()} className="rounded-xl bg-blue-800 px-3 text-xs font-black text-white disabled:opacity-40" aria-label="Send question">SEND</button>
          </form>
        </section>
      )}

      <button type="button" onClick={() => setOpen(current => !current)} className="chatbot-launcher ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-900 text-white shadow-xl ring-2 ring-white/70" aria-label={open ? 'Close NCOA Help' : 'Open NCOA Help'} aria-expanded={open}>
        {open ? (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="h-10 w-10" viewBox="0 0 48 48" role="img" aria-label="Cute NCOA helper bot">
            <path d="M24 6v5" stroke="#FFE7A3" strokeWidth="3" strokeLinecap="round" />
            <circle cx="24" cy="5" r="3" fill="#FB7185" />
            <rect x="8" y="13" width="32" height="27" rx="11" fill="#FFF4CC" stroke="#F6C85F" strokeWidth="2" />
            <path d="M8 22H5a3 3 0 000 6h3m32-6h3a3 3 0 010 6h-3" fill="#FFF4CC" stroke="#F6C85F" strokeWidth="2" />
            <circle cx="18" cy="25" r="2.5" fill="#334155" />
            <circle cx="30" cy="25" r="2.5" fill="#334155" />
            <path d="M20 31c1.2 1.4 2.5 2 4 2s2.8-.6 4-2" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
            <circle cx="13" cy="30" r="2" fill="#FDA4AF" opacity=".9" />
            <circle cx="35" cy="30" r="2" fill="#FDA4AF" opacity=".9" />
            <path d="M15 40v3m18-3v3" stroke="#F6C85F" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </div>
  );
}
