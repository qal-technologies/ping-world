import type { Quiz } from '@/app/(main)/quiz/';
import { packPingWorldMediaUrl } from './quiz-piping';

// Sample tiny packed SVG icons for demonstration of option and question image attachments
const SAMPLE_SLIDE_ICON = packPingWorldMediaUrl(
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMwMEZhRTYiIHN0cm9rZS13aWR0aD0iMiI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIvPjxwYXRoIGQ9Ik0zIDloMTgiLz48cGF0aCBkPSJNOSAyMXYtMTIiLz48L3N2Zz4=',
  { name: 'slide-icon.svg', type: 'image/svg+xml', size: 350 },
);

const SAMPLE_BADGE_ICON = packPingWorldMediaUrl(
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNGQUE4MTAiIHN0cm9rZS13aWR0aD0iMiI+PGNpcmNsZSBjeD0iMTIiIGN5PSI4IiByPSI2Ii8+PHBhdGggZD0iTTE1LjQ3NyAxMi44OWwyLjM1IDcuMTEtNS44MjctMy41NS01LjgyNyAzLjU1IDIuMzUtNy4xMSIvPjwvc3ZnPg==',
  { name: 'badge-icon.svg', type: 'image/svg+xml', size: 390 },
);

/**
 * Comprehensive PingWorld Showcase Quiz Template.
 * Reflects every single quiz feature:
 * - Fullscreen persistent branding (image, blur, shade color, opacity)
 * - Complete details collection (Full Name, Date of Birth, Gender, Role, Email)
 * - DOB natural words (@DOB -> "2nd of March, 2005") and getters (@DOB:age, @DOB:year, @DOB:month, @DOB:day)
 * - Dynamic variable mentions (@FullName, @Role, @Gender, @score, @total, @percentage)
 * - Literal prefix escaping (\@PreservedLiteral and @\EscapedToken)
 * - Logic evaluations (@eval:{condition ? 'A' : 'B'} and arithmetic @eval:{10 * 5 + 50})
 * - Multiple choice with image thumbnail attachment
 * - Checkbox multi-select
 * - True / False
 * - Short answer input with conditional keyword branching
 * - Range slider and star ratings
 * - File upload question
 * - Celebration Confetti (Fireworks) and Diamond Completion Icon
 */
