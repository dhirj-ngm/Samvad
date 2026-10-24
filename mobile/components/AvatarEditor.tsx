import { useEffect, useRef, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { randomUUID } from "expo-crypto";
import { supabase } from "../lib/supabase";
import { AVATAR_LIMIT, validateAvatar } from "../lib/social";
import { actionStyle, Avatar, linkStyle } from "./SocialUI";
import type { PublicProfile } from "../types/contracts";

export function AvatarEditor({
  actor,
  path,
  disabled,
  onChange,
  onBusyChange,
}: {
  actor: string;
  path: string | null;
  disabled: boolean;
  onChange: (path: string | null) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [selected, setSelected] = useState<ImagePicker.ImagePickerAsset | null>(
      null,
    ),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);
  async function choose() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setMessage(
          "Photo access was denied. You can allow it in phone Settings, or keep your initials.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > AVATAR_LIMIT)
        throw new Error("Choose an image up to 2 MiB.");
      if (!asset.base64)
        throw new Error(
          "Could not read this image. Choose another JPEG, PNG or WebP.",
        );
      if (asset.base64.length > Math.ceil(AVATAR_LIMIT / 3) * 4)
        throw new Error("Choose an image up to 2 MiB.");
      validateAvatar(
        Uint8Array.from(atob(asset.base64), (c) => c.charCodeAt(0)),
      );
      if (alive.current) setSelected(asset);
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Photo selection failed. Your current avatar is kept.",
      );
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function upload() {
    if (!selected?.base64 || !supabase || lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error || session?.user.id !== actor)
        throw new Error("Account changed. Sign in before uploading.");
      const bytes = Uint8Array.from(atob(selected.base64), (c) =>
          c.charCodeAt(0),
        ),
        format = validateAvatar(bytes);
      const next = `${actor}/${randomUUID()}.${format.extension}`;
      // Separate client pins the initiating bearer without persisting another session.
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(
        process.env.EXPO_PUBLIC_SUPABASE_URL!,
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: { Authorization: `Bearer ${session.access_token}` },
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        },
      );
      const { error: uploadError } = await client.storage
        .from("avatars")
        .upload(next, bytes.buffer, {
          contentType: format.mime,
          upsert: false,
          cacheControl: "3600",
        });
      if (uploadError)
        throw new Error(
          "Upload was not confirmed. Your current avatar is kept. Retry with the preview.",
        );
      if (!alive.current) return;
      onChange(next);
      setSelected(null);
      setMessage(
        "Image uploaded. Save profile to confirm replacement; the previous avatar is kept until then.",
      );
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Upload failed. Your current avatar is kept.",
      );
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <View>
      <Text style={linkStyle}>
        Optional public avatar · JPEG / PNG / WebP · up to 2 MiB
      </Text>
      {selected ? (
        <Image
          source={{ uri: selected.uri }}
          accessibilityLabel="Selected avatar preview"
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            marginVertical: 12,
          }}
        />
      ) : (
        <Avatar
          size={80}
          profile={
            {
              user_id: actor,
              handle: "you",
              display_name: "",
              bio: "",
              preferred_language: "en",
              avatar_path: path,
            } as PublicProfile
          }
        />
      )}
      <Pressable
        style={actionStyle}
        disabled={disabled || busy}
        accessibilityRole="button"
        onPress={() => void choose()}
      >
        <Text style={linkStyle}>Choose / replace image</Text>
      </Pressable>
      {selected ? (
        <View>
          <Pressable
            disabled={disabled || busy}
            accessibilityRole="button"
            style={actionStyle}
            onPress={() => void upload()}
          >
            <Text style={linkStyle}>
              {busy ? "Uploading…" : "Upload this preview"}
            </Text>
          </Pressable>
          <Pressable
            disabled={busy}
            accessibilityRole="button"
            style={actionStyle}
            onPress={() => setSelected(null)}
          >
            <Text style={linkStyle}>Cancel selection</Text>
          </Pressable>
        </View>
      ) : null}
      {path ? (
        <Pressable
          disabled={disabled || busy}
          accessibilityRole="button"
          style={actionStyle}
          onPress={() => {
            onChange(null);
            setMessage("Save profile to confirm removal.");
          }}
        >
          <Text style={linkStyle}>Remove avatar</Text>
        </Pressable>
      ) : null}
      {message ? (
        <Text accessibilityLiveRegion="polite" style={{ lineHeight: 24 }}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}
