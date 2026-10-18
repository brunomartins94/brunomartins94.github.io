import {tr} from './i18n.js';
export function fitBattle(){
 const width=Math.min(window.innerWidth,1440),height=window.innerHeight;
 document.documentElement.style.setProperty('--battle-width',Math.min(width,height*1676/940)+'px');
 const menu=document.getElementById('campaign-menu');
 if(menu&&!menu.hidden){const scale=Math.min(1,height/Math.max(1,menu.offsetHeight));menu.style.setProperty('--menu-scale',String(scale));}

}
export function installFullscreen(bar){
 // The CrazyGames export uses the platform's fullscreen control exclusively.
 const platform=document.querySelector('meta[name="primal-platform"]')?.content==='crazygames';
 if(!platform){const button=document.createElement('button');button.id='fullscreen';button.type='button';
 const status=document.createElement('span');status.id='fullscreen-status';status.setAttribute('role','status');
 function refresh(){button.textContent='⛶';button.title=tr(document.fullscreenElement?'Sair da tela cheia':'Tela cheia');button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(!!document.fullscreenElement));}
 button.onclick=async()=>{try{status.textContent='';if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{status.textContent=tr('Tela cheia indisponível neste navegador.');}refresh();};
 bar.append(button,status);document.addEventListener('fullscreenchange',()=>{refresh();fitBattle();});addEventListener('languagechange',refresh);refresh();}
 addEventListener('resize',fitBattle);addEventListener('menurendered',fitBattle);const observer=new ResizeObserver(fitBattle);observer.observe(bar);observer.observe(document.getElementById('campaign-menu'));fitBattle();
}
