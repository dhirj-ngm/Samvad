import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/tokens";
import { Icon } from "../components/Icon";
import { Screen } from "../components/Screen";
import { OwnPosts } from "../components/OwnPosts";
import { actionStyle, linkStyle } from "../components/SocialUI";
import { useAuth } from "../lib/auth";
import { languageLabel } from "../lib/languages";
import { loadPendingDraft } from "../lib/onboarding";
import { social } from "../lib/social";
import { supabase } from "../lib/supabase";
export default function Settings() {
  const { session } = useAuth();
  return <AccountSettings key={session?.user.id ?? "anonymous"} />;
}
function AccountSettings() {
  const { session, profile } = useAuth();
  const router = useRouter();
  const { saved } = useLocalSearchParams<{ saved?: string }>();
  const [message, setMessage] = useState(""),
    [topics, setTopics] = useState<string[]>([]),
    [admin, setAdmin] = useState(false),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState(false),
    [attempt, setAttempt] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (session && supabase) {
        void Promise.all([
          supabase
            .from("user_interests")
            .select("interest_id,interests(label)")
            .eq("user_id", session.user.id),
          social<boolean>(supabase, "admin_status", {}, session.user.id),
          loadPendingDraft(session.user.id),
        ])
          .then(([selection, isAdmin, draft]) => {
            if (!alive) return;
            if (selection.error) throw selection.error;
            setTopics(
              (selection.data ?? []).flatMap((row) => {
                const i = row.interests as unknown as { label: string } | null;
                return i ? [i.label] : [];
              }),
            );
            setAdmin(isAdmin);
            setPending(!!draft);
            setMessage("");
          })
          .catch(() => {
            if (alive)
              setMessage("Preferences could not be loaded. Retry below.");
          });
      }
      return () => {
        alive = false;
      };
    }, [session?.user.id, profile, attempt]),
  );
  async function logout() {
    if (!supabase || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      router.replace("/(tabs)/profile");
    } catch {
      setMessage("Sign out was not confirmed. Check your connection and retry.");
    } finally { setBusy(false); }
  }
  return <Screen back title="Settings" subtitle="Your account, your preferences.">
    <ScrollView contentContainerStyle={styles.content}>
      {session ? <>
        {saved === '1' ? <Text accessibilityLiveRegion="polite" style={styles.saved}>Your profile has been updated.</Text> : null}
        <Text style={styles.section}>ACCOUNT</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Email address</Text><Text style={styles.value}>{session.user.email}</Text>
          <Text style={styles.note}>Only visible to you.</Text>
        </View>
        <Text style={styles.section}>MAKE IT YOURS</Text>
        <View style={styles.card}>
          <Pressable style={styles.row} accessibilityRole="button" onPress={() => router.push('/onboarding')}><Icon name="globe" color={colors.accent}/><View style={{flex:1}}><Text style={styles.label}>Reading language</Text><Text style={styles.value}>{profile ? languageLabel(profile.preferred_language) : 'Complete your profile'}</Text></View><Icon name="arrow" size={17} color={colors.muted}/></Pressable>
          <View style={styles.divider}/>
          <Text style={styles.label}>Your interests</Text><View style={styles.tags}>{(topics.length ? topics : ['All topics']).map(topic => <View style={styles.tag} key={topic}><Text style={styles.tagText}>{topic}</Text></View>)}</View>
          <Pressable accessibilityRole="button" style={actionStyle} onPress={() => router.push('/onboarding')}><Text style={linkStyle}>Edit profile & interests</Text></Pressable>
        </View>
        {pending ? <Text style={styles.note}>Your last profile change needs a retry. Open Edit profile to finish saving.</Text> : null}
        {admin ? <Pressable accessibilityRole="button" style={styles.admin} onPress={() => router.push('/review')}><Icon name="book" color={colors.accent}/><Text style={linkStyle}>Review reports</Text><Icon name="arrow" size={17} color={colors.accent}/></Pressable> : null}
        {profile ? <OwnPosts key={session.user.id} actor={session.user.id}/> : null}
        <View style={[styles.card,{marginTop:24}]}><Text style={styles.label}>About AI features</Text><Text style={styles.note}>AI features use Groq and, where available, Sarvam. Posts are checked before publishing; requesting a translation or summary also sends text to these services. AI can make mistakes; you can always read the original.</Text></View>
        <Pressable style={styles.signOut} accessibilityRole="button" disabled={busy} onPress={() => void logout()}><Text style={{color:colors.danger,fontWeight:'700'}}>{busy ? 'Signing out…' : 'Sign out'}</Text></Pressable>
      </> : <Text style={styles.value}>Sign in to manage your account.</Text>}
      {message ? <View><Text accessibilityLiveRegion="polite" style={styles.note}>{message}</Text><Pressable style={actionStyle} onPress={() => setAttempt(n => n + 1)} accessibilityRole="button"><Text style={linkStyle}>Try again</Text></Pressable></View> : null}
    </ScrollView>
  </Screen>;
}
const styles = StyleSheet.create({
  content:{paddingHorizontal:20,paddingBottom:40,backgroundColor:colors.canvas},
  section:{fontSize:11,fontWeight:'700',letterSpacing:1.2,color:colors.muted,marginTop:24,marginBottom:10},
  card:{backgroundColor:colors.surface,borderRadius:18,padding:18,borderWidth:1,borderColor:colors.border},
  label:{fontSize:14,fontWeight:'700',color:colors.ink},value:{fontSize:15,lineHeight:24,color:colors.ink,marginTop:5},note:{fontSize:13,lineHeight:21,color:colors.muted,marginTop:8},
  saved:{backgroundColor:colors.accentSoft,color:colors.accent,borderRadius:12,padding:14,marginTop:12},
  row:{flexDirection:'row',alignItems:'center',gap:14,minHeight:54},divider:{height:1,backgroundColor:colors.border,marginVertical:16},
  tags:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:10},tag:{backgroundColor:colors.accentSoft,borderRadius:20,paddingVertical:7,paddingHorizontal:12},tagText:{color:colors.accent,fontSize:12},
  admin:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:colors.surface,padding:18,borderRadius:16,marginTop:16},
  signOut:{alignItems:'center',justifyContent:'center',minHeight:48,marginTop:24},
});
