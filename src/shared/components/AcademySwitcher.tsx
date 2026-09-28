import React from 'react';
import { AcademyId } from '../../types/academy';

interface Props {
  academy: AcademyId;
  onChange: (academy: AcademyId) => void;
}

export default function AcademySwitcher({ academy, onChange }: Props) {
  return (
    <div className="flex rounded-xl bg-slate-200 p-1" aria-label="Academy schedule">
      {(['BLC', 'KTA'] as AcademyId[]).map(option => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-lg px-3 py-2 text-xs font-black transition-colors ${
            academy === option ? 'bg-blue-800 text-white shadow' : 'text-slate-600'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
