'use client';
import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCitySearch, type CitySuggestion } from '@/hooks/useCitySearch';

export default function CitySearchForm() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CitySuggestion | null>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const containerRef = useRef<HTMLFormElement>(null);

  const { suggestions, loading: searching } = useCitySearch(selected ? '' : query);

  // Open dropdown when suggestions arrive
  useEffect(() => {
    if (suggestions.length > 0) setOpen(true);
  }, [suggestions]);

  // Close dropdown on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  function handleInputChange(value: string) {
    setQuery(value);
    setSelected(null); // require re-selection when user edits
    setOpen(false);
  }

  function handleSelect(city: CitySuggestion) {
    setSelected(city);
    setQuery(city.name);
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || isPending) return;
    const slug = selected.name.toLowerCase().replace(/\s+/g, '-');
    startTransition(() => {
      router.push(
        `/city/${slug}?name=${encodeURIComponent(selected.name)}&country=${encodeURIComponent(selected.country)}&lat=${selected.lat}&lng=${selected.lng}`
      );
    });
  }

  const canSubmit = !!selected && !isPending;

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3" ref={containerRef}>
      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          placeholder="e.g. Amsterdam, Rome, Kyoto…"
          className="w-full px-5 py-4 rounded-2xl text-base focus:outline-none placeholder-slate-500 text-white transition-all"
          style={{
            background: 'rgba(15,23,42,0.8)',
            border: selected
              ? '1px solid rgba(34,211,238,0.5)'
              : query
              ? '1px solid rgba(255,255,255,0.15)'
              : '1px solid rgba(255,255,255,0.08)',
            boxShadow: selected ? '0 0 15px rgba(34,211,238,0.12)' : 'none',
          }}
          disabled={isPending}
          autoCapitalize="words"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />

        {/* Search spinner */}
        {searching && !selected && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div
              className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'rgba(34,211,238,0.4)', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {/* Confirmed city check */}
        {selected && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#22d3ee' }}>
            ✓
          </div>
        )}

        {/* Dropdown */}
        {open && suggestions.length > 0 && (
          <ul
            className="absolute top-full mt-2 left-0 right-0 rounded-2xl overflow-hidden z-50"
            style={{
              background: 'rgba(10,17,38,0.97)',
              border: '1px solid rgba(34,211,238,0.2)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(16px)',
            }}
          >
            {suggestions.map((city) => (
              <li key={city.key}>
                <button
                  type="button"
                  onPointerDown={() => handleSelect(city)}
                  className="w-full text-left px-5 py-3 flex flex-col gap-0.5 transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(34,211,238,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <span className="text-white font-semibold text-sm">{city.name}</span>
                  <span className="text-slate-500 text-xs">
                    {[city.region, city.country].filter(Boolean).join(', ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Hint when query typed but not confirmed */}
      {query.length >= 2 && !selected && !searching && suggestions.length === 0 && (
        <p className="text-xs text-slate-600 px-1">No cities found — try a different spelling.</p>
      )}
      {query.length >= 2 && !selected && suggestions.length > 0 && !open && (
        <p className="text-xs text-slate-600 px-1">Select a city from the list to continue.</p>
      )}

      {/* Selected city pill */}
      {selected && (
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs"
          style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)' }}
        >
          <span style={{ color: '#22d3ee' }}>📍</span>
          <span className="text-slate-300 flex-1">
            {[selected.name, selected.region, selected.country].filter(Boolean).join(', ')}
          </span>
          <button
            type="button"
            onClick={() => { setSelected(null); setQuery(''); }}
            className="text-slate-600 hover:text-slate-400 ml-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full font-bold py-4 rounded-2xl text-base transition-all"
        style={{
          background: canSubmit
            ? 'linear-gradient(to right, #22d3ee, #2dd4bf)'
            : 'rgba(34,211,238,0.1)',
          color: canSubmit ? '#020617' : 'rgba(255,255,255,0.2)',
          boxShadow: canSubmit ? '0 0 20px rgba(34,211,238,0.3)' : 'none',
          cursor: canSubmit ? 'pointer' : 'default',
        }}
      >
        {isPending ? 'Loading…' : 'Find Highlights →'}
      </button>
    </form>
  );
}
