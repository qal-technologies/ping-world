// jules edit: Professional modular responsive Email Template Engine with hierarchical button placement, downlink arrays, and section override colors.

export type EmailTemplateType = 
  | 'professional'
  | 'marketing'
  | 'social'
  | 'information'
  | 'otp'
  | 'newsletter'
  | 'welcome'
  | 'modular';

export interface EmailTemplateParams {
  title: string;
  body: string;
  recipientName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
  otpCode?: string;
  footerText?: string;
  companyName?: string;
  modularConfig?: ModularEmailParams;
}

export interface ButtonConfig {
  order: 'before-text' | 'after-text' | number;
  title: { text: string; color?: string; underline?: boolean; weight?: 'bold' | 'normal' };
  url: string;
  position: 'left' | 'right' | 'center';
}

export interface DownlinkConfig {
  text: string;
  url: string;
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
    downlinks?: DownlinkConfig[];
  };
}

export class EmailEngine {
  public generateTemplate(type: EmailTemplateType, params: EmailTemplateParams): string {
    try {
      const primary = params.primaryColor || '#00f0ff';
      const secondary = params.secondaryColor || '#0f172a';
      const company = params.companyName || 'PingWorld';
      const logo = params.logoUrl || 'https://pingworld.app/images/logo.png';
      const footer = params.footerText || `© ${new Date().getFullYear()} ${company}. All rights reserved.`;

      if (type === 'modular' && params.modularConfig) {
        return this.generateModularTemplate(params.modularConfig);
      }

      switch (type) {
        case 'otp':
          return this.wrapEmail(primary, secondary, `
            <div style="text-align: center; padding: 20px 0;">
              <img src="${logo}" alt="${company}" style="height: 48px; margin-bottom: 20px;" />
              <h1 style="color: ${secondary}; font-size: 24px; margin-bottom: 10px;">Verification Code</h1>
              <p style="color: #64748b; font-size: 14px; margin-bottom: 25px;">Use the following 6-digit one-time password to complete your authentication:</p>
              <div style="background: #f1f5f9; border: 2px dashed ${primary}; border-radius: 12px; padding: 20px; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: ${primary}; display: inline-block; margin-bottom: 25px;">
                ${params.otpCode || '123456'}
              </div>
              <p style="color: #94a3b8; font-size: 12px;">This code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
            </div>
          `, footer);

        case 'professional':
          return this.wrapEmail(primary, secondary, `
            <div>
              <div style="border-bottom: 2px solid ${primary}; padding-bottom: 15px; margin-bottom: 25px;">
                <img src="${logo}" alt="${company}" style="height: 36px; float: left;" />
                <div style="clear: both;"></div>
              </div>
              <h2 style="color: ${secondary}; font-size: 20px; margin-bottom: 15px;">${params.title}</h2>
              <p style="color: #334155; font-size: 15px; line-height: 1.6;">Dear ${params.recipientName || 'Valued User'},</p>
              <div style="color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
                ${params.body.replace(/\n/g, '<br/>')}
              </div>
              ${params.ctaUrl ? `
                <div style="margin-top: 30px;">
                  <a href="${params.ctaUrl}" style="background-color: ${primary}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                    ${params.ctaText || 'View Details'}
                  </a>
                </div>
              ` : ''}
            </div>
          `, footer);

        case 'marketing':
          return this.wrapEmail(primary, secondary, `
            <div style="text-align: center; background: linear-gradient(135deg, ${secondary} 0%, #1e293b 100%); color: #ffffff; padding: 40px 20px; border-radius: 16px; margin-bottom: 30px;">
              <img src="${logo}" alt="${company}" style="height: 48px; margin-bottom: 20px;" />
              <h1 style="color: ${primary}; font-size: 28px; margin-bottom: 15px;">${params.title}</h1>
              <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; max-width: 500px; margin: 0 auto 30px;">
                ${params.body}
              </p>
              ${params.ctaUrl ? `
                <a href="${params.ctaUrl}" style="background: ${primary}; color: #000000; padding: 14px 32px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px rgba(0,240,255,0.4);">
                  ${params.ctaText || 'Claim Offer Now'}
                </a>
              ` : ''}
            </div>
          `, footer);

        case 'social':
          return this.wrapEmail(primary, secondary, `
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px;">
              <div style="display: flex; align-items: center; margin-bottom: 20px;">
                <img src="${logo}" alt="${company}" style="height: 32px; margin-right: 12px;" />
                <span style="font-weight: bold; color: ${secondary}; font-size: 16px;">${company} Activity</span>
              </div>
              <h3 style="color: ${secondary}; font-size: 18px; margin-bottom: 10px;">${params.title}</h3>
              <p style="color: #475569; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">${params.body}</p>
              ${params.ctaUrl ? `
                <a href="${params.ctaUrl}" style="color: ${primary}; text-decoration: none; font-weight: bold; font-size: 14px;">
                  ${params.ctaText || 'View Notification →'}
                </a>
              ` : ''}
            </div>
          `, footer);

        case 'information':
        default:
          return this.wrapEmail(primary, secondary, `
            <div>
              <h2 style="color: ${secondary}; font-size: 20px; margin-bottom: 15px;">${params.title}</h2>
              <div style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                ${params.body.replace(/\n/g, '<br/>')}
              </div>
            </div>
          `, footer);
      }
    } catch (e) {
      return `<p>${params.body}</p>`;
    }
  }

