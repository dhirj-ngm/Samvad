import { batchMentions } from "../lib/social";
import { AuthorLink, MentionLinks } from "./SocialUI";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import {
  actorRpc,
  loadReplies,
  submitReply,
  submitReport,
} from "../lib/conversation";
import {
  appendReplies,
  replyCursor,
  replyDraftKey,
  reportDraftKey,
  type ReportTarget,
} from "../lib/conversation-model";
import type { FeedItem, Reply, Mention } from "../types/contracts";
import { ConversationComposer } from "./ConversationComposer";
import { AIText, ScreeningRetry } from "./AIText";
import { colors, radius, spacing, type } from "../theme/tokens";

export function ConversationThread({
  conversation,
  root,
}: {
  conversation: string;
  root: FeedItem;
}) {
  const { session, profile } = useAuth();
  const actor = session?.user.id;
  const canWrite = !!actor && profile?.user_id === actor;
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [rows, setRows] = useState<Reply[]>([]),
    [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false),
    [more, setMore] = useState(false);
  const [parent, setParent] = useState<{ id: string; handle: string } | null>(
    null,
  );
  const [target, setTarget] = useState<ReportTarget | null>(null);
  const mounted = useRef(true),
    generation = useRef(0),
    loading = useRef(false);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
      generation.current++;
    };
  }, [conversation]);
  async function refresh() {
    const run = ++generation.current;
    loading.current = true;
    setBusy(true);
    setMessage("");
    try {
      if (!supabase) throw new Error("Backend is not configured.");
      const incoming = await loadReplies(supabase, conversation, null);
      const tags = await batchMentions(
        supabase,
        "reply",
        incoming.map((r) => r.id),
      ).catch(() => []);
      if (mounted.current && run === generation.current) {
        setMentions(tags);
        setRows(incoming);
        setMore(incoming.length === 30);
      }
    } catch (error) {
      if (mounted.current && run === generation.current)
        setMessage(error instanceof Error ? error.message : "Refresh failed.");
    } finally {
      if (mounted.current && run === generation.current) {
        loading.current = false;
        setBusy(false);
      }
    }
  }
  async function loadMore() {
    if (!supabase || loading.current || !rows.length) return;
    const run = generation.current;
    loading.current = true;
    setBusy(true);
    setMessage("");
    try {
      const incoming = await loadReplies(
        supabase,
        conversation,
        replyCursor(rows[rows.length - 1]),
      );
      const tags = await batchMentions(
        supabase,
        "reply",
        incoming.map((r) => r.id),
      ).catch(() => []);
      if (mounted.current && run === generation.current) {
        setMentions((old) => [...old, ...tags]);
        setRows((previous) => appendReplies(previous, incoming));
        setMore(incoming.length === 30);
      }
    } catch (error) {
      if (mounted.current && run === generation.current)
        setMessage(
          error instanceof Error ? error.message : "Load more failed.",
        );
    } finally {
      if (mounted.current && run === generation.current) {
        loading.current = false;
        setBusy(false);
      }
    }
  }
  function report(target: ReportTarget) {
    if (canWrite) setTarget(target);
    else
      setMessage("Sign in and complete your public profile to report content.");
  }
  async function remove(id: string) {
    if (!supabase || !actor) return;
    try {
      const removed = await actorRpc(supabase, actor, "delete_own_reply", {
        p_reply_id: id,
      });
      if (removed !== true) throw new Error("Reply could not be removed.");
      await refresh();
    } catch (error) {
      if (mounted.current)
        setMessage(
          error instanceof Error
            ? error.message
            : "Removal was not confirmed. Refresh before retrying.",
        );
    }
  }
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          report({ type: root.kind === "news" ? "news" : "post", id: root.id })
        }
      >
        <Text style={styles.link}>
          Report {root.kind === "news" ? "source item" : "post"}
        </Text>
      </Pressable>
      {root.kind === "post" ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            report({ type: "profile", id: root.post.author.user_id })
          }
        >
          <Text style={styles.link}>Report @{root.post.author.handle}</Text>
        </Pressable>
      ) : null}
      <Text style={styles.heading}>Replies</Text>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void refresh()}
      >
        <Text style={styles.link}>
          {busy ? "Loading replies…" : "Refresh replies"}
        </Text>
      </Pressable>
      {!busy && !rows.length && !message ? (
        <Text style={styles.note}>
          No visible replies yet. Start the conversation.
        </Text>
      ) : null}
      {rows.map((reply) => {
        const parentRow = reply.parent_reply_id
          ? rows.find((row) => row.id === reply.parent_reply_id)
          : null;
        return (
          <View
            key={reply.id}
            style={[styles.reply, reply.parent_reply_id && styles.nested]}
          >
            <AuthorLink profile={reply.author} />
            {reply.is_fixture ? (
              <Text style={styles.note}>Demo fixture</Text>
            ) : null}
            <Text style={styles.note}>
              {new Date(reply.created_at).toLocaleString()} · {reply.language}
              {reply.moderation_state !== "allowed"
                ? ` · ${reply.moderation_state} — only visible to you`
                : ""}
            </Text>
            {reply.parent_reply_id ? (
              <Text style={styles.note}>
                {parentRow
                  ? `Reply to @${parentRow.author.handle}`
                  : "Reply to an earlier or unavailable reply"}
              </Text>
            ) : null}
            {reply.deleted_at ? (
              <Text style={styles.body}>Reply removed by its author</Text>
            ) : (
              <AIText
                entityType="reply"
                id={reply.id}
                original={reply.body}
                language={reply.language}
              />
            )}
            {!reply.deleted_at ? (
              <MentionLinks
                mentions={mentions.filter((m) => m.entity_id === reply.id)}
              />
            ) : null}
            {!reply.deleted_at &&
            reply.moderation_state === "pending" &&
            actor === reply.author.user_id ? (
              <ScreeningRetry
                actor={actor}
                entityType="reply"
                id={reply.id}
                onDone={() => void refresh()}
              />
            ) : null}
            {!reply.deleted_at ? (
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (canWrite)
                      setParent({ id: reply.id, handle: reply.author.handle });
                    else setMessage("Sign in and finish onboarding to reply.");
                  }}
                >
                  <Text style={styles.link}>Reply</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => report({ type: "reply", id: reply.id })}
                >
                  <Text style={styles.link}>Report reply</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    report({ type: "profile", id: reply.author.user_id })
                  }
                >
                  <Text style={styles.link}>Report author</Text>
                </Pressable>
                {actor === reply.author.user_id ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      Alert.alert(
                        "Remove your reply?",
                        "The text will be removed. Replies to it keep their place in the conversation.",
                        [
                          { text: "Keep", style: "cancel" },
                          {
                            text: "Remove",
                            style: "destructive",
                            onPress: () => void remove(reply.id),
                          },
                        ],
                      )
                    }
                  >
                    <Text style={styles.link}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
      {more ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void loadMore()}
        >
          <Text style={styles.link}>Load more replies</Text>
        </Pressable>
      ) : null}
      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.note}>
          {message}
        </Text>
      ) : null}
      {target && canWrite && actor ? (
        <View>
          <Text style={styles.heading}>Private report</Text>
          <Pressable accessibilityRole="button" onPress={() => setTarget(null)}>
            <Text style={styles.link}>
              Close report · draft stays on this device
            </Text>
          </Pressable>
          <ConversationComposer
            key={reportDraftKey(actor, target)}
            storageKey={reportDraftKey(actor, target)}
            language="en"
            report
            save={async (draft) => {
              if (!supabase) throw new Error("Backend unavailable.");
              const result = await submitReport(supabase, actor, target, draft);
              return `${result.already_reported ? "Already reported" : "Report saved"} · reference ${result.id} · ${result.status}. No automatic ban or removal has been applied.`;
            }}
          />
        </View>
      ) : null}
      {canWrite && actor && profile ? (
        <View>
          <Text style={styles.heading}>Reply as @{profile.handle}</Text>
          <Text style={styles.note}>
            {parent
              ? `Replying to @${parent.handle}`
              : "Replying to the original conversation"}
          </Text>
          {parent ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setParent(null)}
            >
              <Text style={styles.link}>
                Reply to original instead · draft kept
              </Text>
            </Pressable>
          ) : null}
          <ConversationComposer
            key={replyDraftKey(actor, conversation, parent?.id ?? null)}
            storageKey={replyDraftKey(actor, conversation, parent?.id ?? null)}
            language={profile.preferred_language}
            save={async (draft) => {
              if (!supabase) throw new Error("Backend unavailable.");
              const result = await submitReply(
                supabase,
                actor,
                conversation,
                parent?.id ?? null,
                draft,
              );
              if (mounted.current) void refresh();
              return result.deleted
                ? "This reply was already removed. It was not created again."
                : result.moderation_state === "allowed"
                  ? "Reply saved and public."
                  : "Reply saved for trusted review. Only you can see it until approved. Refresh after review.";
            }}
          />
        </View>
      ) : (
        <Text style={styles.note}>
          Sign in and complete onboarding to reply or report. Public replies
          remain readable.
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  heading: {
    color: colors.ink,
    fontSize: type.heading,
    fontWeight: "700",
    marginVertical: spacing.md,
  },
  reply: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  nested: {
    marginLeft: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  author: { fontWeight: "700", color: colors.ink, fontSize: type.body },
  body: { color: colors.ink, fontSize: type.body, lineHeight: 26 },
  note: {
    color: colors.muted,
    fontSize: type.small,
    lineHeight: 22,
    marginVertical: spacing.sm,
  },
  link: {
    color: colors.accent,
    fontWeight: "700",
    paddingVertical: spacing.md,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
});
