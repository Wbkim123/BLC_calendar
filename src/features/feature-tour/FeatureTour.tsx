import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AccessProfile } from '../../types/academy';
import { getTourSteps, TourStep } from './policy';
import './featureTour.css';

function TourIcon({ kind }: { kind: TourStep['icon'] }) {
  const paths = {
    calendar: 'M5 5h14v15H5z M5 9h14 M8 3v4 M16 3v4 M8 12h2 M14 12h2 M8 16h2 M14 16h2',
    search: 'M20 20l-5-5 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
    bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5z M10 20h4 M12 2v2',
    edit: 'M4 17v3h3L20 7l-3-3z M14 7l3 3 M4 7V4h6',
    import: 'M6 3h8l4 4v14H6z M14 3v5h4 M12 10v7 M9 14l3 3 3-3',
    academy: 'M3 21V7h7v14 M14 21V3h7v18 M1 21h22 M6 10h1 M6 14h1 M17 7h1 M17 11h1 M17 15h1',
    settings: 'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6'
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[kind]} /></svg>;
}

export default function FeatureTour({ profile, onClose }: { profile: AccessProfile; onClose: () => void }) {
  const steps = getTourSteps(profile);
  const [index, setIndex] = useState(0);
  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;
  const closeRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => { document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, []);
  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0; }, [index]);
  return <div data-feature-tour="true" className={`feature-tour-overlay${Capacitor.isNativePlatform() ? ' feature-tour-native' : ''}`}>
    <section className="feature-tour-panel" role="dialog" aria-modal="true" aria-labelledby="feature-tour-title" aria-describedby="feature-tour-description"
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); onClose(); }
        if (event.key === 'Tab') {
          const controls = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
          const first = controls[0], final = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); final.focus(); }
          else if (!event.shiftKey && document.activeElement === final) { event.preventDefault(); first.focus(); }
        }
      }}>
      <header className="feature-tour-header soft-modal-header">
        <span>NCOA <span className="feature-tour-header-divider">/</span> APP GUIDE</span>
        <button ref={closeRef} type="button" className="feature-tour-close" aria-label="Close app guide" onClick={onClose}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M6 18L18 6" /></svg>
        </button>
      </header>
      <div ref={contentRef} className="feature-tour-content" aria-live="polite" aria-atomic="true">
        <div className="feature-tour-illustration" aria-hidden="true"><div className="feature-tour-icon"><TourIcon kind={step.icon} /></div><span>{profile.academy} · YOUR QUICK TOUR</span></div>
        <p className="feature-tour-counter">{index + 1} OF {steps.length}</p>
        <h2 id="feature-tour-title">{step.title}</h2>
        <p id="feature-tour-description" className="feature-tour-description">{step.description}</p>
        <ul className="feature-tour-tips">{step.tips.map(tip => <li key={tip}><span aria-hidden="true">✓</span><p>{tip}</p></li>)}</ul>
      </div>
      <footer className="feature-tour-footer">
        <div className="feature-tour-progress" aria-label={`Step ${index + 1} of ${steps.length}`}>{steps.map((item, position) => <span key={item.id} className={position === index ? 'active' : ''} />)}</div>
        <div className="feature-tour-actions">
          {index === 0 ? <button type="button" className="feature-tour-secondary" onClick={onClose}>Skip guide</button>
            : <button type="button" className="feature-tour-secondary" onClick={() => setIndex(index - 1)}>Back</button>}
          <button type="button" className="feature-tour-primary" onClick={() => last ? onClose() : setIndex(index + 1)}>{last ? 'Got it' : 'Next'}<span aria-hidden="true">{last ? ' ✓' : ' →'}</span></button>
        </div>
        <p>Always available in Settings → App guide</p>
      </footer>
    </section>
  </div>;
}