  // Purely modular builder with detailed alignments, hierarchical ordering, downlinks, and color overrides
  public generateModularTemplate(config: ModularEmailParams): string {
    const defaultPrimary = config.primaryColor || '#00f0ff';

    // Header Color Overrides
    const headerTitleColor = config.header?.color || defaultPrimary;
    const headerBgColor = config.header?.bgColor || '#0f172a';

    // Parse buttons into before-text, after-text, and numeric sorted slots
    const buttons = config.body.buttons || [];
    const beforeTextButtons = buttons.filter(b => b.order === 'before-text');
    const afterTextButtons = buttons.filter(b => b.order === 'after-text');
    const numericButtons = buttons
      .filter(b => typeof b.order === 'number')
      .sort((a, b) => (a.order as number) - (b.order as number));

    const renderButton = (btn: ButtonConfig) => {
      const alignment = btn.position || 'center';
      const isUnderlined = btn.title.underline ? 'text-decoration: underline;' : 'text-decoration: none;';
      const isBold = btn.title.weight === 'bold' ? 'font-weight: bold;' : 'font-weight: normal;';
      const textColor = btn.title.color || '#ffffff';
      const btnBg = btn.title.color || defaultPrimary;

      return `
        <div style="text-align: ${alignment}; margin: 15px 0;">
          <a href="${btn.url}" style="background-color: ${btnBg}; color: ${textColor}; padding: 12px 24px; display: inline-block; border-radius: 8px; font-family: sans-serif; font-size: 14px; ${isUnderlined} ${isBold}">
            ${btn.title.text}
          </a>
        </div>
      `;
    };

    const beforeHtml = beforeTextButtons.map(renderButton).join('');
    const afterHtml = afterTextButtons.map(renderButton).join('');
    const numericHtml = numericButtons.map(renderButton).join('');

    // Downlinks in footer
    const downlinks = config.footer?.downlinks || [];
    const downlinksHtml = downlinks.length > 0
      ? `
        <div style="margin-top: 15px; text-align: center;">
          ${downlinks.map(dl => `<a href="${dl.url}" style="color: ${defaultPrimary}; margin: 0 10px; font-size: 12px; text-decoration: underline;">${dl.text}</a>`).join('')}
        </div>
      `
      : '';

    const contentHtml = `
      <!-- Header -->
      ${config.header ? `
        <div style="background-color: ${headerBgColor}; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: ${headerTitleColor}; font-size: 24px; margin: 0; font-family: sans-serif;">${config.header.title}</h1>
          ${config.header.description ? `<p style="color: #cbd5e1; font-size: 13px; margin: 10px 0 0 0; font-family: sans-serif;">${config.header.description}</p>` : ''}
        </div>
      ` : ''}

      <!-- Body -->
      <div style="padding: 30px; background-color: #ffffff; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; ${!config.header ? 'border-radius: 12px 12px 0 0;' : ''}">
        ${beforeHtml}
        <div style="color: #334155; font-size: 15px; line-height: 1.6; font-family: sans-serif; margin-bottom: 20px;">
          ${config.body.text.replace(/\n/g, '<br/>')}
        </div>
        ${numericHtml}
        ${afterHtml}
      </div>

      <!-- Footer -->
      <div style="padding: 24px; background-color: #f8fafc; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0; font-family: sans-serif;">${config.footer?.text || `© ${new Date().getFullYear()} All rights reserved.`}</p>
        ${downlinksHtml}
      </div>
    `;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
          .container { max-width: 600px; margin: 30px auto; }
        </style>
      </head>
      <body>
        <div class="container">
          ${contentHtml}
        </div>
      </body>
      </html>
    `;
  }

  private wrapEmail(primaryColor: string, secondaryColor: string, contentHtml: string, footerText: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
          .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          ${contentHtml}
          <div class="footer">
            <p>${footerText}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
