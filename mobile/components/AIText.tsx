import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { aiDemoEnabled, requestAI } from '../lib/ai-client';
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
      <Text style={styles.note}>AI translation may contain mistakes. {aiDemoEnabled?'Processed by Sarvam.':'Processed by Groq.'}</Text>
      <Pressable accessibilityRole="button" disabled={busy} onPress={()=>show?setShow(false):void translate()}><Text style={styles.link}>{busy?'Translating…':show?'Show original':`Read in ${target==='ml'?'മലയാളം':target==='hi'?'हिन्दी':'English'}`}</Text></Pressable>
    </>:null}
    {message?<Text accessibilityLiveRegion="polite" style={styles.note}>{message}</Text>:null}
  </View>;
}
export function NewsBrief({id}: {id:string}) {
  const {session,profile}=useAuth();
  if(aiDemoEnabled)return <ContentSummary id={id} entityType="news"/>;
  return <Brief key={`${session?.user.id}:${id}:${profile?.preferred_language}`} id={id} actor={session?.user.id} language={profile?.preferred_language??'en'}/>;
}
export function ContentSummary({id,entityType}:{id:string;entityType:'news'|'post'}) {
  const {session,profile}=useAuth();
  const actor=session?.user.id,target=profile?.preferred_language??'en';
  return <DemoSummary key={`${actor}:${id}:${target}`} id={id} entityType={entityType} actor={actor} target={target}/>;
}
function DemoSummary({id,entityType,actor,target}:{id:string;entityType:'news'|'post';actor?:string;target:LanguageCode}){
  const [english,setEnglish]=useState<string[]>([]),[native,setNative]=useState<string[]>([]),[showNative,setShowNative]=useState(false);
  const [label,setLabel]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[cached,setCached]=useState(false),[open,setOpen]=useState(false);
  const alive=useRef(true),lock=useRef(false);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  async function load(){
    if(!supabase||!actor){setMessage('Sign in to request a summary.');return;}
    if(lock.current)return;lock.current=true;setBusy(true);setMessage('');
    try{
      const d=await requestAI(supabase,actor,'summarize',{entity_type:entityType,entity_id:id,target_language:target});
      if(!Array.isArray(d.english_lines)||d.english_lines.length<4||d.english_lines.length>5||!d.english_lines.every((s:unknown)=>typeof s==='string'&&s.trim()))throw new Error('Summary unavailable. Read the original.');
      if(alive.current){setEnglish(d.english_lines);setNative(d.native_status==='available'||target==='en'?d.native_lines:[]);setLabel(d.label);setCached(d.is_cached===true);setOpen(true);if(d.native_status==='unavailable')setMessage('English summary is ready. Retry for your reading language.');}
    }catch(e){if(alive.current)setMessage(e instanceof Error?e.message:'Summary unavailable.');}
    finally{lock.current=false;if(alive.current)setBusy(false);}
  }
  return <View>
    <Pressable accessibilityRole="button" disabled={busy} onPress={()=>english.length?setOpen(!open):void load()}><Text style={styles.link}>{busy?'Preparing summary…':open?'Hide summary':'Summarize'}</Text></Pressable>
    {open&&english.length?<View style={{backgroundColor:colors.accentSoft,padding:16,borderRadius:12}}>
      <Text style={styles.note}>{label} · AI generated{cached?' · previously generated':''}</Text>
      {target!=='en'?<View style={{flexDirection:'row',gap:20}}>
        <Pressable accessibilityRole="button" onPress={()=>setShowNative(false)}><Text style={styles.link}>English</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={()=>native.length?setShowNative(true):void load()}><Text style={styles.link}>{target==='ml'?'മലയാളം':'हिन्दी'}{!native.length?' · retry':''}</Text></Pressable>
      </View>:null}
      {(showNative&&native.length?native:english).map((line,i)=><Text key={i} selectable style={styles.body}>• {line}</Text>)}
      <Text style={styles.note}>The full original stays above. AI can make mistakes.</Text>
    </View>:null}
    {message?<Text accessibilityLiveRegion="polite" style={styles.note}>{message}</Text>:null}
  </View>;
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
  return <View><Text style={styles.note}>Screening uses Groq and, when needed, Sarvam. Unavailable or uncertain screening keeps it private.</Text><Pressable disabled={busy} accessibilityRole="button" onPress={()=>void screen()}><Text style={styles.link}>{busy?'Checking screening…':'Retry AI screening'}</Text></Pressable>{message?<Text style={styles.note}>{message}</Text>:null}</View>;
}
