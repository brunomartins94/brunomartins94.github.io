import {tr} from './i18n.js';
import {STAGES,UPGRADES,points,purchase,completeStage,recordObjectives,nextSelection,loadProgress,saveProgress} from './campaign.js';
import {DIFFICULTIES} from './difficulty.js';
export function createCampaign(overlay,onStart){
 let storage;try{storage=window.localStorage;}catch{}
 const loaded=loadProgress(storage),progress=loaded.progress;let selected=Math.min(progress.completed,4),warning=loaded.warning;
 const game=document.querySelector('main');overlay.hidden=true;
 const menu=document.createElement('section');menu.id='campaign-menu';menu.setAttribute('aria-label',tr('Menu da campanha'));document.body.insertBefore(menu,game);
 const element=(tag,text,cls)=>{const el=document.createElement(tag);el.textContent=tr(text);if(cls)el.className=cls;return el;};
 function persist(){warning=saveProgress(storage,progress)?'':'Não foi possível salvar. O progresso será mantido apenas nesta sessão.';}
 function show(message=''){menu.setAttribute('aria-label',tr('Menu da campanha'));
  game.hidden=true;menu.hidden=false;globalThis.dispatchEvent?.(new Event('menushow'));const preferences=document.getElementById?.('preferences');menu.replaceChildren();
  const top=element('header','','menu-top');top.append(element('h1','PRIMAL CLASH'),element('span','CAMPANHA · '+progress.completed+'/5 CONCLUÍDAS · '+points(progress)+' FÓSSEIS'));
  const art=element('div','','map-art');const map=element('nav','','map-path');map.setAttribute('aria-label',tr('Escolher fase'));
  STAGES.forEach((stage,i)=>{const button=element('button','','map-node node-'+i+(i===selected?' selected':''));button.disabled=i>progress.completed;button.setAttribute('aria-pressed',String(i===selected));button.setAttribute('aria-label',tr((i+1)+'. '+stage.name+(i>progress.completed?' bloqueada':i<progress.completed?' concluída':'')));button.append(element('span',i>progress.completed?'🔒':i<progress.completed?'✓':'','node-marker'),element('span',(i+1)+'. '+stage.name,'node-name'));button.onclick=()=>{selected=i;show();};map.append(button);});
  const detail=element('div','','map-detail');detail.append(element('h2',(selected+1)+'. '+STAGES[selected].name),element('p',STAGES[selected].hint));
  const objectives=element('div','','map-objectives');objectives.append(element('h3','OBJETIVOS DA FASE'));['Destrua o ninho inimigo','Mantenha seu ninho acima de 50% de vida','Conclua em menos de 5 minutos'].forEach((text,i)=>{const done=!!(progress.stars[selected]&(1<<i));const line=element('p',(done?'★ ':'☆ ')+text);line.classList.toggle('earned',done);objectives.append(line);});
  const reward=element('div','','map-reward');reward.append(element('h3','RECOMPENSA'),element('strong',selected<progress.completed?'✓':'✦ +2'),element('span',selected<progress.completed?'RECEBIDA':'FÓSSEIS'));
  const play=element('button',selected<progress.completed?'REJOGAR FASE →':'INICIAR FASE →','map-start');play.id='play';play.onclick=()=>{persist();menu.hidden=true;game.hidden=false;onStart(STAGES[selected],{...progress.levels},progress.difficulty);};art.append(map,detail,objectives,reward,play);
  const tools=element('div','','menu-tools');const diff=element('fieldset','','difficulty');diff.append(element('legend','DIFICULDADE'));for(const [key,d] of Object.entries(DIFFICULTIES)){const button=element('button',d.name);button.setAttribute('aria-pressed',String(progress.difficulty===key));button.onclick=()=>{progress.difficulty=key;persist();show();};diff.append(button);}diff.append(element('p',DIFFICULTIES[progress.difficulty].description));
  const upgrades=element('div','','menu-upgrades');upgrades.append(element('h3','MELHORIAS PERMANENTES · '+points(progress)+' FÓSSEIS'));const cards=element('div','','upgrade-cards');for(const [key,def] of Object.entries(UPGRADES)){const n=progress.levels[key],button=element('button','');button.append(element('strong',def.name+' '+n+'/2'),element('small',def.description),element('span',n===2?'MÁXIMO':(n+1)+' fóssil(is)'));button.disabled=n>=2||points(progress)<n+1;button.onclick=()=>{if(purchase(progress,key)){persist();show(def.name+' melhorado.');}};cards.append(button);}upgrades.append(cards);tools.append(diff,upgrades);
  const status=element('p',message||(progress.completed===5?'Campanha concluída! Rejogue as fases e complete seus objetivos.':'Escolha a dificuldade e clique em Iniciar fase quando estiver pronto.'),'menu-message');status.setAttribute('role','status');const save=element('small',warning||'Salvamento local · Dificuldade pode ser alterada entre partidas · Objetivos não concedem fósseis extras','menu-save');const footer=element('footer','','menu-footer');footer.append(status);if(preferences)footer.append(preferences);menu.append(top,art,tools,footer,save);globalThis.dispatchEvent?.(new Event('menurendered'));
 }
 function finish(battle){const won=battle.result==='victory',rewarded=won&&completeStage(progress,selected);if(won){recordObjectives(progress,selected,battle);persist();}const message=(won?'Vitória! ':'Seu ninho caiu. ')+battle.kills+' inimigos derrotados em '+Math.floor(battle.time)+'s.'+(rewarded?' +2 fósseis.':'')+(won?' A próxima batalha espera pelo seu comando.':' Tente outra composição ou dificuldade.');if(won)selected=nextSelection(selected,progress.completed);show(message);}
 return {show,finish,refresh(){if(!menu.hidden)show();}};
}


