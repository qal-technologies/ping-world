// jules edit: Created interactive feedback component with local storage persistence, rating selection, and recent reviews stream.
'use client';

import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Star,
  Send,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { tools } from '@/lib/general/data';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FeedbackItem {
  id: string;
  name: string;
  toolId: string;
  toolTitle: string;
  rating: number;
  comment: string;
  timestamp: string;
}

export default function FeedbackWidget() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [name, setName] = useState('');
  const [selectedToolId, setSelectedToolId] = useState('general');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Load existing feedbacks from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pingworld_user_feedbacks');
    if (saved) {
      try {
        setFeedbacks(JSON.parse(saved));
      } catch (e) {
        console.warn('Feedback parsing failed');
      }
    } else {
      const seed: FeedbackItem[] = [
        {
          id: 'seed-1',
          name: 'Paschal',
          toolId: 'quizzable',
          toolTitle: 'Quizzable',
          rating: 5,
          comment:
            'Absolutely loving the dynamic layout updates, relative question branching, anticheat and the question category. It works like magic!',
          timestamp: new Date().toLocaleDateString(),
        },
        {
          id: 'seed-2',
          name: 'Sarah Jenkins',
          toolId: 'general',
          toolTitle: 'General Site',
          rating: 5,
          comment:
            'Amazing utility suite. Having all of these developer and social creator tools completely free and in one place is unreal.',
          timestamp: new Date().toLocaleDateString(),
        },
      ];
      setFeedbacks(seed);
      localStorage.setItem('pingworld_user_feedbacks', JSON.stringify(seed));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your name!');
      return;
    }
    if (!comment.trim()) {
      toast.error('Please add a recommendation or feedback!');
      return;
    }

    const toolObj = tools.find((t) => t.id === selectedToolId);
    const toolTitle =
      selectedToolId === 'general' ? 'General Site' : toolObj?.title || 'Tool';

    const newFeedback: FeedbackItem = {
      id: `${Date.now()}`,
      name: name.trim(),
      toolId: selectedToolId,
      toolTitle,
      rating,
      comment: comment.trim(),
      timestamp: new Date().toLocaleDateString(),
    };

    const updated = [newFeedback, ...feedbacks];
    setFeedbacks(updated);
    localStorage.setItem('pingworld_user_feedbacks', JSON.stringify(updated));

    setName('');
    setComment('');
    setRating(5);
    setSubmitted(true);
    toast.success('Feedback shared successfully!');

    setTimeout(() => {
      setSubmitted(false);
    }, 4000);
  };

  return (
    <section
      id='recommendations'
      className='relative overflow-hidden py-16 px-6 max-w-7xl mx-auto w-full'>
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-12 items-start'>
        {/* Feedback input form */}
        <div className='lg:col-span-5 space-y-6'>
          <div className='badge inline-flex'>
            <MessageSquare className='h-3.5 w-3.5' />
            Feedback
          </div>
          <h2 className='text-3xl md:text-4xl font-extrabold font-display leading-[1.1] text-pw-text'>
            Say your <span className='gradient-text'>Mind.</span>
          </h2>
          <p className='text-sm text-pw-muted leading-relaxed'>
            Have thoughts about a specific utility or general feedback about
            Ping World? We&apos;d love to hear your recommendations and
            feedbacks. Let&apos;s build Ping World together!
          </p>

          {submitted ?
            <Card className='p-8 border-pw-success/20 bg-pw-success/5 text-center space-y-4'>
              <CheckCircle2 className='h-12 w-12 text-pw-success mx-auto animate-bounce' />
              <h3 className='text-lg font-bold text-pw-success'>
                Feedback Shared!
              </h3>
              <p className='text-xs text-pw-muted leading-relaxed'>
                Thank you for contributing your feedback. Your review has been
                added to our live feedback.
              </p>
            </Card>
          : <Card className='bg-transparent sm:bg-card ring-0 sm:ring-1 sm:card-glow sm:p-4 sm:bg-white/[0.01]'>
              <form
                onSubmit={handleSubmit}
                className='space-y-5 px-1 sm:px-0'>
                <div>
                  <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                    Your Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder='e.g. Paschal'
                    className='bg-white/5 border-white/10 h-10 focus:border-pw-primary text-sm'
                  />
                </div>

                <div>
                  <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                    Select Tool
                  </label>
                  <select
                    value={selectedToolId}
                    onChange={(e) => setSelectedToolId(e.target.value)}
                    className='w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 focus:border-pw-primary focus:outline-none text-xs text-pw-text cursor-pointer'>
                    <option
                      value='general'
                      className='bg-pw-surface text-pw-text'>
                      General Site (Overall Feedback)
                    </option>
                    {tools.map((t) => (
                      <option
                        key={t.id}
                        value={t.id}
                        className='bg-pw-surface text-pw-text'>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                    Rating
                  </label>
                  <div
                    className='flex gap-1.5'
                    role='img'
                    aria-label={`Rating choice: ${rating} of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type='button'
                        onClick={() => setRating(star)}
                        className='text-pw-warning hover:scale-115 transition-transform'>
                        <Star
                          className={cn(
                            'h-6 w-6',
                            star <= rating ? 'fill-pw-warning' : (
                              'text-pw-muted/40'
                            ),
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                    Comment
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder='What did you love? Any requests?'
                    className='w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-pw-primary focus:outline-none resize-none'
                  />
                </div>

                <Button
                  type='submit'
                  className='w-full btn-primary h-11 max-w-[400px] gap-2 font-bold text-xs uppercase tracking-wider'>
                  <Send className='h-4 w-4' /> Share
                </Button>
              </form>
            </Card>
          }
        </div>

        {/* Live feedback feed */}
        <div className='lg:col-span-7 space-y-6'>
          <h3 className='text-sm font-bold uppercase tracking-widest text-pw-muted flex items-center gap-2 pl-1'>
            <Sparkles className='h-4 w-4 text-pw-primary' /> Live Feedback Feed
            ({feedbacks.length})
          </h3>

          <div className='space-y-4 max-h-[460px] overflow-y-auto p-2 custom-scrollbar'>
            {feedbacks.map((item) => (
              <Card
                key={item.id}
                className='p-3 border-white/5 bg-white/[0.01] hover:border-pw-primary/10 transition-colors'>
                <div className='flex justify-between items-start flex-wrap gap-2'>
                  <div>
                    <h4 className='font-bold text-sm text-pw-text'>
                      {item.name}
                    </h4>
                    <span className='text-[10px] text-pw-muted mt-0.5 block'>
                      Commented on:{' '}
                      <span className='font-semibold text-pw-primary'>
                        {item.toolTitle}
                      </span>
                    </span>
                  </div>
                  <div className='flex flex-col items-end'>
                    <div className='flex gap-0.5 text-pw-warning'>
                      {Array.from({ length: item.rating }).map((_, i) => (
                        <Star
                          key={i}
                          className='h-3 w-3 fill-pw-warning text-pw-warning'
                        />
                      ))}
                    </div>
                    <span className='text-[9px] text-pw-muted font-mono mt-1'>
                      {item.timestamp}
                    </span>
                  </div>
                </div>
                <p className='text-xs text-pw-muted leading-relaxed mt-[-5px] whitespace-pre-wrap'>
                  {item.comment}
                </p>
              </Card>
            ))}

            {feedbacks.length === 0 && (
              <p className='text-center py-10 text-xs text-pw-muted italic'>
                No feedback have been shared yet. Be the first!
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
