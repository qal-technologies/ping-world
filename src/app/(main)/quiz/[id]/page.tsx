"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Puzzle, CheckCircle2, ChevronRight, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
}

interface QuizData {
  title: string;
  description?: string;
  questions: Question[];
}

export default function PublicQuizPage({ params }: { params: { id: string } }) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem('pingworld-quizzes');
    let target = null;

    if (saved) {
      const all = JSON.parse(saved);
      target = all.find((q: any) => q.id === params.id);
    }

    if (target) {
      setQuiz(target);
    } else if (params.id === "demo") {
      setQuiz({
        title: "Demo Quiz",
        questions: [{ id:"demo", text: "Test", options: ["A", "B"], correctAnswer: 0 }]
      });
    }
  }, [params.id]);

  const handleNext = () => {
    if (selectedOption === null) {
      toast.error("Please select an answer");
      return;
    }

    if (quiz && selectedOption === quiz.questions[currentQuestion].correctAnswer) {
      setScore(s => s + 1);
    }

    if (quiz && currentQuestion + 1 < quiz.questions.length) {
      setCurrentQuestion(c => c + 1);
      setSelectedOption(null);
    } else {
      setIsFinished(true);
    }
  };

  if (!quiz) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <Puzzle className="h-12 w-12 text-pw-muted mb-4 opacity-20" />
        <h2 className="text-2xl font-bold">Quiz Not Found</h2>
        <p className="text-pw-muted mt-2">The quiz you are looking for does not exist or has been removed.</p>
        <Link href="/tools" className="mt-6 text-pw-primary font-bold inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Tools
        </Link>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="container mx-auto px-6 py-20 max-w-2xl text-center">
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-20 h-20 bg-pw-success/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-pw-success/20">
            <CheckCircle2 className="h-10 w-10 text-pw-success" />
          </div>
          <h1 className="text-4xl font-extrabold font-display mb-4">Quiz Completed!</h1>
          <p className="text-pw-muted text-lg mb-8">You scored <span className="text-pw-text font-bold">{score}</span> out of <span className="text-pw-text font-bold">{quiz.questions.length}</span></p>
          
          <Card className="card-glow p-8 mb-8 bg-white/5 border-white/10">
             <div className="text-sm font-bold text-pw-muted uppercase mb-2">Performance</div>
             <div className="w-full h-4 bg-pw-surface rounded-full overflow-hidden border border-white/5 mb-4">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(score / quiz.questions.length) * 100}%` }}
                  className="h-full gradient-brand"
                />
             </div>
             <p className="text-xs text-pw-muted italic">Great job! Share your result with friends.</p>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <Button onClick={() => window.location.reload()} variant="outline" className="h-12 border-white/10">Try Again</Button>
             <Link href="/tools" className="btn-primary h-12 flex items-center px-8">Browse More Tools</Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const q = quiz.questions[currentQuestion];

  return (
    <div className="container mx-auto px-6 py-20 max-w-3xl">
      <div className="mb-12">
        <div className="flex justify-between items-end mb-6">
           <div>
             <div className="badge mb-4">Question {currentQuestion + 1} of {quiz.questions.length}</div>
             <h1 className="text-3xl font-bold font-display">{quiz.title}</h1>
           </div>
           <div className="text-[10px] font-bold text-pw-muted uppercase tracking-widest text-right">
              Score: {score}
           </div>
        </div>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
           <motion.div 
             className="h-full bg-pw-primary"
             animate={{ width: `${((currentQuestion) / quiz.questions.length) * 100}%` }}
           />
        </div>
      </div>

      <Card className="card-glow p-8 md:p-12 mb-8 bg-pw-surface border-white/10">
        <h2 className="text-xl md:text-2xl font-bold leading-relaxed mb-8">{q.text}</h2>
        
        <div className="space-y-3">
          {q.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedOption(idx)}
              className={cn(
                "w-full p-5 text-left rounded-2xl border transition-all duration-200 flex items-center justify-between group",
                selectedOption === idx 
                  ? "bg-pw-primary/10 border-pw-primary text-pw-text shadow-lg shadow-pw-primary/10" 
                  : "bg-white/5 border-white/5 text-pw-muted hover:border-white/10 hover:bg-white/10"
              )}
            >
              <span className="font-medium">{opt}</span>
              <ChevronRight className={cn("h-4 w-4 transition-all opacity-0", selectedOption === idx ? "opacity-100 translate-x-0" : "group-hover:opacity-50 -translate-x-2")} />
            </button>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleNext} className="btn-primary h-14 px-10 text-lg gap-2">
           {currentQuestion + 1 === quiz.questions.length ? "Finish Quiz" : "Next Question"}
           <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
