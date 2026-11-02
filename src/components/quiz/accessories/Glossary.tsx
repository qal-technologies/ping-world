'use client';

import {Card} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {BookOpen} from "lucide-react";
import {useState} from "react";


const Glossary = ({ terms = '' }: { terms?: string }) => {
  const [filter, setFilter] = useState('');
  const entries = terms
    .split(/\r?\n/)
    .map((line) => {
      const separator = line.search(/\s[=:—-]\s/);
      return separator < 0 ? null : (
          {
            word: line.slice(0, separator).trim(),
            definition: line.slice(separator + 3).trim(),
          }
        );
    })
    .filter((entry): entry is { word: string; definition: string } =>
      Boolean(entry?.word && entry.definition),
    );
  const builtIns = [
    {
      word: 'Hypothesis',
      definition: 'A proposed explanation that can be tested through evidence.',
    },
    {
      word: 'Variable',
      definition: 'A factor that can change or be changed in an investigation.',
    },
    { word: 'Velocity', definition: 'Speed in a specified direction.' },
    {
      word: 'Inference',
      definition: 'A conclusion drawn from observations and evidence.',
    },
    {
      word: 'Evidence',
      definition: 'Information used to support or challenge a claim.',
    },
  ];
  const visible = (entries.length ? entries : builtIns).filter((entry) =>
    `${entry.word} ${entry.definition}`
      .toLowerCase()
      .includes(filter.trim().toLowerCase()),
  );
  return (
    <Card className='m-2 w-full max-w-2xl border-white/10 bg-pw-surface p-4 shadow-2xl bkblur sm:p-6'>
      <div className='mb-4 flex items-center gap-2 text-pw-success'>
        <BookOpen size={20} />
        <h3 className='text-xs font-bold uppercase tracking-widest'>
          Glossary
        </h3>
      </div>
      <Input
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder='Search terms…'
        aria-label='Search glossary'
        className='mb-4 bg-black/20'
      />
      <div className='max-h-[65dvh] space-y-3 overflow-y-auto pr-2 custom-scrollbar'>
        {visible.map((entry) => (
          <article
            key={entry.word}
            className='rounded-xl border border-white/5 bg-white/[.03] p-3'>
            <h4 className='mb-1 font-bold text-pw-success'>{entry.word}</h4>
            <p className='text-sm leading-relaxed text-pw-muted'>
              {entry.definition}
            </p>
          </article>
        ))}
        {!visible.length && (
          <p className='py-8 text-center text-sm text-pw-muted'>
            No matching terms.
          </p>
        )}
      </div>
      {terms.trim() && (
        <p className='mt-3 text-[10px] text-pw-muted'>
          Custom terms supplied for this assessment.
        </p>
      )}
    </Card>
  );
};

export default Glossary;