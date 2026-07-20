'use client';

import { useState, useEffect } from 'react';
import { analyzeText, checkGrammar, type GrammarIssue } from './ai-utils';
import type { TextAnalysis } from './types';

export interface TextCheckResult {
  analysis: TextAnalysis;
  grammarIssues: GrammarIssue[];
  isChecking: boolean;
  sensationalismScore: number; // 0 to 100
  clickbaitLabel: string;
  tone: 'professional' | 'casual' | 'viral' | 'educational' | 'unknown';
}

export function useTextChecks(text: string, delayMs = 1500): TextCheckResult {
  const [debouncedText, setDebouncedText] = useState(text);
  const [isChecking, setIsChecking] = useState(false);
  const [grammarIssues, setGrammarIssues] = useState<GrammarIssue[]>([]);
  const [sensationalismScore, setSensationalismScore] = useState(0);
  const [clickbaitLabel, setClickbaitLabel] = useState('Low');
  const [tone, setTone] = useState<'professional' | 'casual' | 'viral' | 'educational' | 'unknown'>('unknown');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedText(text);
    }, delayMs);
    return () => clearTimeout(handler);
  }, [text, delayMs]);

  useEffect(() => {
    let active = true;
    if (!debouncedText.trim()) {
      setGrammarIssues([]);
      setSensationalismScore(0);
      setClickbaitLabel('Low');
      setTone('unknown');
      return;
    }

    async function runChecks() {
      setIsChecking(true);
      try {
        // Grammar Check
        const issues = await checkGrammar(debouncedText);
        if (!active) return;
        setGrammarIssues(issues);

        // Calculate Sensationalism and Clickbait Scores
        let score = 0;
        const lower = debouncedText.toLowerCase();

        // Sensational / Clickbait triggers
        const clickbaitWords = [
          'stop scrolling', 'you won\'t believe', 'shocking', 'mind-blowing', 'secret',
          'will change your life', 'revealed', 'exposed', 'what they don\'t want you to know',
          'must read', 'never before seen', 'omg', 'incredible', 'miracle', 'absolutely free'
        ];

        clickbaitWords.forEach(w => {
          if (lower.includes(w)) score += 20;
        });

        // Caps Density
        const upperCount = (debouncedText.match(/[A-Z]/g) || []).length;
        const totalLetters = (debouncedText.match(/[a-zA-Z]/g) || []).length;
        if (totalLetters > 5 && (upperCount / totalLetters) > 0.3) {
          score += 25;
        }

        // Exclamation / Punctuation density
        const exclamations = (debouncedText.match(/!/g) || []).length;
        if (exclamations > 2) score += 15;

        const finalScore = Math.min(100, score);
        setSensationalismScore(finalScore);

        if (finalScore > 60) setClickbaitLabel('High Clickbait Risk');
        else if (finalScore > 30) setClickbaitLabel('Moderate Sensationalism');
        else setClickbaitLabel('Low Clickbait Risk');

        // Tone Heuristics
        const professionalWords = ['excited to share', 'best practices', 'infrastructure', 'strategy', 'insights', 'collaboration', 'synergy'];
        const casualWords = ['real talk', 'hey guys', 'cool', 'literally', 'chill', 'lol', 'awesome'];
        const viralWords = ['stop', 'agree', 'share this', 'massive', 'insane', '🔥', '🚀', '🚨'];
        const educationalWords = ['did you know', 'here\'s why', 'how to', 'learn', 'understand', 'concept', 'lessons'];

        const profScore = professionalWords.filter(w => lower.includes(w)).length;
        const casScore = casualWords.filter(w => lower.includes(w)).length;
        const virScore = viralWords.filter(w => lower.includes(w)).length;
        const eduScore = educationalWords.filter(w => lower.includes(w)).length;

        const maxScore = Math.max(profScore, casScore, virScore, eduScore);
        if (maxScore === 0) {
          setTone('unknown');
        } else if (maxScore === profScore) {
          setTone('professional');
        } else if (maxScore === casScore) {
          setTone('casual');
        } else if (maxScore === virScore) {
          setTone('viral');
        } else {
          setTone('educational');
        }

      } catch (err) {
        console.warn('Text check hook error:', err);
      } finally {
        if (active) setIsChecking(false);
      }
    }

    runChecks();
    return () => {
      active = false;
    };
  }, [debouncedText]);

  const analysis = analyzeText(text);

  return {
    analysis,
    grammarIssues,
    isChecking,
    sensationalismScore,
    clickbaitLabel,
    tone,
  };
}
