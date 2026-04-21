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
        className="absolute inset-0 bg-black/30 pointer-events-auto"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative pointer-events-auto bg-white rounded-t-3xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-3 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
              {CATEGORY_LABELS[highlight.category] ?? highlight.category}
            </span>
            <h2 className="text-xl font-bold text-gray-900 leading-tight mt-0.5">
              {highlight.name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{highlight.address}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-lg"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-5 pb-6 flex-1">
          <p className="text-gray-700 text-sm leading-relaxed font-medium mb-4">
            {highlight.shortDescription}
          </p>

          {(highlight.openingHours || highlight.entryFee) && (
            <div className="flex gap-4 mb-4">
              {highlight.openingHours && (
                <div className="flex-1 bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Hours</div>
                  <div className="text-sm text-gray-700">{highlight.openingHours}</div>
                </div>
              )}
              {highlight.entryFee && (
                <div className="flex-1 bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Entry</div>
                  <div className="text-sm text-gray-700">{highlight.entryFee}</div>
                </div>
              )}
            </div>
          )}

          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Background</h3>
            <div className="text-sm text-gray-600 leading-relaxed space-y-3">
              {highlight.backgroundInfo.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-5">
            <div className="text-xs text-amber-700 font-semibold uppercase tracking-wide mb-1">Tip</div>
            <p className="text-sm text-amber-800">{highlight.tips}</p>
          </div>

          <a
            href={mapsUrl}
            onClick={(e) => {
              // Fallback to web URL on desktop
              if (!/iPhone|iPad|iPod/.test(navigator.userAgent)) {
                e.preventDefault();
                window.open(fallbackMapsUrl, '_blank');
              }
            }}
            className="block w-full bg-blue-600 text-white text-center font-semibold py-3.5 rounded-2xl text-sm"
          >
            Get Walking Directions
          </a>
        </div>
      </div>
    </div>
  );
}
