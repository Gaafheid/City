'use client';
import type { Highlight } from '@/types';

interface Props {
  highlight: Highlight;
  onView: () => void;
  onDismiss: () => void;
}

export default function ProximityBanner({ highlight, onView, onDismiss }: Props) {
  return (
    <div className="absolute top-4 left-4 right-4 z-10 bg-white rounded-2xl shadow-lg p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Nearby</div>
        <div className="text-sm font-bold text-gray-900 truncate">{highlight.name}</div>
        <div className="text-xs text-gray-500 truncate">{highlight.shortDescription}</div>
      </div>
      <button
        onClick={onView}
        className="flex-shrink-0 bg-blue-600 text-white text-sm font-semibold px-3 py-2 rounded-xl"
      >
        Info
      </button>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-gray-400 text-xl w-7 h-7 flex items-center justify-center"
      >
        ×
      </button>
    </div>
  );
}
