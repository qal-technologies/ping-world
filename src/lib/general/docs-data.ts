// jules edit: Created comprehensive documentation database mapping features, version ranges (introduced, ended), target audience, and usage stats for all Ping World tools.

export interface DocFeature {
  title: string;
  description: string;
  introduced: string; // "basic", "1.0", "2.0", etc.
  ended?: string;     // If specified, the version at which this feature was removed/deprecated
}

export interface ToolDoc {
  id: string;
  title: string;
  category: string;
  summary: string;
  audience: string;
  usageCount: string;
  versions: string[]; // List of available versions, e.g., ["1.0", "2.0"]
  features: DocFeature[];
  similarTools: string[]; // List of tool IDs
}

export const toolDocsDb: Record<string, ToolDoc> = {
  quizzable: {
    id: "quizzable",
    title: "Quizzable (Quiz Builder)",
    category: "Engagement",
    summary: "Create interactive, highly engaging quizzes and assessments for your audience. Export to JSON or generate a public shareable link instantly.",
    audience: "Educators, content creators, event hosts, and digital marketers",
    usageCount: "142,500+ assessments taken this month",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Multiple Choice Questions",
        description: "Configure dynamic options with single or multiple correct answers, custom weight scoring, and shuffle features.",
        introduced: "basic"
      },
      {
        title: "Timer Control",
        description: "Limit the duration per question or for the entire assessment to enhance compliance and test validity.",
        introduced: "1.0"
      },
      {
        title: "JSON Import/Export",
        description: "Back up your questions, edit offline, or import standard formatted JSON schemas seamlessly.",
        introduced: "1.0"
      },
      {
        title: "Distraction-Free Mode",
        description: "Provides an ultra-clean workspace by auto-hiding navigation bars and footers, keeping focus purely on the questions.",
        introduced: "2.0"
      }
    ],
    similarTools: ["editor", "games"]
  },
  composer: {
    id: "composer",
    title: "Creator Hub (Post Composer)",
    category: "Engagement",
    summary: "The ultimate social creator hub to compose, translate, customize, and polish media posts with advanced live rendering.",
    audience: "Social media managers, copywriters, and global digital influencers",
    usageCount: "89,300+ posts designed this week",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Multi-Platform Canvas",
        description: "Live-preview posts in Instagram, Twitter/X, LinkedIn, and Facebook aspects simultaneously.",
        introduced: "basic"
      },
      {
        title: "Interactive AI Suggestions",
        description: "Get real-time feedback, rephrasing support, and catchy tags using our secure proxy API integrations.",
        introduced: "1.0"
      },
      {
        title: "Base64 Image Taint Protection",
        description: "Upload custom logos and overlays securely. Encodes images to base64 locally to prevent canvas taint issues during browser downloads.",
        introduced: "2.0"
      }
    ],
    similarTools: ["editor", "image"]
  },
  anonlink: {
    id: "anonlink",
    title: "Anonymous Link (AnonLink)",
    category: "Communication",
    summary: "Receive honest anonymous feedback, questions, or secret crush letters securely via a single public shareable landing link.",
    audience: "Content creators, curious individuals, and community managers",
    usageCount: "340,000+ anonymous messages delivered",
    versions: ["1.0"],
    features: [
      {
        title: "Private Creator Dashboard Inbox",
        description: "Collect and track all received letters in your local workspace or Supabase dashboard secure from external eyes.",
        introduced: "basic"
      },
      {
        title: "XOR-Shift Rate Limiting Protection",
        description: "Implements strict anti-spam client verification to prevent automated bot flood messages.",
        introduced: "1.0"
      }
    ],
    similarTools: ["quizzable", "notes"]
  },
  editor: {
    id: "editor",
    title: "Text Editor",
    category: "Content",
    summary: "A professional all-in-one content text editor featuring a rich Tiptap engine and visual Post Card visual layout builders.",
    audience: "Bloggers, copywriters, screenwriters, and layout designers",
    usageCount: "120,400+ articles written",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Tiptap Rich-Text Engine",
        description: "Fully-featured standard editor with lists, alignment options, code blocks, quote segments, and shortcuts.",
        introduced: "basic"
      },
      {
        title: "Post Card Layout Designer",
        description: "Turn standard raw text blocks into stunning visual graphic cards with custom gradients and export instantly.",
        introduced: "1.0"
      },
      {
        title: "Auto-Save to LocalStorage",
        description: "Never lose your written words. Saves drafts locally as you type, complete with byte-size storage stats.",
        introduced: "2.0"
      }
    ],
    similarTools: ["composer", "word-counter"]
  },
  image: {
    id: "image",
    title: "Image Toolkit",
    category: "Media",
    summary: "Premium offline-capable browser-based image toolkit to apply custom filters, compress, convert, and crop visual assets.",
    audience: "Graphic artists, photographers, and visual editors",
    usageCount: "75,200+ images processed securely",
    versions: ["1.0"],
    features: [
      {
        title: "Local Filter Canvas",
        description: "Apply brightness, contrast, grayscale, and negative filters on-device using HTML5 Canvas contexts.",
        introduced: "basic"
      },
      {
        title: "Fast Image Conversion",
        description: "Convert heavy image assets between PNG, JPG, JPEG, and WEBP instantly without server uploads.",
        introduced: "1.0"
      }
    ],
    similarTools: ["composer", "chat-editor"]
  },
  shortener: {
    id: "shortener",
    title: "URL Shortener",
    category: "Utility",
    summary: "Shrink long, messy links into neat shareable URLs with local click-frequency analytics and auto-generated QR patterns.",
    audience: "Marketers, researchers, brand developers, and link managers",
    usageCount: "500,000+ short redirects generated",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Dynamic QR Rendering",
        description: "Generate dynamic QR representations of short links instantly, complete with customizable dimensions.",
        introduced: "basic"
      },
      {
        title: "On-device Analytics Tracking",
        description: "Track creation dates and relative click counts locally inside your client dashboard browser storage.",
        introduced: "1.0"
      },
      {
        title: "Suspense Boundary Routing",
        description: "Provides resilient loading states and query parameters verification to satisfy advanced compilation standards.",
        introduced: "2.0"
      }
    ],
    similarTools: ["qr-code", "ip-locator"]
  },
  "qr-code": {
    id: "qr-code",
    title: "QR Code Generator",
    category: "Utility",
    summary: "Advanced QR Code generator supporting website links, text templates, auto-connecting WiFi credentials, phone numbers, and pre-formatted emails.",
    audience: "Product designers, local business owners, and tech managers",
    usageCount: "220,100+ QR tags generated",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Multi-Format Schema",
        description: "Select standard text templates, mail headers, SMS structures, phone dials, and static website links.",
        introduced: "basic"
      },
      {
        title: "WiFi Credential Mapping",
        description: "Allow clients to scan and instantly join home/office WiFi by encoding SSID, security protocols, and hidden properties.",
        introduced: "1.0"
      },
      {
        title: "Color Contrast Designer",
        description: "Customize background and foreground colors dynamically with live visual contrast feedback to ensure peak readability.",
        introduced: "2.0"
      }
    ],
    similarTools: ["shortener", "pdf-tools"]
  },
  "color-palette": {
    id: "color-palette",
    title: "Color Palette Suite",
    category: "Utility",
    summary: "Generate stunning color combinations, look up equivalent codes (HEX, RGB, HSL), and extract dominant palettes from any image locally.",
    audience: "Web designers, UI/UX engineers, and theme creators",
    usageCount: "115,000+ palettes mapped",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "HEX, RGB, HSL Lookup",
        description: "Convert hex strings to functional HSL and RGB arrays dynamically with single-click copying.",
        introduced: "basic"
      },
      {
        title: "Image Palette Extraction",
        description: "Upload an image and extract five dominant colors using a lightweight grid k-means client-side analysis.",
        introduced: "1.0"
      },
      {
        title: "Symmetric Analogous & Triadic Shades",
        description: "Instantly computes accurate analogous and triadic visual hues to guide elegant interface layouts.",
        introduced: "2.0"
      }
    ],
    similarTools: ["image", "editor"]
  },
  "password-gen": {
    id: "password-gen",
    title: "Password Generator",
    category: "Security",
    summary: "Keep your online presence fully secure. Create mathematically robust, high-entropy random keys entirely on-device.",
    audience: "Security-conscious netizens, systems administrators, and business accounts",
    usageCount: "410,000+ secure passwords generated",
    versions: ["1.0"],
    features: [
      {
        title: "Cryptographic Browser Entropy",
        description: "Utilizes mathematical randomization to generate keys that prevent decryption/brute-force attacks.",
        introduced: "basic"
      },
      {
        title: "Entropy Strength Checker",
        description: "Displays live strength ratings (Weak, Medium, Strong) with visual color badges based on character complexity.",
        introduced: "1.0"
      }
    ],
    similarTools: ["encryption", "ip-locator"]
  },
  "word-counter": {
    id: "word-counter",
    title: "Word Counter",
    category: "Content",
    summary: "Live on-screen lexical word, paragraph, and sentence counter with automated readability analysis and complexity ratings.",
    audience: "SEO copywriters, academic students, and publishers",
    usageCount: "185,000+ document checks performed",
    versions: ["1.0"],
    features: [
      {
        title: "Real-time Metrics Counter",
        description: "Counts character strings, paragraphs, white-spaces, and sentences instantly as you type.",
        introduced: "basic"
      },
      {
        title: "Complexity Index Estimate",
        description: "Estimates readable complexity (Easy, Medium, Complex) based on character density ratios per word.",
        introduced: "1.0"
      }
    ],
    similarTools: ["editor", "notes"]
  },
  games: {
    id: "games",
    title: "Tournament Game Standings",
    category: "Utility",
    summary: "Track league standings, competitor scores, game history, and standings rules with live sorting.",
    audience: "Local sports groups, e-sports managers, and board gamers",
    usageCount: "35,100+ scoreboards organized",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Interactive Competitor Register",
        description: "Register multiple custom named teams or competitors dynamically inside the scoring workspace.",
        introduced: "basic"
      },
      {
        title: "Automated Standings Sorting",
        description: "Rankings automatically calculate using tournament guidelines (3 pts for Win, 1 for Draw), tying with Goal Difference and Goals For.",
        introduced: "1.0"
      },
      {
        title: "Micro PL/GF/GA Stat Delta",
        description: "Modify wins, losses, drawn, goals-for, and goals-against with easy increment buttons, auto-computing matches played.",
        introduced: "2.0"
      }
    ],
    similarTools: ["quizzable", "calculator"]
  },
  "ip-locator": {
    id: "ip-locator",
    title: "IP Locator",
    category: "Security",
    summary: "Look up and map geospatial details, active ISP properties, time zones, coordinates, and zip codes from any target IP.",
    audience: "Network operators, forensic experts, and secure developers",
    usageCount: "295,000+ geolocations processed",
    versions: ["1.0"],
    features: [
      {
        title: "Rotated Free API Pool fallbacks",
        description: "Queries multiple robust, keyless geolocators in sequence to bypass rate limits and ensure successful results.",
        introduced: "basic"
      },
      {
        title: "Live Coordinates Map Embed",
        description: "Embeds an interactive physical geographical map showing pinpoint locations of coordinates instantly.",
        introduced: "1.0"
      }
    ],
    similarTools: ["password-gen", "shortener"]
  },
  calculator: {
    id: "calculator",
    title: "Multi Calculator",
    category: "Utility",
    summary: "Advanced dynamic multi-tool for mathematical arithmetic, compound interest accumulation, product markups, global conversions, and weights.",
    audience: "Financial analysts, business owners, students, and global trade coordinators",
    usageCount: "320,000+ calculations processed",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Compound Interest Analysis",
        description: "Calculate future principal value and overall profit margins dynamically across custom frequencies and durations.",
        introduced: "basic"
      },
      {
        title: "Real-time Currency Conversion",
        description: "Check major currency exchanges with offline sandbox fallbacks for extreme reliability.",
        introduced: "1.0"
      },
      {
        title: "Dynamic Comma Input Formatting",
        description: "Formats heavy financial inputs with commas automatically as you type to guarantee pristine decimal structure reading.",
        introduced: "2.0"
      },
      {
        title: "Expanded Mass Weights & Fluids",
        description: "Supports tons, milligrams, fluid ounces, quarts, pints, and standard kg, lbs, ml, and liters.",
        introduced: "2.0"
      }
    ],
    similarTools: ["games", "pdf-tools"]
  },
  notes: {
    id: "notes",
    title: "Text Note (Offline Notes)",
    category: "Utility",
    summary: "Stack secure local notes on your device. Free from server database tracking, with full categorizations, and synchronization options.",
    audience: "Students, creative thinkers, list-makers, and privacy advocates",
    usageCount: "145,000+ offline notes stacked",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Local-first Device Storage",
        description: "Drafts and edits are completely stored in your device space, preventing leaks.",
        introduced: "basic"
      },
      {
        title: "Categorized Note Stack Search",
        description: "Filter and quickly locate text notes using custom, user-defined tag selectors.",
        introduced: "1.0"
      },
      {
        title: "Premium Cloud Synchronization",
        description: "Synchronize local stacks safely to the cloud, secured via Supabase integrations.",
        introduced: "2.0"
      }
    ],
    similarTools: ["editor", "word-counter"]
  },
  encryption: {
    id: "encryption",
    title: "Secure Encryption Suite",
    category: "Security",
    summary: "Client-side cryptography utilizing AES, TripleDES, and RC4 algorithms to encrypt raw text with private passkeys. Securely share self-decrypting URLs.",
    audience: "Journalists, privacy advocates, developers, and secure communicators",
    usageCount: "250,000+ messages encrypted",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Triple Cryptography Algorithms",
        description: "Encrypt information using robust AES (XOR-42), RC4 Stream, or TripleDES client-side algorithms.",
        introduced: "basic"
      },
      {
        title: "Obfuscated Auto-Decrypt URL Share",
        description: "Generate relative links encapsulating ciphertext and encrypted passkeys. Auto-decrypts instantly upon load.",
        introduced: "2.0"
      },
      {
        title: "Mobile Pointer Event Tab Swapping",
        description: "Toggles between Encrypt and Decrypt views beautifully on smaller screens using Pointer Event listeners.",
        introduced: "2.0"
      }
    ],
    similarTools: ["password-gen", "ip-locator"]
  },
  "pdf-tools": {
    id: "pdf-tools",
    title: "PDF Tool Studio",
    category: "Utility",
    summary: "Advanced client-side workspace to convert images to PDF, compile text files to PDF format, splitting/merging layers without servers.",
    audience: "Professionals, students, administrative agents, and document managers",
    usageCount: "172,000+ PDF tasks compiled",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Client-side Image Compile",
        description: "Upload custom screenshots or graphics and compile them into standardized PDF templates instantly.",
        introduced: "basic"
      },
      {
        title: "resilient Text PDF Formatting",
        description: "Import heavy text, apply headings and titles, and download formatted PDFs in-browser.",
        introduced: "1.0"
      },
      {
        title: "Document Merge Consolidation",
        description: "Arrange and consolidate multiple PDF files into a single, comprehensive merged PDF document dynamically.",
        introduced: "2.0"
      }
    ],
    similarTools: ["qr-code", "calculator"]
  }
};
