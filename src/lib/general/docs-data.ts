// jules edit: Highly-expanded, non-technical, user-focused documentation database explaining exactly how to use every input, slider, tab, and control for every tool.

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
    summary: "Quizzable is an interactive, fully integrated assessment platform designed to help you construct custom quizzes in seconds, share them directly with your audience via unique short-links, or back them up to reusable file configurations.",
    audience: "Teachers, social media managers, event coordinators, trainers, and content creators",
    usageCount: "142,500+ quizzes created and graded worldwide",
    versions: ["1.0"],
    features: [
      {
        title: "How to Build Questions",
        description: "Click the 'Add Question' button to insert a new slide. Type your question query into the title field, then use the Question Type dropdown to choose from 'Multiple Choice', 'True or False', 'Checkbox list', 'Rating scale', or 'Text input'. Provide the answer choices in the options boxes, and click the checkbox next to the correct choice to teach the system how to grade it automatically.",
        introduced: "basic"
      },
      {
        title: "Setting Up Time Limits",
        description: "Look for the 'Timer Limit' input field located at the top-right settings panel of each question. Type in a number (in seconds) to configure an automatic countdown timer. When your participants take the assessment, the system will start this countdown instantly, encouraging quick, top-of-mind responses.",
        introduced: "1.0"
      },
      {
        title: "JSON Backup Configurations",
        description: "Protect your work by exporting your entire quiz structure to a portable JSON file. Find the 'Export Configuration' button at the top header, click it, and save the downloaded file to your local computer. To reload your quiz later, click 'Import Configuration' and upload your saved JSON file to instantly rebuild all questions, timers, and scoring rules.",
        introduced: "1.0"
      },
    ],
    similarTools: ["editor", "games"]
  },
  composer: {
    id: "composer",
    title: "Creator Hub (Post Composer)",
    category: "Engagement",
    summary: "Creator Hub is a social visual canvas and content composing workstation. It assists you in writing highly engaging posts, previewing exactly how they render across major social networks, applying custom text enhancements, and compiling beautiful post cards.",
    audience: "Digital brand marketers, content writers, copywriters, and influencers",
    usageCount: "89,300+ social media campaigns designed",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Platform Preview Selectors",
        description: "Use the platform switcher tabs (Twitter/X, Instagram, LinkedIn, Facebook) at the top of the composer canvas. As you type your post content in the composition editor, the live preview card dynamically adjusts its aspect ratio, margins, line wrapping, and text limits to match the selected platform's exact design guidelines.",
        introduced: "basic"
      },
      {
        title: "Formatting Text & Hashtags",
        description: "Select any text inside the composing box to reveal formatting options. To add trending elements, click the 'AI Tags' button on the sidebar to analyze your written content and generate highly relevant, trending hashtags which you can insert with a single click.",
        introduced: "1.0"
      },
      {
        title: "Secure Custom Logo Uploads",
        description: "To brand your post cards, locate the 'Logo Layer' configuration under the canvas layers. Click 'Upload Image' to import your custom brand logo. The system automatically reads and encodes your logo as a secure base64 data string inside your local browser. This protects the canvas rendering from security 'taint' errors, ensuring you can download your visual cards smoothly.",
        introduced: "2.0"
      }
    ],
    similarTools: ["editor", "image"]
  },
  anonlink: {
    id: "anonlink",
    title: "Anonymous Link (AnonLink)",
    category: "Engagement",
    summary: "AnonLink allows you to receive secure, anonymous confessions, feedback, and questions from your friends or community followers. You generate a public profile link, share it on your social media bios, and collect letters securely inside a private inbox.",
    audience: "Individuals, social media users, curious creators, and community organizers",
    usageCount: "340,000+ anonymous submissions processed",
    versions: ["1.0"],
    features: [
      {
        title: "Generating Your Public Bio Link",
        description: "Create an account on Ping World. Navigate to the AnonLink page to find your customized public link (formatted as 'pingworld.fun/u/yourusername'). Click the copy icon to copy this link, then paste it directly into your Instagram bio, Twitter profile, or Snapchat stories to invite messages.",
        introduced: "basic"
      },
      {
        title: "Reading Your Anonymous Inbox",
        description: "When someone visits your public link, they are presented with a clean, fully secure writing card where they can type their message. To read what they sent, log into your personal Ping World Creator Dashboard and select the 'Inbox' tab. Your messages are displayed in a clean feed, sorted chronologically, showing only the date and message content to guarantee complete sender anonymity.",
        introduced: "1.0"
      }
    ],
    similarTools: ["quizzable", "notes"]
  },
  editor: {
    id: "editor",
    title: "Text Editor",
    category: "Content",
    summary: "This all-in-one text workspace lets you write rich-text documents and convert them into beautifully styled social media graphics or PDF reports without leaving your browser.",
    audience: "Bloggers, writers, social media designers, and students",
    usageCount: "120,400+ creative drafts composed",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Writing with the Tiptap Toolbar",
        description: "Use the floating formatting toolbar directly above your document text area. Highlight any phrase to apply bold, italics, underlines, or heading sizes (H1, H2, H3). You can insert structured lists, blockquotes, and code snippets, allowing you to organize complex documents with simple clicks.",
        introduced: "basic"
      },
      {
        title: "Designing Graphic Post Cards",
        description: "Switch from 'Document' mode to 'Post Card' mode using the top layout selector. Type your text, select a gradient background preset from the design palette, adjust the card layout alignments, and click 'Export Image' to download a clean, high-resolution PNG graphic of your text card.",
        introduced: "1.0"
      },
      {
        title: "draft Auto-Recovery",
        description: "Never worry about power outages or browser crashes. As you write in the editor workspace, the system silently auto-saves your draft to your browser's secure LocalStorage. The sidebar displays a real-time 'Storage Metric' indicating the size of your recovered draft, allowing you to resume writing immediately upon returning.",
        introduced: "2.0"
      }
    ],
    similarTools: ["composer", "word-counter"]
  },
  image: {
    id: "image",
    title: "Image Toolkit",
    category: "Media",
    summary: "The Image Toolkit is a high-speed, local editor that allows you to apply professional filters, adjust color balances, and resize or rotate photos instantly without uploading them to external servers.",
    audience: "Graphic designers, photographers, content managers, and web editors",
    usageCount: "75,200+ visual assets optimized",
    versions: ["1.0"],
    features: [
      {
        title: "Applying Filter Presets",
        description: "Click the upload area to select a photo from your computer. Look at the Preset Filters section on the panel and click on various styles like Grayscale, Sepia, Negative, Saturate, or Hue Rotation to apply instant cinematic adjustments to your loaded image preview.",
        introduced: "basic"
      },
      {
        title: "Precision Slide Controls",
        description: "Locate the 'Adjustments' panel on the sidebar. Drag the individual sliders (such as Brightness, Contrast, Blur, Saturation, and Invert) left or right. The central canvas updates in real-time, allowing you to fine-tune specific light and color levels with ease.",
        introduced: "1.0"
      },
      {
        title: "Transformations and Downloads",
        description: "Use the transform action buttons at the top of the canvas to flip your image horizontally, flip it vertically, or rotate it clockwise by 90 degrees. Once you are satisfied with the edits, click the 'Download' button to download your processed image file instantly.",
        introduced: "1.0"
      }
    ],
    similarTools: ["composer", "chat-editor"]
  },
  shortener: {
    id: "shortener",
    title: "URL Shortener",
    category: "Utility",
    summary: "URL Shortener takes long, messy internet links and condenses them into clean, short URLs. It also generates custom vector QR codes and tracks redirection frequency.",
    audience: "Marketers, advertisers, researchers, and general link-sharers",
    usageCount: "500,000+ shortened redirection links",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Shortening Long Links",
        description: "Paste your lengthy, cluttered link (beginning with http:// or https://) into the main input box. Click the scissor icon button next to it. In under a second, the system will output a clean, neat short URL (e.g. 'pingworld.fun/s/abc123') ready to copy and share.",
        introduced: "basic"
      },
      {
        title: "Local Analytics & QR Ready Card",
        description: "After shortening, look at the result dashboard. It generates a high-fidelity QR code on the right panel. You can download this QR code as an image, share the short link directly, and review the on-device stats card showing the date of creation and the overall click frequencies.",
        introduced: "1.0"
      }
    ],
    similarTools: ["qr-code", "ip-locator"]
  },
  "qr-code": {
    id: "qr-code",
    title: "QR Code Generator",
    category: "Utility",
    summary: "This comprehensive generator constructs standardized matrix QR codes for various everyday inputs—including website URLs, text notes, automatic WiFi credentials, and pre-formatted emails.",
    audience: "Retail business owners, hospitality managers, and marketing specialists",
    usageCount: "220,100+ scan codes generated",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "WiFi Auto-Connect Coding",
        description: "Click on the 'WiFi' tab in the input selector. Enter your home or business network name (SSID) in the first input box, then type your password in the Password box (you can toggle the eye icon to verify spelling). Choose your encryption type WPA/WPA2 from the dropdown, check the 'Hidden Network' box if applicable, and click 'Download PNG'. When users scan this QR code, their devices will connect to your network automatically.",
        introduced: "basic"
      },
      {
        title: "Pre-Formatted Emails & SMS",
        description: "Select the 'Email' or 'SMS' tabs. For Emails, fill in the recipient address, subject header, and message body. For SMS, input the telephone number and short text. The system automatically formats the data into compliant schemas (like 'mailto:' or 'SMSTO:'). Scanning this QR code instantly opens your user's default messaging app pre-filled with your content.",
        introduced: "1.0"
      },
      {
        title: "Color Contrast Customizations",
        description: "Scroll down to the 'Appearance' card. Use the dynamic color picker inputs to select a Foreground Color and Background Color. The live preview updates immediately. Maintain high color contrast (like white on dark or dark on white) to ensure smartphones scan your custom QR code instantly.",
        introduced: "2.0"
      }
    ],
    similarTools: ["shortener", "pdf-tools"]
  },
  "color-palette": {
    id: "color-palette",
    title: "Color Palette Suite",
    category: "Utility",
    summary: "Color Palette is an advanced color harmony workshop. It allows you to select solid colors, generate matching themes, copy equivalent HEX/RGB/HSL codes, or extract primary colors from photos.",
    audience: "Frontend developers, UI designers, digital illustrators, and branding experts",
    usageCount: "115,000+ color harmonies tested",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Interactive Color Picker & Copying",
        description: "Click on the large color circle to open the browser color palette. Select your desired color, then use the format selector buttons (HEX, RGB, HSL) to choose your output. Click the copy icon next to the code box to copy the formatted string (e.g. 'rgb(92, 111, 255)') instantly.",
        introduced: "basic"
      },
      {
        title: "Extracting Colors from Images",
        description: "Click the 'Pick Image' button on the header and select any photo. The system will render a preview of the photo and use a client-side grid algorithm to analyze and extract the five most dominant colors. It adds them directly to your 'Active Palette' on the right panel.",
        introduced: "1.0"
      },
      {
        title: "Analogous & Complementary Suggestions",
        description: "Whenever you select a color, scroll down to review the suggestions section. It displays perfect Shades (from light to dark), Analogous neighbors (adjacent on the color wheel), Complementary contrasts (opposites), and Triadic balances. Click on any suggested card to make it your active color.",
        introduced: "2.0"
      }
    ],
    similarTools: ["image", "editor"]
  },
  "password-gen": {
    id: "password-gen",
    title: "Password Generator",
    category: "Security",
    summary: "The Password Generator builds customizable, secure passkeys to protect your online accounts. It processes everything inside your browser so your keys are never sent online.",
    audience: "Privacy-conscious individuals, systems managers, and corporate accounts",
    usageCount: "410,000+ strong keys created",
    versions: ["1.0"],
    features: [
      {
        title: "Length & Complexity Settings",
        description: "Locate the 'Length' slider in the configuration panel. Drag the slider to select a length between 8 and 64 characters. Use the checkboxes below to customize your password's complexity: toggle uppercase letters (A-Z), lowercase letters (a-z), numbers (0-9), or special symbols (like !@#$%). Click 'Generate Secure Key' to instantly randomize a new password.",
        introduced: "basic"
      },
      {
        title: "Analyzing Password Strength",
        description: "After your password is generated, look at the strength rating badge in the output panel. It evaluates length and character diversity in real-time, displaying a color-coded rating: 'Weak' (red) for basic keys, 'Medium' (yellow) for standard keys, or 'Strong' (green) for robust passwords. Click the copy button to copy the password when satisfied.",
        introduced: "1.0"
      }
    ],
    similarTools: ["encryption", "ip-locator"]
  },
  "word-counter": {
    id: "word-counter",
    title: "Word Counter",
    category: "Content",
    summary: "Word Counter is a typing tool that analyzes words, characters, sentences, paragraphs, and reading times in real-time as you compose your drafts.",
    audience: "Copywriters, authors, students, SEO specialists, and translation managers",
    usageCount: "185,000+ texts audited",
    versions: ["1.0"],
    features: [
      {
        title: "Typing & Reading the Stats Board",
        description: "Start typing or paste your content into the large central text box. The 'Analysis Stats' panel updates instantly with four metrics: 'Words', 'Characters' (including spaces), 'Sentences' (based on punctuation marks), and 'Paragraphs' (based on line breaks).",
        introduced: "basic"
      },
      {
        title: "Read-Time and Complexity Indicators",
        description: "Look at the bottom of the stats card. It displays an estimated 'Read Time' in seconds (assuming a standard reading speed of 200 words per minute). It also analyzes the 'Readability' rating (Easy, Medium, or Complex) based on the character length of your words, letting you know how accessible your writing is to readers.",
        introduced: "1.0"
      }
    ],
    similarTools: ["editor", "notes"]
  },
  games: {
    id: "games",
    title: "Tournament Game Standings",
    category: "Utility",
    summary: "Games Table is a scoreboard and standings ledger. It lets you register teams or competitors, log wins, draws, losses, and goals, and ranks standings dynamically using standardized tournament rules.",
    audience: "E-sports hosts, local sports leagues, board game groups, and school physical education coaches",
    usageCount: "35,100+ scoreboards organized",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "How to Add Competitors",
        description: "Locate the 'Add Competitor' card on the sidebar. Type in the team or player name into the input field (e.g. 'Cyber Knights') and click 'Register Competitor'. The competitor will instantly appear as a row on your active scoreboard.",
        introduced: "basic"
      },
      {
        title: "Adjusting Live Game Stats",
        description: "In your standings table, each competitor has interactive stat columns: W (Won), D (Drawn), L (Lost), GF (Goals For), and GA (Goals Against). Click the '+' or '-' buttons in any competitor cell to adjust their score. The 'PL' (Played) count automatically calculates based on their wins, draws, and losses.",
        introduced: "1.0"
      },
      {
        title: "Dynamic Rankings Sorting",
        description: "As you modify stats, the scoreboard dynamically recalculates overall points (3 points per Win, 1 per Draw). The rows are sorted instantly: players with more points move to the top of the table. If points are tied, rankings are resolved by Goal Difference (GF minus GA), followed by Goals For.",
        introduced: "2.0"
      }
    ],
    similarTools: ["quizzable", "calculator"]
  },
  "ip-locator": {
    id: "ip-locator",
    title: "IP Locator",
    category: "Security",
    summary: "This geolocator queries networks to trace physical locations, coordinating maps, active service provider properties, and postal data for any valid IP address.",
    audience: "Network administrators, cybersecurity agents, web developers, and tech managers",
    usageCount: "295,000+ coordinates geolocated",
    versions: ["1.0"],
    features: [
      {
        title: "Searching for IP Coordinates",
        description: "Type any IP address (e.g., '8.8.8.8') into the search box and click the magnifying glass button. The system will look up the location data across free locator APIs and populate the results panel with Country, Region, City, ZIP code, and coordinates.",
        introduced: "basic"
      },
      {
        title: "Navigating the Interactive Map",
        description: "When search details load, an interactive Google Map will render on the right panel, centered on the IP's coordinates. You can pinch, zoom, or drag the map to inspect the physical location of the IP host.",
        introduced: "1.0"
      }
    ],
    similarTools: ["password-gen", "shortener"]
  },
  calculator: {
    id: "calculator",
    title: "Multi Calculator",
    category: "Utility",
    summary: "Multi Calculator is a complete financial, mathematical, unit-converting, and markup workstation. It formats financial figures dynamically and converts currency rates and weight/volume measurements.",
    audience: "Accountants, web retailers, logistics operators, students, and home chefs",
    usageCount: "320,000+ calculations processed",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Formulating Markup Pricing",
        description: "Open the 'Pricing' tab. Type your product cost into the 'Product Cost $' field (the input formats with commas automatically as you type). Enter your desired profit margin in the 'Profit Percentage %' field (e.g., 30). The system will output the exact Target Selling Price and calculate your Net Gross Margin, showing you exactly how much money you will make per sale.",
        introduced: "basic"
      },
      {
        title: "Converting Global Currencies",
        description: "Select the 'Currency' tab. Enter the cash amount in the first field (auto-formats with commas). Choose your starting currency from the 'From Currency' dropdown, and select your destination currency from the 'To Currency' dropdown. The system automatically fetches exchange rates to display the converted result. If you are offline, it loads realistic fallbacks.",
        introduced: "1.0"
      },
      {
        title: "Formatting Heavy Financial Inputs",
        description: "As you enter cash amounts in the Principal, Amount, or Cost fields across the calculator tabs, the system formats your numbers with commas in real-time. This makes large values (like '$10,000,000') easy to read and prevents typing errors.",
        introduced: "2.0"
      },
      {
        title: "Weight and Volume Conversions",
        description: "Open the 'Units' tab. Choose your Category from the dropdown (Weight/Mass or Volume/Fluid). Enter the numerical value, select your starting unit (e.g., Kilograms or Gallons), and choose your destination unit (e.g., Pounds or Liters). The system performs the conversion instantly, with precision up to four decimal places.",
        introduced: "2.0"
      }
    ],
    similarTools: ["games", "pdf-tools"]
  },
  notes: {
    id: "notes",
    title: "Text Note (Offline Notes)",
    category: "Utility",
    summary: "Offline Notes is a local drafting book stored in your browser's secure memory. You can write, organize, and search your notes completely private from online database tracking.",
    audience: "Students, writers, planners, and privacy advocates",
    usageCount: "145,000+ local notes composed",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Drafting Your Notes",
        description: "Click the 'Add Note' button on the header to create a new draft. Type your title into the title box and enter your thoughts in the text area below. The draft saves automatically as you type.",
        introduced: "basic"
      },
      {
        title: "Categorizing with Custom Tags",
        description: "To categorize your notes, look at the Category tag input field below your note's title. Type a custom category name (e.g. 'Work', 'Recipe', 'Shopping') to tag the note. Use the category filter buttons at the top of your notes list to quickly display only notes with specific tags.",
        introduced: "1.0"
      },
      {
        title: "Cloud Backup Sync Options",
        description: "While notes save locally by default, you can click the 'Backup to Cloud' button on the header. If you have an account, the system will sync your note stacks to our cloud database. This secures your content and lets you access your notes across other devices.",
        introduced: "2.0"
      }
    ],
    similarTools: ["editor", "word-counter"]
  },
  encryption: {
    id: "encryption",
    title: "Secure Encryption Suite",
    category: "Security",
    summary: "The Secure Encryption Suite is a client-side cryptographic dashboard that lets you lock private messages with passkeys and generate secure, self-decrypting sharing links.",
    audience: "Privacy advocates, journalists, developers, and secure communicators",
    usageCount: "250,000+ texts encrypted",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "How to Encrypt Private Text",
        description: "Type your sensitive message into the 'Plain Text' textarea. In the 'Encryption Key' input field, type your secret passkey, or click 'Generate' to create a cryptographically secure randomized key. Select your algorithm from the dropdown—AES (highly recommended), TripleDES (legacy), or RC4 (fast)—and click 'Encrypt Data'. Copy the encrypted payload to share it.",
        introduced: "basic"
      },
      {
        title: "Copying Self-Decrypting Share Links",
        description: "Once you successfully encrypt your data, the system generates an 'Obfuscated Decryption Share Link' in the output panel. Copy this link and send it to your recipient. When clicked, it automatically loads our decryption interface, pre-fills the encrypted text, decodes the passkey from the URL parameters, and decrypts your message instantly.",
        introduced: "2.0"
      },
      {
        title: "Mobile View Tab Navigation",
        description: "On mobile phones, look at the pill selector at the top of the interface. Since screens are smaller, we place the 'Encryption' and 'Decryption' panels into simple, clear tabs. Tap 'Encrypt' to compose locked payloads, or tap 'Decrypt' to paste ciphers. On desktop screens, these panels display side-by-side automatically.",
        introduced: "2.0"
      }
    ],
    similarTools: ["password-gen", "ip-locator"]
  },
  "pdf-tools": {
    id: "pdf-tools",
    title: "PDF Tool",
    category: "Utility",
    summary: "PDF Tool Studio lets you perform common PDF tasks right in your browser. You can convert images to PDF, turn raw text into document downloads, extract text from PDFs, or merge multiple files.",
    audience: "Administrators, writers, students, designers, and office agents",
    usageCount: "172,000+ document edits compiled",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Converting Photos to PDF Documents",
        description: "Open the 'Image To PDF' tab. Click the upload zone to choose an image (PNG, JPG, JPEG, or WEBP) from your computer. Once the preview image loads, click 'Convert to PDF'. The system compiles the photo into a standard A4 page layout and downloads it automatically.",
        introduced: "basic"
      },
      {
        title: "Compiling Plain Text to PDF Files",
        description: "Open the 'Text To PDF' tab. Type your document header into the 'Document Title' input, then write or paste your text into the content area. Click 'Format & Download PDF' to generate and download a clean PDF document with properly wrapped and structured text margins.",
        introduced: "1.0"
      },
      {
        title: "Merging Multiple PDF Files Together",
        description: "Select the 'Merge PDFs' tab. Click 'Add Document' to choose PDF files and add them to your compilation list. You can add several files and review their estimated file sizes. To combine them, click 'Merge Files into Single PDF' to consolidate them into a single, cohesive document.",
        introduced: "2.0"
      }
    ],
    similarTools: ["qr-code", "calculator"]
  }
};
