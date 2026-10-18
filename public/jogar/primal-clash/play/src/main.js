import {reportGameplay} from './platform.js';
import {tr} from './i18n.js';
import {music,installPreferences} from './preferences.js';
import {createCampaign} from './campaign-ui.js';
import {createSpriteRenderer} from './sprites.js';
import {Battle,TYPES} from './battle.js';
import {portrait,recruitmentState} from './hud.js';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');let battle=new Battle(),running=false,paused=false,last=0,acc=0,noticeTimer;
const buttons={};let previousHp=650,damageUntil=0;
for(const [key,t] of Object.entries(TYPES)){const b=document.createElement('button');b.className='unit';b.title=t.label;b.innerHTML=`<span class="number">${Object.keys(buttons).length+1}</span><div class="portrait">${portrait(key)}<div class="cooldown"></div><span class="cooltext"></span></div><strong>${t.name}</strong><b>◆ ${t.cost} ÂMBAR · ${t.spawn}s</b><span class="availability">PRONTO</span>`;b.onclick=()=>buy(key);$('roster').append(b);buttons[key]=b;}function notice(s){$('notice').textContent=tr(s);clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').textContent=tr(''),2300);}
function buy(t){if(!running||paused)return;if(recruitmentState(battle,t))return notice('Este dinossauro já está em produção.');if(battle.recruit(t))notice(TYPES[t].name+' entrou na fila.');else if(battle.gold[0]<battle.cost(t))notice('Faltam '+Math.ceil(battle.cost(t)-battle.gold[0])+' de âmbar.');else notice('Limite de tropas ou fila atingido.');}
$('income').onclick=()=>{if(running&&!paused)battle.upgrade();};$('meteor').onclick=()=>{if(running&&!paused)battle.strike();};
const campaign=createCampaign($('overlay'),(stage,levels,difficulty)=>{battle=new Battle({stage,levels,difficulty});document.querySelector('main').style.backgroundImage='url('+stage.art+')';document.querySelector('main').append(document.getElementById('preferences'));music.scene(stage.music);running=true;paused=false;reportGameplay(true);acc=0;last=0;$('pause').textContent=tr('Ⅱ');$('pause').setAttribute('aria-label',tr('Pausar batalha'));previousHp=battle.bases[0];document.querySelector('.location strong').textContent=tr(stage.name.toUpperCase());});
const leave=document.createElement('button');leave.id='leave';leave.textContent=tr('← Voltar ao menu');leave.hidden=true;leave.onclick=()=>{running=false;paused=false;reportGameplay(false);campaign.show('Batalha encerrada. Você pode tentar novamente sem perder fósseis.');};document.querySelector('.arena').append(leave);campaign.show();
$('pause').onclick=()=>{if(!running)return;paused=!paused;reportGameplay(!paused);$('pause').textContent=tr(paused?'▶':'Ⅱ');$('pause').setAttribute('aria-label',tr(paused?'Retomar batalha':'Pausar batalha'));notice(paused?'Batalha pausada':'Batalha retomada');};
addEventListener('keydown',e=>{if(e.repeat||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.code==='Space'&&e.target===document.body){e.preventDefault();$('pause').click();return;}const t=Object.keys(TYPES)[Number(e.key)-1];if(t)buy(t);});
document.addEventListener('visibilitychange',()=>{last=0;acc=0;if(document.hidden&&running){paused=true;$('pause').textContent=tr('▶');$('pause').setAttribute('aria-label',tr('Retomar batalha'));}});
const drawSprite=createSpriteRenderer();
function dino(u){drawSprite(ctx,u);}
function draw(){if(document.querySelector('main').hidden)return;const ratio=devicePixelRatio||1,w=Math.round(canvas.clientWidth*ratio),h=Math.round(canvas.clientHeight*ratio);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);ctx.setTransform(w/1200,0,0,h/530,0,0);ctx.translate(0,90);battle.corpses.forEach(dino);battle.units.forEach(dino);for(const e of battle.effects){if(e.kind==='meteor'){ctx.strokeStyle='#ffe4a0';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(e.x-50,100);ctx.lineTo(e.x,345);ctx.stroke();}else{ctx.save();ctx.globalAlpha=e.life/.14;ctx.fillStyle='#e8c798';ctx.fillRect(e.x-3,345,5,5);ctx.fillRect(e.x-8,341,3,3);ctx.fillRect(e.x+5,349,3,3);ctx.restore();}}}
function updateUI(){
 $('gold').textContent=tr(Math.floor(battle.gold[0]));
 for(const [t,b] of Object.entries(buttons)){b.querySelector('b').textContent=tr('◆ '+battle.cost(t)+' ÂMBAR · '+TYPES[t].spawn+'s');b.querySelector('strong').textContent=tr(TYPES[t].name);b.title=tr(TYPES[t].label);const cd=recruitmentState(battle,t),poor=battle.gold[0]<battle.cost(t),full=battle.units.filter(u=>u.side===0).length+battle.queues[0].length>=16;
 b.disabled=!running||paused||!!cd;b.classList.toggle('recruiting',!!cd);b.classList.toggle('poor',poor&&!cd);b.setAttribute('aria-label',tr(`${TYPES[t].name}, ${battle.cost(t)} âmbar${cd?', disponível em '+cd.remaining.toFixed(1)+' segundos':''}`));
 b.querySelector('.cooltext').textContent=tr(cd?'◷ '+cd.remaining.toFixed(1)+'s':'');b.style.setProperty('--revealed',cd?`${100*(1-Math.min(1,cd.remaining/TYPES[t].spawn))}%`:'0%');
 b.querySelector('.availability').textContent=tr(cd?(cd.active?'EM PRODUÇÃO':'NA FILA'):full?'LIMITE ATINGIDO':poor?'FALTAM '+Math.ceil(battle.cost(t)-battle.gold[0])+' ÂMBAR':'PRONTO PARA RECRUTAR');}
 const cost=100+battle.level*90;$('income').textContent=tr(battle.level===2?'RENDA MÁXIMA':`↑ RENDA +3/s · ${cost} ◆`);$('income').disabled=!running||paused||battle.level>=2||battle.gold[0]<cost;
 $('meteor').textContent=tr(battle.meteor>0?`◷ ${Math.ceil(battle.meteor)}s`:'PRONTA');$('meteor').disabled=!running||paused||battle.meteor>0;$('meteor-bar').style.width=`${100*(1-battle.meteor/35)}%`;
 $('stats').textContent=tr(`Renda: ${7+battle.level*3}/s | Tropas: ${battle.units.filter(u=>u.side===0).length}/16 | Fila: ${battle.queues[0].length}/5`);
 for(const [s,prefix] of [[0,'home'],[1,'enemy']]){$(prefix+'-bar').style.width=100*battle.bases[s]/battle.maxBases[s]+'%';$(prefix+'-hp').textContent=tr(Math.ceil(battle.bases[s])+' / '+battle.maxBases[s]);}
 $('time').textContent=tr(`${Math.floor(battle.time/60)}:${String(Math.floor(battle.time%60)).padStart(2,'0')}`);
 $('danger').hidden=!running||battle.bases[0]>battle.maxBases[0]*.3;$('home').classList.toggle('critical',battle.bases[0]<=battle.maxBases[0]*.3);
 if(battle.bases[0]<previousHp)damageUntil=performance.now()+500;previousHp=battle.bases[0];$('home').classList.toggle('damaged',performance.now()<damageUntil);
 $('paused').hidden=!paused||!running;leave.hidden=!running;$('pause').disabled=!running;
 $('queue-label').textContent=tr(battle.queues[0].length?'PRODUÇÃO':'NINHO LIVRE');
 const queueKey=battle.queues[0].map(q=>q.type+Math.ceil(q.left)).join('|');if($('queue').dataset.key!==queueKey){$('queue').dataset.key=queueKey;$('queue').replaceChildren(...battle.queues[0].map((q,i)=>{const span=document.createElement('span');span.className='queue-chip';span.textContent=tr(TYPES[q.type].name+(i===0?' · '+Math.ceil(q.left)+'s':''));return span;}));}
}function frame(now){const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(running&&!paused){acc+=dt;while(acc>=1/60){battle.tick(1/60);acc-=1/60;}if(battle.result){running=false;reportGameplay(false);campaign.finish(battle);}}draw();updateUI();requestAnimationFrame(frame);}requestAnimationFrame(frame);


installPreferences(()=>{campaign.refresh();$('queue').dataset.key='';$('notice').textContent='';leave.textContent=tr('← Voltar ao menu');document.querySelector('.location strong').textContent=tr((battle.scenario.name||'Vale Primordial').toUpperCase());updateUI();});


document.getElementById('preferences').append(leave);

