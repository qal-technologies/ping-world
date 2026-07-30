// ============================================================
// Country Data Engine — Resilient country resolution
// Handles aliases, +prefixes, ISO2/ISO3, flag emojis
// Search capability and URL/image fallbacks
// ============================================================

export interface CountryData {
  name: string;
  code: string;        // ISO-3166 alpha-2
  iso3: string;        // ISO-3166 alpha-3
  dialCode: string;
  flag: string;        // Emoji flag
  currency: string;
  currencySymbol: string;
  aliases: string[];   // Search variations, numeric codes, misspellings
}

// Expanded dataset with robust aliases
const GLOBAL_COUNTRIES: CountryData[] = [
  { name: 'Nigeria', code: 'NG', iso3: 'NGA', dialCode: '+234', flag: '🇳🇬', currency: 'NGN', currencySymbol: '₦', aliases: ['ng', 'ngn', 'nga', '234', '+234', 'nigeria', '566', '9ja'] },
  { name: 'United States', code: 'US', iso3: 'USA', dialCode: '+1', flag: '🇺🇸', currency: 'USD', currencySymbol: '$', aliases: ['us', 'usa', '840', '1', '+1', 'united states', 'america', 'united states of america'] },
  { name: 'United Kingdom', code: 'GB', iso3: 'GBR', dialCode: '+44', flag: '🇬🇧', currency: 'GBP', currencySymbol: '£', aliases: ['gb', 'gbr', 'uk', '826', '44', '+44', 'united kingdom', 'britain', 'great britain', 'england'] },
  { name: 'Canada', code: 'CA', iso3: 'CAN', dialCode: '+1', flag: '🇨🇦', currency: 'CAD', currencySymbol: '$', aliases: ['ca', 'can', '124', 'canada', '1', '+1'] },
  { name: 'Germany', code: 'DE', iso3: 'DEU', dialCode: '+49', flag: '🇩🇪', currency: 'EUR', currencySymbol: '€', aliases: ['de', 'deu', 'germany', '276', '49', '+49', 'deutschland'] },
  { name: 'France', code: 'FR', iso3: 'FRA', dialCode: '+33', flag: '🇫🇷', currency: 'EUR', currencySymbol: '€', aliases: ['fr', 'fra', 'france', '250', '33', '+33'] },
  { name: 'India', code: 'IN', iso3: 'IND', dialCode: '+91', flag: '🇮🇳', currency: 'INR', currencySymbol: '₹', aliases: ['in', 'ind', 'india', '356', '91', '+91', 'bharat'] },
  { name: 'Japan', code: 'JP', iso3: 'JPN', dialCode: '+81', flag: '🇯🇵', currency: 'JPY', currencySymbol: '¥', aliases: ['jp', 'jpn', 'japan', '392', '81', '+81', 'nippon', 'nihon'] },
  { name: 'China', code: 'CN', iso3: 'CHN', dialCode: '+86', flag: '🇨🇳', currency: 'CNY', currencySymbol: '¥', aliases: ['cn', 'chn', 'china', '156', '86', '+86', 'prc'] },
  { name: 'Brazil', code: 'BR', iso3: 'BRA', dialCode: '+55', flag: '🇧🇷', currency: 'BRL', currencySymbol: 'R$', aliases: ['br', 'bra', 'brazil', '076', '55', '+55', 'brasil'] },
  { name: 'South Africa', code: 'ZA', iso3: 'ZAF', dialCode: '+27', flag: '🇿🇦', currency: 'ZAR', currencySymbol: 'R', aliases: ['za', 'zaf', 'south africa', '710', '27', '+27', 'sa', 'rsa'] },
  { name: 'Australia', code: 'AU', iso3: 'AUS', dialCode: '+61', flag: '🇦🇺', currency: 'AUD', currencySymbol: '$', aliases: ['au', 'aus', 'australia', '036', '61', '+61', 'oz'] },
  { name: 'Ghana', code: 'GH', iso3: 'GHA', dialCode: '+233', flag: '🇬🇭', currency: 'GHS', currencySymbol: '₵', aliases: ['gh', 'gha', 'ghana', '288', '233', '+233'] },
  { name: 'Kenya', code: 'KE', iso3: 'KEN', dialCode: '+254', flag: '🇰🇪', currency: 'KES', currencySymbol: 'KSh', aliases: ['ke', 'ken', 'kenya', '404', '254', '+254'] },
  { name: 'United Arab Emirates', code: 'AE', iso3: 'ARE', dialCode: '+971', flag: '🇦🇪', currency: 'AED', currencySymbol: 'د.إ', aliases: ['ae', 'are', 'uae', 'dubai', '784', '971', '+971', 'united arab emirates'] },
  { name: 'Mexico', code: 'MX', iso3: 'MEX', dialCode: '+52', flag: '🇲🇽', currency: 'MXN', currencySymbol: '$', aliases: ['mx', 'mex', 'mexico', '484', '52', '+52'] },
  { name: 'Italy', code: 'IT', iso3: 'ITA', dialCode: '+39', flag: '🇮🇹', currency: 'EUR', currencySymbol: '€', aliases: ['it', 'ita', 'italy', '380', '39', '+39', 'italia'] },
  { name: 'Spain', code: 'ES', iso3: 'ESP', dialCode: '+34', flag: '🇪🇸', currency: 'EUR', currencySymbol: '€', aliases: ['es', 'esp', 'spain', '724', '34', '+34', 'espana', 'españa'] },
  { name: 'Russia', code: 'RU', iso3: 'RUS', dialCode: '+7', flag: '🇷🇺', currency: 'RUB', currencySymbol: '₽', aliases: ['ru', 'rus', 'russia', '643', '7', '+7'] },
  { name: 'South Korea', code: 'KR', iso3: 'KOR', dialCode: '+82', flag: '🇰🇷', currency: 'KRW', currencySymbol: '₩', aliases: ['kr', 'kor', 'south korea', '410', '82', '+82', 'korea'] },
];

