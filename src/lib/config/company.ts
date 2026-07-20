/**
 * Centralised company & developer data.
 * Import from here instead of hard-coding strings across the codebase.
 */

export const COMPANY = {
  name: 'Ping World',
  tagline: 'Your world of tools.',
  description:
    'Open premium utilities and creator tools for everyone.',
  version: '1.0.0',
  launchDate: '2026-08-01',

  domain: 'https://ping-world.site',
  supportEmail: 'ping.world@gmail.com',
  contactEmail: 'ping.world@gmail.com',

  legal: {
    privacyUrl: '/privacy',
    termsUrl: '/terms',
    year: new Date().getFullYear(),
  },

  developer: {
    name: 'Poshcodes',
    contact: 'https://wa.me/2349016561308',
    url:'https://pascodes-tech.netlify.app'
  },

  parent: {
    name: 'QAL TECH',
    url: 'https://qal-tech.website',
    short: 'Qal Technologies',
  },

  socials: {
    youtube: 'https://www.youtube.com/@ping-world',
    email: 'mailto:ping.world@gmail.com',
    x: 'https://x.com/ping_world',
    instagram: 'https://www.instagram.com/ping.world',
    linkedin: 'https://www.linkedin.com/company/ping-world',
  },
} as const;

export type CompanyData = typeof COMPANY;
