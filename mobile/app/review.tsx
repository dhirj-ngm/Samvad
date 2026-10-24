import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { randomUUID } from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Screen } from "../components/Screen";
import { PublicationReview } from '../components/PublicationReview';
import { aiDemoEnabled } from '../lib/ai-client';
import { actionStyle, linkStyle } from "../components/SocialUI";
import { useAuth } from "../lib/auth";
import { social } from "../lib/social";
import { supabase } from "../lib/supabase";
import type { ReviewReport } from "../types/contracts";
import {
  parseReviewDraft,
  type ReviewDecision as Decision,
} from "../lib/profile-model";
export default function Review() {
  const { session } = useAuth();
  return <ReviewSession key={session?.user.id ?? "anon"} />;
}
function ReviewSession() {
  const { session } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false),
    [rows, setRows] = useState<ReviewReport[]>([]),
    [message, setMessage] = useState("Checking reviewer authorization…");
  const [status, setStatus] = useState("submitted"),
    [draftReady, setDraftReady] = useState(false),
    [reason, setReason] = useState(""),
    [pending, setPending] = useState<Decision | null>(null),
    [busy, setBusy] = useState(false),
    [more, setMore] = useState(false);
  const alive = useRef(true),
    lock = useRef(false),
    gen = useRef(0);
  const draftGen = useRef(0);
  const actor = session?.user.id,
    key = `samvad-review-pending:${actor}`;
  async function load(reset = true) {
    const run = ++gen.current;
    try {
      if (!actor || !supabase)
        throw new Error("Trusted reviewer sign-in required.");
      if (!(await social<boolean>(supabase, "admin_status", {}, actor)))
        throw new Error("This account is not a trusted reviewer.");
      const page = await social<ReviewReport[]>(
        supabase,
        "review_queue",
        { status, after: reset ? undefined : rows.at(-1)?.id },
        actor,
      );
      if (alive.current && run === gen.current) {
        setAuthorized(true);
        setRows((old) => (reset ? page : [...new Map([...old, ...page].map(row => [row.id, row])).values()]));
        setMore(page.length === 20);
        setMessage("");
      }
    } catch (e) {
      if (alive.current && run === gen.current) {
        setAuthorized(false);
        setRows([]);
        setMessage(
          e instanceof Error ? e.message : "Review queue unavailable.",
        );
      }
    }
  }
  async function restoreDraft() {
    const run = ++draftGen.current;
    setDraftReady(false);
    await AsyncStorage.getItem(key)
      .then((raw) => {
        const value = raw ? parseReviewDraft(raw) : null;
        if (alive.current && run === draftGen.current) {
          setPending(value);
          if (value) setReason(value.reason);
          setDraftReady(true);
        }
      })
      .catch(() => {
        if (alive.current && run === draftGen.current)
          setMessage(
            "Review draft could not be restored. Retry before taking action.",
          );
      });
  }
  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
      gen.current++;
    };
  }, [actor, status]);
  useEffect(() => {
    void restoreDraft();
    return () => { draftGen.current++; };
  }, [actor]);
  async function submit(decision: Decision) {
    if (!actor || !supabase || lock.current || !draftReady) return;
    lock.current = true;
    draftGen.current++; // Ignore any disk read started before this new decision.
    setBusy(true);
    setPending(decision);
    setMessage("");
    try {
      await AsyncStorage.setItem(key, JSON.stringify(decision));
      await social(supabase, "review", decision, actor);
      await AsyncStorage.removeItem(key);
      if (alive.current) {
        setPending(null);
        setReason("");
        await load();
        setMessage("Human action and audit record saved.");
      }
    } catch (e) {
      if (alive.current)
        setMessage(
          e instanceof Error
            ? e.message
            : "Action not confirmed. Retry the same request.",
        );
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <Screen
      title="Human report review"
      subtitle="Trusted reviewers only · no automated account punishment"
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        >
          <Pressable
            style={actionStyle}
            accessibilityRole="button"
            onPress={() => router.back()}
          >
            <Text style={linkStyle}>Back</Text>
          </Pressable>
          <Text accessibilityLiveRegion="polite" style={{ lineHeight: 24 }}>
            {message}
          </Text>
          <Pressable
            style={actionStyle}
            disabled={busy}
            accessibilityRole="button"
            onPress={() => {
              void load();
              void restoreDraft();
            }}
          >
            <Text style={linkStyle}>Refresh authorization / queue</Text>
          </Pressable>
          {authorized ? (
            <>
              {aiDemoEnabled?<PublicationReview key={actor}/>:null}
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {["submitted", "resolved", "dismissed"].map((s) => (
                  <Pressable
                    disabled={busy || !!pending}
                    accessibilityRole="button"
                    accessibilityState={{ selected: s === status }}
                    key={s}
                    style={actionStyle}
                    onPress={() => setStatus(s)}
                  >
                    <Text style={linkStyle}>{s}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                accessibilityLabel="Human review reason"
                placeholder="Required reason, up to 500 characters"
                multiline
                value={reason}
                editable={!pending && !busy}
                onChangeText={setReason}
                style={{
                  minHeight: 90,
                  padding: 16,
                  borderWidth: 1,
                  borderRadius: 12,
                }}
              />
              {pending ? (
                <Pressable
                  disabled={busy}
                  accessibilityRole="button"
                  style={actionStyle}
                  onPress={() => void submit(pending)}
                >
                  <Text style={linkStyle}>
                    {busy ? "Saving…" : "Retry exact recorded action"}
                  </Text>
                </Pressable>
              ) : null}
              {!rows.length ? <Text>No reports in this status.</Text> : null}
              {rows.map((r) => (
                <View
                  key={r.id}
                  style={{
                    borderWidth: 1,
                    borderColor: "#DCE4DE",
                    padding: 16,
                    borderRadius: 16,
                    marginVertical: 12,
                  }}
                >
                  <Text style={{ fontWeight: "700" }}>
                    {r.entity_type} · {r.reason} · {r.status}
                  </Text>
                  <Text style={{ lineHeight: 26 }}>
                    {r.content ?? "Content deleted or unavailable"}
                  </Text>
                  <Text style={{ lineHeight: 26 }}>
                    Private report details: {r.details}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                    {(r.entity_type === "profile"
                      ? ["reviewed", "dismissed"]
                      : ["reviewed", "dismissed", "hide", "restore"]
                    ).map((action) => (
                      <Pressable
                        key={action}
                        style={actionStyle}
                        disabled={
                          busy ||
                          !draftReady ||
                          !!pending ||
                          !reason.trim() ||
                          Array.from(reason).length > 500
                        }
                        accessibilityRole="button"
                        onPress={() =>
                          void submit({
                            id: r.id,
                            request_id: randomUUID(),
                            action,
                            reason,
                          })
                        }
                      >
                        <Text style={linkStyle}>{action}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
              {more ? (
                <Pressable
                  disabled={busy}
                  style={actionStyle}
                  accessibilityRole="button"
                  onPress={() => void load(false)}
                >
                  <Text style={linkStyle}>Load more reports</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
