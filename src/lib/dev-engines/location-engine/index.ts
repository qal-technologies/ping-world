// ============================================================
// Location Engine — Multi-source, high-accuracy geolocation
// Strategy: Browser GPS → IP geocoding (3 APIs) → fallback
// Returns: lat, lng, country, city, region, timezone, ISP, speed
// ============================================================

export type LocationSource =
  | 'browser_gps'
  | 'ip_geocoding'
  | 'ip_secondary'
  | 'ip_tertiary'
  | 'fallback';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number; // GPS accuracy in meters
  altitude?: number; // GPS altitude in meters (if available)
  heading?: number; // GPS heading in degrees
  speed?: number; // GPS speed in m/s
  country: string;
  countryCode: string;
  region?: string;
  regionCode?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  timezone?: string;
  utcOffset?: string;
  currency?: string;
  callingCode?: string;
  ip?: string;
  isp?: string;
  org?: string;
  asn?: string;
  isVPN?: boolean;
  isProxy?: boolean;
  source: LocationSource;
  confidence: number; // 0.0 – 1.0 (GPS = 0.99, IP = 0.75, fallback = 0.1)
  fetchedAt: string; // ISO timestamp
}

export interface DistanceResult {
  km: number;
  miles: number;
  bearing: number; // heading in degrees
  bearingLabel: string; // e.g. 'NE', 'SW'
}

export interface LocationOptions {
  timeout?: number; // GPS timeout in ms (default: 8000)
  highAccuracy?: boolean; // Enable high accuracy GPS (default: true)
  ipFallback?: boolean; // Try IP geocoding on GPS failure (default: true)
  cacheMs?: number; // Cache result for N ms (default: 120 000 = 2 min)
}

let _locationCache: { data: LocationData; expiresAt: number } | null = null;

const IP_APIS = [
  'https://ipapi.co/json/',
  'https://ip-api.com/json/?fields=status,country,countryCode,regionName,region,city,district,zip,lat,lon,timezone,offset,currency,callingCode,isp,org,as,query,proxy,hosting',
  'https://ipwho.is/',
];

export class LocationEngine {
  /**
   * Get current location using:
   * 1. Browser GPS (most accurate)
   * 2. IP geocoding via ipapi.co
   * 3. IP geocoding via ip-api.com
   * 4. IP geocoding via ipwho.is
   * 5. Hardcoded fallback
   */
  public async getCurrentLocation(
    options: LocationOptions = {},
  ): Promise<LocationData> {
    const cacheMs = options.cacheMs ?? 120_000;
    const now = Date.now();

    // Cache check
    if (_locationCache && now < _locationCache.expiresAt) {
      return _locationCache.data;
    }

    let result: LocationData | null = null;

    // ---- Strategy 1: Browser GPS ----
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      result = await this._tryBrowserGPS(options);
    }

    // ---- Strategy 2–4: IP geocoding (in order) ----
    if (!result && options.ipFallback !== false) {
      result = await this._tryAllIPApis();
    }

    // ---- Strategy 5: Hardcoded fallback ----
    if (!result) {
      result = this._getFallback();
    }

