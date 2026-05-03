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

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
      <input
        type="text"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="e.g. Amsterdam, Rome, Kyoto…"
        className="w-full px-5 py-4 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-blue-400"
        style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}
        disabled={isPending}
        autoCapitalize="words"
        autoComplete="off"
      />
      <button
        type="submit"
        disabled={!city.trim() || isPending}
        className="w-full text-white font-semibold py-4 rounded-2xl text-base transition-all"
        style={{ background: isPending || !city.trim() ? 'rgba(96,165,250,0.4)' : '#3b82f6' }}
      >
        {isPending ? 'Loading…' : 'Find Highlights →'}
      </button>
    </form>
  );
}
