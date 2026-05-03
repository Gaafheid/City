import CitySearchForm from '@/components/CitySearchForm';

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: '#020617' }}
    >
      {/* Ambient glow orbs */}
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
