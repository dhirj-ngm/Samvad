import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LanguageCode } from '../types/contracts';

export type OnboardingDraft = { handle: string; language: LanguageCode; interestIds: string[] };
const key = (userId: string) => `samvad-onboarding-pending:${userId}`;
export async function loadPendingDraft(userId: string): Promise<OnboardingDraft | null> {
  const value = await AsyncStorage.getItem(key(userId));
  if (!value) return null;
  try { return JSON.parse(value) as OnboardingDraft; } catch { return null; }
}
export async function savePendingDraft(userId: string, draft: OnboardingDraft) { await AsyncStorage.setItem(key(userId), JSON.stringify(draft)); }
export async function clearPendingDraft(userId: string) { await AsyncStorage.removeItem(key(userId)); }
