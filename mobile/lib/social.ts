import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FeedItem,
  InteractionState,
  Mention,
  PublicProfile,
  SocialRow,
} from "../types/contracts";

export async function social<T>(
  client: SupabaseClient,
  action: string,
  payload: Record<string, unknown> = {},
  actor?: string,
): Promise<T> {
  let request = client.rpc("social", { p_action: action, p_payload: payload });
  if (actor) {
    const {
      data: { session },
      error,
    } = await client.auth.getSession();
    if (error || session?.user.id !== actor)
      throw new Error("Account changed. Sign in again before saving.");
    request = request.setHeader(
      "Authorization",
      `Bearer ${session.access_token}`,
    );
  }
  const { data, error } = await request;
  if (error) {
    const message =
      error.code === "23505"
        ? "That handle is taken. Choose another."
        : error.code === "PT404"
          ? "This public source is unavailable."
          : error.code === "42501"
            ? "This action requires an authorized account."
            : error.code === "PT409"
              ? "This request was already used with different content."
              : error.code === "PGRST202"
                ? "P4.5 database migration is not installed in this environment."
                : "Save or load was not confirmed. Check your connection and retry.";
    throw new Error(message);
  }
  return data as T;
}
export const conversationId = (item: FeedItem) =>
  item.kind === "news" ? item.conversation_id : item.post.conversation_id;
export async function batchInteractions(
  client: SupabaseClient,
  items: FeedItem[],
) {
  const ids = [...new Set(items.map(conversationId))];
  if (!ids.length) return {} as Record<string, InteractionState>;
  const rows = await social<InteractionState[]>(client, "interactions", {
    ids,
  });
  return Object.fromEntries(rows.map((r) => [r.id, r]));
}
export async function batchMentions(
  client: SupabaseClient,
  type: "post" | "reply",
  ids: string[],
) {
  return ids.length ? social<Mention[]>(client, "mentions", { type, ids }) : [];
}
export const searchPeople = (
  client: SupabaseClient,
  query: string,
  after?: string,
) => social<PublicProfile[]>(client, "people", { query, after, limit: 20 });
export const socialCursor = (row: SocialRow) => ({ at: row.at, id: row.id });
export function appendSocial(old: SocialRow[], next: SocialRow[]) {
  return [...new Map([...old, ...next].map((r) => [r.id, r])).values()];
}
// Cursor-position replacement preserves the remainder of an edited draft.
export function mentionQuery(text: string, cursor: number) {
  return (
    /(?:^|[^A-Za-z0-9_@])@([A-Za-z0-9_]{0,30})$/.exec(
      text.slice(0, cursor),
    )?.[1] ?? null
  );
}
export function insertMention(text: string, cursor: number, handle: string) {
  const query = mentionQuery(text, cursor);
  if (query === null || !/^[a-z0-9_]{3,30}$/.test(handle))
    return { text, cursor };
  const start = cursor - query.length - 1,
    value = `@${handle} `;
  return {
    text: text.slice(0, start) + value + text.slice(cursor),
    cursor: start + value.length,
  };
}
export const AVATAR_LIMIT = 2 * 1024 * 1024;
export function validateAvatar(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > AVATAR_LIMIT)
    throw new Error("Choose an image up to 2 MiB.");
  const head = String.fromCharCode(...bytes.slice(0, 12));
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return { mime: "image/jpeg", extension: "jpg" };
  if (head.slice(0, 8) === "\x89PNG\r\n\x1a\n")
    return { mime: "image/png", extension: "png" };
  if (head.startsWith("RIFF") && head.slice(8) === "WEBP")
    return { mime: "image/webp", extension: "webp" };
  throw new Error("Choose a JPEG, PNG or WebP image.");
}
