// ============================================================
// Email Template Engine — Modular responsive HTML emails
// Modular: header + body (with ordered buttons) + footer
// Templates: professional, otp, marketing, social, information
// Component-level color overrides the global primaryColor
// ============================================================

export type EmailTemplateType =
  | 'professional'
  | 'otp'
  | 'marketing'
  | 'social'
  | 'information'
  | 'otp'
  | 'newsletter'
  | 'welcome'
  | 'modular';

export type ButtonOrder = 'before-text' | 'after-text' | number;
export type ButtonPosition = 'left' | 'center' | 'right';
export type FontWeight = 'normal' | 'bold' | '600' | '700';

export interface ButtonConfig {
  title: { text: string; color?: string; underline?: boolean; weight?: 'bold' | 'normal' };
  url: string;
  order?: ButtonOrder; // 'before-text', 'after-text', or numeric index
  position?: ButtonPosition;
  color?: string; // Text color
  bgColor?: string; // Background color (overrides primaryColor for this button)
  style?: {
    underline?: boolean;
    weight?: FontWeight;
    borderRadius?: string;
  };
}

export interface HeaderConfig {
  title?: string;
  description?: string;
  color?: string; // Header text color (overrides primaryColor)
  bgColor?: string; // Header background color
  logoUrl?: string;
  logoAlt?: string;
}

export interface BodyConfig {
  text?: string;
  buttons?: ButtonConfig[];
}

export interface FooterConfig {
  text?: string;
  downlinks?: Array<{ text: string; url: string }>;
  bgColor?: string;
  color?: string;
}

export interface ModularEmailParams {
  primaryColor?: string;
  header?: {
    title: string;
    description?: string;
    color?: string;
    bgColor?: string;
  };
  body: {
    text: string;
    buttons?: ButtonConfig[];
  };
  footer?: {
    text: string;
    downlinks?: FooterConfig[];
  };
}
export interface EmailTemplateParams {
  // Modular structural approach
  header?: HeaderConfig;
  body?: BodyConfig;
  footer?: FooterConfig;

  // Legacy flat-param shorthand (for quick usage)
  title?: string;
  preheader?: string;
  bodyText?: string;
  ctaText?: string;
  ctaUrl?: string;
  otp?: string;
  primaryColor?: string; // Global accent color (can be overridden per component)
  companyName?: string;
  year?: number;
  unsubscribeUrl?: string;
  modularConfig?: ModularEmailParams;
}

export interface EmailResult {
  html: string;
  plainText: string;
  subject: string;
  type: EmailTemplateType;
}

export class EmailEngine {
  private readonly defaultColors: Record<EmailTemplateType, string> = {
    professional: '#1a73e8',
    otp: '#ff6b35',
    marketing: '#7c3aed',
    social: '#0ea5e9',
    information: '#059669',
    newsletter: '#ffe100',
    welcome: '#e000d8',
    modular: '#1a73e8',
  };

  /** Generate a complete responsive HTML email */
  public generateTemplate(
    type: EmailTemplateType,
    params: EmailTemplateParams = {},
  ): EmailResult {
    try {
      const primary = params.primaryColor ?? this.defaultColors[type];
      const company = params.companyName ?? 'PingWorld';
      const year = params.year ?? new Date().getFullYear();

      // Resolve modular or flat params
      const header = this._resolveHeader(type, params, primary);
      const body = this._resolveBody(type, params, primary);
      const footer = this._resolveFooter(params, primary, company, year);



      const html = this._buildHTML(header, body, footer, primary);
      const plainText = this._buildPlainText(header, body, footer);
      const subject = header.title ?? `Message from ${company}`;

      return { html, plainText, subject, type };
    } catch (e) {
      return {
        html: '<p>Failed to generate email template.</p>',
        plainText: 'Email generation failed.',
        subject: 'Email',
        type,
      };
    }
  }

  /** Generate preview-ready HTML (same as generateTemplate but returns only HTML) */
  public preview(
    type: EmailTemplateType,
    params: EmailTemplateParams = {},
  ): string {
    return this.generateTemplate(type, params).html;
  }

  /** Generate just a plaintext version */
  public toPlainText(
    type: EmailTemplateType,
    params: EmailTemplateParams = {},
  ): string {
    return this.generateTemplate(type, params).plainText;
  }

  /** List all available template types */
  public getTemplateTypes(): EmailTemplateType[] {
    return ['professional', 'otp', 'marketing', 'social', 'information', 'newsletter', 'welcome', 'modular'];
  }

  // ---- Resolvers ----

  private _resolveHeader(
    type: EmailTemplateType,
    params: EmailTemplateParams,
    primary: string,
  ): Required<HeaderConfig> {
    const flat = params.header;
    const defaults: Record<EmailTemplateType, Partial<HeaderConfig>> = {
      professional: {
        title: params.title ?? 'Important Update',
        description: params.preheader ?? '',
      },
      otp: {
        title: 'Your Verification Code',
        description: 'Use this code to complete your login.',
      },
      marketing: {
        title: params.title ?? 'Exclusive Offer Just for You',
        description: params.preheader ?? "Don't miss out.",
      },
      social: {
        title: params.title ?? 'Activity Update',
        description: params.preheader ?? '',
      },
      information: {
        title: params.title ?? 'Information',
        description: params.preheader ?? '',
      },
      newsletter: {
        title: params.title ?? 'Newsletter',
        description: params.preheader ?? '',
      },
      welcome: {
        title: params.title ?? 'Welcome',
        description: params.preheader ?? '',
      },
      modular: {
        title: params.title ?? 'Modular Email',
        description: params.preheader ?? '',
      },
    };
    const base = defaults[type];
    return {
      title: flat?.title ?? base.title ?? '',
      description: flat?.description ?? base.description ?? '',
      color: flat?.color ?? '#ffffff',
      bgColor: flat?.bgColor ?? primary,
      logoUrl: flat?.logoUrl ?? '',
      logoAlt: flat?.logoAlt ?? '',
    };
  }

