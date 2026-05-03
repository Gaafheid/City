'use client';
import dynamic from 'next/dynamic';
import { useHighlights } from '@/hooks/useHighlights';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const MapView = dynamic(() => import('./MapView'), { ssr: false });

const LOADING_STEPS = [
  { icon: '🔍', text: 'Researching the best spots…' },
  { icon: '📍', text: 'Pinning highlights on the map…' },
  { icon: '🗺️', text: 'Building your map…' },
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
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8" style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 100%)' }}>
      <div className="text-5xl animate-bounce">{current.icon}</div>
      <div className="text-center">
        <p className="text-white text-xl font-semibold tracking-tight">{cityName}</p>
        <p className="text-blue-300 text-sm mt-2">{current.text}</p>
      </div>
      <div className="flex gap-2 mt-2">
        {LOADING_STEPS.map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full transition-all duration-500"
            style={{ background: i === step ? '#60a5fa' : 'rgba(255,255,255,0.2)' }}
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
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6" style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 100%)' }}>
        <div className="text-4xl">😕</div>
        <div className="text-center">
          <p className="font-semibold text-white">Something went wrong</p>
          <p className="text-sm text-blue-300 mt-1 max-w-xs">{error ?? 'No highlights found.'}</p>
        </div>
        <Link
          href="/"
          className="bg-blue-500 text-white font-semibold px-6 py-3 rounded-2xl text-sm"
        >
          Try Another City
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/90 backdrop-blur-sm px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link href="/" className="text-blue-600 text-sm font-medium">← Back</Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-900 truncate">{data.city}</h1>
          <p className="text-xs text-gray-500">{data.highlights.length} highlights</p>
        </div>
      </div>
      <MapView cityData={data} />
    </div>
  );
}