    // Cache result
    _locationCache = { data: result, expiresAt: now + cacheMs };
    return result;
  }

  /** Get location using only IP geocoding (browser permission not required) */
  public async getLocationByIP(): Promise<LocationData> {
    return (await this._tryAllIPApis()) ?? this._getFallback();
  }

  /** Get browser GPS coordinates without reverse geocoding */
  public async getRawGPSCoordinates(
    options: LocationOptions = {},
  ): Promise<GeolocationCoordinates | null> {
    if (typeof window === 'undefined' || !('geolocation' in navigator))
      return null;
    try {
      return await new Promise<GeolocationCoordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          reject,
          {
            timeout: options.timeout ?? 8000,
            enableHighAccuracy: options.highAccuracy ?? true,
            maximumAge: 60_000,
          },
        );
      });
    } catch {
      return null;
    }
  }

  /** Calculate Haversine distance + bearing between two coordinate pairs */
  public calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): DistanceResult {
    const R = 6371;
    const φ1 = this._rad(lat1),
      φ2 = this._rad(lat2);
    const Δφ = this._rad(lat2 - lat1),
      Δλ = this._rad(lon2 - lon1);

    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const km = Number((R * c).toFixed(2));
    const miles = Number((km * 0.621371).toFixed(2));

    // Bearing
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const bearingLabel = dirs[Math.round(bearing / 45) % 8];

    return { km, miles, bearing: Number(bearing.toFixed(1)), bearingLabel };
  }

  /** Check if coordinates are within a bounding box */
  public isWithinBounds(
    lat: number,
    lon: number,
    bounds: { north: number; south: number; east: number; west: number },
  ): boolean {
    return (
      lat >= bounds.south &&
      lat <= bounds.north &&
      lon >= bounds.west &&
      lon <= bounds.east
    );
  }

  /** Format coordinates as DMS (Degrees, Minutes, Seconds) */
  public toDMS(lat: number, lon: number): { lat: string; lon: string } {
    const fmt = (val: number, pos: string, neg: string) => {
      const abs = Math.abs(val);
      const d = Math.floor(abs);
      const m = Math.floor((abs - d) * 60);
      const s = ((abs - d - m / 60) * 3600).toFixed(2);
      return `${d}°${m}'${s}" ${val >= 0 ? pos : neg}`;
    };
    return { lat: fmt(lat, 'N', 'S'), lon: fmt(lon, 'E', 'W') };
  }

  /** Invalidate cached location */
  public clearCache(): void {
    _locationCache = null;
  }

  // ---- Private ----

  private async _tryBrowserGPS(
    options: LocationOptions,
  ): Promise<LocationData | null> {
    try {
      const coords = await new Promise<GeolocationCoordinates>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos.coords),
            reject,
            {
              timeout: options.timeout ?? 8000,
              enableHighAccuracy: options.highAccuracy ?? true,
              maximumAge: 30_000,
            },
          );
        },
      );

      // Try to reverse geocode via IP API for country/city metadata
      const meta = await this._tryAllIPApis();

      return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        altitude: coords.altitude ?? undefined,
        heading: coords.heading ?? undefined,
        speed: coords.speed ?? undefined,
        country: meta?.country ?? 'Unknown',
        countryCode: meta?.countryCode ?? 'XX',
        region: meta?.region,
        regionCode: meta?.regionCode,
        city: meta?.city,
        postalCode: meta?.postalCode,
        timezone: meta?.timezone,
        utcOffset: meta?.utcOffset,
        currency: meta?.currency,
        callingCode: meta?.callingCode,
        ip: meta?.ip,
        isp: meta?.isp,
        org: meta?.org,
        isProxy: meta?.isProxy,
        isVPN: meta?.isVPN,
        source: 'browser_gps',
        confidence: 0.99,
        fetchedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  private async _tryAllIPApis(): Promise<LocationData | null> {
    // Try ipapi.co
    try {
      const res = await fetch(IP_APIS[0], {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.latitude) return this._parseIpapiCo(d);
      }
    } catch {
      /* try next */
    }

    // Try ip-api.com
    try {
      const res = await fetch(IP_APIS[1], {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.status === 'success') return this._parseIpApiCom(d);
      }
    } catch {
      /* try next */
    }

    // Try ipwho.is
    try {
      const res = await fetch(IP_APIS[2], {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success) return this._parseIpWhoIs(d);
      }
    } catch {
      /* exhausted */
    }

    return null;
  }

  private _parseIpapiCo(d: any): LocationData {
    return {
      latitude: d.latitude ?? 0,
      longitude: d.longitude ?? 0,
      country: d.country_name ?? 'Unknown',
      countryCode: d.country_code ?? 'XX',
      region: d.region,
      regionCode: d.region_code,
      city: d.city,
      postalCode: d.postal,
      timezone: d.timezone,
      utcOffset: d.utc_offset,
      currency: d.currency,
      callingCode: d.country_calling_code,
      ip: d.ip,
      isp: d.org,
      org: d.org,
      isVPN: false,
      isProxy: false,
      source: 'ip_geocoding',
      confidence: 0.78,
      fetchedAt: new Date().toISOString(),
    };
  }

  private _parseIpApiCom(d: any): LocationData {
    return {
      latitude: d.lat ?? 0,
      longitude: d.lon ?? 0,
      country: d.country ?? 'Unknown',
      countryCode: d.countryCode ?? 'XX',
      region: d.regionName,
      regionCode: d.region,
      city: d.city,
      district: d.district,
      postalCode: d.zip,
      timezone: d.timezone,
      currency: d.currency,
      callingCode: d.callingCode,
      ip: d.query,
      isp: d.isp,
      org: d.org,
      asn: d.as,
      isProxy: d.proxy === true,
      isVPN: d.hosting === true,
      source: 'ip_secondary',
      confidence: 0.75,
      fetchedAt: new Date().toISOString(),
    };
  }

  private _parseIpWhoIs(d: any): LocationData {
    return {
      latitude: d.latitude ?? 0,
      longitude: d.longitude ?? 0,
      country: d.country ?? 'Unknown',
      countryCode: d.country_code ?? 'XX',
      region: d.region,
      city: d.city,
      postalCode: d.postal,
      timezone: d.timezone?.id,
      ip: d.ip,
      isp: d.connection?.isp,
      org: d.connection?.org,
      asn: d.connection?.asn,
      isProxy: d.security?.is_proxy ?? false,
      isVPN: d.security?.is_vpn ?? false,
      source: 'ip_tertiary',
      confidence: 0.72,
      fetchedAt: new Date().toISOString(),
    };
  }

  private _getFallback(): LocationData {
    return {
      latitude: 0,
      longitude: 0,
      country: 'Unknown',
      countryCode: 'XX',
      source: 'fallback',
      confidence: 0.1,
      fetchedAt: new Date().toISOString(),
    };
  }

  private _rad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}