  private _resolveBody(
    type: EmailTemplateType,
    params: EmailTemplateParams,
    primary: string,
  ): BodyConfig {
    if (params.body) return params.body;

    const buttons: ButtonConfig[] = [];

    if (type === 'otp') {
      return {
        text: `Your one-time password is below. It expires in 10 minutes. Do not share this code with anyone.`,
      };
    }

    if (params.ctaText && params.ctaUrl) {
      buttons.push({
        title: {text: params.ctaText, color: '#ffffff', underline: true, weight: 'bold'},
        url: params.ctaUrl,
        bgColor: primary,
        position: 'center',
        order: 'after-text',
      });
    }

    return {
      text: params.bodyText ?? 'Thank you for using our services.',
      buttons,
    };
  }

  private _resolveFooter(
    params: EmailTemplateParams,
    primary: string,
    company: string,
    year: number,
  ): Required<FooterConfig> {
    const flat = params.footer;
    const downlinks: Array<{ text: string; url: string }> =
      flat?.downlinks ?? [];
    if (params.unsubscribeUrl) {
      downlinks.push({ text: 'Unsubscribe', url: params.unsubscribeUrl });
    }
    return {
      text: flat?.text ?? `© ${year} ${company}. All rights reserved.`,
      downlinks,
      bgColor: flat?.bgColor ?? '#f8f8f8',
      color: flat?.color ?? '#888888',
    };
  }

  // ---- HTML Builder ----

  private _buildHTML(
    header: Required<HeaderConfig>,
    body: BodyConfig,
    footer: Required<FooterConfig>,
    primary: string,
  ): string {
    const beforeTextButtons = (body.buttons ?? []).filter(
      (b) =>
        b.order === 'before-text' ||
        (typeof b.order === 'number' && b.order < 0),
    );
    const afterTextButtons = (body.buttons ?? [])
      .filter(
        (b) =>
          b.order === 'after-text' ||
          b.order === undefined ||
          (typeof b.order === 'number' && b.order >= 0),
      )
      .sort((a, b) => {
        const aOrder = typeof a.order === 'number' ? a.order : 999;
        const bOrder = typeof b.order === 'number' ? b.order : 999;
        return aOrder - bOrder;
      });

    const buttonHtml = (btn: ButtonConfig) => {
      const bg = btn.bgColor ?? primary;
      const align = btn.position ?? 'center';
      const br = btn.style?.borderRadius ?? '6px';
      const underline =
        btn.style?.underline || btn.title.underline ?
          'text-decoration: underline;'
        : 'text-decoration: none;';
      const weight = btn.style?.weight ?? '600';
      return `<tr><td style="padding: 12px 0; text-align: ${align};">
        <a href="${btn.url}" style="display: inline-block; background-color: ${bg}; color: ${btn.title.color}; font-weight: ${weight}; padding: 14px 32px; border-radius: ${br}; ${underline} font-family: Arial, sans-serif; font-size: 15px;">${btn.title.text}</a>
      </td></tr>`;
    };

    const logoBlock =
      header.logoUrl ?
        `<img src="${header.logoUrl}" alt="${header.logoAlt}" style="max-height: 48px; max-width: 200px; margin-bottom: 12px;">`
      : '';

    const footerLinks = (footer.downlinks ?? [])
      .map(
        (l) =>
          `<a href="${l.url}" style="color: ${footer.color}; font-size: 11px; margin: 0 8px; text-decoration: none;">${l.text}</a>`,
      )
      .join(' &bull; ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${header.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f0f0;font-family:Arial,Helvetica,sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0f0f0;padding:30px 0;">
    <tr><td align="center">
      <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- HEADER -->
        <tr>
          <td style="background-color:${header.bgColor};padding:36px 40px;text-align:center;">
            ${logoBlock}
            <h1 style="margin:0;font-size:26px;font-weight:700;color:${header.color};line-height:1.3;">${header.title}</h1>
            ${header.description ? `<p style="margin:10px 0 0;font-size:14px;color:${header.color};opacity:0.85;">${header.description}</p>` : ''}
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:36px 40px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              ${beforeTextButtons.map(buttonHtml).join('')}
              ${body.text ? `<tr><td style="font-size:15px;color:#333333;line-height:1.7;padding-bottom:20px;">${body.text.replace(/\n/g, '<br>')}</td></tr>` : ''}
              ${afterTextButtons.map(buttonHtml).join('')}
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background-color:${footer.bgColor};padding:24px 40px;text-align:center;border-top:1px solid #e5e5e5;">
            <p style="margin:0 0 8px;font-size:12px;color:${footer.color};">${footer.text}</p>
            ${footerLinks ? `<p style="margin:0;">${footerLinks}</p>` : ''}
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private _buildPlainText(
    header: Required<HeaderConfig>,
    body: BodyConfig,
    footer: Required<FooterConfig>,
  ): string {
    const lines: string[] = [];
    lines.push(header.title, header.description, '', body.text ?? '');
    (body.buttons ?? []).forEach((b) => lines.push(`\n→ ${b.title}: ${b.url}`));
    lines.push('', footer.text);
    (footer.downlinks ?? []).forEach((l) => lines.push(`${l.text}: ${l.url}`));
    return lines.filter((l) => typeof l === 'string' && l.trim()).join('\n');
  }
}
