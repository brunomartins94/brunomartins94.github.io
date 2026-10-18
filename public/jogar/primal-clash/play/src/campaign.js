import {DIFFICULTIES} from './difficulty.js';
export const STAGES = [
 {name:'Vale Primordial',music:'background.mp3',art:'assets/valley-hud.png',hint:'Comece recrutando tropas e melhore a renda para sustentar seu exército.',base:500,gold:40,income:4.8,ramp:1.5,delay:7,cadence:4,pattern:['raptor','raptor','brachio']},
 {name:'Passagem dos Raptors',music:'Passagem dos Raptors.mp3',art:'assets/raptor-pass-hud.png',hint:'Raptors rápidos chegam em sequência. Proteja sua linha de frente.',base:650,gold:75,income:6,ramp:2,delay:5,cadence:3,pattern:['raptor','raptor','brachio','raptor']},
 {name:'Bosque dos Gigantes',music:'Bosque dos Gigantes.mp3',art:'assets/giant-grove-hud.png',hint:'Braquiossauros resistentes disputam o bosque.',base:800,gold:100,income:7,ramp:2,delay:4,cadence:2.8,pattern:['brachio','raptor','brachio','trike']},
 {name:'Terras de Chifres',music:'Terras de Chifres.mp3',art:'assets/hornlands-hud.png',hint:'O rival usa tanques. Invista em renda para sustentar o combate.',base:950,gold:120,income:8,ramp:2.5,delay:3,cadence:2.5,pattern:['trike','raptor','trike','brachio']},
 {name:'Fortaleza Ancestral',music:'Fortaleza Ancestral.mp3',art:'assets/ancestral-fortress-hud.png',hint:'Conquiste o último ninho contra um exército misto.',base:1200,gold:150,income:8.5,ramp:3,delay:3,cadence:2.2,pattern:['trike','brachio','raptor','trike','brachio']}
];
export const UPGRADES={nest:{name:'Ninho reforçado',description:'+80 de vida da base por nível'},vitality:{name:'Vitalidade',description:'+8% de vida das tropas por nível'},stock:{name:'Reserva de âmbar',description:'+20 de âmbar inicial por nível'}};
export const SAVE_KEY='primal-clash.campaign.v1';
export function freshProgress(){return {version:1,completed:0,difficulty:'medium',stars:[0,0,0,0,0],levels:{nest:0,vitality:0,stock:0}};}
export function validateProgress(raw){if(!raw||raw.version!==1)return freshProgress();const p=freshProgress();p.completed=Number.isInteger(raw.completed)?Math.max(0,Math.min(5,raw.completed)):0;p.difficulty=Object.hasOwn(DIFFICULTIES,raw.difficulty)?raw.difficulty:'medium';p.stars=p.stars.map((_,i)=>i<p.completed&&Number.isInteger(raw.stars?.[i])?Math.max(0,Math.min(7,raw.stars[i])):0);let budget=p.completed*2;for(const key of Object.keys(UPGRADES)){const n=raw.levels?.[key];const level=Number.isInteger(n)?Math.max(0,Math.min(2,n)):0;const cost=level*(level+1)/2;if(cost<=budget){p.levels[key]=level;budget-=cost;}}return p;}
export function points(p){return p.completed*2-Object.values(p.levels).reduce((sum,n)=>sum+n*(n+1)/2,0);}
export function purchase(p,key){if(!Object.hasOwn(UPGRADES,key))return false;const level=p.levels[key];if(level>=2||points(p)<level+1)return false;p.levels[key]++;return true;}
export function completeStage(p,index){if(index!==p.completed||index>=STAGES.length)return false;p.completed++;return true;}
export function loadProgress(storage){try{const raw=storage.getItem(SAVE_KEY);return {progress:validateProgress(raw?JSON.parse(raw):null),warning:''};}catch{return {progress:freshProgress(),warning:'Salvamento indisponível ou inválido. O progresso desta sessão continua disponível.'};}}
export function saveProgress(storage,p){try{storage.setItem(SAVE_KEY,JSON.stringify(p));return true;}catch{return false;}}

export function recordObjectives(progress,index,battle){if(battle.result!=='victory')return;const bits=1|(battle.bases[0]>battle.maxBases[0]*.5?2:0)|(battle.time<300?4:0);progress.stars[index]|=bits;}
export function nextSelection(index,completed){return Math.min(index+1,completed,STAGES.length-1);}

