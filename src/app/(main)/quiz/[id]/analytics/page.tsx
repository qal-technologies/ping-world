'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  BarChart3,
  ArrowLeft,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  PieChart,
  HelpCircle,
  Download,
  RefreshCw,
  Award,
  Layers,
  Activity,
  FileText,
  AlertCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { HybridStorage } from '@/lib/storage-utils';
import { capFirst, cn } from '@/lib/utils';
import { exportResponsesToCSV, exportResponsesToJSON } from '@/lib/quiz/text-parser';
import Link from 'next/link';

export default function FullscreenQuizAnalytics() {
  const params = useParams();
  const router = useRouter();
  const quizId = params?.id as string;

  const [quiz, setQuiz] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'categories' | 'demographics' | 'responses'>('overview');

  const loadData = async () => {
    if (!quizId) return;
    setLoading(true);
    try {
      const q = await HybridStorage.getQuiz(quizId);
      if (!q) {
        toast.error('Assessment not found');
        router.push('/quiz');
        return;
      }
      setQuiz(q);

      const respResult = await HybridStorage.getQuizResponses(quizId);
      setResponses(respResult.responses || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [quizId]);

  const toggleFullscreenMode = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Analytics Metrics Computation
  const stats = useMemo(() => {
    if (!quiz || !responses.length) {
      return {
        total: responses.length,
        avgScore: 0,
        passRate: 0,
        avgPercentage: 0,
        passCount: 0,
        failCount: 0,
        categories: {},
        questionStats: {},
        countries: {},
        reasons: { completion: 0, timeout: 0, quit: 0 },
      };
    }

    const total = responses.length;
    let passCount = 0;
    let failCount = 0;
    let totalScoreSum = 0;
    const totalPossible = (quiz.questions?.length || 1);

    const categories: Record<string, { total: number; correct: number }> = {};
    const questionStats: Record<string, { text: string; total: number; correct: number; incorrect: number }> = {};
    const countries: Record<string, number> = {};
    const reasons = { completion: 0, timeout: 0, quit: 0 };

    quiz.questions?.forEach((q: any) => {
      questionStats[q.id] = { text: q.text || 'Question', total: 0, correct: 0, incorrect: 0 };
    });

    responses.forEach((resp: any) => {
      const score = Number(resp.score) || 0;
      totalScoreSum += score;

      const passThreshold = quiz.type === 'quiz' ? Math.ceil(totalPossible * 0.6) : 0;
      if (score >= passThreshold) passCount++;
      else failCount++;

      const country = resp.userData?.country || 'Unknown';
      countries[country] = (countries[country] || 0) + 1;

      const reason = resp.userData?.submissionReason || 'completion';
      if (reason === 'timeout') reasons.timeout++;
      else if (reason === 'quit') reasons.quit++;
      else reasons.completion++;

      if (Array.isArray(resp.answers)) {
        resp.answers.forEach((ans: any) => {
          const qId = ans.questionId;
          const q = quiz.questions?.find((item: any) => item.id === qId);
          if (q) {
            const cat = q.category || 'General';
            if (!categories[cat]) categories[cat] = { total: 0, correct: 0 };
            categories[cat].total += 1;
            if (ans.correct) categories[cat].correct += 1;

            if (questionStats[qId]) {
              questionStats[qId].total += 1;
              if (ans.correct) questionStats[qId].correct += 1;
              else questionStats[qId].incorrect += 1;
            }
          }
        });
      }
    });

    const avgScore = total > 0 ? (totalScoreSum / total).toFixed(1) : '0';
    const avgPercentage = total > 0 ? Math.round((totalScoreSum / (total * totalPossible)) * 100) : 0;
    const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0;

    return {
      total,
      avgScore,
      passRate,
      avgPercentage,
      passCount,
      failCount,
      categories,
      questionStats,
      countries,
      reasons,
    };
  }, [quiz, responses]);

  if (loading) {
    return (
      <div className='min-h-screen bg-pw-bg text-white flex flex-col items-center justify-center p-6'>
        <div className='animate-spin rounded-full h-10 w-10 border-2 border-pw-cyan border-t-transparent mb-4' />
        <p className='text-sm text-pw-muted font-semibold'>Loading Fullscreen Analytics...</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-pw-bg text-white flex flex-col p-4 sm:p-8 space-y-6'>
      {/* Top Header Navigation */}
      <div className='flex justify-between items-center flex-wrap gap-4 bg-pw-surface/80 bkblur border border-white/10 p-4 rounded-3xl shadow-2xl'>
        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => router.push('/quiz')}
            className='h-9 w-9 rounded-2xl text-pw-muted hover:text-white'>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-xl font-bold tracking-tight'>{quiz?.title || 'Assessment Analytics'}</h1>
              <span className='bg-pw-cyan/10 text-pw-cyan border border-pw-cyan/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase'>
                Fullscreen
              </span>
            </div>
            <p className='text-xs text-pw-muted truncate max-w-md'>
              {quiz?.description || 'Comprehensive response analysis, performance breakdowns, and participant demographics.'}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2 flex-wrap'>
          <Button
            variant='outline'
            size='sm'
            onClick={loadData}
            className='rounded-xl text-xs flex items-center gap-1.5'>
            <RefreshCw size={14} /> Refresh
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              const content = exportResponsesToCSV(quiz, responses);
              const blob = new Blob([content], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${quiz?.title || 'Analytics'}_responses.csv`;
              a.click();
            }}
            className='rounded-xl text-xs flex items-center gap-1.5 text-pw-cyan border-pw-cyan/20'>
            <Download size={14} /> Export CSV
          </Button>

          <Button
            variant='ghost'
            size='icon'
            onClick={toggleFullscreenMode}
            title='Toggle Fullscreen'
            className='h-9 w-9 rounded-2xl text-pw-muted hover:text-white'>
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </Button>
        </div>
      </div>

      {/* Analytics Tabs */}
      <div className='flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto'>
        {[
          { id: 'overview', label: 'Overview Metrics', icon: BarChart3 },
          { id: 'questions', label: 'Question Item Analysis', icon: HelpCircle },
          { id: 'categories', label: 'Category Performance', icon: Layers },
          { id: 'demographics', label: 'Geo & Demographics', icon: Globe },
          { id: 'responses', label: 'Responses Ledger', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0',
                isActive
                  ? 'bg-pw-primary text-white shadow-lg shadow-pw-primary/20'
                  : 'text-pw-muted hover:text-white hover:bg-white/5'
              )}>
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview View */}
      {activeTab === 'overview' && (
        <div className='space-y-6'>
          {/* KPI Cards Grid */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
            <Card className='p-5 bg-pw-surface/60 bkblur border-white/10 flex flex-col gap-2'>
              <div className='flex justify-between items-center text-pw-cyan'>
                <span className='text-xs font-bold uppercase tracking-wider'>Total Responses</span>
                <Users size={18} />
              </div>
              <p className='text-3xl font-extrabold'>{stats.total}</p>
              <p className='text-[10px] text-pw-muted'>Participants recorded</p>
            </Card>

            <Card className='p-5 bg-pw-surface/60 bkblur border-white/10 flex flex-col gap-2'>
              <div className='flex justify-between items-center text-pw-success'>
                <span className='text-xs font-bold uppercase tracking-wider'>Pass Rate</span>
                <Award size={18} />
              </div>
              <p className='text-3xl font-extrabold'>{stats.passRate}%</p>
              <p className='text-[10px] text-pw-muted'>{stats.passCount} passed, {stats.failCount} failed</p>
            </Card>

            <Card className='p-5 bg-pw-surface/60 bkblur border-white/10 flex flex-col gap-2'>
              <div className='flex justify-between items-center text-pw-primary'>
                <span className='text-xs font-bold uppercase tracking-wider'>Average Score</span>
                <Activity size={18} />
              </div>
              <p className='text-3xl font-extrabold'>{stats.avgScore} <span className='text-sm text-pw-muted'>/ {quiz?.questions?.length || 0}</span></p>
              <p className='text-[10px] text-pw-muted'>{stats.avgPercentage}% overall accuracy</p>
            </Card>

            <Card className='p-5 bg-pw-surface/60 bkblur border-white/10 flex flex-col gap-2'>
              <div className='flex justify-between items-center text-pw-warning'>
                <span className='text-xs font-bold uppercase tracking-wider'>Submissions</span>
                <Clock size={18} />
              </div>
              <p className='text-3xl font-extrabold'>{stats.reasons.completion}</p>
              <p className='text-[10px] text-pw-muted'>{stats.reasons.timeout} timeouts, {stats.reasons.quit} quits</p>
            </Card>
          </div>

          {/* Detailed Performance Meter */}
          <Card className='p-6 bg-pw-surface/60 bkblur border-white/10 space-y-4'>
            <h3 className='font-bold text-sm text-pw-cyan uppercase tracking-widest flex items-center gap-2'>
              <PieChart size={16} /> Score Distribution & Outcome Ratio
            </h3>
            <div className='space-y-2'>
              <div className='flex justify-between text-xs font-semibold'>
                <span>Pass Rate ({stats.passCount} takers)</span>
                <span className='text-pw-success'>{stats.passRate}%</span>
              </div>
              <div className='w-full h-3 bg-white/10 rounded-full overflow-hidden flex'>
                <div style={{ width: `${stats.passRate}%` }} className='bg-pw-success h-full transition-all' />
                <div style={{ width: `${100 - stats.passRate}%` }} className='bg-pw-danger/60 h-full transition-all' />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Question Item Analysis Tab */}
      {activeTab === 'questions' && (
        <div className='space-y-4'>
          <h3 className='font-bold text-sm text-pw-cyan uppercase tracking-widest flex items-center gap-2 mb-2'>
            <HelpCircle size={16} /> Per-Question Accuracy Breakdown
          </h3>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {quiz?.questions?.map((q: any, i: number) => {
            const qStat = (stats.questionStats as Record<string, any>)[String(q.id)] || { total: 0, correct: 0, incorrect: 0 };
              const acc = qStat.total > 0 ? Math.round((qStat.correct / qStat.total) * 100) : 0;
             return (
                <Card key={q.id || i} className='p-4 bg-pw-surface/60 bkblur border-white/10 space-y-2'>
                  <div className='flex justify-between items-start gap-2'>
                    <span className='text-xs font-bold text-pw-muted uppercase'>Question {i + 1}</span>
                    <span className={cn('text-xs font-extrabold px-2 py-0.5 rounded-full border', acc >= 70 ? 'bg-pw-success/10 text-pw-success border-pw-success/20' : 'bg-pw-danger/10 text-pw-danger border-pw-danger/20')}>
                      {acc}% Accuracy
                    </span>
                  </div>
                  <p className='text-sm font-semibold leading-snug'>{q.text || 'Question'}</p>
                  <div className='w-full h-2 bg-white/10 rounded-full overflow-hidden flex mt-2'>
                    <div style={{ width: `${acc}%` }} className='bg-pw-success h-full' />
                    <div style={{ width: `${100 - acc}%` }} className='bg-pw-danger/60 h-full' />
                  </div>
                  <div className='flex justify-between text-[10px] text-pw-muted pt-1'>
                    <span>Correct: {qStat.correct}</span>
                    <span>Incorrect: {qStat.incorrect}</span>
                    <span>Total Takers: {qStat.total}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Performance Tab */}
      {activeTab === 'categories' && (
        <div className='space-y-4'>
          <h3 className='font-bold text-sm text-pw-cyan uppercase tracking-widest flex items-center gap-2 mb-2'>
            <Layers size={16} /> Performance By Question Category
          </h3>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            {Object.entries(stats.categories).map(([cat, val]: [string, any]) => {
              const pct = val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0;
              return (
                <Card key={cat} className='p-5 bg-pw-surface/60 bkblur border-white/10 space-y-2'>
                  <div className='flex justify-between items-center'>
                    <span className='font-bold text-sm'>{cat}</span>
                    <span className='text-xs font-bold text-pw-cyan'>{pct}%</span>
                  </div>
                  <div className='w-full h-2.5 bg-white/10 rounded-full overflow-hidden'>
                    <div style={{ width: `${pct}%` }} className='bg-pw-cyan h-full' />
                  </div>
                  <p className='text-[10px] text-pw-muted'>{val.correct} correct answers out of {val.total} total category questions</p>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Demographics Tab */}
      {activeTab === 'demographics' && (
        <div className='space-y-4'>
          <h3 className='font-bold text-sm text-pw-cyan uppercase tracking-widest flex items-center gap-2 mb-2'>
            <Globe size={16} /> Taker Geographic Distribution
          </h3>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {Object.entries(stats.countries).map(([country, count]: [string, any]) => (
              <Card key={country} className='p-4 bg-pw-surface/60 bkblur border-white/10 flex justify-between items-center'>
                <span className='font-semibold text-sm'>{country}</span>
                <span className='bg-pw-primary/10 text-pw-primary border border-pw-primary/20 px-2.5 py-1 rounded-full text-xs font-bold'>
                  {count} Takers
                </span>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Responses Ledger Tab */}
      {activeTab === 'responses' && (
        <div className='space-y-4'>
          <h3 className='font-bold text-sm text-pw-cyan uppercase tracking-widest flex items-center gap-2 mb-2'>
            <FileText size={16} /> Individual Response Records ({responses.length})
          </h3>
          <div className='space-y-3'>
            {responses.map((resp: any, idx: number) => (
              <Card key={resp.id || idx} className='p-4 bg-pw-surface/60 bkblur border-white/10 space-y-2'>
                <div className='flex justify-between items-start flex-wrap gap-2'>
                  <div>
                    <p className='font-bold text-pw-cyan text-sm'>
                      {resp.userData?.name || resp.userData?.email || `Taker #${idx + 1}`}
                    </p>
                    <p className='text-[10px] text-pw-muted'>{new Date(resp.timestamp).toLocaleString()}</p>
                  </div>
                  <div className='bg-pw-primary/10 text-pw-primary border border-pw-primary/20 px-3 py-1 rounded-full text-xs font-bold'>
                    Score: {resp.score || 0} / {quiz?.questions?.length || 0}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
