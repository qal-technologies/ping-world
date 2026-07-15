export interface Country {
  name: string;
  code: string; // ISO 2-letter code
  flag: string; // Emoji flag or Unicode char
  language: string;
  capital: string;
  currency: string;
  population: string;
  ethnicity: string;
  region: "Americas" | "Europe" | "Asia" | "Africa" | "Oceania";
}

// Highly detailed modular database of key countries across different regions
export const countriesDb: Country[] = [
  { name: "United States", code: "US", flag: "🇺🇸", language: "English", capital: "Washington, D.C.", currency: "USD", population: "331M", ethnicity: "White, Hispanic, African American", region: "Americas" },
  { name: "United Kingdom", code: "GB", flag: "🇬🇧", language: "English", capital: "London", currency: "GBP", population: "67M", ethnicity: "White, Asian, Black", region: "Europe" },
  { name: "Canada", code: "CA", flag: "🇨🇦", language: "English, French", capital: "Ottawa", currency: "CAD", population: "38M", ethnicity: "Canadian, English, French", region: "Americas" },
  { name: "Germany", code: "DE", flag: "🇩🇪", language: "German", capital: "Berlin", currency: "EUR", population: "83M", ethnicity: "German, Turkish", region: "Europe" },
  { name: "France", code: "FR", flag: "🇫🇷", language: "French", capital: "Paris", currency: "EUR", population: "67M", ethnicity: "French, North African", region: "Europe" },
  { name: "Japan", code: "JP", flag: "🇯🇵", language: "Japanese", capital: "Tokyo", currency: "JPY", population: "125M", ethnicity: "Japanese", region: "Asia" },
  { name: "Nigeria", code: "NG", flag: "🇳🇬", language: "English, Hausa, Igbo, Yoruba", capital: "Abuja", currency: "NGN", population: "206M", ethnicity: "Hausa, Yoruba, Igbo", region: "Africa" },
  { name: "Australia", code: "AU", flag: "🇦🇺", language: "English", capital: "Canberra", currency: "AUD", population: "25M", ethnicity: "Australian, English, Irish", region: "Oceania" },
  { name: "India", code: "IN", flag: "🇮🇳", language: "Hindi, English", capital: "New Delhi", currency: "INR", population: "1.3B", ethnicity: "Indo-Aryan, Dravidian", region: "Asia" },
  { name: "Brazil", code: "BR", flag: "🇧🇷", language: "Portuguese", capital: "Brasília", currency: "BRL", population: "212M", ethnicity: "White, Mixed, Black", region: "Americas" },
  { name: "South Africa", code: "ZA", flag: "🇿🇦", language: "Zulu, Xhosa, Afrikaans, English", capital: "Pretoria", currency: "ZAR", population: "59M", ethnicity: "Black, Coloured, White", region: "Africa" },
  { name: "Mexico", code: "MX", flag: "🇲🇽", language: "Spanish", capital: "Mexico City", currency: "MXN", population: "128M", ethnicity: "Mestizo, Indigenous", region: "Americas" },
  { name: "Italy", code: "IT", flag: "🇮🇹", language: "Italian", capital: "Rome", currency: "EUR", population: "60M", ethnicity: "Italian", region: "Europe" },
  { name: "Spain", code: "ES", flag: "🇪🇸", language: "Spanish", capital: "Madrid", currency: "EUR", population: "47M", ethnicity: "Spanish", region: "Europe" },
  { name: "South Korea", code: "KR", flag: "🇰🇷", language: "Korean", capital: "Seoul", currency: "KRW", population: "51M", ethnicity: "Korean", region: "Asia" }
];

// Modular query & algorithm functions to easily support country API route
export function searchCountries(query: string): Country[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return countriesDb;
  return countriesDb.filter(c =>
    c.name.toLowerCase().includes(clean) ||
    c.code.toLowerCase().includes(clean) ||
    c.capital.toLowerCase().includes(clean) ||
    c.language.toLowerCase().includes(clean)
  );
}

export function filterCountriesByRegion(region: string): Country[] {
  if (region === "All") return countriesDb;
  return countriesDb.filter(c => c.region === region);
}

export function getCountryByCode(code: string): Country | undefined {
  return countriesDb.find(c => c.code.toUpperCase() === code.toUpperCase());
}
