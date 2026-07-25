export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  country: string;
  countryCode: string;
  region?: string;
  city?: string;
  postalCode?: string;
  timezone?: string;
  ip?: string;
  source: 'browser' | 'ip_geocoding' | 'fallback';
}

export class LocationEngine {
  public async getCurrentLocation(): Promise<LocationData> {
    // Try browser HTML5 geolocation first
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      try {
        const coords = await new Promise<GeolocationCoordinates>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve(pos.coords),
              (err) => reject(err),
              { timeout: 5000, enableHighAccuracy: true },
            );
          },
        );

        const approxCountry = this.mapCoordsToCountry(
          coords.latitude,
          coords.longitude,
        );
        return {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          country: approxCountry.name,
          countryCode: approxCountry.code,
          source: 'browser',
        };
      } catch (e) {
        // Fallback to IP geocoding
      }
    }

    // IP Geocoding Fallback
    return this.getLocationByIP();
  }

  public async getLocationByIP(): Promise<LocationData> {
    try {
      const res = await fetch('https://ipapi.co/json/', {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          country: data.country_name || 'United States',
          countryCode: data.country_code || 'US',
          region: data.region || 'California',
          city: data.city || 'San Francisco',
          postalCode: data.postal || '94105',
          timezone: data.timezone || 'America/Los_Angeles',
          ip: data.ip,
          source: 'ip_geocoding',
        };
      }
    } catch (e) {}

    // Secondary IP fallback
    try {
      const res = await fetch(
        'http://ip-api.com/json/?fields=status,country,countryCode,regionName,city,zip,lat,lon,timezone,query',
      );
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          return {
            latitude: data.lat,
            longitude: data.lon,
            country: data.country,
            countryCode: data.countryCode,
            region: data.regionName,
            city: data.city,
            postalCode: data.zip,
            timezone: data.timezone,
            ip: data.query,
            source: 'ip_geocoding',
          };
        }
      }
    } catch (e) {}

    return {
      latitude: 37.7749,
      longitude: -122.4194,
      country: 'United States',
      countryCode: 'US',
      city: 'San Francisco',
      region: 'California',
      source: 'fallback',
    };
  }

  public calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    unit: 'km' | 'miles' = 'km',
  ): number {
    const R = unit === 'km' ? 6371 : 3958.8;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  private mapCoordsToCountry(
    lat: number,
    lng: number,
  ): { name: string; code: string } {
    if (lat >= 24.39 && lat <= 49.38 && lng >= -124.84 && lng <= -66.88)
      return { name: 'United States', code: 'US' };
    if (lat >= 41.67 && lat <= 83.11 && lng >= -141.0 && lng <= -52.62)
      return { name: 'Canada', code: 'CA' };
    if (lat >= 49.8 && lat <= 60.9 && lng >= -10.5 && lng <= 1.8)
      return { name: 'United Kingdom', code: 'GB' };
    if (lat >= 47.2 && lat <= 55.1 && lng >= 5.8 && lng <= 15.0)
      return { name: 'Germany', code: 'DE' };
    if (lat >= -43.6 && lat <= -10.6 && lng >= 113.3 && lng <= 153.6)
      return { name: 'Australia', code: 'AU' };
    if (lat >= 20.5 && lat <= 37.1 && lng >= 68.1 && lng <= 97.4)
      return { name: 'India', code: 'IN' };
    if (lat >= 4.1 && lat <= 13.9 && lng >= 2.6 && lng <= 14.6)
      return { name: 'Nigeria', code: 'NG' };
    return { name: 'Unknown Location', code: 'UN' };
  }

  private toRadians(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
