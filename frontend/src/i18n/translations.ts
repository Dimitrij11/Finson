import mk from './mk.json';
import en from './en.json';

export const translations = {
  mk,
  en,
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;

