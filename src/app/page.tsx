import CitySearchForm from '@/components/CitySearchForm';

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 100%)' }}
    >
      <div className="w-full max-w-sm flex flex-col items-center gap-10">
        <div className="text-center">
          <div className="text-6xl mb-6">🗺️</div>
          <h1 className="text-4xl font-bold text-white tracking-tight">View the Town</h1>
          <p className="text-blue-300 mt-3 text-sm leading-relaxed">
            Type a city. Get 8 must-see highlights.<br />
            Walk around — get the story when you arrive.
          </p>
        </div>
        <CitySearchForm />
      </div>
    </main>
  );
}
