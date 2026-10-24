import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { aiDemoEnabled, requestAI } from '../lib/ai-client';
import { parseDemoSummary } from '../lib/ai-model';
import type { EntityType, LanguageCode } from '../types/contracts';
import { Icon } from './Icon';
import { languageLabel } from '../lib/languages';
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
    {show?<Text style={styles.note}>{originalResult?'Original text':'AI translation'} · {languageLabel(target)}{experimental?' · Preview':''}</Text>:null}
    {language!==target?<>
      <Pressable accessibilityRole="button" disabled={busy} onPress={()=>show?setShow(false):void translate()}><Text style={styles.link}>{busy?'Translating…':show?'Show original':`Translate to ${languageLabel(target)}`}</Text></Pressable>
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
  async function load(preferNative = false){
    if(!supabase||!actor){setMessage('Sign in to request a summary.');return;}
    if(lock.current)return;lock.current=true;setBusy(true);setMessage('');
    try{
      const d=parseDemoSummary(await requestAI(supabase,actor,'summarize',{entity_type:entityType,entity_id:id,target_language:target}),target);
      if(alive.current){setEnglish(d.english_lines);setNative(d.native_lines);setShowNative(preferNative&&d.native_status==='available');setLabel(d.label);setCached(d.is_cached);setOpen(true);if(d.native_status==='unavailable')setMessage('English summary is ready. Retry for your reading language.');}
    }catch(e){if(alive.current)setMessage(e instanceof Error?e.message:'Summary unavailable.');}
    finally{lock.current=false;if(alive.current)setBusy(false);}
  }
  return <View>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:open,disabled:busy}} disabled={busy} style={styles.summaryButton} onPress={()=>english.length?setOpen(!open):void load()}><Icon name="sparkles" size={18} color={colors.accent}/><Text style={styles.summaryButtonText}>{busy?'Preparing summary…':open?'Hide summary':'Get the gist'}</Text></Pressable>
    {open&&english.length?<View style={{backgroundColor:colors.accentSoft,padding:16,borderRadius:12}}>
      <Text style={styles.note}>{label} · AI summary</Text>
        {target!=='en'?<View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:8}}>
        <Pressable style={[styles.languageTab,!showNative&&styles.selectedLanguage]} accessibilityRole="button" accessibilityState={{selected:!showNative}} onPress={()=>setShowNative(false)}><Text style={[styles.summaryButtonText,!showNative&&{color:colors.surface}]}>English</Text></Pressable>
        <Pressable style={[styles.languageTab,showNative&&styles.selectedLanguage]} accessibilityRole="button" disabled={busy} accessibilityState={{selected:showNative,busy,disabled:busy}} onPress={()=>native.length?setShowNative(true):void load(true)}><Text style={[styles.summaryButtonText,showNative&&{color:colors.surface}]}>{languageLabel(target)}{!native.length?' · retry':''}</Text></Pressable>
      </View>:null}
      {(showNative&&native.length?native:english).map((line,i)=><Text key={i} selectable style={styles.body}>• {line}</Text>)}
      <Text style={styles.note}>AI can make mistakes. Read the original for context.</Text>
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
    {lines?<><Text style={styles.note}>Headline-based brief · AI summary · {languageLabel(language)}</Text>{lines.map((line,index)=><Text key={index} style={styles.body}>{index+1}. {line}</Text>)}</>:<Pressable disabled={busy} accessibilityRole="button" onPress={()=>void load()}><Text style={styles.link}>{busy?'Preparing brief…':'Get the gist'}</Text></Pressable>}
    {message?<Text accessibilityLiveRegion="polite" style={styles.note}>{message}</Text>:null}
  </View>;
}
const styles=StyleSheet.create({languageTab:{minHeight:44,paddingHorizontal:16,justifyContent:'center',borderRadius:22},selectedLanguage:{backgroundColor:colors.accent},body:{color:colors.ink,fontSize:type.body,lineHeight:26,marginVertical:spacing.xs},note:{color:colors.muted,fontSize:type.small,lineHeight:20,marginTop:spacing.sm},link:{color:colors.accent,fontSize:13,fontWeight:'600',paddingVertical:12,minHeight:44},summaryButton:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:6,minHeight:44,paddingHorizontal:12,marginTop:6,backgroundColor:colors.accentSoft,borderRadius:22},summaryButtonText:{color:colors.accent,fontSize:12,fontWeight:'700'}});

export function ScreeningRetry({actor,entityType,id,onDone}: {actor:string;entityType:EntityType;id:string;onDone:()=>void}) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const alive=useRef(true),inFlight=useRef(false);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  async function screen(){
    if(!supabase||inFlight.current)return;
    inFlight.current=true;setBusy(true);setMessage('');
    try{const result=await requestAI(supabase,actor,'moderate',{entity_type:entityType,entity_id:id});
      if(!['allowed','flagged','blocked'].includes(result?.status))throw new Error('Screening was not confirmed. Content stays pending.');
      if(alive.current){setMessage(result.status==='allowed'?'Screened and public.':'Awaiting review.');onDone();}}
    catch(error){if(alive.current)setMessage(error instanceof Error?error.message:'Screening unavailable. Content stays pending.');}
    finally{inFlight.current=false;if(alive.current)setBusy(false);}
  }
  return <View><Text style={styles.note}>Your post stays private until the check is complete.</Text><Pressable disabled={busy} accessibilityRole="button" onPress={()=>void screen()}><Text style={styles.link}>{busy?'Checking screening…':'Retry check'}</Text></Pressable>{message?<Text style={styles.note}>{message}</Text>:null}</View>;
}