export const DEFAULT_PINGWORLD_SHOWCASE_QUIZ: Quiz = {
  id: 'pingworld-mastery-showcase',
  title: 'PingWorld Feature Showcase',
  description:
    'Experience the complete suite of PingWorld Quiz Studio features! From dynamic @DOB age getters and @eval calculations, to media attachments, fullscreen persistent branding, and fireworks celebrations.',
  type: 'quiz',
  quizLayout: 'single',
  quizScroll: false,
  showScore: true,
  allowRetry: true,
  randomizeQuestions: false,
  createdAt: Date.now(),
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  disclaimer:
    'Preview mode: try every feature. Your answers stay in this session and are never submitted or saved.',
  branding: {
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80',
    opacity: 0.12,
    shadeColor: '#050814',
    blur: 6,
  },
  askDetails: [
    {
      title: 'Full Name',
      type: 'input',
      minLength: 2,
      maxLength: 60,
    },
    {
      title: 'Date of Birth',
      type: 'dob',
    },
    {
      title: 'Gender',
      type: 'sex',
    },
    {
      title: 'Role',
      type: 'dropdown',
      options: [
        'Software Engineer',
        'UI/UX Designer',
        'Content Creator',
        'Product Manager',
        'Power User',
      ],
    },
    {
      title: 'Work Email',
      type: 'email',
    },
  ],
  questions: [
    {
      id: 'showcase-q1',
      text: 'Welcome @FullName! We recorded your birth date as @Date of Birth. In natural language words that is @DOB. As a @DOB:age year-old (@eval:{"@DOB:age" >= 18 ? "Adult Participant" : "Young Scholar"}), which PingWorld tool is best for crafting social carousel slides?',
      type: 'multiple_choice',
      category: 'Dynamic Piping & Mentions',
      options: [
        {
          id: 'opt-composer',
          text: 'Social Post Composer & Text-to-Slide Canvas',
          uploadUrl: SAMPLE_SLIDE_ICON,
          explanation: 'The Social Post Composer lets you compose, AI-enhance, and format multi-slide carousels across Instagram, X, Facebook, and LinkedIn.',
        },
        {
          id: 'opt-pdf',
          text: 'PDF Image Extractor & Converter',
        },
        {
          id: 'opt-profile',
          text: 'Profile Picture Designer Studio',
        },
        {
          id: 'opt-inbox',
          text: 'Anonymous Feedback Board',
        },
      ],
      correctIndex: 'opt-composer',
      correctExplanation:
        'The Social Post Composer is PingWorld’s flagship tool for composing and designing multi-slide carousel graphics.',
    },
    {
      id: 'showcase-q2',
      text: 'Select ALL native getters supported by the PingWorld @DOB token engine:',
      type: 'checkbox',
      category: 'Dynamic Piping & Mentions',
      options: [
        { id: 'opt-age', text: '@DOB:age (Calculates exact current age in years)' },
        { id: 'opt-year', text: '@DOB:year (Extracts the 4-digit birth year)' },
        { id: 'opt-month', text: '@DOB:month (Extracts full birth month name, e.g. March)' },
        { id: 'opt-day', text: '@DOB:day (Extracts numeric day of birth)' },
      ],
      correctIndex: ['opt-age', 'opt-year', 'opt-month', 'opt-day'],
      correctExplanation:
        'PingWorld provides all four getters (@DOB:age, @DOB:year, @DOB:month, @DOB:day) plus word-formatting for any date of birth field.',
    },
    {
      id: 'showcase-q3',
      text: 'Prefix Escaping Test: Is the token \\@FullName kept as literal text without replacing it with your name?',
      type: 'true_false',
      category: 'Syntax & Escapes',
      options: [
        { id: 'true', text: 'True' },
        { id: 'false', text: 'False' },
      ],
      correctIndex: 'true',
      correctExplanation:
        'Prefixing @ with a backslash (\\@ or @\\) preserves the exact literal symbol and token without dynamic substitution.',
    },
    {
      id: 'showcase-q4',
      text: 'Branching Test: Type "skip" to jump straight to the math evaluation question, or type "continue" to proceed step-by-step:',
      type: 'input',
      category: 'Smart Branching',
      options: [
        { id: 'continue', text: 'continue' },
        { id: 'skip', text: 'skip' },
      ],
      correctIndex: 'continue',
      caseSensitive: false,
      inputBranchRules: [
        {
          keyword: 'skip',
          skipTo: 'showcase-q7',
          caseSensitive: false,
        },
      ],
      correctExplanation:
        'Input branching can inspect text responses and immediately jump participants to designated questions or categories.',
    },
    {
      id: 'showcase-q5',
      text: 'On a scale of 0 to 10, how intuitive is PingWorld’s question and option piping?',
      type: 'range',
      category: 'User Experience',
      options: [],
      min: 0,
      max: 10,
      step: 1,
      correctIndex: 10,
      correctExplanation: 'PingWorld enables full live variable substitution in every text field!',
    },
    {
      id: 'showcase-q6',
      text: 'Rate your satisfaction with PingWorld’s sound synthesizer and offline-first hybrid cache:',
      type: 'rating',
      category: 'User Experience',
      options: [],
      correctIndex: 5,
      correctExplanation: 'PingWorld synthesizes audio frequencies via the Web Audio API without external assets.',
    },
    {
      id: 'showcase-q7',
      text: 'Dynamic Logic Evaluation: What is the calculated value of @eval:{10 * 5 + 50}? (Current progress: Question @score of @total)',
      type: 'multiple_choice',
      category: 'Logical Evaluations',
      options: [
        { id: 'opt-100', text: '100', uploadUrl: SAMPLE_BADGE_ICON },
        { id: 'opt-50', text: '50' },
        { id: 'opt-25', text: '25' },
        { id: 'opt-150', text: '150' },
      ],
      correctIndex: 'opt-100',
      correctExplanation: 'PingWorld dynamically evaluates arithmetic inside @eval expressions (10 * 5 = 50, + 50 = 100).',
    },
    {
      id: 'showcase-q8',
      text: 'Optional Document / Image Upload: Upload any file or screenshot to test encrypted envelope media storage (or click Finish):',
      type: 'upload',
      category: 'Media & Attachments',
      options: [],
      allowedTypes: 'images/*',
      maxFileSize: 10,
      correctIndex: null,
      correctExplanation: 'Uploaded files are packaged with secure envelope tagging and displayed in the completion review.',
    },
  ],
  endScreen: {
    title: 'Outstanding Achievement, @FullName!',
    message:
      'Born in @DOB:year (@DOB:age years old), your profile as a @Role was successfully certified! You achieved a score of @score out of @total (@percentage). Standing: @eval:{"@score" >= 4 ? "Master Laureate" : "Certified Explorer"}.',
    showPerformance: true,
    enableConfetti: true,
    confettiType: 'fireworks',
    completionIcon: 'diamond',
    textAlign: 'center',
  },
};
