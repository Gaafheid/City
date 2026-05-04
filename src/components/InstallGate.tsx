'use client';
import { useState, useEffect, useRef } from 'react';
import CitySearchForm from './CitySearchForm';

export default function InstallGate() {
  const [mode, setMode] = useState<'loading' | 'standalone' | 'browser'>('loading');
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
  const [showApp, setShowApp] = useState(false);
  const installPromptRef = useRef<Event & { prompt: () => Promise<void> } | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) setPlatform('ios');
    else if (/Android/.test(ua)) setPlatform('android');

    setMode(standalone ? 'standalone' : 'browser');

    const handler = (e: Event) => {
      e.preventDefault();
      installPromptRef.current = e as Event & { prompt: () => Promise<void> };
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (mode === 'loading') return null;
  if (mode === 'standalone' || showApp) return <AppShell />;

  return <LandingPage platform={platform} installPrompt={installPromptRef} onSkip={() => setShowApp(true)} />;
}

function AppShell() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: '#020617' }}
    >
      <div
        className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.07) 0%, transparent 70%)' }}
      />
      <div
        className="fixed bottom-1/4 left-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.05) 0%, transparent 70%)' }}
      />
      <div className="w-full max-w-sm flex flex-col items-center gap-10 relative z-10">
        <div className="text-center">
          <div className="text-6xl mb-6">🗺️</div>
          <h1
            className="text-4xl font-black tracking-tighter bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(to right, #22d3ee, #2dd4bf)' }}
          >
            View the Town
          </h1>
          <p className="text-slate-400 mt-3 text-sm leading-relaxed">
            Type a city. Get 8 must-see highlights.<br />
            Walk around — get the story when you arrive.
          </p>
        </div>
        <CitySearchForm />
      </div>
    </main>
  );
}

interface LandingProps {
  platform: 'ios' | 'android' | 'other';
  installPrompt: React.MutableRefObject<(Event & { prompt: () => Promise<void> }) | null>;
  onSkip: () => void;
}

function LandingPage({ platform, installPrompt, onSkip }: LandingProps) {
  const [showIOSHint, setShowIOSHint] = useState(false);

  async function handleInstallClick() {
    if (installPrompt.current) {
      await installPrompt.current.prompt();
    } else {
      setShowIOSHint(true);
    }
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: '#020617' }}
    >
      {/* Glow orbs */}
      <div
        className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)' }}
      />
      <div
        className="fixed bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-sm flex flex-col items-center gap-8 relative z-10">
        {/* Header */}
        <div className="text-center">
          <div className="text-6xl mb-5">🗺️</div>
          <h1
            className="text-4xl font-black tracking-tighter bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(to right, #22d3ee, #2dd4bf)' }}
          >
            View the Town
          </h1>
          <p className="text-slate-400 mt-3 text-sm leading-relaxed">
            Your AI city guide for curious walkers.
          </p>
        </div>

        {/* Features */}
        <div className="w-full flex flex-col gap-3">
          {[
            { icon: '🔍', title: 'Type any city', desc: 'AI picks 8 must-see highlights in seconds' },
            { icon: '🗺️', title: 'See them on a map', desc: 'Interactive map with colour-coded pins' },
            { icon: '📍', title: 'Walk up — get the story', desc: 'Background info appears automatically when you arrive' },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="flex items-start gap-4 p-4 rounded-2xl"
              style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.1)' }}
            >
              <span className="text-2xl flex-shrink-0">{icon}</span>
              <div>
                <p className="text-white font-semibold text-sm">{title}</p>
                <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Install CTA */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleInstallClick}
            className="w-full font-bold py-4 rounded-2xl text-base"
            style={{
              background: 'linear-gradient(to right, #22d3ee, #2dd4bf)',
              color: '#020617',
              boxShadow: '0 0 24px rgba(34,211,238,0.35)',
            }}
          >
            {platform === 'ios' ? '📲 Add to Home Screen' : '📲 Install App'}
          </button>

          <button
            onClick={onSkip}
            className="w-full py-3 text-sm font-medium text-slate-500"
          >
            Use in browser instead →
          </button>
        </div>

        {/* iOS step-by-step hint */}
        {showIOSHint && (
          <div
            className="w-full rounded-2xl p-5 flex flex-col gap-3"
            style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(34,211,238,0.2)' }}
          >
            <p className="text-white font-bold text-sm text-center">How to add to Home Screen</p>
            {[
              { step: '1', text: 'Tap the Share button', sub: '(the square with an arrow, at the bottom of Safari)' },
              { step: '2', text: 'Scroll down and tap', sub: '"Add to Home Screen"' },
              { step: '3', text: 'Tap "Add"', sub: 'The app icon appears on your home screen' },
            ].map(({ step, text, sub }) => (
              <div key={step} className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                  style={{ background: 'rgba(34,211,238,0.15)', color: '#22d3ee' }}
                >
                  {step}
                </div>
                <div>
                  <p className="text-slate-200 text-sm font-semibold">{text}</p>
                  <p className="text-slate-500 text-xs">{sub}</p>
                </div>
              </div>
            ))}
            {/* Arrow pointing to Safari's share bar */}
            <div className="text-center mt-1">
              <span className="text-2xl animate-bounce inline-block">↓</span>
              <p className="text-slate-600 text-xs mt-1">Share button is in the toolbar below</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
