import CityMapWrapper from '@/components/CityMapWrapper';

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ name?: string; country?: string; lat?: string; lng?: string }>;
}) {
  const { slug } = await params;
  const { name, country, lat, lng } = await searchParams;
  const cityName = name ?? slug.replace(/-/g, ' ');

  const parsedLat = parseFloat(lat ?? '');
  const parsedLng = parseFloat(lng ?? '');
  const center = isFinite(parsedLat) && isFinite(parsedLng)
    ? { lat: parsedLat, lng: parsedLng }
    : undefined;

  return (
    <div className="w-full h-screen flex flex-col">
      <CityMapWrapper cityName={cityName} country={country ?? ''} center={center} />
    </div>
  );
}
