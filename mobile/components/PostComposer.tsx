import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { useRouter } from "expo-router";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import { submitPost } from "../lib/discovery";
import {
  codePointLength,
  parseDraft,
  postDraftKey,
  validPost,
  type PostDraft,
} from "../lib/post-model";
import type { LanguageCode } from "../types/contracts";
import { colors, radius, spacing, type } from "../theme/tokens";

import { languages } from "../lib/languages";
import { Icon } from "./Icon";
import { MentionSuggestions } from "./MentionSuggestions";

export function PostComposer({
  actor,
  handle,
  language,
}: {
  actor: string;
  handle: string;
  language: LanguageCode;
}) {
  const router = useRouter();
  const [cursor, setCursor] = useState(0);
  const [draft, setDraft] = useState<PostDraft | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const writeQueue = useRef(Promise.resolve());
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const key = postDraftKey(actor);
  useEffect(() => {
    mounted.current = true;
    void AsyncStorage.getItem(key)
      .then((raw) => {
        if (!mounted.current) return;
        const restored = parseDraft(raw);
        if (raw && !restored) {
          setLoadFailed(true);
          setMessage(
            "This saved draft could not be restored. It has been kept on this device.",
          );
          return;
        }
        setDraft(
          restored ?? {
            requestId: randomUUID(),
            body: "",
            language,
            attempted: false,
          },
        );
        setLoadFailed(false);
        setMessage("");
      })
      .catch(() => {
        if (mounted.current) {
          setLoadFailed(true);
          setMessage(
            "Could not restore your draft. Retry before writing a new post.",
          );
        }
      });
    return () => {
      mounted.current = false;
    };
  }, [key, attempt]);

  function persist(next: PostDraft) {
    setDraft(next);
    const pending = writeQueue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(key, JSON.stringify(next)));
    writeQueue.current = pending;
    return pending;
  }
  function edit(next: PostDraft) {
    void persist(next).catch(() => {
      if (mounted.current)
        setMessage(
          "Your draft could not be saved on this device. Check storage before leaving this screen.",
        );
    });
  }
  async function submit() {
    if (!supabase || !draft || !validPost(draft.body) || inFlight.current)
      return;
    inFlight.current = true;
    setBusy(true);
    setMessage("");
    const outgoing = { ...draft, attempted: true };
    try {
      // Persist the key and exact content before sending anything over the network.
      await persist(outgoing);
      const result = await submitPost(supabase, outgoing, actor);
      await writeQueue.current;
      await AsyncStorage.removeItem(key);
      if (!mounted.current) return;
      setDraft({
        requestId: randomUUID(),
        body: "",
        language,
        attempted: false,
      });
      setMessage(
        result.deleted
          ? "This submission was already removed. It was not created again."
          : result.moderation_state === "allowed"
            ? "Your post is live. Find it on your profile."
            : "Your post is saved and awaiting review. You can find it in Settings → My submissions.",
      );
    } catch (error) {
      if (mounted.current)
        setMessage(
          error instanceof Error
            ? error.message
            : "Save was not confirmed. Your draft is kept; retry the same submission.",
        );
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function startNew() {
    if (inFlight.current) return;
    const fresh = {
      requestId: randomUUID(),
      body: "",
      language,
      attempted: false,
    };
    try {
      await persist(fresh);
      if (mounted.current)
        setMessage(
          "New draft started. Any previously saved submission remains in your profile.",
        );
    } catch {
      if (mounted.current)
        setMessage("Could not start a new saved draft. Try again.");
    }
  }
  const count = codePointLength(draft?.body ?? "");
  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.wrap}
      >
        <View style={{flexDirection:'row',alignItems:'center',gap:12,marginBottom:8}}>
          <View style={{width:44,height:44,borderRadius:22,backgroundColor:colors.accentSoft,alignItems:'center',justifyContent:'center'}}><Text style={{color:colors.accent,fontWeight:'800',fontSize:16}}>{handle.slice(0,2).toUpperCase()}</Text></View>
          <View><Text style={styles.author}>@{handle}</Text><View style={{flexDirection:'row',alignItems:'center',gap:5,marginTop:4}}><Icon name="globe" size={13} color={colors.muted}/><Text style={{color:colors.muted,fontSize:12}}>Public conversation</Text></View></View>
        </View>
        {loadFailed ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setAttempt((n) => n + 1)}
          >
            <Text style={styles.link}>Retry draft recovery</Text>
          </Pressable>
        ) : !draft ? (
          <Text style={styles.note}>Restoring draft…</Text>
        ) : (
          <>
            <View style={styles.languages}>
              {languages.map((option) => (
                <Pressable
                  key={option.code}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: draft.language === option.code,
                  }}
                  disabled={busy || draft.attempted}
                  onPress={() => edit({ ...draft, language: option.code })}
                  style={[
                    styles.chip,
                    draft.language === option.code && styles.selected,
                  ]}
                >
                  <Text style={styles.chipText}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              multiline
              onSelectionChange={(e) => setCursor(e.nativeEvent.selection.end)}
              value={draft.body}
              editable={!busy && !draft.attempted}
              placeholder="What's on your mind?"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Original post text"
              style={styles.input}
              onChangeText={(body) => edit({ ...draft, body })}
              textAlignVertical="top"
            />
            {!busy && !draft.attempted ? (
              <MentionSuggestions
                text={draft.body}
                cursor={cursor}
                onInsert={(body, next) => {
                  edit({ ...draft, body });
                  setCursor(next);
                }}
              />
            ) : null}
            <Text style={[styles.counter, count > 2000 && styles.error]}>
              {count.toLocaleString()} / 2,000
            </Text>
            {draft.attempted ? (
              <Text style={styles.note}>
                The previous save was not confirmed. Retry this exact submission
                safely before editing.
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={busy || !validPost(draft.body)}
              accessibilityState={{ disabled: busy || !validPost(draft.body), busy }}
              onPress={() => void submit()}
              style={[
                styles.button,
                (busy || !validPost(draft.body)) && styles.disabled,
              ]}
            >
              <Text style={styles.buttonText}>
                {busy
                  ? "Saving…"
                  : draft.attempted
                    ? "Try posting again"
                    : "Post"}
              </Text>
            </Pressable>
            {draft.attempted && !busy ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  Alert.alert(
                    "Start a different draft?",
                    "The earlier submission may already be saved. Check My submissions first; starting again could create a second post.",
                    [
                      { text: "Keep and retry", style: "cancel" },
                      {
                        text: "Start new draft",
                        onPress: () => void startNew(),
                      },
                    ],
                  )
                }
              >
                <Text style={styles.link}>Start a different draft</Text>
              </Pressable>
            ) : null}
          </>
        )}
        {message ? (
          <Text style={styles.note} accessibilityLiveRegion="polite">
            {message}
          </Text>
        ) : null}
        <Text style={styles.note}>Posts are checked before appearing publicly. Keep the conversation respectful.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/settings")}
        >
          <Text style={styles.link}>My submissions</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  fill: { flex: 1 },
  wrap: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: spacing.xl },
  author: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  note: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 21,
    marginTop: spacing.md,
  },
  languages: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 24,
  },
  selected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.ink },
  input: {
    minHeight: 240,
    borderWidth: 0,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: 0,
    color: colors.ink,
    backgroundColor: colors.surface,
    fontSize: 20,
    lineHeight: 30,
  },
  counter: { color: colors.muted, textAlign: "right", marginTop: spacing.sm },
  error: { color: colors.warning },
  button: {
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: 28,
    alignItems: "center",
    marginTop: spacing.md,
  },
  disabled: { opacity: 0.5 },
  buttonText: { color: colors.surface, fontWeight: "700" },
  link: {
    color: colors.accent,
    fontWeight: "700",
    paddingVertical: spacing.md,
  },
});