export class CountryDataEngine {
  /** Resolve any string query to a country */
  public getCountry(query: string): CountryData | null {
    if (!query) return null;
    const clean = query.trim().toLowerCase();

    // Exact match for strict fields
    let match = GLOBAL_COUNTRIES.find(c => 
      c.code.toLowerCase() === clean ||
      c.iso3.toLowerCase() === clean ||
      c.name.toLowerCase() === clean ||
      c.dialCode === clean ||
      c.dialCode.replace('+', '') === clean
    );
    if (match) return match;

    // Alias check
    match = GLOBAL_COUNTRIES.find(c => c.aliases.includes(clean));
    if (match) return match;

    // Partial name match (e.g. "United" -> "United States")
    return GLOBAL_COUNTRIES.find(c => c.name.toLowerCase().includes(clean)) || null;
  }

  /** Return entire database */
  public getAllCountries(): CountryData[] {
    return GLOBAL_COUNTRIES;
  }

  /** Filter list by keyword */
  public searchCountries(keyword: string): CountryData[] {
    if (!keyword) return GLOBAL_COUNTRIES;
    const clean = keyword.trim().toLowerCase();

    return GLOBAL_COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(clean) ||
      c.code.toLowerCase().includes(clean) ||
      c.iso3.toLowerCase().includes(clean) ||
      c.dialCode.includes(clean) ||
      c.currency.toLowerCase().includes(clean) ||
      c.aliases.some(a => a.includes(clean))
    );
  }

  /** Format a phone number with country dial code */
  public formatPhone(countryQuery: string, localNumber: string): string {
    const country = this.getCountry(countryQuery);
    if (!country) return localNumber;
    let cleanLocal = localNumber.trim().replace(/^0/, ''); // strip leading zero
    // Remove formatting characters except +
    cleanLocal = cleanLocal.replace(/[^\d+]/g, '');
    
    if (cleanLocal.startsWith('+')) return cleanLocal; // already formatted
    return `${country.dialCode}${cleanLocal}`;
  }

  /** Generate URL for standard country flag image API (if emojis aren't supported) */
  public getFlagImageUrl(countryCode: string): string {
    const code = (this.getCountry(countryCode)?.code || 'UN').toLowerCase();
    return `https://flagcdn.com/w160/${code}.png`;
  }
}
