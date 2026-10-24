import type { LanguageCode } from "../types/contracts";
// Registry of supported reading/original languages, not a UI localization promise.
export const languages: ReadonlyArray<{ code: LanguageCode; label: string }> = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "ml", label: "മലയാളം" },
];
export const languageLabel = (code: LanguageCode) =>
  languages.find((l) => l.code === code)!.label;
