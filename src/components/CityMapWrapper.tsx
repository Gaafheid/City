'use client';
import dynamic from 'next/dynamic';
import { useHighlights } from '@/hooks/useHighlights';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const MapView = dynamic(() => import('./MapView'), { ssr: false });

const LOADING_STEPS = [
  { icon: '🔍', text: 'Researching the best spots…' },
  { icon: '📍', text: 'Pinning highlights on the map…' },
  { icon: '🗺️', text: 'Building your city guide…' },
  { icon: '📡', text: 'Getting GPS ready…' },
];

function LoadingScreen({ cityName }: { cityName: string }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => (s + 1) % LOADING_STEPS.length);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  const current = LOADING_STEPS[step];

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-6 px-8"
      style={{ background: '#020617' }}
    >
      {/* Ambient glow */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)' }}
      />

      <div
        className="text-5xl animate-bounce"
        style={{ filter: 'drop-shadow(0 0 12px rgba(34,211,238,0.6))' }}
      >
        {current.icon}
      </div>

      <div className="text-center relative z-10">
        <p
          className="text-xl font-black tracking-tighter bg-clip-text text-transparent"
          style={{ backgroundImage: 'linear-gradient(to right, #22d3ee, #2dd4bf)' }}
        >
          {cityName}
        </p>
        <p className="text-slate-400 text-sm mt-2">{current.text}</p>
      </div>

      <div className="flex gap-2 mt-2">
        {LOADING_STEPS.map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full transition-all duration-500"
            style={{
              background: i === step ? '#22d3ee' : 'rgba(255,255,255,0.1)',
              boxShadow: i === step ? '0 0 6px rgba(34,211,238,0.8)' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface Props {
  cityName: string;
}

export default function CityMapWrapper({ cityName }: Props) {
  const { data, loading, error } = useHighlights(cityName);

  if (loading) return <LoadingScreen cityName={cityName} />;

  if (error || !data) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-5 px-6"
        style={{ background: '#020617' }}
      >
        <div className="text-4xl">😕</div>
        <div className="text-center">
          <p className="font-bold text-white">Something went wrong</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs">{error ?? 'No highlights found.'}</p>
        </div>
        <Link
          href="/"
          className="text-slate-900 font-bold px-6 py-3 rounded-2xl text-sm"
          style={{
            background: 'linear-gradient(to right, #22d3ee, #2dd4bf)',
            boxShadow: '0 0 20px rgba(34,211,238,0.3)',
          }}
        >
          Try Another City
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{
          background: 'rgba(2,6,23,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(34,211,238,0.1)',
        }}
      >
        <Link
          href="/"
          className="text-sm font-semibold"
          style={{ color: '#22d3ee' }}
        >
          ← Back
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-white truncate">{data.city}</h1>
          <p className="text-xs text-slate-500">{data.highlights.length} highlights</p>
        </div>
      </div>
      <MapView cityData={data} />
    </div>
  );
}
