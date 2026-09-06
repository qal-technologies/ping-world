import type { Quiz } from '@/app/(main)/quiz/page';

/**
 * Default PingWorld Showcase Quiz Template.
 * Highlighting all features: mentions, image uploads, multiple option types,
 * data collection, logic branching, and end screen customization.
 */
export const DEFAULT_PINGWORLD_SHOWCASE_QUIZ: Quiz = {
  id: 'pingworld-mastery-showcase',
  title: 'PingWorld Feature Showcase',
  description:
    'Welcome to the PingWorld interactive feature demonstration! Experience dynamic variable mentions (@FullName), media attachments, smart branching, allowlists, and sound synthesizers.',
  type: 'quiz',
  quizLayout: 'single',
  quizScroll: false,
  showScore: true,
  allowRetry: true,
  randomizeQuestions: false,
  createdAt: Date.now(),
  expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  disclaimer:
    'Notice: This demonstration showcases PingWorld features. Responses are stored securely in local hybrid storage.',
  askDetails: [
    {
      title: 'Full Name',
      type: 'input',
      minLength: 2,
      maxLength: 60,
    },
    {
      title: 'Work Email',
      type: 'email',
    },
    {
      title: 'Gender',
      type: 'sex',
    },
    {
      title: 'Role',
      type: 'dropdown',
      options: [
        'Developer',
        'Content Creator',
        'Designer',
        'Student',
        'Power User',
      ],
    },
  ],
  questions: [
    {
      id: 'showcase-q1',
      text: 'Hi @FullName! Which PingWorld tool is best for crafting cross-platform social media posts and Instagram carousel slides?',
      type: 'multiple_choice',
      category: 'Platform Tools',
      options: [
        'Social Post Composer & Text-to-Slide Canvas',
        'PDF Image Extractor',
        'Profile Picture Maker',
        'Anonymous Inbox Board',
      ],
      correctIndex: 0,
      correctExplanation:
        'The Social Post Composer lets you compose, AI-enhance, and format text-to-slide carousels across Instagram, X, Facebook, and LinkedIn.',
    },
    {
      id: 'showcase-q2',
      text: 'Select ALL features built into PingWorld Quiz Studio:',
      type: 'checkbox',
      category: 'Quiz Capabilities',
      options: [
        'Dynamic variable interpolation (like @FullName and @Role)',
        'Native Web Audio API focus and completion sound synthesizers',
        'Accurate IANA timezone-based country & continent analytics',
        'Offline-first hybrid storage with remote sync capabilities',
      ],
      correctIndex: [0, 1, 2, 3],
      correctExplanation:
        'PingWorld Quiz Studio supports all these features seamlessly out of the box!',
    },
    {
      id: 'showcase-q3',
      text: 'True or False: PingWorld works smoothly when offline and auto-syncs when your connection is restored.',
      type: 'true_false',
      category: 'Platform Tools',
      options: ['True', 'False'],
      correctIndex: 0,
      correctExplanation:
        'PingWorld is built with an offline-first architecture using local hybrid caching.',
    },
    {
      id: 'showcase-q4',
      text: 'What keyword represents PingWorld’s link shortening utility? (e.g. "shortener")',
      type: 'input',
      category: 'Quiz Capabilities',
      options: ['url shortener', 'shortener', 'link shortener'],
      correctIndex: 0,
      caseSensitive: false,
      correctExplanation:
        'The URL Shortener tool allows fast link shortening with custom aliases.',
    },
  ],
  endScreen: {
    title: 'Outstanding Work, @FullName!',
    message:
      'You have experienced the full feature set of PingWorld Quiz Studio! You can edit this template, add your own question branches, or create new quizzes from scratch.',
  },
};
