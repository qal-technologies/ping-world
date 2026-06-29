# Setting up FREE LLM AI for PingWorld Composer

The PingWorld Composer features advanced AI capabilities like Hashtag Generation, Content Refinement/Rephrasing, and Post Idea Suggestions. While the local demo mocks these features, you can easily enable the real AI engines using free keys.

## Recommended Free APIs (No Credit Card Required)

### 1. Groq (Fastest & Free)
Groq provides one of the fastest inference APIs in the world with a very generous free tier using advanced models like LLaMA-3.
**How to get it:**
1. Go to [console.groq.com](https://console.groq.com/) and create a free account.
2. Navigate to "API Keys" and click "Create API Key".
3. Copy the key and add it to your `.env.local` as `GROQ_API_KEY=your_key_here`.

### 2. Google Gemini (Generous Free Tier)
Google's Gemini 1.5 Flash offers 15 Requests Per Minute for free.
**How to get it:**
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Click "Get API Key" on the left sidebar.
3. Copy the key and add it to `.env.local` as `GEMINI_API_KEY=your_key_here`.

### 3. OpenRouter (Access to dozens of free models)
OpenRouter provides a single unified API endpoint for many models, and hosts several completely free models like `mistral-7b-instruct` or `llama-3-8b`.
**How to get it:**
1. Go to [openrouter.ai](https://openrouter.ai/) and sign up.
2. Go to "Keys" and create a key.
3. Add it to `.env.local` as `OPENROUTER_API_KEY=your_key_here`.

---

## Already Configured Keyless APIs

We've already configured several of the Composer's tools to use **completely free, public, keyless APIs** so they run right out of the box:

- **Grammar Check**: Powered by the public `LanguageTool` REST API.
- **Translation**: Powered by the public `MyMemory` Translation API (supports up to 5,000 chars per day translating between any standard languages).

No setup is required for these! Just boot the app and verify you have an internet connection.
