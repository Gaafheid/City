import CityMapWrapper from '@/components/CityMapWrapper';

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ name?: string; country?: string }>;
}) {
  const { slug } = await params;
  const { name, country } = await searchParams;
  const cityName = name ?? slug.replace(/-/g, ' ');

  return (
    <div className="w-full h-screen flex flex-col">
      <CityMapWrapper cityName={cityName} country={country ?? ''} />
    </div>
  );
}
