import { env } from './env';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Address -> latitude/longitude for Task 3.1.2.
 *
 * Three deliberate choices:
 *
 *  - Provider is pluggable. `none` (default) stores no coordinates, `nominatim`
 *    uses OpenStreetMap's free endpoint so the feature can be demonstrated
 *    without a billing account, and `google` uses the Maps Geocoding API named
 *    in the work breakdown once a key exists.
 *  - Coordinates are stored as plain float columns rather than PostGIS
 *    geometry. The breakdown allows either; floats keep `prisma db push`
 *    working on a stock postgres:15 container with no extension to install,
 *    and a bounding-box filter (Member 4's Task 4.1.1) works fine on floats.
 *  - Failure is never fatal. A profile save must not fail because a third-party
 *    geocoder was slow or rate-limited, so every path returns null instead of
 *    throwing.
 */
export const geocodeAddress = async (address: string): Promise<Coordinates | null> => {
  const query = address?.trim();
  if (!query) return null;

  try {
    switch (env.geocoding.provider) {
      case 'google':
        return await geocodeWithGoogle(query);
      case 'nominatim':
        return await geocodeWithNominatim(query);
      default:
        return null;
    }
  } catch (error) {
    console.warn('[geocode] lookup failed, continuing without coordinates:', error instanceof Error ? error.message : error);
    return null;
  }
};

const signal = () => AbortSignal.timeout(env.geocoding.timeoutMs);

const geocodeWithGoogle = async (address: string): Promise<Coordinates | null> => {
  if (!env.geocoding.googleApiKey) {
    console.warn('[geocode] GEOCODING_PROVIDER=google but GOOGLE_MAPS_API_KEY is empty');
    return null;
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('key', env.geocoding.googleApiKey);

  const response = await fetch(url, { signal: signal() });
  if (!response.ok) return null;

  const body = (await response.json()) as {
    status?: string;
    results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
  };

  const location = body.results?.[0]?.geometry?.location;
  if (body.status !== 'OK' || typeof location?.lat !== 'number' || typeof location?.lng !== 'number') {
    return null;
  }
  return { latitude: location.lat, longitude: location.lng };
};

const geocodeWithNominatim = async (address: string): Promise<Coordinates | null> => {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', address);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');

  // Nominatim's usage policy requires an identifying User-Agent.
  const response = await fetch(url, {
    signal: signal(),
    headers: { 'User-Agent': 'FoodShare/1.0 (university project)' },
  });
  if (!response.ok) return null;

  const body = (await response.json()) as Array<{ lat?: string; lon?: string }>;
  const first = body?.[0];
  if (!first?.lat || !first?.lon) return null;

  const latitude = Number.parseFloat(first.lat);
  const longitude = Number.parseFloat(first.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude };
};
