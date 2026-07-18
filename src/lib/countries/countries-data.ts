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

// Highly comprehensive modular database of countries across all regions
export const countriesDb: Country[] = [
  // --- AFRICA ---
  { name: "Nigeria", code: "NG", flag: "🇳🇬", language: "English, Hausa, Igbo, Yoruba", capital: "Abuja", currency: "NGN", population: "206M", ethnicity: "Hausa, Yoruba, Igbo, Fulani", region: "Africa" },
  { name: "South Africa", code: "ZA", flag: "🇿🇦", language: "Zulu, Xhosa, Afrikaans, English", capital: "Pretoria", currency: "ZAR", population: "59M", ethnicity: "Black, Coloured, White, Indian", region: "Africa" },
  { name: "Egypt", code: "EG", flag: "🇪🇬", language: "Arabic", capital: "Cairo", currency: "EGP", population: "102M", ethnicity: "Egyptian, Nubian", region: "Africa" },
  { name: "Kenya", code: "KE", flag: "🇰🇪", language: "Swahili, English", capital: "Nairobi", currency: "KES", population: "53M", ethnicity: "Kikuyu, Luhya, Luo, Kalenjin", region: "Africa" },
  { name: "Ghana", code: "GH", flag: "🇬🇭", language: "English, Akan", capital: "Accra", currency: "GHS", population: "31M", ethnicity: "Akan, Mole-Dagbon, Ewe", region: "Africa" },
  { name: "Ethiopia", code: "ET", flag: "🇪🇹", language: "Amharic", capital: "Addis Ababa", currency: "ETB", population: "115M", ethnicity: "Oromo, Amhara, Tigrayan", region: "Africa" },
  { name: "Morocco", code: "MA", flag: "🇲🇦", language: "Arabic, Berber", capital: "Rabat", currency: "MAD", population: "36M", ethnicity: "Arab-Berber", region: "Africa" },
  { name: "Algeria", code: "DZ", flag: "🇩🇿", language: "Arabic, Berber", capital: "Algiers", currency: "DZD", population: "43M", ethnicity: "Arab-Berber", region: "Africa" },
  { name: "Uganda", code: "UG", flag: "🇺🇬", language: "English, Swahili", capital: "Kampala", currency: "UGX", population: "45M", ethnicity: "Baganda, Banyankole, Basoga", region: "Africa" },
  { name: "Angola", code: "AO", flag: "🇦🇴", language: "Portuguese", capital: "Luanda", currency: "AOA", population: "32M", ethnicity: "Ovimbundu, Ambundu, Bakongo", region: "Africa" },

  // --- AMERICAS ---
  { name: "United States", code: "US", flag: "🇺🇸", language: "English", capital: "Washington, D.C.", currency: "USD", population: "331M", ethnicity: "White, Hispanic, Black, Asian", region: "Americas" },
  { name: "Canada", code: "CA", flag: "🇨🇦", language: "English, French", capital: "Ottawa", currency: "CAD", population: "38M", ethnicity: "Canadian, English, French, Scottish", region: "Americas" },
  { name: "Brazil", code: "BR", flag: "🇧🇷", language: "Portuguese", capital: "Brasília", currency: "BRL", population: "212M", ethnicity: "White, Mixed (Pardo), Black, East Asian", region: "Americas" },
  { name: "Mexico", code: "MX", flag: "🇲🇽", language: "Spanish", capital: "Mexico City", currency: "MXN", population: "128M", ethnicity: "Mestizo, Indigenous, White", region: "Americas" },
  { name: "Argentina", code: "AR", flag: "🇦🇷", language: "Spanish", capital: "Buenos Aires", currency: "ARS", population: "45M", ethnicity: "European descent, Mestizo", region: "Americas" },
  { name: "Colombia", code: "CO", flag: "🇨🇴", language: "Spanish", capital: "Bogotá", currency: "COP", population: "50M", ethnicity: "Mestizo, White, Afro-Colombian", region: "Americas" },
  { name: "Peru", code: "PE", flag: "🇵🇪", language: "Spanish, Quechua", capital: "Lima", currency: "PEN", population: "32M", ethnicity: "Mestizo, Amerindian, White", region: "Americas" },
  { name: "Chile", code: "CL", flag: "🇨🇱", language: "Spanish", capital: "Santiago", currency: "CLP", population: "19M", ethnicity: "White and non-Indigenous, Mapuche", region: "Americas" },
  { name: "Venezuela", code: "VE", flag: "🇻🇪", language: "Spanish", capital: "Caracas", currency: "VES", population: "28M", ethnicity: "Mestizo, Spanish, Italian, Portuguese", region: "Americas" },
  { name: "Ecuador", code: "EC", flag: "🇪🇨", language: "Spanish, Kichwa", capital: "Quito", currency: "USD", population: "17M", ethnicity: "Mestizo, Amerindian, Afro-Ecuadorian", region: "Americas" },

  // --- ASIA ---
  { name: "Japan", code: "JP", flag: "🇯🇵", language: "Japanese", capital: "Tokyo", currency: "JPY", population: "125M", ethnicity: "Japanese, Korean, Chinese", region: "Asia" },
  { name: "India", code: "IN", flag: "🇮🇳", language: "Hindi, English", capital: "New Delhi", currency: "INR", population: "1.3B", ethnicity: "Indo-Aryan, Dravidian, Mongoloid", region: "Asia" },
  { name: "South Korea", code: "KR", flag: "🇰🇷", language: "Korean", capital: "Seoul", currency: "KRW", population: "51M", ethnicity: "Korean", region: "Asia" },
  { name: "China", code: "CN", flag: "🇨🇳", language: "Mandarin", capital: "Beijing", currency: "CNY", population: "1.4B", ethnicity: "Han Chinese, Zhuang, Hui", region: "Asia" },
  { name: "Indonesia", code: "ID", flag: "🇮🇩", language: "Indonesian", capital: "Jakarta", currency: "IDR", population: "273M", ethnicity: "Javanese, Sundanese, Malay", region: "Asia" },
  { name: "Pakistan", code: "PK", flag: "🇵🇰", language: "Urdu, English", capital: "Islamabad", currency: "PKR", population: "220M", ethnicity: "Punjabi, Pashtun, Sindhi, Saraiki", region: "Asia" },
  { name: "Bangladesh", code: "BD", flag: "🇧🇩", language: "Bengali", capital: "Dhaka", currency: "BDT", population: "164M", ethnicity: "Bengali", region: "Asia" },
  { name: "Philippines", code: "PH", flag: "🇵🇭", language: "Filipino, English", capital: "Manila", currency: "PHP", population: "109M", ethnicity: "Tagalog, Cebuano, Ilocano", region: "Asia" },
  { name: "Vietnam", code: "VN", flag: "🇻🇳", language: "Vietnamese", capital: "Hanoi", currency: "VND", population: "97M", ethnicity: "Kinh (Viet), Tay, Thai", region: "Asia" },
  { name: "Turkey", code: "TR", flag: "🇹🇷", language: "Turkish", capital: "Ankara", currency: "TRY", population: "84M", ethnicity: "Turkish, Kurdish", region: "Asia" },

  // --- EUROPE ---
  { name: "United Kingdom", code: "GB", flag: "🇬🇧", language: "English", capital: "London", currency: "GBP", population: "67M", ethnicity: "White, Asian, Black, Mixed", region: "Europe" },
  { name: "Germany", code: "DE", flag: "🇩🇪", language: "German", capital: "Berlin", currency: "EUR", population: "83M", ethnicity: "German, Turkish, Polish", region: "Europe" },
  { name: "France", code: "FR", flag: "🇫🇷", language: "French", capital: "Paris", currency: "EUR", population: "67M", ethnicity: "French, North African, Italian", region: "Europe" },
  { name: "Italy", code: "IT", flag: "🇮🇹", language: "Italian", capital: "Rome", currency: "EUR", population: "60M", ethnicity: "Italian, German, French", region: "Europe" },
  { name: "Spain", code: "ES", flag: "🇪🇸", language: "Spanish", capital: "Madrid", currency: "EUR", population: "47M", ethnicity: "Spanish, Catalan, Galician", region: "Europe" },
  { name: "Russia", code: "RU", flag: "🇷🇺", language: "Russian", capital: "Moscow", currency: "RUB", population: "145M", ethnicity: "Russian, Tatar, Ukrainian", region: "Europe" },
  { name: "Poland", code: "PL", flag: "🇵🇱", language: "Polish", capital: "Warsaw", currency: "PLN", population: "38M", ethnicity: "Polish, Silesian", region: "Europe" },
  { name: "Ukraine", code: "UA", flag: "🇺🇦", language: "Ukrainian", capital: "Kyiv", currency: "UAH", population: "41M", ethnicity: "Ukrainian, Russian", region: "Europe" },
  { name: "Netherlands", code: "NL", flag: "🇳🇱", language: "Dutch", capital: "Amsterdam", currency: "EUR", population: "17M", ethnicity: "Dutch, Moroccan, Turkish", region: "Europe" },
  { name: "Belgium", code: "BE", flag: "🇧🇪", language: "Dutch, French, German", capital: "Brussels", currency: "EUR", population: "11M", ethnicity: "Flemish, Walloon", region: "Europe" },

  // --- OCEANIA ---
  { name: "Australia", code: "AU", flag: "🇦🇺", language: "English", capital: "Canberra", currency: "AUD", population: "25M", ethnicity: "Australian, English, Irish, Italian", region: "Oceania" },
  { name: "New Zealand", code: "NZ", flag: "🇳🇿", language: "English, Māori", capital: "Wellington", currency: "NZD", population: "5M", ethnicity: "European, Māori, Asian, Pacific peoples", region: "Oceania" },
  { name: "Papua New Guinea", code: "PG", flag: "🇵🇬", language: "Tok Pisin, English, Hiri Motu", capital: "Port Moresby", currency: "PGK", population: "9M", ethnicity: "Melanesian, Papuan, Micronesian", region: "Oceania" },
  { name: "Fiji", code: "FJ", flag: "🇫🇯", language: "English, Fijian, Fiji Hindi", capital: "Suva", currency: "FJD", population: "896K", ethnicity: "iTaukei, Indo-Fijian", region: "Oceania" },
  { name: "Samoa", code: "WS", flag: "🇼🇸", language: "Samoan, English", capital: "Apia", currency: "WST", population: "200K", ethnicity: "Samoan, Euronesian", region: "Oceania" }
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
