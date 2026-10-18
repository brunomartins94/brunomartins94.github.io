import {STAGES} from './campaign.js';
import {installFullscreen} from './fullscreen.js';
import {tr,LANGUAGES,getLanguage,setLanguage} from './i18n.js';
export function createMusic(makeAudio=url=>new Audio(url)){
 const tracks={menu:makeAudio('./menu.mp3'),battle:makeAudio('./background.mp3')};
 const sources=Object.fromEntries(STAGES.map(stage=>[stage.music,'./'+stage.music]));sources['background.mp3']=null;
 for(const track of Object.values(tracks)){if(track.nodeType){track.hidden=true;document.body.append(track);}track.loop=true;track.volume=.35;track.preload='none';}
 let current='menu',unlocked=false,muted=false,hidden=false,platformMuted=false;
 try{muted=localStorage.getItem('primal-clash.muted')==='true';}catch{}
 function sync(){for(const [key,audio] of Object.entries(tracks)){if(key!==current||muted||platformMuted||hidden||!unlocked)audio.pause();else{const result=audio.play();result?.catch(()=>{});}}}
 return {scene(key){if(key==='background.mp3')key='battle';if(!tracks[key]&&sources[key]){const audio=makeAudio(sources[key]);audio.loop=true;audio.volume=.35;audio.preload='none';if(audio.nodeType){audio.hidden=true;document.body.append(audio);}tracks[key]=audio;}if(!tracks[key])return;if(key!==current){tracks[current].pause();tracks[current].currentTime=0;current=key;}sync();},unlock(){unlocked=true;sync();},visibility(value){hidden=value;sync();},toggle(){muted=!muted;try{localStorage.setItem('primal-clash.muted',String(muted));}catch{}sync();},setPlatformMuted(value){platformMuted=Boolean(value);sync();},get muted(){return muted||platformMuted;}};
}
export const music=typeof Audio==='undefined'?null:createMusic();
export function installPreferences(onChange){
 const bar=document.createElement('div');bar.id='preferences';
 const label=document.createElement('label'),select=document.createElement('select'),mute=document.createElement('button');select.id='language';label.htmlFor='language';mute.id='mute';mute.type='button';
 for(const [value,name] of Object.entries(LANGUAGES)){const option=document.createElement('option');option.value=value;option.textContent=name;select.append(option);}select.value=getLanguage();
 const languageControl=document.createElement('div');languageControl.className='language-control';languageControl.append(label,select);bar.append(languageControl,mute);document.querySelector('.menu-footer').append(bar);installFullscreen(bar);
 const staticSelectors=['#home > span','.rival > span','#danger','#paused','.economy small','aside label','.hint'];
 const originals=staticSelectors.map(selector=>{const el=document.querySelector(selector);return [el,el.textContent];});
 function refreshMute(){mute.textContent=music.muted?'🔇':'🔊';mute.setAttribute('aria-label','Mute');mute.title=tr(music.muted?'Ativar música':'Silenciar música');mute.setAttribute('aria-pressed',String(music.muted));}
 function refresh(){label.textContent='🌐';select.setAttribute('aria-label',tr('Idioma'));select.title=tr('Idioma')+' · '+LANGUAGES[getLanguage()];refreshMute();for(const [el,text] of originals)el.textContent=tr(text);document.getElementById('game').setAttribute('aria-label',tr('Campo de batalha entre dinossauros'));document.getElementById('pause').setAttribute('aria-label',tr(document.getElementById('pause').textContent==='▶'?'Retomar batalha':'Pausar batalha'));document.documentElement.lang=getLanguage();onChange();}
 select.onchange=()=>setLanguage(select.value);mute.onclick=()=>{music.toggle();refreshMute();};
 addEventListener('languagechange',refresh);addEventListener('menushow',()=>music.scene('menu'));
 document.addEventListener('pointerdown',()=>music.unlock(),{once:true});document.addEventListener('keydown',()=>music.unlock(),{once:true});
 document.addEventListener('visibilitychange',()=>music.visibility(document.hidden));music.visibility(document.hidden);refresh();
}


