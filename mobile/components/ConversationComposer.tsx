import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { codePointLength, validPost } from '../lib/post-model';
import { parseConversationDraft, reportReasons, type ConversationDraft } from '../lib/conversation-model';
import type { LanguageCode } from '../types/contracts';
import { colors, radius, spacing, type } from '../theme/tokens';

// Parent mounts a new instance per account/target. Persist exact text/key BEFORE RPC.
export function ConversationComposer({ storageKey, language, report = false, save }: {
  storageKey: string; language: LanguageCode; report?: boolean;
  save: (draft: ConversationDraft) => Promise<string>;
}) {
  const [draft,setDraft] = useState<ConversationDraft | null>(null);
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  const [attempt,setAttempt] = useState(0);
  const mounted = useRef(true), inFlight = useRef(false), queue = useRef(Promise.resolve());
  const fresh = (): ConversationDraft => ({ requestId: randomUUID(), body: '', language, attempted: false, reason: 'other' });
  useEffect(() => {
    mounted.current=true;
    void AsyncStorage.getItem(storageKey).then(raw => {
      if (!mounted.current) return;
      const restored=parseConversationDraft(raw);
      if (raw && !restored) { setMessage('Saved draft could not be restored. It remains on this device.'); return; }
      setDraft(restored ?? fresh()); setMessage('');
    }).catch(() => { if (mounted.current) setMessage('Could not restore your draft. Retry loading before continuing.'); });
    return () => { mounted.current=false; };
  },[storageKey,attempt]);
  function persist(next: ConversationDraft) {
    setDraft(next);
    const pending=queue.current.catch(()=>{}).then(()=>AsyncStorage.setItem(storageKey,JSON.stringify(next)));
    queue.current=pending; return pending;
  }
  function edit(next: ConversationDraft) {
    void persist(next).catch(()=>{ if(mounted.current) setMessage('Draft storage failed. Retry before leaving this screen.'); });
  }
  async function send() {
    if (!draft || inFlight.current) return;
    inFlight.current=true; setBusy(true); setMessage('');
    try {
      const outgoing={...draft,attempted:true}; await persist(outgoing);
      const confirmation=await save(outgoing);
      await queue.current; await AsyncStorage.removeItem(storageKey);
      if(mounted.current) { setDraft(fresh()); setMessage(confirmation); }
    } catch(error) { if(mounted.current) setMessage(error instanceof Error ? error.message : 'Save was not confirmed. Retry the same draft.'); }
    finally { inFlight.current=false; if(mounted.current) setBusy(false); }
  }
  const count=codePointLength(draft?.body??''),limit=report?1000:2000;
  const valid=!!draft && count<=limit && (report || validPost(draft.body));
  return <View style={styles.box}>
    <Text style={styles.note}>{report ? 'Your report and details are private to you and platform reviewers. Reporting does not automatically remove content.' : 'Be respectful. Disagreement is allowed; threats, harassment and sharing private information are not. When AI is enabled, submitting sends your reply text to Groq Free-plan AI for screening. Unavailable or uncertain screening keeps it private for review.'}</Text>
    {!draft ? <Pressable onPress={()=>setAttempt(n=>n+1)} accessibilityRole="button"><Text style={styles.link}>Retry loading draft</Text></Pressable> : <>
      <View style={styles.options}>{report ? reportReasons.map(reason=><Pressable key={reason} disabled={busy||draft.attempted} onPress={()=>edit({...draft,reason})} accessibilityRole="button" accessibilityState={{selected:draft.reason===reason}} style={[styles.chip,draft.reason===reason&&styles.selected]}><Text>{reason}</Text></Pressable>) : ([['en','English'],['hi','हिन्दी'],['ml','മലയാളം']] as const).map(([code,label])=><Pressable key={code} disabled={busy||draft.attempted} accessibilityRole="button" accessibilityState={{selected:draft.language===code}} onPress={()=>edit({...draft,language:code})} style={[styles.chip,draft.language===code&&styles.selected]}><Text>{label}</Text></Pressable>)}</View>
      <TextInput multiline editable={!busy&&!draft.attempted} value={draft.body} onChangeText={body=>edit({...draft,body})} placeholder={report?'Optional details (do not include passwords or private contact data)':'Write an original reply…'} accessibilityLabel={report?'Private report details':'Reply text'} style={styles.input} textAlignVertical="top" />
      <Text style={styles.note}>{count}/{limit} Unicode code points{draft.attempted?' · Exact draft locked for safe retry':''}</Text>
      <Pressable accessibilityRole="button" disabled={busy||!valid} onPress={()=>void send()} style={[styles.button,(busy||!valid)&&styles.disabled]}><Text style={styles.buttonText}>{busy?'Saving…':draft.attempted?'Retry same submission':report?'Submit private report':'Submit reply for review'}</Text></Pressable>
      {draft.attempted&&!busy ? <Pressable accessibilityRole="button" onPress={()=>Alert.alert('Start a different draft?','The previous submission may already be saved. Refresh the conversation before starting again; another reply could create a duplicate.',[{text:'Keep draft',style:'cancel'},{text:'Start new draft',onPress:()=>{void persist(fresh()).catch(()=>{if(mounted.current)setMessage('Could not save a new draft.');});}}])}><Text style={styles.link}>Start a different draft</Text></Pressable>:null}
    </>}
    {message?<Text accessibilityLiveRegion="polite" style={styles.note}>{message}</Text>:null}
  </View>;
}
const styles=StyleSheet.create({
  box:{padding:spacing.md,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,marginBottom:spacing.md},
  note:{color:colors.muted,fontSize:type.small,lineHeight:22,marginVertical:spacing.sm},
  options:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm,marginVertical:spacing.sm},
  chip:{padding:spacing.md,borderWidth:1,borderColor:colors.border,borderRadius:radius.md}, selected:{backgroundColor:colors.accentSoft,borderColor:colors.accent},
  input:{minHeight:110,padding:spacing.md,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,color:colors.ink,fontSize:type.body,lineHeight:25,backgroundColor:colors.surface},
  button:{padding:spacing.md,backgroundColor:colors.accent,borderRadius:radius.md,alignItems:'center'},buttonText:{color:colors.surface,fontWeight:'700'},disabled:{opacity:.5},
  link:{color:colors.accent,fontWeight:'700',paddingVertical:spacing.md},
});
