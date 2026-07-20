'use client';

import { useState, useMemo } from 'react';
import {
  Globe,
  Search,
  MapPin,
  Coins,
  Clock3,
  Phone,
  ChevronDown,
  ChevronUp,
  AlignLeft,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  countriesDb,
  searchCountries,
  filterCountriesByRegion,
  type Country,
} from '@/lib/countries/countries-data';
import { cn } from '@/lib/utils';
import { usePageLayout } from '@/components/layout';

const REGIONS = [
  'All',
  'Africa',
  'Americas',
  'Asia',
  'Europe',
  'Oceania',
] as const;

type SortMode = 'alphabetical' | 'continent';

function explainTimezone(tz: string): string {
  if (!tz) return 'No timezone data';
  const offset = tz.replace('UTC', '').trim();
  if (!offset || offset === '0' || offset === '+0') {
    return 'Coordinated Universal Time (same as GMT)';
  }
  const hours = parseFloat(offset);
  if (isNaN(hours)) return tz;
  const isAhead = hours > 0;
  const formattedHours = Math.abs(hours);
  const hourText = formattedHours === 1 ? 'hour' : 'hours';
  return `UTC ${offset} (${formattedHours} ${hourText} ${isAhead ? 'ahead of' : 'behind'} GMT/UTC)`;
}

