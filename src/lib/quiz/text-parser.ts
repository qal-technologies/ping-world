/**
 * Whitelisted HTML & Text Parsing Helper
 * Retains exact line breaks (\n / CSS white-space: pre-wrap) and paragraph spacing.
 * Whitelists safe HTML tags (e.g. b, i, u, strong, em, code, a, sub, sup, br).
 * Filters out unsafe tags (script, iframe, style, onclick) while maintaining exact raw text values for CSV exports.
 */

const ALLOWED_TAGS_REGEX = /<\/?(b|i|u|strong|em|code|a|sub|sup|br)\b[^>]*>/gi;

/**
 * Strips unallowed HTML tags from text while preserving allowed formatting tags and line breaks.
 */
export function parseWhitelistedHtml(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';

  let sanitized = text;

  // Protect allowed tags temporarily
  const tokens: string[] = [];
  sanitized = sanitized.replace(ALLOWED_TAGS_REGEX, (match) => {
    tokens.push(match);
    return `___PW_HTML_TOKEN_${tokens.length - 1}___`;
  });

  // Strip all other HTML tags
  sanitized = sanitized.replace(/<[^>]*>?/gm, '');

  // Restore allowed tags
  sanitized = sanitized.replace(/___PW_HTML_TOKEN_(\d+)___/g, (_, idx) => tokens[parseInt(idx, 10)] || '');

  return sanitized;
}

/**
 * Cleans text for CSV exports: removes all HTML tags and eval code tokens while preserving exact plain-text parity.
 */
export function cleanTextForCSV(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';

  return text
    .replace(/<[^>]*>?/gm, '') // Strip all HTML
    .replace(/@eval:\{[^}]*\}/gi, '') // Strip eval blocks if raw
    .trim();
}
