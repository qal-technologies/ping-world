import { AutoCorrectEngine } from './autocorrect';
import { ToneCorrectionEngine } from './tone-correction';
import { TextArrayMatrixEngine } from './text-array-matrix';
import { ColorSuggestionEngine } from './color-suggestion';
import { EncryptionEngine } from './encryption';
import { PDFDocEngine } from './pdf-doc';
import { AudioEditingEngine } from './audio-editing';
import { CountryDataEngine } from './country-data';
import { ImageEditingEngine } from './image-editing';
import { EmailEngine } from './email-engine';
import { AlertingToastEngine } from './alerting-toast';
import { StylingEngine } from './styling-engine';
import { SecureStateManager } from './secure-state';
import { RecallerEngine } from './recaller';
import { LocationEngine } from './location-engine';
import { PasswordUtilityEngine } from './password-utility';
import { SessionEngine } from './session-engine';
import { DbValidationHandler } from './db-validation';

export * from './autocorrect';
export * from './tone-correction';
export * from './text-array-matrix';
export * from './color-suggestion';
export * from './encryption';
export * from './pdf-doc';
export * from './audio-editing';
export * from './country-data';
export * from './image-editing';
export * from './email-engine';
export * from './alerting-toast';
export * from './styling-engine';
export * from './secure-state';
export * from './recaller';
export * from './location-engine';
export * from './password-utility';
export * from './session-engine';
export * from './db-validation';

export const DevEngineRegistry: Record<string, any> = {
  'autocorrect': new AutoCorrectEngine(),
  'tone-correction': new ToneCorrectionEngine(),
  'text-array-matrix': new TextArrayMatrixEngine(),
  'color-suggestion': new ColorSuggestionEngine(),
  'encryption': new EncryptionEngine(),
  'pdf-doc': new PDFDocEngine(),
  'audio-editing': new AudioEditingEngine(),
  'country-data': new CountryDataEngine(),
  'image-editing': new ImageEditingEngine(),
  'email-engine': new EmailEngine(),
  'alerting-toast': new AlertingToastEngine(),
  'styling-engine': new StylingEngine(),
  'secure-state': SecureStateManager.getInstance(),
  'recaller': new RecallerEngine(),
  'location-engine': new LocationEngine(),
  'password-utility': new PasswordUtilityEngine(),
  'session-engine': new SessionEngine(),
  'db-validation': new DbValidationHandler(),
};
