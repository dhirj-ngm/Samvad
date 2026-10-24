import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { requestAI } from '../lib/ai-client';
import { actionStyle, linkStyle } from './SocialUI';

type Held = {entity_id:string;entity_type:'post'|'reply';body:string;handle:string;
  moderation_state:'pending'|'flagged'|'blocked';manual_hidden:boolean;source_hash:string;is_fixture?:boolean};
type Decision = {entity_id:string;entity_type:'post'|'reply';request_id:string;
  action:'approve'|'reject';reason:string;source_hash:string;expected_state:Held['moderation_state']};

export function PublicationReview(){
  const {session}=useAuth();
  const actor=session?.user.id;
  const [rows,setRows]=useState<Held[]>([]),[reason,setReason]=useState(''),[message,setMessage]=useState('');
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[pending,setPending]=useState<Decision|null>(null);
  const lock=useRef(false),alive=useRef(true),key=`samvad-publication-review:${actor}`;
  useEffect(()=>{alive.current=true;setReady(false);setPending(null);
    void AsyncStorage.getItem(key).then(raw=>{
      if(!alive.current)return;
      if(raw){const d=JSON.parse(raw);if(!d||typeof d.request_id!=='string'||typeof d.source_hash!=='string'||!['approve','reject'].includes(d.action))throw new Error();setPending(d);setReason(d.reason);}
      setReady(true);
    }).catch(()=>{if(alive.current)setMessage('Review draft could not be restored. It remains on this device.');});
    return()=>{alive.current=false;};
  },[key]);
  async function load(){
    if(!actor||!supabase||lock.current)return;
    lock.current=true;setBusy(true);setOpen(true);setMessage('');
    try{const d=await requestAI(supabase,actor,'review-queue',{});if(!Array.isArray(d))throw new Error('Invalid review response.');if(alive.current)setRows(d);}
    catch(e){if(alive.current)setMessage(e instanceof Error?e.message:'Queue unavailable.');}
    finally{lock.current=false;if(alive.current)setBusy(false);}
  }
  async function decide(d:Decision){
    if(!actor||!supabase||lock.current||!ready)return;
    lock.current=true;setBusy(true);setPending(d);setMessage('');
    try{
      await AsyncStorage.setItem(key,JSON.stringify(d));
      await requestAI(supabase,actor,'review',d);
      await AsyncStorage.removeItem(key);
      if(alive.current){setPending(null);setReason('');setRows(old=>old.filter(r=>r.entity_id!==d.entity_id));setMessage('Publication decision and audit saved. Manual hiding remains in force.');}
    }catch(e){if(alive.current)setMessage(e instanceof Error?e.message:'Not confirmed. Retry the same saved decision.');}
    finally{lock.current=false;if(alive.current)setBusy(false);}
  }
  return <View style={{marginVertical:16}}>
    <Pressable style={actionStyle} accessibilityRole="button" disabled={busy} onPress={()=>open?setOpen(false):void load()}><Text style={linkStyle}>{busy?'Loading…':open?'Hide publication queue':'Pending / held publication decisions'}</Text></Pressable>
    {message?<Text accessibilityLiveRegion="polite">{message}</Text>:null}
    {open?<>
      <Text>Approve releases a held submission. It does not undo a separate manual hide. No account bans.</Text>
      <TextInput value={reason} onChangeText={setReason} editable={!pending&&!busy} accessibilityLabel="Publication decision reason" placeholder="Required review reason" multiline style={{padding:16,borderWidth:1,borderRadius:12,minHeight:80,marginVertical:12}}/>
      {pending?<Pressable accessibilityRole="button" style={actionStyle} disabled={busy||!ready} onPress={()=>void decide(pending)}><Text style={linkStyle}>Retry exact publication decision</Text></Pressable>:null}
      {!busy&&!rows.length?<Text>No held submissions.</Text>:null}
      {rows.map(row=><View key={`${row.entity_type}:${row.entity_id}`} style={{padding:16,marginVertical:8,borderWidth:1,borderColor:'#DCE4DE',borderRadius:16}}>
        <Text style={{fontWeight:'700'}}>@{row.handle} · {row.moderation_state}{row.is_fixture?' · Demo fixture':''}</Text>
        <Text selectable style={{lineHeight:26,marginVertical:8}}>{row.body}</Text>
        {row.manual_hidden?<Text>Manually hidden; approval will not make it public.</Text>:null}
        <View style={{flexDirection:'row',gap:20}}>{(['approve','reject'] as const).map(action=><Pressable key={action} accessibilityRole="button" style={actionStyle}
          disabled={busy||!ready||!!pending||!reason.trim()||Array.from(reason).length>500}
          onPress={()=>Alert.alert(`${action==='approve'?'Approve publication':'Keep held'}?`,'This human decision is recorded.',[{text:'Cancel',style:'cancel'},{text:action==='approve'?'Approve':'Reject',onPress:()=>void decide({entity_id:row.entity_id,entity_type:row.entity_type,request_id:randomUUID(),action,reason,source_hash:row.source_hash,expected_state:row.moderation_state})}])}>
          <Text style={linkStyle}>{action==='approve'?'Approve publication':'Reject / hold'}</Text></Pressable>)}</View>
      </View>)}
    </>:null}
  </View>;
}
