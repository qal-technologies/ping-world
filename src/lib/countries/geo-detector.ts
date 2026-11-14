'use client';

export interface GeoLocationInfo {
  country: string;
  continent: string;
  countryCode?: string;
  timezone: string;
}

// Comprehensive IANA Timezone Prefix / Area to Country & Continent Dictionary
const TIMEZONE_GEO_MAP: Record<
  string,
  { country: string; continent: string; code?: string }
> = {
  // Africa
  'Africa/Lagos': { country: 'Nigeria', continent: 'Africa', code: 'NG' },
  'Africa/Cairo': { country: 'Egypt', continent: 'Africa', code: 'EG' },
  'Africa/Johannesburg': {
    country: 'South Africa',
    continent: 'Africa',
    code: 'ZA',
  },
  'Africa/Nairobi': { country: 'Kenya', continent: 'Africa', code: 'KE' },
  'Africa/Accra': { country: 'Ghana', continent: 'Africa', code: 'GH' },
  'Africa/Casablanca': { country: 'Morocco', continent: 'Africa', code: 'MA' },
  'Africa/Algiers': { country: 'Algeria', continent: 'Africa', code: 'DZ' },
  'Africa/Tunis': { country: 'Tunisia', continent: 'Africa', code: 'TN' },
  'Africa/Addis_Ababa': {
    country: 'Ethiopia',
    continent: 'Africa',
    code: 'ET',
  },
  'Africa/Kampala': { country: 'Uganda', continent: 'Africa', code: 'UG' },
  'Africa/Kigali': { country: 'Rwanda', continent: 'Africa', code: 'RW' },
  'Africa/Dakar': { country: 'Senegal', continent: 'Africa', code: 'SN' },
  'Africa/Abidjan': {
    country: "Côte d'Ivoire",
    continent: 'Africa',
    code: 'CI',
  },

  // Europe
  'Europe/London': {
    country: 'United Kingdom',
    continent: 'Europe',
    code: 'GB',
  },
  'Europe/Dublin': { country: 'Ireland', continent: 'Europe', code: 'IE' },
  'Europe/Paris': { country: 'France', continent: 'Europe', code: 'FR' },
  'Europe/Berlin': { country: 'Germany', continent: 'Europe', code: 'DE' },
  'Europe/Rome': { country: 'Italy', continent: 'Europe', code: 'IT' },
  'Europe/Madrid': { country: 'Spain', continent: 'Europe', code: 'ES' },
  'Europe/Amsterdam': {
    country: 'Netherlands',
    continent: 'Europe',
    code: 'NL',
  },
  'Europe/Brussels': { country: 'Belgium', continent: 'Europe', code: 'BE' },
  'Europe/Zurich': { country: 'Switzerland', continent: 'Europe', code: 'CH' },
  'Europe/Vienna': { country: 'Austria', continent: 'Europe', code: 'AT' },
  'Europe/Stockholm': { country: 'Sweden', continent: 'Europe', code: 'SE' },
  'Europe/Oslo': { country: 'Norway', continent: 'Europe', code: 'NO' },
  'Europe/Copenhagen': { country: 'Denmark', continent: 'Europe', code: 'DK' },
  'Europe/Helsinki': { country: 'Finland', continent: 'Europe', code: 'FI' },
  'Europe/Warsaw': { country: 'Poland', continent: 'Europe', code: 'PL' },
  'Europe/Lisbon': { country: 'Portugal', continent: 'Europe', code: 'PT' },
  'Europe/Athens': { country: 'Greece', continent: 'Europe', code: 'GR' },
  'Europe/Prague': {
    country: 'Czech Republic',
    continent: 'Europe',
    code: 'CZ',
  },
  'Europe/Bucharest': { country: 'Romania', continent: 'Europe', code: 'RO' },
  'Europe/Budapest': { country: 'Hungary', continent: 'Europe', code: 'HU' },
  'Europe/Kiev': { country: 'Ukraine', continent: 'Europe', code: 'UA' },
  'Europe/Kyiv': { country: 'Ukraine', continent: 'Europe', code: 'UA' },
  'Europe/Moscow': { country: 'Russia', continent: 'Europe', code: 'RU' },
  'Europe/Istanbul': { country: 'Turkey', continent: 'Europe', code: 'TR' },

  // North America
  'America/New_York': {
    country: 'United States',
    continent: 'North America',
    code: 'US',
  },
  'America/Chicago': {
    country: 'United States',
    continent: 'North America',
    code: 'US',
  },
  'America/Denver': {
    country: 'United States',
    continent: 'North America',
    code: 'US',
  },
  'America/Los_Angeles': {
    country: 'United States',
    continent: 'North America',
    code: 'US',
  },
  'America/Phoenix': {
    country: 'United States',
    continent: 'North America',
    code: 'US',
  },
  'America/Anchorage': {
    country: 'United States',
    continent: 'North America',
    code: 'US',
  },
  'America/Honolulu': {
    country: 'United States',
    continent: 'North America',
    code: 'US',
  },
  'America/Detroit': {
    country: 'United States',
    continent: 'North America',
    code: 'US',
  },
  'America/Toronto': {
    country: 'Canada',
    continent: 'North America',
    code: 'CA',
  },
  'America/Vancouver': {
    country: 'Canada',
    continent: 'North America',
    code: 'CA',
  },
  'America/Montreal': {
    country: 'Canada',
    continent: 'North America',
    code: 'CA',
  },
  'America/Edmonton': {
    country: 'Canada',
    continent: 'North America',
    code: 'CA',
  },
  'America/Winnipeg': {
    country: 'Canada',
    continent: 'North America',
    code: 'CA',
  },
  'America/Halifax': {
    country: 'Canada',
    continent: 'North America',
    code: 'CA',
  },
  'America/Mexico_City': {
    country: 'Mexico',
    continent: 'North America',
    code: 'MX',
  },
  'America/Monterrey': {
    country: 'Mexico',
    continent: 'North America',
    code: 'MX',
  },

  // South & Central America
  'America/Sao_Paulo': {
    country: 'Brazil',
    continent: 'South America',
    code: 'BR',
  },
  'America/Buenos_Aires': {
    country: 'Argentina',
    continent: 'South America',
    code: 'AR',
  },
  'America/Santiago': {
    country: 'Chile',
    continent: 'South America',
    code: 'CL',
  },
  'America/Bogota': {
    country: 'Colombia',
    continent: 'South America',
    code: 'CO',
  },
  'America/Lima': { country: 'Peru', continent: 'South America', code: 'PE' },
  'America/Caracas': {
    country: 'Venezuela',
    continent: 'South America',
    code: 'VE',
  },

  // Asia
  'Asia/Tokyo': { country: 'Japan', continent: 'Asia', code: 'JP' },
  'Asia/Shanghai': { country: 'China', continent: 'Asia', code: 'CN' },
  'Asia/Hong_Kong': { country: 'Hong Kong', continent: 'Asia', code: 'HK' },
  'Asia/Taipei': { country: 'Taiwan', continent: 'Asia', code: 'TW' },
  'Asia/Seoul': { country: 'South Korea', continent: 'Asia', code: 'KR' },
  'Asia/Singapore': { country: 'Singapore', continent: 'Asia', code: 'SG' },
  'Asia/Kolkata': { country: 'India', continent: 'Asia', code: 'IN' },
  'Asia/Calcutta': { country: 'India', continent: 'Asia', code: 'IN' },
  'Asia/Dubai': {
    country: 'United Arab Emirates',
    continent: 'Asia',
    code: 'AE',
  },
  'Asia/Riyadh': { country: 'Saudi Arabia', continent: 'Asia', code: 'SA' },
  'Asia/Bangkok': { country: 'Thailand', continent: 'Asia', code: 'TH' },
  'Asia/Jakarta': { country: 'Indonesia', continent: 'Asia', code: 'ID' },
  'Asia/Manila': { country: 'Philippines', continent: 'Asia', code: 'PH' },
  'Asia/Kuala_Lumpur': { country: 'Malaysia', continent: 'Asia', code: 'MY' },
  'Asia/Karachi': { country: 'Pakistan', continent: 'Asia', code: 'PK' },
  'Asia/Dhaka': { country: 'Bangladesh', continent: 'Asia', code: 'BD' },
  'Asia/Colombo': { country: 'Sri Lanka', continent: 'Asia', code: 'LK' },
  'Asia/Tel_Aviv': { country: 'Israel', continent: 'Asia', code: 'IL' },
  'Asia/Jerusalem': { country: 'Israel', continent: 'Asia', code: 'IL' },
  'Asia/Ho_Chi_Minh': { country: 'Vietnam', continent: 'Asia', code: 'VN' },
  'Asia/Saigon': { country: 'Vietnam', continent: 'Asia', code: 'VN' },

  // Oceania
  'Australia/Sydney': {
    country: 'Australia',
    continent: 'Oceania',
    code: 'AU',
  },
  'Australia/Melbourne': {
    country: 'Australia',
    continent: 'Oceania',
    code: 'AU',
  },
  'Australia/Brisbane': {
    country: 'Australia',
    continent: 'Oceania',
    code: 'AU',
  },
  'Australia/Perth': { country: 'Australia', continent: 'Oceania', code: 'AU' },
  'Australia/Adelaide': {
    country: 'Australia',
    continent: 'Oceania',
    code: 'AU',
  },
  'Pacific/Auckland': {
    country: 'New Zealand',
    continent: 'Oceania',
    code: 'NZ',
  },
};

