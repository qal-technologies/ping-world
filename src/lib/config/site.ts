import { COMPANY } from './company';

/**
 * Site-wide constants — version, URLs, canonical domain.
 * Import from here wherever you need the app domain or version.
 */
export const SITE = {
  version: COMPANY.version,
  domain: COMPANY.domain,
  name: COMPANY.name,
  launchDate: COMPANY.launchDate,
  /** Full canonical URL for a relative path */
  url: (path: string) => `${COMPANY.domain}${path}`,
} as const;
