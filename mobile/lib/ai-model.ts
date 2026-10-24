import type { LanguageCode } from '../types/contracts';

type DemoSummary = {
  english_lines: string[];
  native_lines: string[];
  native_language: LanguageCode;
  native_status: 'original' | 'available' | 'unavailable';
  is_cached: boolean;
  label: string;
};
const validLines = (value: unknown): value is string[] => Array.isArray(value) &&
  value.every(line => typeof line === 'string' && !!line.trim() && !/[\r\n]/.test(line));

export function parseDemoSummary(value: unknown, target: LanguageCode): DemoSummary {
  const d = value as Partial<DemoSummary> | null;
  if (!d || !validLines(d.english_lines) || d.english_lines.length < 4 || d.english_lines.length > 5 ||
      !validLines(d.native_lines) || d.native_language !== target || typeof d.label !== 'string' ||
      typeof d.is_cached !== 'boolean' ||
      !(target === 'en' ? d.native_status === 'original' : ['available', 'unavailable'].includes(d.native_status ?? '')) ||
      (d.native_status === 'unavailable' ? d.native_lines.length !== 0 : d.native_lines.length !== d.english_lines.length)) {
    throw new Error('Summary was not valid. Read the original and retry.');
  }
  return d as DemoSummary;
}
