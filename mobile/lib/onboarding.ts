import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseProfileDraft, type OnboardingDraft } from "./profile-model";
export type { OnboardingDraft } from "./profile-model";

const key = (userId: string) => `samvad-onboarding-pending:${userId}`;
export async function loadPendingDraft(
  userId: string,
): Promise<OnboardingDraft | null> {
  const value = await AsyncStorage.getItem(key(userId));
  if (!value) return null;
  return parseProfileDraft(value);
}
export async function savePendingDraft(userId: string, draft: OnboardingDraft) {
  await AsyncStorage.setItem(key(userId), JSON.stringify(draft));
}
export async function clearPendingDraft(userId: string) {
  await AsyncStorage.removeItem(key(userId));
}
