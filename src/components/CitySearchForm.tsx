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
        className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-white text-gray-900 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
        disabled={isPending}
        autoCapitalize="words"
        autoComplete="off"
      />
      <button
        type="submit"
        disabled={!city.trim() || isPending}
        className="w-full bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-4 rounded-2xl text-base transition-colors"
      >
        {isPending ? 'Loading…' : 'Find Highlights'}
      </button>
    </form>
  );
}
