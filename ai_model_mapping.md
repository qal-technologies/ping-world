# AI Model Curation and Architecture Mapping

This document describes how PingWorld Composer maps specific social media composition features to various free/free-tier LLMs and AI services to achieve high-quality output while keeping deployment and running costs at zero.

---

## 1. Feature-to-Model Mapping

| Composer Feature | Assigned Model / Service | Reason for Selection | Fallback / Mock Service |
| :--- | :--- | :--- | :--- |
| **Social Post Ideas & Suggestions** (Based on Title) | **Google Gemini 2.5 Flash** (via Google AI Studio) | High context window (up to 1M tokens), very fast generation, extremely creative and structured social content generation. Free tier supports 15 RPM. | Local title heuristics & preset templates. |
| **Content Rephrasing & Tone Shift** (Professional, Casual, Viral, Educational) | **Google Gemini 2.5 Flash** | Excellent instruction-following for tone customization, style alignment, and character limit safety. | Rule-based localized suffix/prefix transformer. |
| **Hashtags & Tag Discovery** (Dependent on content) | **LLaMA 3.1 8B / 70B** (via Groq Free Tier) or **Gemini 2.5 Flash** | LLaMA 3.1 is lightning-fast at extracting entities, tags, and semantic keywords. Groq provides this with up to 14,400 requests/day for free. | Key noun extraction and platform defaults. |
| **Grammar & Tone Quality Check** | **LanguageTool API** (Keyless Public REST) | Unbelievably reliable and quick for spelling, structural suggestions, and style corrections without requiring keys. | Basic client-side dictionary regex checks. |
| **Selection Translation** (Inline selection translator) | **MyMemory API** (Keyless REST) | Free keyless translation up to 5,000 chars per day between standard international languages. | Google Translate web-embed or local simulated bracketed text translation. |

---

## 2. Setting Up Real API Keys for Production

To activate real AI generation:
1. Create a `.env.local` file at the root of the repository.
2. Provide the following keys:
   ```env
   # Enable Gemini 2.5 Flash via Server-Side REST Call
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. The server will automatically detect these keys and swap the simulation endpoints for the real live API models!
