export interface SearchPageItem {
  id: string;
  title: string;
  category: 'Tool' | 'Page' | 'Feature' | 'Developer';
  description: string;
  keywords: string[];
  href: string;
  iconName?: string;
}

export const SEARCH_INDEX: SearchPageItem[] = [
  // Tools
  {
    id: 'pdf-tool',
    title: 'PDF & Word Studio',
    category: 'Tool',
    description: 'Convert PDF to Word, Word to PDF, Excel to PDF, merge documents, and build books.',
    keywords: ['pdf', 'word', 'doc', 'docx', 'convert', 'merge', 'book', 'creator', 'manuscript', 'excel', 'sheets', 'spreadsheet', 'txt'],
    href: '/tools/pdf',
  },
  {
    id: 'book-creator',
    title: 'Book Creator (Text to PDF)',
    category: 'Tool',
    description: 'Structure chapters, pages, custom title styles, footnotes, image palettes, and live pagination.',
    keywords: ['book', 'creator', 'pdf', 'chapters', 'pages', 'write', 'editor', 'publish', 'manuscript', 'footnotes', 'palette'],
    href: '/tools/pdf?tab=book-editor',
  },
  {
    id: 'pdf-conversion',
    title: 'Universal Document Converter',
    category: 'Tool',
    description: 'Convert between PDF, Word, Excel, TXT, and Image formats.',
    keywords: ['convert', 'conversion', 'word to pdf', 'pdf to word', 'excel to pdf', 'csv', 'sheets'],
    href: '/tools/pdf?tab=conversion',
  },
  {
    id: 'quizzable',
    title: 'Quizzable (Quiz & Survey Builder)',
    category: 'Tool',
    description: 'Create interactive progressive assessments, surveys, form questionnaires, with branching logic.',
    keywords: ['quiz', 'survey', 'form', 'assessment', 'branching', 'test', 'exam', 'questions', 'scores', 'quizzable'],
    href: '/quiz',
  },
  {
    id: 'composer',
    title: 'Post Composer & Canvas',
    category: 'Tool',
    description: 'Compose and format social posts with live previews, canvas builder, AI copywriting, and publishing.',
    keywords: ['composer', 'social', 'post', 'canvas', 'instagram', 'twitter', 'x', 'facebook', 'linkedin', 'caption', 'publish'],
    href: '/composer',
  },
  {
    id: 'anonlink',
    title: 'AnonLink (Anonymous Messages)',
    category: 'Tool',
    description: 'Send and receive secure anonymous feedback, confessions, and questions with public boards.',
    keywords: ['anonymous', 'message', 'anonlink', 'inbox', 'confession', 'secret', 'feedback', 'private'],
    href: '/message',
  },
  {
    id: 'text-editor',
    title: 'Rich Text Editor',
    category: 'Tool',
    description: 'Format rich documents, export HTML/Markdown, generate clean typography.',
    keywords: ['editor', 'text', 'markdown', 'write', 'typography', 'draft', 'richtext'],
    href: '/editor',
  },
  {
    id: 'image-toolkit',
    title: 'Image Toolkit',
    category: 'Tool',
    description: 'Resize, crop, filter, and optimize images directly in your browser.',
    keywords: ['image', 'photo', 'picture', 'crop', 'resize', 'filter', 'toolkit', 'graphics'],
    href: '/image',
  },
  {
    id: 'url-shortener',
    title: 'URL Shortener',
    category: 'Tool',
    description: 'Shorten links, generate QR codes, and track click analytics.',
    keywords: ['url', 'shortener', 'link', 'qr', 'analytics', 'clicks', 'short link'],
    href: '/tools/url-shortener',
  },
  {
    id: 'calculator',
    title: 'Smart Calculator & Math Studio',
    category: 'Tool',
    description: 'Scientific calculator, unit converter, tip calculator, and math formula workspace.',
    keywords: ['calculator', 'math', 'calc', 'scientific', 'convert', 'tip', 'units'],
    href: '/tools/calculator',
  },
  {
    id: 'qr-code',
    title: 'QR Code Generator',
    category: 'Tool',
    description: 'Generate customizable, high-resolution QR codes with custom styling.',
    keywords: ['qr', 'qrcode', 'barcode', 'scan', 'generator'],
    href: '/tools/qr-code',
  },
  {
    id: 'password-gen',
    title: 'Password Generator',
    category: 'Tool',
    description: 'Generate secure, cryptographically random passwords and passphrases.',
    keywords: ['password', 'generator', 'security', 'secure', 'passphrase'],
    href: '/tools/password-gen',
  },
  {
    id: 'colors',
    title: 'Color Palette Studio',
    category: 'Tool',
    description: 'Generate color palettes, extract colors from images, and test contrast accessibility.',
    keywords: ['color', 'palette', 'contrast', 'hex', 'rgb', 'hsl', 'gradient'],
    href: '/tools/colors',
  },
  {
    id: 'json-formatter',
    title: 'JSON Formatter & Validator',
    category: 'Tool',
    description: 'Format, validate, beautify, and inspect JSON payloads.',
    keywords: ['json', 'formatter', 'validator', 'beautify', 'syntax', 'debug'],
    href: '/tools/json-formatter',
  },
  {
    id: 'markdown-preview',
    title: 'Markdown Live Editor',
    category: 'Tool',
    description: 'Write Markdown with real-time GitHub-flavored live previews and table tools.',
    keywords: ['markdown', 'md', 'preview', 'gfm', 'readme'],
    href: '/tools/markdown',
  },

  // Main Pages
  {
    id: 'browse-tools',
    title: 'Browse All Tools',
    category: 'Page',
    description: 'Explore the complete directory of productivity, utility, and creative tools.',
    keywords: ['tools', 'all', 'directory', 'catalog', 'browse', 'list'],
    href: '/tools',
  },
  {
    id: 'dashboard',
    title: 'User Dashboard',
    category: 'Page',
    description: 'View metrics, recent activity, quizzes, messages, and saved content.',
    keywords: ['dashboard', 'home', 'account', 'stats', 'analytics', 'activity', 'overview'],
    href: '/dashboard',
  },
  {
    id: 'pricing',
    title: 'Pricing & Plans',
    category: 'Page',
    description: 'Upgrade plans: Free, Flexible Tool Licenses, Standard, and Pro.',
    keywords: ['pricing', 'plans', 'pro', 'upgrade', 'billing', 'subscription', 'flexible', 'license', 'cost', 'payment'],
    href: '/pricing',
  },
  {
    id: 'settings',
    title: 'Account & App Settings',
    category: 'Page',
    description: 'Manage account profile, security, app preferences, offline cache, and logout.',
    keywords: ['settings', 'account', 'profile', 'security', 'preferences', 'cache', 'logout', 'password'],
    href: '/settings',
  },
  {
    id: 'developer-api',
    title: 'Developer APIs',
    category: 'Developer',
    description: 'API documentation, endpoints, and SDKs for developers building on Ping World.',
    keywords: ['api', 'developer', 'docs', 'rest', 'sdk', 'endpoints', 'keys'],
    href: '/api',
  },
  {
    id: 'documentation',
    title: 'Documentation & Guides',
    category: 'Page',
    description: 'Complete user guides and tutorials for all Ping World utilities.',
    keywords: ['docs', 'help', 'guide', 'tutorial', 'manual', 'how to'],
    href: '/docs',
  },
];