/**
 * Accurately resolve client country and continent from browser environment
 */
export async function detectClientGeo(): Promise<GeoLocationInfo> {
  let tz = '';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    tz = '';
  }
  // A hosting edge can estimate a country from the request IP. Locale and
  // timezone are not reliable country signals, so they are never used as one.
  let country = 'Unknown';
  let countryCode: string | undefined;
  let serverContinent = 'Unknown';
  try {
    const response = await fetch('/api/geo', { cache: 'no-store' });
    if (response.ok) {
      const result = await response.json();
      if (typeof result.country === 'string') country = result.country;
      if (typeof result.countryCode === 'string')
        countryCode = result.countryCode;
      if (typeof result.continent === 'string')
        serverContinent = result.continent;
    }
  } catch {
    /* Offline and local development may not have edge geo headers. */
  }
  const zoneArea = tz.split('/')[0] || '';
  const continent =
    serverContinent !== 'Unknown' ? serverContinent
    : zoneArea === 'Africa' ? 'Africa'
    : zoneArea === 'Europe' ? 'Europe'
    : zoneArea === 'Asia' ? 'Asia'
    : zoneArea === 'Australia' || zoneArea === 'Pacific' ? 'Oceania'
    : zoneArea === 'America' ? 'Americas'
    : 'Unknown';
  return {
    country,
    continent,
    countryCode,
    timezone: tz || 'UTC',
  };
}
