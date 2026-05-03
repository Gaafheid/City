'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function CitySearchForm() {
  const [city, setCity] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = city.trim();
    if (!trimmed) return;
    const slug = trimmed.toLowerCase().replace(/\s+/g, '-');
    startTransition(() => {
      router.push(`/city/${slug}?name=${encodeURIComponent(trimmed)}`);
    });
  }

  const active = city.trim() && !isPending;

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
      <input
        type="text"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="e.g. Amsterdam, Rome, Kyoto…"
        className="w-full px-5 py-4 rounded-2xl text-base focus:outline-none placeholder-slate-500 text-white transition-all"
        style={{
          background: 'rgba(15,23,42,0.8)',
          border: city ? '1px solid rgba(34,211,238,0.4)' : '1px solid rgba(255,255,255,0.08)',
          boxShadow: city ? '0 0 15px rgba(34,211,238,0.1)' : 'none',
        }}
        disabled={isPending}
        autoCapitalize="words"
        autoComplete="off"
      />
      <button
        type="submit"
        disabled={!active}
        className="w-full text-white font-bold py-4 rounded-2xl text-base transition-all"
        style={{
          background: active
            ? 'linear-gradient(to right, #22d3ee, #2dd4bf)'
            : 'rgba(34,211,238,0.15)',
          color: active ? '#020617' : 'rgba(255,255,255,0.3)',
          boxShadow: active ? '0 0 20px rgba(34,211,238,0.3)' : 'none',
        }}
      >
        {isPending ? 'Loading…' : 'Find Highlights →'}
      </button>
    </form>
  );
}
