'use client';
import dynamic from 'next/dynamic';
import { useHighlights } from '@/hooks/useHighlights';
import Link from 'next/link';

const MapView = dynamic(() => import('./MapView'), { ssr: false });

interface Props {
  cityName: string;
}

export default function CityMapWrapper({ cityName }: Props) {
  const { data, loading, error } = useHighlights(cityName);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gray-50 px-6">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="font-semibold text-gray-900">Finding highlights…</p>
          <p className="text-sm text-gray-500 mt-1">Asking Claude about {cityName}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 bg-gray-50 px-6">
        <div className="text-4xl">😕</div>
        <div className="text-center">
          <p className="font-semibold text-gray-900">Something went wrong</p>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">{error ?? 'No highlights found.'}</p>
        </div>
        <Link
          href="/"
          className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-2xl text-sm"
        >
          Try Another City
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/90 backdrop-blur-sm px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link href="/" className="text-blue-600 text-sm font-medium">
          ← Back
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-900 truncate">{data.city}</h1>
          <p className="text-xs text-gray-500">{data.highlights.length} highlights</p>
        </div>
      </div>
      <MapView cityData={data} />
    </div>
  );
}
