export interface CountryData {
  name: string;
  code: string;
  iso3: string;
  dialCode: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  aliases: string[];
}

const GLOBAL_COUNTRIES: CountryData[] = [
  {
    name: 'Nigeria',
    code: 'NG',
    iso3: 'NGA',
    dialCode: '+234',
    flag: '🇳🇬',
    currency: 'NGN',
    currencySymbol: '₦',
    aliases: ['ng', 'ngn', 'nga', '234', '+234', 'nigeria', '566'],
  },
  {
    name: 'United States',
    code: 'US',
    iso3: 'USA',
    dialCode: '+1',
    flag: '🇺🇸',
    currency: 'USD',
    currencySymbol: '$',
    aliases: ['us', 'usa', '840', '1', '+1', 'united states', 'america'],
  },
  {
    name: 'United Kingdom',
    code: 'GB',
    iso3: 'GBR',
    dialCode: '+44',
    flag: '🇬🇧',
    currency: 'GBP',
    currencySymbol: '£',
    aliases: [
      'gb',
      'gbr',
      'uk',
      '826',
      '44',
      '+44',
      'united kingdom',
      'britain',
    ],
  },
  {
    name: 'Canada',
    code: 'CA',
    iso3: 'CAN',
    dialCode: '+1',
    flag: '🇨🇦',
    currency: 'CAD',
    currencySymbol: '$',
    aliases: ['ca', 'can', '124', 'canada'],
  },
  {
    name: 'Germany',
    code: 'DE',
    iso3: 'DEU',
    dialCode: '+49',
    flag: '🇩🇪',
    currency: 'EUR',
    currencySymbol: '€',
    aliases: ['de', 'deu', 'germany', '276', '49', '+49'],
  },
  {
    name: 'France',
    code: 'FR',
    iso3: 'FRA',
    dialCode: '+33',
    flag: '🇫🇷',
    currency: 'EUR',
    currencySymbol: '€',
    aliases: ['fr', 'fra', 'france', '250', '33', '+33'],
  },
  {
    name: 'India',
    code: 'IN',
    iso3: 'IND',
    dialCode: '+91',
    flag: '🇮🇳',
    currency: 'INR',
    currencySymbol: '₹',
    aliases: ['in', 'ind', 'india', '356', '91', '+91'],
  },
  {
    name: 'Japan',
    code: 'JP',
    iso3: 'JPN',
    dialCode: '+81',
    flag: '🇯🇵',
    currency: 'JPY',
    currencySymbol: '¥',
    aliases: ['jp', 'jpn', 'japan', '392', '81', '+81'],
  },
  {
    name: 'China',
    code: 'CN',
    iso3: 'CHN',
    dialCode: '+86',
    flag: '🇨🇳',
    currency: 'CNY',
    currencySymbol: '¥',
    aliases: ['cn', 'chn', 'china', '156', '86', '+86'],
  },
  {
    name: 'Brazil',
    code: 'BR',
    iso3: 'BRA',
    dialCode: '+55',
    flag: '🇧🇷',
    currency: 'BRL',
    currencySymbol: 'R$',
    aliases: ['br', 'bra', 'brazil', '076', '55', '+55'],
  },
  {
    name: 'South Africa',
    code: 'ZA',
    iso3: 'ZAF',
    dialCode: '+27',
    flag: '🇿🇦',
    currency: 'ZAR',
    currencySymbol: 'R',
    aliases: ['za', 'zaf', 'south africa', '710', '27', '+27'],
  },
  {
    name: 'Australia',
    code: 'AU',
    iso3: 'AUS',
    dialCode: '+61',
    flag: '🇦🇺',
    currency: 'AUD',
    currencySymbol: '$',
    aliases: ['au', 'aus', 'australia', '036', '61', '+61'],
  },
  {
    name: 'Ghana',
    code: 'GH',
    iso3: 'GHA',
    dialCode: '+233',
    flag: '🇬🇭',
    currency: 'GHS',
    currencySymbol: '₵',
    aliases: ['gh', 'gha', 'ghana', '288', '233', '+233'],
  },
  {
    name: 'Kenya',
    code: 'KE',
    iso3: 'KEN',
    dialCode: '+254',
    flag: '🇰🇪',
    currency: 'KES',
    currencySymbol: 'KSh',
    aliases: ['ke', 'ken', 'kenya', '404', '254', '+254'],
  },
  {
    name: 'United Arab Emirates',
    code: 'AE',
    iso3: 'ARE',
    dialCode: '+971',
    flag: '🇦🇪',
    currency: 'AED',
    currencySymbol: 'د.إ',
    aliases: ['ae', 'are', 'uae', 'dubai', '784', '971', '+971'],
  },
];

export class CountryDataEngine {
  public getCountry(query: string): CountryData | null {
    if (!query) return null;
    const clean = query.trim().toLowerCase();

    const match = GLOBAL_COUNTRIES.find(
      (c) =>
        c.code.toLowerCase() === clean ||
        c.iso3.toLowerCase() === clean ||
        c.name.toLowerCase() === clean ||
        c.dialCode.toLowerCase() === clean ||
        c.dialCode.replace('+', '') === clean ||
        c.currency.toLowerCase() === clean ||
        c.aliases.includes(clean),
    );

    return match || null;
  }

  public getAllCountries(): CountryData[] {
    return GLOBAL_COUNTRIES;
  }

  public searchCountries(keyword: string): CountryData[] {
    if (!keyword) return GLOBAL_COUNTRIES;
    const clean = keyword.trim().toLowerCase();

    return GLOBAL_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(clean) ||
        c.code.toLowerCase().includes(clean) ||
        c.iso3.toLowerCase().includes(clean) ||
        c.dialCode.includes(clean) ||
        c.currency.toLowerCase().includes(clean) ||
        c.aliases.some((a) => a.includes(clean)),
    );
  }
}
