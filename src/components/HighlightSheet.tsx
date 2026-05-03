'use client';
import type { Highlight } from '@/types';

interface Props {
  highlight: Highlight;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  monument: 'Monument',
  museum: 'Museum',
  church: 'Church',
  viewpoint: 'Viewpoint',
  market: 'Market',
  park: 'Park',
  restaurant: 'Restaurant',
  neighbourhood: 'Neighbourhood',
  other: 'Point of Interest',
};

export default function HighlightSheet({ highlight, onClose }: Props) {
  const mapsUrl = `maps://maps.apple.com/?daddr=${highlight.coordinates.lat},${highlight.coordinates.lng}&dirflg=w`;
  const fallbackMapsUrl = `https://maps.apple.com/?daddr=${highlight.coordinates.lat},${highlight.coordinates.lng}&dirflg=w`;

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 pointer-events-auto"
        style={{ background: 'rgba(2,6,23,0.6)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative pointer-events-auto max-h-[80vh] flex flex-col rounded-t-3xl"
        style={{
          background: 'linear-gradient(to bottom, #0f172a, #020617)',
          border: '1px solid rgba(34,211,238,0.15)',
          borderBottom: 'none',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(34,211,238,0.3)' }} />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-3 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: '#22d3ee' }}
            >
              {CATEGORY_LABELS[highlight.category] ?? highlight.category}
            </span>
            <h2 className="text-xl font-black text-white leading-tight mt-0.5 tracking-tight">
              {highlight.name}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{highlight.address}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-5 pb-6 flex-1">
          <p className="text-slate-300 text-sm leading-relaxed font-medium mb-4">
            {highlight.shortDescription}
          </p>

          {(highlight.openingHours || highlight.entryFee) && (
            <div className="flex gap-3 mb-4">
              {highlight.openingHours && (
                <div
                  className="flex-1 rounded-xl p-3"
                  style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.12)' }}
                >
                  <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#22d3ee' }}>
                    Hours
                  </div>
                  <div className="text-sm text-slate-300">{highlight.openingHours}</div>
                </div>
              )}
              {highlight.entryFee && (
                <div
                  className="flex-1 rounded-xl p-3"
                  style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.12)' }}
                >
                  <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#22d3ee' }}>
                    Entry
                  </div>
                  <div className="text-sm text-slate-300">{highlight.entryFee}</div>
                </div>
              )}
            </div>
          )}

          <div className="mb-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Background</h3>
            <div className="text-sm text-slate-400 leading-relaxed space-y-3">
              {highlight.backgroundInfo.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl p-3 mb-5"
            style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.15)' }}
          >
            <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#ec4899' }}>
              Tip
            </div>
            <p className="text-sm text-slate-300">{highlight.tips}</p>
          </div>

          <a
            href={mapsUrl}
            onClick={(e) => {
              if (!/iPhone|iPad|iPod/.test(navigator.userAgent)) {
                e.preventDefault();
                window.open(fallbackMapsUrl, '_blank');
              }
            }}
            className="block w-full text-center font-bold py-3.5 rounded-2xl text-sm"
            style={{
              background: 'linear-gradient(to right, #22d3ee, #2dd4bf)',
              color: '#020617',
              boxShadow: '0 0 20px rgba(34,211,238,0.25)',
            }}
          >
            Get Walking Directions
          </a>
        </div>
      </div>
    </div>
  );
}