function CountryCard({ c }: { c: Country }) {
  const tzExplanation = explainTimezone(c.timezone);

  return (
    <Card className='p-4 border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all group bkblur relative'>
      <div className='absolute -top-10 -right-10 w-25 h-25 bg-pw-cyan/20 rounded-full blur-3xl' />

      <div className='flex items-start gap-3 mb-3'>
        <img
          src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`}
          alt={`${c.name} Flag`}
          className='w-7 h-5 object-cover rounded-sm border border-white/10 shrink-0 mt-0.5 shadow-sm'
          onError={(e) => {
            // If image fails, hide image element
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className='min-w-0 flex-1 flex gap-1 items-baseline'>
          <h3 className='font-bold text-sm text-pw-text truncate group-hover:text-pw-primary transition-colors'>
            {c.name}
          </h3>
          <p className='text-[9px] text-pw-muted font-mono'>({c.code})</p>
        </div>
      </div>

      <div className='space-y-1.5 text-[11px] text-pw-muted'>
        <div className='flex items-center gap-1'>
          <MapPin className='h-3 w-3 shrink-0' />
          <span>Capital: </span>
          <span className='truncate text-pw-text'>{c.capital}</span>
        </div>
        <div className='flex items-center gap-1'>
          <Coins className='h-3 w-3 shrink-0' />
          <span>Currency: </span>
          <span className='text-pw-text'>{c.currency}</span>
        </div>
        <div className='flex items-center gap-1'>
          <Phone className='h-3 w-3 shrink-0' />
          <span>Code:</span>
          <span className='text-pw-text'>{c.callingCode ?? '—'}</span>
          {c.tld && (
            <span className='ml-1 opacity-60 font-mono text-[9px]'>
              {c.tld}
            </span>
          )}
        </div>
        <div
          className='flex items-center gap-1'
          title={tzExplanation}>
          <Clock3 className='h-3 w-3 shrink-0 text-pw-primary cursor-help' />
          <span className='cursor-help border-b border-dashed border-pw-muted/40'>
            Timezone:
          </span>
          <span className='text-pw-text hover:text-pw-primary font-medium cursor-help transition-colors'>
            {c.timezone ?? '—'}
          </span>
        </div>
        <div className='flex items-center gap-1'>
          <Globe className='h-3 w-3 shrink-0' />
          <span>Language:</span>
          <span className='truncate text-pw-text'>{c.language}</span>
        </div>
      </div>

      <div className='mt-3 pt-3 border-t border-white/5 flex flex-wrap justify-between text-[10px]'>
        <p>
          <span className=' text-pw-muted'>Population: </span>
          {c.population}
        </p>
        {c.areaSqKm && (
          <p>
            <span className=' text-pw-muted'>Landmass: </span>
            {`${c.areaSqKm} km²`}
          </p>
        )}
      </div>
    </Card>
  );
}

function ContinentSection({
  region,
  countries,
}: {
  region: string;
  countries: Country[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className='mb-6'>
      <button
        onClick={() => setOpen((p) => !p)}
        className='flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-widest text-pw-muted hover:text-pw-text transition-colors w-full text-left'>
        <span className='flex-1'>{region}</span>
        <span className='text-[10px] font-normal mr-2'>{countries.length}</span>
        {open ?
          <ChevronUp className='h-3.5 w-3.5' />
        : <ChevronDown className='h-3.5 w-3.5' />}
      </button>

      {open && (
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'>
          {countries.map((c) => (
            <CountryCard
              key={c.code}
              c={c}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CountriesPage() {
  const [search, setSearch] = useState('');
  const [activeRegion, setActiveRegion] = useState<string>('All');
  const [sortMode, setSortMode] = useState<SortMode>('alphabetical');

  const filtered = useMemo<Country[]>(() => {
    let result =
      activeRegion === 'All' ? countriesDb : (
        filterCountriesByRegion(activeRegion)
      );
    if (search.trim()) {
      const matched = searchCountries(search);
      const codes = new Set(matched.map((m) => m.code));
      result = result.filter((c) => codes.has(c.code));
    }
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  }, [search, activeRegion]);

  // Group by region (continent sort mode)
  const grouped = useMemo<Record<string, Country[]>>(() => {
    const g: Record<string, Country[]> = {};
    (REGIONS.filter((r) => r !== 'All') as string[]).forEach((r) => {
      g[r] = filtered.filter((c) => c.region === r);
    });
    return g;
  }, [filtered]);

  return (
    <div className='container mx-auto px-6 py-12 max-w-[1200px] min-h-screen pt-24'>
      {/* Header */}
      <div className='flex flex-col md:flex-row items-start justify-between gap-8 mb-12'>
        <div className='max-w-2xl'>
          <div className='badge mb-4 inline-flex'>
            <Globe className='h-3.5 w-3.5' />
            Global Registry
          </div>
          <h1 className='text-4xl md:text-6xl font-extrabold font-display leading-tight mb-4'>
            Demographic <span className='gradient-text'>Matrix.</span>
          </h1>
          <p className='text-pw-muted text-lg'>
            Explore {countriesDb.length}+ countries - capitals, timezones,
            calling codes, languages, TLDs, and more.
          </p>
        </div>

        <div className='w-full md:w-[380px] shrink-0'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pw-muted pointer-events-none' />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search country, capital, code, +dial...'
              className='pl-10 h-10 bg-white/5 border-white/10'
            />
          </div>
        </div>
      </div>

      {/* Filter + Sort toolbar */}
      <div className='flex flex-wrap gap-2 items-center mb-8'>
        {/* Sort toggle */}
        <div className='flex items-center bg-white/5 rounded-xl border border-white/10 p-1 mr-3'>
          <button
            onClick={() => setSortMode('alphabetical')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              sortMode === 'alphabetical' ?
                'bg-pw-primary text-white'
              : 'text-pw-muted hover:text-pw-text',
            )}>
            <AlignLeft className='h-3 w-3' /> A–Z
          </button>
          <button
            onClick={() => setSortMode('continent')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              sortMode === 'continent' ?
                'bg-pw-primary text-white'
              : 'text-pw-muted hover:text-pw-text',
            )}>
            <Layers className='h-3 w-3' /> Region
          </button>
        </div>

        {/* Region buttons */}
        {REGIONS.map((r) => (
          <Button
            key={r}
            variant={activeRegion === r ? 'default' : 'outline'}
            onClick={() => setActiveRegion(r)}
            size='sm'
            className={cn(
              'h-8 text-xs',
              activeRegion === r ? 'btn-primary' : (
                'border-white/10 hover:bg-white/5 text-pw-muted'
              ),
            )}>
            {r}
          </Button>
        ))}

        <span className='ml-auto text-xs text-pw-muted font-mono'>
          {filtered.length} countries
        </span>
      </div>

      {/* Content */}
      {filtered.length === 0 ?
        <div className='text-center py-24 text-pw-muted'>
          <Globe className='h-12 w-12 mx-auto mb-4 opacity-30' />
          <p>No countries found for &quot;{search}&quot;</p>
        </div>
      : sortMode === 'alphabetical' ?
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'>
          {filtered.map((c) => (
            <CountryCard
              key={c.code}
              c={c}
            />
          ))}
        </div>
      : /* Continent grouping with collapsible sections */
        <div>
          {(REGIONS.filter((r) => r !== 'All') as string[])
            .filter((r) => (grouped[r] ?? []).length > 0)
            .map((region) => (
              <ContinentSection
                key={region}
                region={region}
                countries={grouped[region]}
              />
            ))}
        </div>
      }
    </div>
  );
}
