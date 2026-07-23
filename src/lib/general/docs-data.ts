// Highly-expanded, non-technical, user-focused documentation database explaining exactly how to use every input, slider, tab, and control for every tool.

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
  // jules edit: Add documentation for the Country Directory tool
  countries: {
    id: "countries",
    title: "Country Directory",
    category: "Utility",
    summary: "Country Directory is an advanced search directory for exploring high-fidelity flags, dialing codes, languages, native names, capitals, and currencies of all 240+ countries.",
    audience: "Travelers, educators, researchers, and network managers",
    usageCount: "68,200+ countries researched",
    versions: ["1.0"],
    features: [
      {
        title: "Search & Filtering (Search Bar)",
        description: "Type any country name, code, language, or capital inside the main search bar to instantly filter the list.",
        introduced: "basic"
      },
      {
        title: "Detailed Country Cards (Info Sheet)",
        description: "Click on any country card to view high-fidelity flag images, native naming structures, ISO codes, calling prefix, active currencies, and spoken languages.",
        introduced: "1.0"
      }
    ],
    similarTools: ["ip-locator", "calculator"]
  },
  quizzable: {
    id: "quizzable",
    title: "Quizzable (Quiz Builder)",
    category: "Engagement",
    summary: "Quizzable is an interactive, fully integrated assessment platform designed to help you construct custom quizzes in seconds, share them directly with your audience via unique short-links, or back them up to reusable file configurations.",
    audience: "Teachers, social media managers, event coordinators, trainers, and content creators",
    usageCount: "142,500+ quizzes created and graded worldwide",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Adding a Question Slide (Add Question Button)",
        description: "Click the cyan '+ Add Question' button on the left sidebar to insert a new slide. A fresh card will appear in the main workspace loaded with placeholder fields for your question's title and answers.",
        introduced: "basic"
      },
      {
        title: "Selecting Question Types (Dropdown Selector)",
        description: "Click the 'Question Type' dropdown menu inside the question editor. Choose from 'Multiple Choice' (single correct answer), 'True/False' (boolean), 'Checkbox' (multiple correct answers), 'Text Input' (keyboard response), 'Range' (slider evaluation), or 'Rating Scale' (star icons).",
        introduced: "basic"
      },
      {
        title: "Configuring Answer Options (Option List & Checkbox Icons)",
        description: "For Multiple Choice and Checkbox questions, type your answers into the option input fields details. Click the circular checkbox icon or radio button directly to the left of the option text to mark it as the correct answer. The selected correct option will highlight in green.",
        introduced: "basic"
      },
      {
        title: "Setting Up Time Limits (Time Limit Slider & Input)",
        description: "Look for the clock icon labeled 'Question Timer' inside the question settings card. Drag the slider or type a value into the input box to assign a duration in seconds (e.g. 30). This countdown forces users to answer before automatically proceeding.",
        introduced: "1.0"
      },
      {
        title: "Managing Security & Protections (Security Controls)",
        description: "Locate the 'Anti-Cheat / Security Protocol' toggle in the right settings sidebar. Toggle it to 'ON' to lock the assessment down. When active, it monitors tab-switching, disables right-clicks (context menu), blocks text highlighting (selectstart), and stops copying/pasting.",
        introduced: "2.0"
      },
      {
        title: "Data Collection Headers (Participant Info Fields)",
        description: "Toggle the 'Collect Participant Info' checkbox in the sidebar. Select which fields are required—such as Name, Email, or Employee ID. Participants will be forced to fill these in on a styled loading gate before the quiz begins.",
        introduced: "1.0"
      },
      {
        title: "Exporting and Importing Quizzes (JSON Backup Buttons)",
        description: "Locate the two top utility buttons: 'Export JSON' and 'Import JSON'. Click 'Export' to download a clean, structured text profile containing your quiz. To load a previous quiz, click 'Import' and pick your saved file to rebuild the workspace.",
        introduced: "1.0"
      },
      {
        title: "Sharing Your Quiz (Share Icon & Link Dialog)",
        description: "Click the blue 'Share Quiz' button in the toolbar. A dialog displays the shareable short URL (e.g. '/quiz/take/[id]'). Click the 'Copy Clip' button next to the link to copy it, then share it directly in chat rooms or email lists.",
        introduced: "1.5"
      }
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
        title: "Platform Switcher Tabs (Network Selectors)",
        description: "Click the platform icons at the top of the preview canvas (Twitter Bird, Instagram Camera, LinkedIn Square, Facebook Letter). This adjusts the preview frame layout to match character count limits, typography, and image margins of each network.",
        introduced: "basic"
      },
      {
        title: "Main Text Editor Area (Writing Box)",
        description: "Type your raw content directly into the central text area. As you type, the character counter displays remaining space (e.g., /280 characters for Twitter) and warning highlights when you exceed length parameters.",
        introduced: "basic"
      },
      {
        title: "AI-Assisted Tone Adjuster (Sparkles Button)",
        description: "Select your composed text and click the purple 'Sparkles / AI Adjust' button. A popover opens offering tones: Professional, Humorous, Bold, or Shorten. Click a tone to rewrite your text using local GPT-like rules.",
        introduced: "2.0"
      },
      {
        title: "Auto Grammar and Translation (Flags and Check Icons)",
        description: "Look at the footer tools in the text box. Click the green 'Grammar Check' icon to flag typos. Click the 'Globe / Translate' icon, select your language (Spanish, French, German, or Portuguese), and click 'Translate' to convert the body text.",
        introduced: "2.0"
      },
      {
        title: "Text Formatter Bar (Bold, Italic, Monospace Toggles)",
        description: "Highlight any portion of your post inside the writing box. Click the formatting popup buttons to bold (𝗕𝗼𝗹𝗱), italicize (𝘐𝘵𝘢𝘭𝘪𝘤), or apply typewriter font style (𝙼𝚘𝚗𝚘𝚜𝚙𝚊𝚌𝚎) to stand out on social timelines.",
        introduced: "1.0"
      },
      {
        title: "Visual Card Constructor (Post Card tab)",
        description: "Click the 'Post Card' mode switch. Your text is rendered inside a large, customizable background square. Choose background palettes, gradients, or upload custom images to create graphic posters for Instagram feed posts.",
        introduced: "1.0"
      },
      {
        title: "Custom Brand Logo Uploader (Logo Control Panel)",
        description: "Under the card settings panel, click the 'Brand Logo' toggle. Click 'Upload Logo Image' and select your PNG or JPEG logo file. The image is rendered as a draggable overlay on your post card, permitting custom placement.",
        introduced: "2.0"
      },
      {
        title: "Exporting Social Images (Download PNG Button)",
        description: "When satisfied with your card preview, click the blue 'Download Card Image' button. The system compiles the poster canvas locally and triggers an immediate download of a high-resolution PNG graphic.",
        introduced: "1.5"
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
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Generating Personal Link (Copy Button)",
        description: "Navigate to the Anonymous Link feature. Log in to claim a username. The app displays 'Your Dedicated Link' formatted as a short URL. Click the blue 'Copy Link' button to copy it instantly.",
        introduced: "basic"
      },
      {
        title: "Setting Link Expiry (Time Dropdown)",
        description: "Before sharing your link, click the 'Expiration Time' dropdown menu. Choose when your inbox link should close: 24 Hours, 3 Days, 7 Days, or Never. Once expired, visitors will be blocked from sending messages.",
        introduced: "2.0"
      },
      {
        title: "Defining Page Metadata (SEO Title & Subtitle Inputs)",
        description: "Customize the welcome card. Type an SEO-friendly Title (like 'Send honest feedback!') and a description. When you share this link on bio pages, standard social preview snippets are generated using your customized texts.",
        introduced: "2.0"
      },
      {
        title: "Pre-Reply Quick Presets (Interactive Tag Tokens)",
        description: "Add quick tags that allow users to select pre-made headers like 'Confession', 'Question', or 'Advice'. Click '+ Add Preset Tag', type the tag name, and save. Visitors can click these pills to fast-format their messages.",
        introduced: "2.0"
      },
      {
        title: "Anonymous Inbox Reader (Message Cards)",
        description: "Open the 'Inbox' tab to view submissions. Messages appear as styling note blocks with timestamps, sorted by newest first. Since it's fully anonymous, no IP or identity logs are displayed.",
        introduced: "1.0"
      },
      {
        title: "Inbox Public Link (Premium Shared View)",
        description: "Unlock the public reading panel by toggling 'Make Inbox Public'. This generates a public viewer URL (gated for billing accounts). Anyone clicking this URL can read messages you approved, without seeing raw sender details.",
        introduced: "2.0"
      },
      {
        title: "Exporting Message Logs (Download Spreadsheet Button)",
        description: "Click 'Export to CSV' at the bottom of the inbox table to save all received letters locally in a spreadsheet format, facilitating categorization and printing.",
        introduced: "1.5"
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
        title: "Tiptap Markdown Formatting Palette",
        description: "Use the floating toolbar located directly above the writing canvas. Highlight any phrase to apply formatting tags: Bold (B icon), Italic (I icon), Underline (U icon), Strikethrough, Code Blocks, and Headings (H1/H2).",
        introduced: "basic"
      },
      {
        title: "Draft Auto-Recovery Engine (Local Memory)",
        description: "No save button required. Every keystroke is saved directly to your local browser storage. The top header displays a green checkmark saying 'Auto-saved' to confirm your writing is backed up.",
        introduced: "2.0"
      },
      {
        title: "Markdown Import Actions",
        description: "Click the 'Import MD' button in the toolbar. Pick a standard `.md` or `.txt` file off your computer. The system compiles the markdown syntax into rich paragraph text layout automatically.",
        introduced: "1.0"
      },
      {
        title: "PDF Compile Panel (Download PDF Button)",
        description: "Click 'Export PDF' in the file actions. Set margins (Normal or Narrow) and font sizes (11px, 12px, 14px), then click 'Download'. The draft is compiled locally and downloaded immediately as a document.",
        introduced: "1.5"
      },
      {
        title: "Graphic Card Layout Preset (Post Card tab)",
        description: "Toggle from Document mode to 'Post Card' layout. Choose background colors, custom gradients, or adjust text padding and alignment tools. The layout wraps your text into a visual card ready for social sharing.",
        introduced: "1.0"
      },
      {
        title: "Typography Font Selector",
        description: "Click the 'Typography' dropdown at the top settings panel. Switch between Inter (Sleek), Outfit (Modern), Lora (Journalist style), or Source Code Pro (Developer coding font) to customize formatting look.",
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
      },
      {
        title: "Image Cropping Boundary (Crop Card)",
        description: "Click the Crop tool. Drag the bounding corners over your image layout. You can select aspect ratios like 1:1 (Square), 16:9 (Widescreen), or 4:3 (Classic). Click 'Apply Crop' to slice the margins.",
        introduced: "1.0"
      },
      {
        title: "Premium BG Background Remover (AI key feature)",
        description: "Select your image and click the purple 'Remove Background' button. Enter your Remove.bg API key in the popup interface. The system securely calls the database and returns a transparent background image block in seconds.",
        introduced: "1.5"
      },
      {
        title: "Resolution Compression Adjuster (Quality Slider)",
        description: "Before downloading, locate the 'Quality Ratio' slider. Drag it between 1% and 100%. This compresses your file size by reducing density, perfect for web optimization and fast page loads.",
        introduced: "1.0"
      }
    ],
    similarTools: ["composer", "color-palette"]
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
        title: "Paste & Shorten Link Box (Input scissor)",
        description: "Type or paste your long target link in the large input field. Select a custom suffix (optional) if you want a branded link (like '/s/sale'). Click the blue 'Shorten' button to trim it.",
        introduced: "basic"
      },
      {
        title: "QR Card Download Selector",
        description: "Once created, look at the result dashboard card. Click 'Save QR Code' to download a custom QR code representation that redirects smartphone scans directly to the shortened target link.",
        introduced: "1.0"
      },
      {
        title: "On-Device Analytical logs (Clicks dashboard)",
        description: "Scroll down to see the Link Table. Check the Click Counter index. It records every visit redirection locally, updating a bar chart by date so you can monitor traffic trends.",
        introduced: "2.0"
      },
      {
        title: "Link Expiration Lock (Expiry Calendar)",
        description: "Click the key icon labeled 'Link Expiry'. Select a date and time from the popup calendar. Once this date passes, the short link redirects to a locked page saying 'This link has expired'.",
        introduced: "2.0"
      },
      {
        title: "URL Forwarding Redirect Customizer (Redirection Rules)",
        description: "Toggle on 'Advanced Redirects'. You can configure destination locations by visitor device: redirect mobile users to app download links other than desktop users, maximizing conversions.",
        introduced: "2.0"
      },
      {
        title: "Delete and Edit controls (Bin button)",
        description: "In the Link table, click the red trashcan icon to delete the redirection reference. Or, click the pencil icon to modify the destination target URL without altering the short suffix.",
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
        title: "WiFi Auto-Access Configurator (Network Card)",
        description: "Select the WiFi tab. Enter your SSID, password, and pick WPA/WPA2 or WEP encryption. Click 'Generate' to create a scan code that triggers network access on smartphones.",
        introduced: "basic"
      },
      {
        title: "Contact vCard Generator (vCard tab)",
        description: "Click the vCard tab. Inputs appear for Full Name, Phone, Email, Company, and Website URL. The generator structures details into vCard coding so scanning saves contact info instantly.",
        introduced: "1.0"
      },
      {
        title: "Custom QR Code Stylings (Colors Palette)",
        description: "Scroll down to the 'Styling Options' box. Click the color bubbles to customize the Foreground (modules) and Background colors. A dynamic selector updates card previews in real time.",
        introduced: "2.0"
      },
      {
        title: "Logo Placement Overlay (Image center)",
        description: "Click the 'Add Logo Image' button in the center styling row. Pick a logo from your computer files. The app places it at the center of the QR matrix, with a white protection zone to ensure scanning remains readable.",
        introduced: "2.0"
      },
      {
        title: "Dimension and Size Adjuster (Pixel Slider)",
        description: "Use the 'Sizing Ratio' slider. Choose from 200px (small web assets) up to 1000px (high-fidelity vector sizing). Larger numbers ensure printing on banners does not blur the square modules.",
        introduced: "1.5"
      },
      {
        title: "Download PNG/SVG Buttons (Save asset)",
        description: "Once satisfied with adjustments, click 'Download PNG' or 'Download SVG'. Use PNG for documents or social emails, and SVG vector format for resizing on large physical branding materials.",
        introduced: "1.0"
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
        title: "HSL/RGB Interactive Wheel (Theme pick)",
        description: "Click the central gradient wheel. Drag your cursor to adjust the color coordinates. The matching panels dynamically display hex indices (e.g. '#2563EB') and color codes immediately.",
        introduced: "basic"
      },
      {
        title: "Complementary Contrast Schemes (Opposites tab)",
        description: "Open the Harmony tab and click 'Complementary'. The app calculates and renders your color's exact opposite on the wheel, showing you a bold highlight pairing.",
        introduced: "1.0"
      },
      {
        title: "Analogous Theme Presets (Neighbors tab)",
        description: "Click 'Analogous Scheme'. The app displays three matching colors adjacent to your selection, allowing you to design eye-pleasing gradients for your website interface.",
        introduced: "2.0"
      },
      {
        title: "dominant Palette Extraction (Image Pick)",
        description: "Click 'Extract from Image'. Select any jpeg or png photo. The canvas parses the image pixels locally and extracts five clean matching theme color blocks onto your palette panel.",
        introduced: "1.0"
      },
      {
        title: "Color Randomizer (Dice button)",
        description: "Click the Shuffle/Dice icon in the header. The app randomizes a clean, trending color scheme and shows the HEX indexes. Keep clicking to quickly find color ideas.",
        introduced: "1.5"
      },
      {
        title: "CSS Styles Export (Copy CSS code)",
        description: "Click 'Export CSS'. In the dialog box, you'll see pre-written CSS variables (like `--color-primary`, `--color-secondary`). Copy this direct stylesheet into your codebase.",
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
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Password Length Slider (Numeric length scale)",
        description: "Locate the 'Length Size' slider control. Slide it between 8 characters (standard keys) up to 128 characters (maximum system password limits). The length number updates instantly.",
        introduced: "basic"
      },
      {
        title: "Complexity Checkboxes (Uppers, Lowers, Numbers, Symbols)",
        description: "Select complexity toggles: 'A-Z' (captials), 'a-z' (lowers), '0-9' (numbers), and '@#$' (symbols). Keep all checked to secure your accounts against dictionary hacks.",
        introduced: "basic"
      },
      {
        title: "Strength Evaluator Indicator (Color scale)",
        description: "Observe the color bar below the password display. It shifts from Red (Weak), to Yellow (Fair), to Green (Secure). It calculates overall cryptographic strength based on password length.",
        introduced: "1.0"
      },
      {
        title: "Exclude Similar Characters Toggle (Anti-Confusion)",
        description: "Toggle 'Exclude Similar' on. The algorithm filters out confusion-prone characters (like 'I' and 'l', 'O' and '0'). This makes typing passwords card-by-card easy.",
        introduced: "2.0"
      },
      {
        title: "Crypto Random Generation (Generate Key button)",
        description: "Click the green 'Generate Key' button. This runs a client-side crypto algorithm block (using web cryptography APIs) to produce a completely unpredictable string.",
        introduced: "1.0"
      },
      {
        title: "Quick-Copy Clipboard Action (Copy button)",
        description: "Click the blue overlapping square files icon next to the result. This copies the generated text to your browser clipboard and clears it from memory after 60 seconds.",
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
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Interactive Typing Workspace (Count Input)",
        description: "Type or paste your document. The workspace immediately renders results in the analysis dashboard columns without lag or processing delays.",
        introduced: "basic"
      },
      {
        title: "Word and Character Index Panels (Main counts)",
        description: "The top row shows counts for Words and Characters (with and without space). It is compatible with multiple language sets, counting glyphs accurately.",
        introduced: "basic"
      },
      {
        title: "Readability and Difficulty Scores (Flesch Index)",
        description: "Look at the Readability card. It lists complex metrics like Flesch Kincaid score, rating text readability from Grade 1 (Very Easy) to College level (Difficult).",
        introduced: "2.0"
      },
      {
        title: "Read & Speak Duration metrics (Seconds timers)",
        description: "Review the 'Time estimation' blocks. It estimates both 'Silent Reading Time' and 'Speaking/Presentation Time' based on typical speech pacing.",
        introduced: "1.0"
      },
      {
        title: "Lexical Keyword Density map (Frequency table)",
        description: "Scroll down to see 'Keyword Frequency'. It shows the most repeated words in a table, displaying percentages. Useful for checking and avoiding SEO keyword stuffing.",
        introduced: "2.0"
      },
      {
        title: "Clear and Clean Slate (Trash Button)",
        description: "Click the trash bin icon. This clears all content from your editor workspace and resets the stats columns to zero immediately.",
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
        title: "Competitor Onboarding inputs (Register Team)",
        description: "Type team names into the 'Competitor Name' input in the sidebar card. Click the blue 'Register Competitor' button to insert them as a new scoreboard row.",
        introduced: "basic"
      },
      {
        title: "Match Stats Multipliers (Wins, Draws, Losses buttons)",
        description: "Each team row lists controls for Wins (W), Draws (D), and Losses (L). Click the plus (+) or minus (-) buttons inside each cell to update match results.",
        introduced: "1.0"
      },
      {
        title: "Goal Difference Calculations (GF & GA inputs)",
        description: "Click the '+' or '-' buttons in the Goals For (GF) and Goals Against (GA) columns. The app automatically calculates GD (GF minus GA) to resolve standing ties.",
        introduced: "1.0"
      },
      {
        title: "Auto-Sorting Standings Ledger (Automatic rank calculation)",
        description: "As results are updated, teams auto-sort: 3 points per win, 1 per draw. Ties are automatically sorted by GD, and then by goals scored (GF).",
        introduced: "2.0"
      },
      {
        title: "Making Tournaments Live (Create/Share button)",
        description: "Click the blue 'Create Tournament' button in the sidebar. This generates a unique ID, saving details in local and cloud stores so you online participants can watch.",
        introduced: "2.0"
      },
      {
        title: "Viewer Mode Links (Admin vs Public Mode)",
        description: "Admin panel uses link parameters (`/tools/games?admin=[id]`). Click 'Copy Share Link' to generate a public, view-only URL (`/tools/games/[id]`) for tournament viewers.",
        introduced: "2.0"
      },
      {
        title: "Scoreboard Reset Switch (Reset card)",
        description: "Click 'Clear Table' at the top of the standings layout. This resets all matches, points, and goals to zero, allowing you to start a new season.",
        introduced: "1.0"
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
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "IP Target Input Field (Lookup box)",
        description: "Type an IPv4 or IPv6 address in the search box. Click 'Locate IP' to retrieve geophysical location coordinates, country details, ISP data, and postal indices.",
        introduced: "basic"
      },
      {
        title: "Interactive Google Maps Interface (Geographic map)",
        description: "Once loaded, a map renders next to results. It places a red pin on coordinate points, with support for zooming, dragging, satellite view, and street adjustments.",
        introduced: "1.0"
      },
      {
        title: "ISP & Network Organization cards",
        description: "Review network details. Check ASN identification keys, autonomous system descriptions, internet service provider names, and domain ranges of the IP host.",
        introduced: "1.0"
      },
      {
        title: "Detecting VPN or Proxy (Anonymity audit)",
        description: "Review the 'Security Metrics' block. The lookup checks proxy lists, detecting whether target IP ranges correspond to Tor nodes, private VPN services, or proxy servers.",
        introduced: "2.0"
      },
      {
        title: "Current User IP Detector (My IP button)",
        description: "Unsure of your public IP? Click the blue 'Find My IP' button. The app queries public network logs to fetch your current public IP address and geolocations.",
        introduced: "1.5"
      },
      {
        title: "Report Exporter (Export PDF button)",
        description: "Click the 'Export Report' button to compile geographical details, coordinates, and maps into a clean PDF document for network diagnostics.",
        introduced: "2.0"
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
        title: "Dynamic Markup Calculator (Pricing Tab)",
        description: "Open the Pricing tab. Key in Product Cost (numbers auto-format with commas) and Markup %. Get target selling price, profit, and gross margins instantly.",
        introduced: "basic"
      },
      {
        title: "Live Currency Exchanger (Exchange rates tab)",
        description: "Select Currency. Type original value and select 'From' and 'To' currency codes. The calculator connects to public exchange APIs to compute rates dynamically.",
        introduced: "1.0"
      },
      {
        title: "Metric & Imperial Volume Converter (Units Tab)",
        description: "Select Units conversion tab. Select category (Weight/Mass, Temperature, or Volume). Type amount, click original unit, and choose destination unit for results.",
        introduced: "2.0"
      },
      {
        title: "Personal BMI Evaluator (BMI Tab)",
        description: "Open the BMI tab. Input your height (in cm or ft/in) and weight (in kg or lbs). Click 'Calculate BMI' to get your score and body weight classification.",
        introduced: "2.0"
      },
      {
        title: "EMI Loan Payments Planner (Loan Tab)",
        description: "Open the Loan tab. Type Principal Loan Amount, Yearly Interest Rate %, and Loan Term (years). It outputs monthly payment, total interest, and total cost.",
        introduced: "2.0"
      },
      {
        title: "Date Age Calculator (Age Tab)",
        description: "Open the Age tab. Select your birthday details. The system outputs age in years, months, days, showing days remaining until your next birthday.",
        introduced: "2.0"
      },
      {
        title: "Tip Divider Calculator (Tip Tab)",
        description: "Open the Tip tab. Input Bill Amount, Tip %, and number of people sharing the cost. It displays tip per person and total bill per person.",
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
        title: "New Note Creation (Plus button)",
        description: "Click '+ New Note' on the sidebar. A new text workspace opens, ready for you to input titles and note contents details.",
        introduced: "basic"
      },
      {
        title: "Categorizing Notes with custom tags",
        description: "Find the Tag input field. Type category terms like 'Work' or 'Personal'. Pill tags appear on note items, allowing you to filter listings.",
        introduced: "1.0"
      },
      {
        title: "Real-time query Search (Search bar)",
        description: "Type search queries into the sidebar search bar. The card index updates instantly, matching keywords inside notes titles or contents.",
        introduced: "1.0"
      },
      {
        title: "Cloud Backup Synchronizer (Sync toggle)",
        description: "Toggle cloud sync to backup local notes to the Supabase database, allowing you to recover notes seamlessly on other devices.",
        introduced: "2.0"
      },
      {
        title: "Archive & Restore logs (Folder button)",
        description: "Click the Folder icon to archive notes. Access the 'Archive' tab to review, restore notes to active view, or delete them permanently.",
        introduced: "2.0"
      },
      {
        title: "Format Text Export (Text file save)",
        description: "Click 'Export Text File' inside the note workspace to download the note contents as a `.txt` file onto your computer.",
        introduced: "1.5"
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
        title: "Plain Text Encoding (Cipher Box)",
        description: "Input sensitive text in the text panel. Add a strong password key in the 'Encryption Password' input field.",
        introduced: "basic"
      },
      {
        title: "Cryptographic Algorithm Selectors",
        description: "Select cryptography standards from the dropdown list. Choose AES (for high security), TripleDES, or RC4 algorithms.",
        introduced: "1.0"
      },
      {
        title: "Secret Key Generator (Key Maker icon)",
        description: "Unsure of password strength? Click the key icon to generate a cryptographically secure string of random characters as a key.",
        introduced: "2.0"
      },
      {
        title: "Self-Decrypting URL Creator (Share button)",
        description: "Click 'Generate Secure Link'. This creates a URL containing the encrypted text payload, allowing you to share self-decrypting links.",
        introduced: "2.0"
      },
      {
        title: "Mobile layout tabs (Screen selector)",
        description: "On mobile layouts, use top page tabs ('Lock Content', 'Unlock Content') to easily input data across narrow screens.",
        introduced: "2.0"
      },
      {
        title: "Clipboard Quick Copier (Copy button)",
        description: "Click the copy icon to copy encrypted ciphers. Decrypt payloads by pasting ciphers into the decryption receiver panel.",
        introduced: "1.0"
      }
    ],
    similarTools: ["password-gen", "ip-locator"]
  },
  "pdf-tools": {
    id: "pdf-tools",
    title: "PDF Tool Studio",
    category: "Utility",
    summary: "PDF Tool Studio lets you perform common PDF tasks right in your browser. You can convert images to PDF, turn raw text into document downloads, extract text from PDFs, or merge multiple files.",
    audience: "Administrators, writers, students, designers, and office agents",
    usageCount: "172,000+ document edits compiled",
    versions: ["1.0", "2.0"],
    features: [
      {
        title: "Convert Image File to PDF layouts",
        description: "Select the 'Image to PDF' tool. Drag JPEG, PNG, or WEBP photos into the upload box. Click 'Format PDF Layout' to compile and download.",
        introduced: "basic"
      },
      {
        title: "Text to PDF converter (Doc creator)",
        description: "Select matching tabs and type content. Adjust margins/spacing sliders and click 'Compile PDF File' to download formatted documents.",
        introduced: "1.0"
      },
      {
        title: "Combine multiple PDF files (PDF Merger)",
        description: "Merge multiple documents: upload files under the 'Merge PDFs' tab, drag rows to reorder, and click 'Consolidate PDFs'.",
        introduced: "2.0"
      },
      {
        title: "Split PDF pages (Splitter tool)",
        description: "Split PDF files: upload the document, enter page ranges (e.g. '1-3, 5'), and click 'Split PDF Pages' to download separate files.",
        introduced: "2.0"
      },
      {
        title: "Extract text from PDF (Parsing log)",
        description: "Upload a PDF document to extract text. The app runs a processing script locally and outputs characters into a copying workspace.",
        introduced: "2.0"
      },
      {
        title: "Download PDF documents (Publish save)",
        description: "Click 'Save Document' to trigger high-speed compilation and download processed PDF files immediately.",
        introduced: "1.0"
      }
    ],
    similarTools: ["qr-code", "calculator"]
  }
};
