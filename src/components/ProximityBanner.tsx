'use client';
import type { Highlight } from '@/types';

interface Props {
  highlight: Highlight;
  onView: () => void;
  onDismiss: () => void;
}

export default function ProximityBanner({ highlight, onView, onDismiss }: Props) {
  return (
    <div
      className="absolute top-16 left-4 right-4 z-10 rounded-2xl p-4 flex items-center gap-3"
      style={{
        background: 'rgba(2,6,23,0.9)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(34,211,238,0.25)',
        boxShadow: '0 0 20px rgba(34,211,238,0.15)',
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#22d3ee' }}>
          Nearby
        </div>
        <div className="text-sm font-bold text-white truncate">{highlight.name}</div>
        <div className="text-xs text-slate-500 truncate">{highlight.shortDescription}</div>
      </div>
      <button
        onClick={onView}
        className="flex-shrink-0 text-sm font-bold px-3 py-2 rounded-xl"
        style={{
          background: 'linear-gradient(to right, #22d3ee, #2dd4bf)',
          color: '#020617',
          boxShadow: '0 0 12px rgba(34,211,238,0.3)',
        }}
      >
        Info
      </button>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-xl w-7 h-7 flex items-center justify-center"
        style={{ color: 'rgba(255,255,255,0.3)' }}
      >
        ×
      </button>
    </div>
  );
}
