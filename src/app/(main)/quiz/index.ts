// --- Types ---
export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'dropdown'
  | 'checkbox'
  | 'input'
  | 'range'
  | 'rating'
  | 'upload';

export interface QuizOption {
  id: string; // questionId-index or uuid
  text: string;
  uploadUrl?: string; // Image upload URL for option
  uploadType?: 'image' | 'video' | 'audio';
  skipTo?: string; // ID of the next question to jump to
  skipToCat?: string; // Category name to jump to (jumps to first question in category)
  branchCondition?: string; // Conditional expression evaluated with taker details and prior answers
  elseSkipTo?: string;
  elseSkipToCat?: string;
  explanation?: string; // Option-level explanation shown in feedback
  hidden?: boolean; // Hidden from taker view (setter-only)
  scoreWeight?: number; // Checkbox: custom score weight for this option
}

export interface InputBranchRule {
  keyword: string;
  caseSensitive?: boolean;
  skipTo?: string;
  skipToCat?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: QuizOption[];
  correctExplanation?: string;
  correctIndex: any; // index, bool, string (optionId), or Array<string> (optionIds)
  caseSensitive?: boolean; // for input type
  inputBranchRules?: InputBranchRule[]; // Branching rules for input type questions
  elseSkipTo?: string; // Branching if no input rule matches
  elseSkipToCat?: string;
  min?: number; // for range
  max?: number; // for range
  step?: number; // for range
  allowedTypes?: string; // e.g. "image/*,.pdf,.docx,.zip" (auto-mapped from plain-word upload type)
  maxFileSize?: number; // max upload size in MB
  uploadInstruction?: string; // Optional taker upload instructions
  accessory?:
    | 'none'
    | 'calculator'
    | 'note'
    | 'periodic_table'
    | 'formula_sheet'
    | 'glossary';
  accessoryNote?: string; // content for the 'note' or custom formulas
  accessoryConfig?: any; // specific IDs or categories for formulas/glossary
  skipTo?: string; // Question-level branching: jump to specific question after this one
  skipToCat?: string; // Question-level branching: jump to first question of this category
  category?: string; // Optional category tag for grouping questions
  timer?: number; // Optional question timer in seconds
}

export interface Details {
  title: string;
  type:
    | 'sex'
    | 'input'
    | 'number'
    | 'date'
    | 'tel'
    | 'email'
    | 'dropdown'
    | 'dob';
  allowlist?: string;
  restrictedKeywords?: string;
  options?: string[];
  maxLength?: number;
  minLength?: number;
  minAge?: number;
}

export interface QuizTakerResponse {
  id?: string;
  status?: 'in_progress' | 'submitted' | 'expired';
  userData: Record<string, string>;
  answers: any[];
  score: number;
  categoryScores?: Record<string, { correct: number; total: number }>;
  totalQuestions: number;
  timestamp: string;
  submissionReason?: 'completion' | 'timeout' | 'self_submit' | 'quit';
  country?: string;
  continent?: string; // Continent-level geo tag (free tier)
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  type: 'quiz' | 'survey';
  surveyType?: 'research' | 'form'; // research = branching/page-by-page; form = scroll-all, no branching
  questions: Question[];
  canGoBack?: boolean;
  showScore?: boolean;
  category?: {
    show?: boolean; // Admin setting to display category above question headers
    inPerformance?: boolean;
  };
  askDetails?: Details[];
  allowlistMessage?: string;
  timer?: {
    hasTimer?: boolean | string | number;
    timerUnit?: 'seconds' | 'minutes' | 'hours'; // Unit for hasTimer value
  };
  randomizeOptions?: boolean;
  randomizeQuestions?: boolean;
  allowRetry?: boolean;
  enforceSecurity?: boolean;
  endScreen: {
    title: string;
    message: string;
    showPerformance?: boolean;
    enableConfetti?: boolean; // Pro: show confetti on completion
    confettiType?: 'standard' | 'fireworks' | 'stars' | 'ribbons'; // Confetti style
    completionIcon?: 'check' | 'diamond' | 'badge' | 'trophy'; // Icon shown in end screen
    textAlign?: 'left' | 'center' | 'right'; // End screen text alignment
  };
  correctOption?: boolean;
  correctOptionDes?: 'in-question' | 'in-result';
  createdAt: number;
  responses?: QuizTakerResponse[];
  responsesNextOffset?: number | null;
  responsesLoadingMore?: boolean;
  allowEarlySubmit?: boolean;
  expires_at?: string; // ISO date
  expiryHistory?: string[]; // Previous expiry values (max 3 changes allowed)
  isExpiryLocked?: boolean; // Locked after 3 expiry changes
  quizScroll?: boolean;
  quizLayout?: string;
  branding?: {
    image?: string;
    opacity?: number;
    shadeColor?: string;
    blur?: number;
    icon?: string;
  };
  userId?: string;
  isCustom?: boolean;
  customUrl?: string;
  disclaimer?: string;
  customDisclaimer?: string; // Pro: replaces default PingWorld disclaimer
  hidePingWorldDisclaimer?: boolean; // Pro: hide PingWorld branding disclaimer
  showRealtimeScore?: boolean; // Pro: show live score badge during quiz
  nextButtonText?: string; // Pro: custom Next button label
  prevButtonText?: string; // Pro: custom Previous button label
  allowPass?: boolean; // Allow takers to pass/skip questions without answering
  fromPremium?: boolean;
  isTemplate?: boolean;
  template?: boolean;
  kind?: string;
  isPrivate?: boolean;
  privateKey?: string;
  privateKeyHash?: string;
  allowedParticipantUsernames?: string[];
  accessGranted?: boolean;
}


export function quizHaptic(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator)
      navigator.vibrate(pattern);
  } catch {
    /* Haptics are optional; continue without device support. */
  }
}
