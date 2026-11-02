'use client';

import {Card} from "@/components/ui/card";
import {StickyNote} from "lucide-react";
import {useState} from "react";

const NoteSheet = ({note}: {note: string;}) => {
  const [personalNote, setPersonalNote] = useState('');
  return (
    <Card className='w-full max-w-2xl rounded-2xl border-white/10 bg-pw-surface p-4 shadow-2xl bkblur sm:p-6'>
      <div className='mb-4 flex items-center gap-2 text-pw-primary'>
        <StickyNote size={20} />
        <h3 className='text-xs font-bold uppercase tracking-widest'>
          Reference Notes
        </h3>
      </div>
      {note.trim() ?
        <div className='mb-4 max-h-[35dvh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/15 p-4 text-sm leading-relaxed text-pw-text'>
          {note}
        </div>
      : <p className='mb-4 rounded-xl border border-white/10 bg-black/15 p-4 text-sm text-pw-muted'>
          No reference note was provided for this question.
        </p>
      }
      <label
        className='mb-2 block text-xs font-semibold text-pw-muted'
        htmlFor='quiz-personal-notes'>
        Your scratch notes (only kept while this question is open)
      </label>
      <textarea
        id='quiz-personal-notes'
        value={personalNote}
        onChange={(event) => setPersonalNote(event.target.value)}
        maxLength={5000}
        placeholder='Write working notes here…'
        className='min-h-32 w-full resize-y rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-pw-text outline-none focus:border-pw-primary/60'
      />
      <p className='mt-1 text-right text-[10px] text-pw-muted'>
        {personalNote.length}/5000
      </p>
    </Card>
  );
};

export default NoteSheet;