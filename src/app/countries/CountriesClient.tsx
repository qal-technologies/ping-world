// jules edit: Extracted client-side Countries implementation to support server-side SEO & metadata compilation
"use client";

import { useState } from "react";
import {
  Globe,
  Search,
  MapPin,
  Compass,
  Users,
  Coins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  countriesDb,
  searchCountries,
  filterCountriesByRegion,
  Country
} from "@/lib/countries/countries-data";
import { cn } from "@/lib/utils";

export default function CountriesPage() {
  const [search, setSearch] = useState("");
  const [activeRegion, setActiveRegion] = useState<string>("All");

  const regions = ["All", "Africa", "Americas", "Asia", "Europe", "Oceania"];

  const getFilteredCountries = (): Country[] => {
    let result = countriesDb;
    if (activeRegion !== "All") {
      result = filterCountriesByRegion(activeRegion);
    }
    if (search.trim()) {
      const searched = searchCountries(search);
      result = result.filter(c => searched.some(s => s.code === c.code));
    }
    return result;
  };

  const countries = getFilteredCountries();

  return (
    <div className="container mx-auto px-6 py-12 max-w-7xl min-h-screen">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
        <div className="max-w-2xl text-center md:text-left">
          <div className="badge mb-4 inline-flex">
            <Globe className="h-3.5 w-3.5" />
            Global Registry
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold font-display leading-tight mb-4">
            Demographic <span className="gradient-text">Matrix.</span>
          </h1>
          <p className="text-pw-muted text-lg">
            Search, filter, and explore demographics, languages, currencies, and modular country details.
          </p>
        </div>

        <div className="w-full md:w-[400px]">
          <Card className="p-2 card-glow bg-white/5 border-white/10 group">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-pw-muted group-focus-within:text-pw-primary transition-colors" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country name, capital, code..."
                className="pl-12 h-12 bg-transparent border-none focus-visible:ring-0 text-md focus:border-pw-primary"
              />
            </div>
          </Card>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-12">
        {regions.map((region) => (
          <Button
            key={region}
            variant="ghost"
            onClick={() => setActiveRegion(region)}
            className={cn(
              "h-9 rounded-full px-6 transition-all cursor-pointer",
              activeRegion === region
                ? "bg-pw-primary text-white shadow-lg shadow-pw-primary/20"
                : "bg-white/5 text-pw-muted hover:text-pw-text hover:bg-white/10"
            )}
          >
            {region}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {countries.map((c) => (
          <Card key={c.code} className="card-glow h-full flex flex-col p-8 pb-5 group hover:border-pw-primary/30 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="text-4xl rounded-2xl flex items-center justify-center bg-pw-surface border border-white/5 w-14 h-14 shadow-xl">
                {c.flag}
              </div>
              <div className="h-8 px-3 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest flex items-center text-pw-muted">
                {c.region}
              </div>
            </div>

            <h3 className="text-2xl font-bold font-display mb-1 text-pw-text group-hover:text-pw-primary transition-colors">
              {c.name} <span className="text-xs text-pw-muted font-mono uppercase">({c.code})</span>
            </h3>
            <p className="text-xs text-pw-muted mb-4 font-semibold flex items-center gap-1">
              <MapPin className="h-3 w-3 text-pw-secondary" /> Capital: {c.capital}
            </p>

            <div className="space-y-2.5 pt-4 border-t border-white/5 flex-1">
              <div className="flex justify-between text-xs">
                <span className="text-pw-muted flex items-center gap-1.5"><Compass className="h-3.5 w-3.5 text-pw-primary" /> Language:</span>
                <span className="font-bold text-pw-text truncate max-w-[150px]">{c.language}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-pw-muted flex items-center gap-1.5"><Coins className="h-3.5 w-3.5 text-pw-warning" /> Currency:</span>
                <span className="font-mono font-bold text-pw-text">{c.currency}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-pw-muted flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-pw-success" /> Population:</span>
                <span className="font-mono font-bold text-pw-text">{c.population}</span>
              </div>
              <div className="flex flex-col gap-1 pt-2">
                <span className="text-[10px] text-pw-muted font-bold uppercase tracking-wider">Major Ethnicities</span>
                <span className="text-xs text-pw-text italic truncate">{c.ethnicity}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {countries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <Globe className="h-10 w-10 text-pw-muted opacity-20" />
          </div>
          <h3 className="text-2xl font-bold">No countries match filters</h3>
          <p className="text-pw-muted mt-2">Try adjusting your search query or region filter.</p>
          <Button
            variant="link"
            onClick={() => { setSearch(""); setActiveRegion("All"); }}
            className="mt-4 text-pw-primary"
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
