import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { requestAI } from '../lib/ai-client';
import type { EntityType, LanguageCode } from '../types/contracts';
import { colors, spacing, type } from '../theme/tokens';

export function AIText({entityType,id,original,language}: {entityType:EntityType;id:string;original:string;language:LanguageCode}) {
  const {session,profile}=useAuth();
  const target=profile?.preferred_language??'en';
  const actor=session?.user.id;
  return <Translation key={`${actor}:${id}:${original}:${target}`} entityType={entityType} id={id} original={original} language={language} target={target} actor={actor}/>;
}
function Translation({entityType,id,original,language,target,actor}: {entityType:EntityType;id:string;original:string;language:LanguageCode;target:LanguageCode;actor?:string}) {
  const [translated,setTranslated]=useState(''),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[cached,setCached]=useState(false),[experimental,setExperimental]=useState(false);
  const [originalResult,setOriginalResult]=useState(false);
  const alive=useRef(true),inFlight=useRef(false);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  async function translate(){
    if(inFlight.current)return;
    if(translated){setShow(true);return;}
    if(!supabase||!actor){setMessage('Sign in to translate. Original text is available.');return;}
    inFlight.current=true;setBusy(true);setMessage('');
    try{
      const data=await requestAI(supabase,actor,'translate',{entity_type:entityType,entity_id:id,target_language:target});
      if(typeof data.translated_text!=='string'||!data.translated_text.trim()||data.target_language!==target||!['live','cache','original'].includes(data.provenance))throw new Error('Translation was not valid. Original text is available.');
      if(alive.current){setTranslated(data.translated_text);setCached(data.is_cached===true);setExperimental(data.evaluation==='experimental');setOriginalResult(data.provenance==='original');setShow(true);}
    }catch(error){if(alive.current)setMessage(error instanceof Error?error.message:'Translation unavailable.');}
    finally{inFlight.current=false;if(alive.current)setBusy(false);}
  }
  return <View>
    <Text selectable style={styles.body}>{show?translated:original}</Text>
    {show?<Text style={styles.note}>{originalResult?'Original text':'Translated by AI'} · {target.toUpperCase()}{cached?' · cached':''}{experimental?' · experimental, language review pending':''}</Text>:null}
    {language!==target?<>
      <Text style={styles.note}>Translation sends this text to Groq Free-plan AI. It may contain mistakes.</Text>
      <Pressable accessibilityRole="button" disabled={busy} onPress={()=>show?setShow(false):void translate()}><Text style={styles.link}>{busy?'Translating…':show?'Show original':`Read in ${target==='ml'?'മലയാളം':target==='hi'?'हिन्दी':'English'}`}</Text></Pressable>
    </>:null}
    {message?<Text accessibilityLiveRegion="polite" style={styles.note}>{message}</Text>:null}
  </View>;
}
export function NewsBrief({id}: {id:string}) {
  const {session,profile}=useAuth();
  return <Brief key={`${session?.user.id}:${id}:${profile?.preferred_language}`} id={id} actor={session?.user.id} language={profile?.preferred_language??'en'}/>;
}
function Brief({id,actor,language}: {id:string;actor?:string;language:LanguageCode}) {
  const [lines,setLines]=useState<string[]|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[cached,setCached]=useState(false);
  const alive=useRef(true),inFlight=useRef(false);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  async function load(){
    if(inFlight.current)return;
    if(!supabase||!actor){setMessage('Sign in to request a brief. The source remains readable.');return;}
    inFlight.current=true;setBusy(true);setMessage('');
    try{const data=await requestAI(supabase,actor,'summarize-news',{news_item_id:id,target_language:language});
      if(!Array.isArray(data.lines)||data.lines.length!==3||!data.lines.every((line:unknown)=>typeof line==='string'&&line.trim()&&!line.includes('\n'))||data.basis!=='headline_excerpt')throw new Error('A valid brief is unavailable. Read the publisher instead.');
      if(alive.current){setLines(data.lines);setCached(data.is_cached===true);}}
    catch(error){if(alive.current)setMessage(error instanceof Error?error.message:'Brief unavailable.');}
    finally{inFlight.current=false;if(alive.current)setBusy(false);}
  }
  return <View>
    <Text style={styles.note}>Optional AI brief uses only the headline and short excerpt, processed by Groq Free-plan AI.</Text>
    {lines?<><Text style={styles.note}>Headline-based brief · AI generated · {language.toUpperCase()}{cached?' · cached':''}</Text>{lines.map((line,index)=><Text key={index} style={styles.body}>{index+1}. {line}</Text>)}</>:<Pressable disabled={busy} accessibilityRole="button" onPress={()=>void load()}><Text style={styles.link}>{busy?'Preparing brief…':'Read 3-line headline brief'}</Text></Pressable>}
    {message?<Text accessibilityLiveRegion="polite" style={styles.note}>{message}</Text>:null}
  </View>;
}
const styles=StyleSheet.create({body:{color:colors.ink,fontSize:type.body,lineHeight:26,marginVertical:spacing.xs},note:{color:colors.muted,fontSize:type.small,lineHeight:20,marginTop:spacing.sm},link:{color:colors.accent,fontWeight:'700',paddingVertical:spacing.md}});

export function ScreeningRetry({actor,entityType,id,onDone}: {actor:string;entityType:EntityType;id:string;onDone:()=>void}) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const alive=useRef(true),inFlight=useRef(false);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  async function screen(){
    if(!supabase||inFlight.current)return;
    inFlight.current=true;setBusy(true);setMessage('');
    try{const result=await requestAI(supabase,actor,'moderate',{entity_type:entityType,entity_id:id});
      if(!['allowed','flagged','blocked'].includes(result?.status))throw new Error('Screening was not confirmed. Content stays pending.');
      if(alive.current){setMessage(result.status==='allowed'?'Screened and public.':'Held for trusted review.');onDone();}}
    catch(error){if(alive.current)setMessage(error instanceof Error?error.message:'Screening unavailable. Content stays pending.');}
    finally{inFlight.current=false;if(alive.current)setBusy(false);}
  }
  return <View><Text style={styles.note}>Screening sends this text to Groq Free-plan AI. Unavailable or uncertain screening keeps it private.</Text><Pressable disabled={busy} accessibilityRole="button" onPress={()=>void screen()}><Text style={styles.link}>{busy?'Checking screening…':'Retry AI screening'}</Text></Pressable>{message?<Text style={styles.note}>{message}</Text>:null}</View>;
}
