'use client';

import {Card} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";
import {Atom, Search} from "lucide-react";
import {useState} from "react";

const PERIODIC_ELEMENTS =
  `Hydrogen|H,Helium|He,Lithium|Li,Beryllium|Be,Boron|B,Carbon|C,Nitrogen|N,Oxygen|O,Fluorine|F,Neon|Ne,Sodium|Na,Magnesium|Mg,Aluminium|Al,Silicon|Si,Phosphorus|P,Sulfur|S,Chlorine|Cl,Argon|Ar,Potassium|K,Calcium|Ca,Scandium|Sc,Titanium|Ti,Vanadium|V,Chromium|Cr,Manganese|Mn,Iron|Fe,Cobalt|Co,Nickel|Ni,Copper|Cu,Zinc|Zn,Gallium|Ga,Germanium|Ge,Arsenic|As,Selenium|Se,Bromine|Br,Krypton|Kr,Rubidium|Rb,Strontium|Sr,Yttrium|Y,Zirconium|Zr,Niobium|Nb,Molybdenum|Mo,Technetium|Tc,Ruthenium|Ru,Rhodium|Rh,Palladium|Pd,Silver|Ag,Cadmium|Cd,Indium|In,Tin|Sn,Antimony|Sb,Tellurium|Te,Iodine|I,Xenon|Xe,Caesium|Cs,Barium|Ba,Lanthanum|La,Cerium|Ce,Praseodymium|Pr,Neodymium|Nd,Promethium|Pm,Samarium|Sm,Europium|Eu,Gadolinium|Gd,Terbium|Tb,Dysprosium|Dy,Holmium|Ho,Erbium|Er,Thulium|Tm,Ytterbium|Yb,Lutetium|Lu,Hafnium|Hf,Tantalum|Ta,Tungsten|W,Rhenium|Re,Osmium|Os,Iridium|Ir,Platinum|Pt,Gold|Au,Mercury|Hg,Thallium|Tl,Lead|Pb,Bismuth|Bi,Polonium|Po,Astatine|At,Radon|Rn,Francium|Fr,Radium|Ra,Actinium|Ac,Thorium|Th,Protactinium|Pa,Uranium|U,Neptunium|Np,Plutonium|Pu,Americium|Am,Curium|Cm,Berkelium|Bk,Californium|Cf,Einsteinium|Es,Fermium|Fm,Mendelevium|Md,Nobelium|No,Lawrencium|Lr,Rutherfordium|Rf,Dubnium|Db,Seaborgium|Sg,Bohrium|Bh,Hassium|Hs,Meitnerium|Mt,Darmstadtium|Ds,Roentgenium|Rg,Copernicium|Cn,Nihonium|Nh,Flerovium|Fl,Moscovium|Mc,Livermorium|Lv,Tennessine|Ts,Oganesson|Og`
    .split(',')
    .map((entry, index) => {
      const [name, symbol] = entry.split('|');
      const atomicNumber = index + 1;
      let period = 1;
      let group = 1;
      if (atomicNumber === 2) {
        period = 1;
        group = 18;
      } else if (atomicNumber >= 3 && atomicNumber <= 4) {
        period = 2;
        group = atomicNumber - 2;
      } else if (atomicNumber >= 5 && atomicNumber <= 10) {
        period = 2;
        group = atomicNumber + 8;
      } else if (atomicNumber >= 11 && atomicNumber <= 12) {
        period = 3;
        group = atomicNumber - 10;
      } else if (atomicNumber >= 13 && atomicNumber <= 18) {
        period = 3;
        group = atomicNumber;
      } else if (atomicNumber >= 19 && atomicNumber <= 36) {
        period = 4;
        group = atomicNumber - 18;
      } else if (atomicNumber >= 37 && atomicNumber <= 54) {
        period = 5;
        group = atomicNumber - 36;
      } else if (atomicNumber >= 55 && atomicNumber <= 56) {
        period = 6;
        group = atomicNumber - 54;
      } else if (atomicNumber >= 57 && atomicNumber <= 71) {
        period = 8;
        group = atomicNumber - 54;
      } else if (atomicNumber >= 72 && atomicNumber <= 86) {
        period = 6;
        group = atomicNumber - 68;
      } else if (atomicNumber >= 87 && atomicNumber <= 88) {
        period = 7;
        group = atomicNumber - 86;
      } else if (atomicNumber >= 89 && atomicNumber <= 103) {
        period = 9;
        group = atomicNumber - 86;
      } else if (atomicNumber >= 104) {
        period = 7;
        group = atomicNumber - 100;
      }
      const category =
        [2, 10, 18, 36, 54, 86, 118].includes(atomicNumber) ? 'Noble gas'
        : [3, 11, 19, 37, 55, 87].includes(atomicNumber) ? 'Alkali metal'
        : [4, 12, 20, 38, 56, 88].includes(atomicNumber) ? 'Alkaline earth'
        : [9, 17, 35, 53, 85, 117].includes(atomicNumber) ? 'Halogen'
        : [1, 6, 7, 8, 15, 16, 34].includes(atomicNumber) ? 'Nonmetal'
        : atomicNumber >= 57 && atomicNumber <= 71 ? 'Lanthanide'
        : atomicNumber >= 89 && atomicNumber <= 103 ? 'Actinide'
        : (
          (atomicNumber >= 21 && atomicNumber <= 30) ||
          (atomicNumber >= 39 && atomicNumber <= 48) ||
          (atomicNumber >= 72 && atomicNumber <= 80) ||
          (atomicNumber >= 104 && atomicNumber <= 112)
        ) ?
          'Transition metal'
        : [5, 14, 32, 33, 51, 52].includes(atomicNumber) ? 'Metalloid'
        : 'Post-transition metal';
      return { atomicNumber, name, symbol, period, group, category };
    });

