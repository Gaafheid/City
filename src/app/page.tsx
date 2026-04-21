import CitySearchForm from '@/components/CitySearchForm';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="text-center">
          <div className="text-5xl mb-4">🗺️</div>
          <h1 className="text-3xl font-bold text-gray-900">City Highlights</h1>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            Discover the best spots in any city.<br />
            Walk with your phone — get info when you arrive.
          </p>
        </div>
        <CitySearchForm />
      </div>
    </main>
  );
}