const PeriodicTable = () => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(PERIODIC_ELEMENTS[5]);
  const filtered =
    query.trim() ?
      PERIODIC_ELEMENTS.filter((element) =>
        `${element.atomicNumber} ${element.symbol} ${element.name} ${element.category}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : PERIODIC_ELEMENTS;
  const matches = new Set(filtered.map((element) => element.atomicNumber));
  const colors: Record<string, string> = {
    'Noble gas': 'text-sky-300 border-sky-400/30 bg-sky-400/10',
    'Alkali metal': 'text-rose-300 border-rose-400/30 bg-rose-400/10',
    'Alkaline earth': 'text-orange-300 border-orange-400/30 bg-orange-400/10',
    Halogen: 'text-violet-300 border-violet-400/30 bg-violet-400/10',
    Nonmetal: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10',
    Lanthanide: 'text-pink-300 border-pink-400/30 bg-pink-400/10',
    Actinide: 'text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-400/10',
    'Transition metal': 'text-cyan-300 border-cyan-400/30 bg-cyan-400/10',
    Metalloid: 'text-amber-300 border-amber-400/30 bg-amber-400/10',
    'Post-transition metal':
      'text-slate-300 border-slate-400/30 bg-slate-400/10',
  };
  return (
    <Card className='m-2 w-full max-w-6xl border-white/10 bg-pw-surface p-3 shadow-2xl bkblur sm:p-5'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2 text-pw-cyan'>
          <Atom size={20} />
          <h3 className='text-xs font-bold uppercase tracking-widest'>
            Periodic Table · 118 Elements
          </h3>
        </div>
        <div className='relative w-full max-w-xs'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pw-muted' />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Find name, symbol, or number'
            aria-label='Search periodic table'
            className='pl-9 bg-black/20'
          />
        </div>
      </div>
      <div className='overflow-x-auto pb-3 custom-scrollbar'>
        <div
          className='grid min-w-[760px] grid-cols-[repeat(18,minmax(34px,1fr))] gap-1'
          style={{ gridAutoRows: 'minmax(42px,auto)' }}>
          {PERIODIC_ELEMENTS.map((element) => (
            <button
              key={element.atomicNumber}
              type='button'
              onClick={() => setSelected(element)}
              title={`${element.name} · ${element.category}`}
              aria-label={`${element.name}, atomic number ${element.atomicNumber}`}
              className={cn(
                'flex min-w-0 flex-col items-center justify-center rounded-md border p-0.5 text-center transition hover:z-10 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-pw-primary',
                colors[element.category],
                !matches.has(element.atomicNumber) && 'opacity-20',
              )}
              style={{ gridColumn: element.group, gridRow: element.period }}>
              <span className='w-full text-left text-[8px] leading-none opacity-65'>
                {element.atomicNumber}
              </span>
              <strong className='text-xs leading-tight'>
                {element.symbol}
              </strong>
              <span className='hidden w-full truncate text-[7px] opacity-70 xl:block'>
                {element.name}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className='mt-3 flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-black/15 p-3'>
        <div className='min-w-24 text-2xl font-black text-pw-cyan'>
          {selected.symbol}
        </div>
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-bold'>
            {selected.name}{' '}
            <span className='font-normal text-pw-muted'>
              #{selected.atomicNumber}
            </span>
          </p>
          <p className='text-xs text-pw-muted'>
            {selected.category} · Period{' '}
            {selected.period > 7 ?
              selected.period === 8 ?
                '6 (lanthanide)'
              : '7 (actinide)'
            : selected.period}{' '}
            · Group {selected.group}
          </p>
        </div>
        <p className='w-full text-[10px] text-pw-muted sm:w-auto'>
          Select an element for details · Search dims non-matching elements
        </p>
      </div>
    </Card>
  );
};

export default PeriodicTable