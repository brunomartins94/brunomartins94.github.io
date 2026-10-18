import {difficultyFor} from './difficulty.js';
import {halfWidth,contactDistance} from './geometry.js';
import {DEATH_DURATION} from './sprites.js';
export const TYPES = {
 raptor:{name:'Raptor',cost:40,hp:65,damage:12,speed:51,interval:.75,spawn:1.2,color:'#b5ce72',label:'Ágil · ataque corpo a corpo'},
 brachio:{name:'Braquiossauro',cost:65,hp:125,damage:22,speed:30,interval:1.2,spawn:2,color:'#7cc5b3',label:'Equilibrado · ataque corpo a corpo'},
 trike:{name:'Tricerátopo',cost:100,hp:200,damage:32,speed:20,interval:1.65,spawn:3,color:'#d9a071',label:'Tanque · lento e resistente'}
};
export class Battle {
 constructor(options={}){this.difficulty=difficultyFor(options.difficulty);this.scenario=options.stage??{base:650,gold:105,income:7,ramp:4,delay:3,cadence:2.8,pattern:['raptor','brachio','raptor','trike']};this.perks=options.levels??{};this.aiIndex=0;this.gold=[120+20*(this.perks.stock||0),this.scenario.gold];this.bases=[650+80*(this.perks.nest||0),this.scenario.base];this.maxBases=[...this.bases];this.units=[];this.corpses=[];this.queues=[[],[]];this.level=0;this.time=0;this.aiTimer=this.scenario.delay;this.meteor=0;this.result=null;this.nextId=1;this.effects=[];this.kills=0;}
 cost(type,side=0){return Math.ceil(TYPES[type].cost*(side===0?this.difficulty.playerCost:this.difficulty.enemyCost));}
 recruit(type,side=0){const t=TYPES[type];if(!t||this.result||this.gold[side]<this.cost(type,side)||this.units.filter(u=>u.side===side).length+this.queues[side].length>=16||this.queues[side].length>=5)return false;this.gold[side]-=this.cost(type,side);this.queues[side].push({type,left:t.spawn*(side===1?this.difficulty.enemySpawn:1)});return true;}
 upgrade(){const cost=100+this.level*90;if(this.result||this.level>=2||this.gold[0]<cost)return false;this.gold[0]-=cost;this.level++;return true;}
 strike(){if(this.result||this.meteor>0)return false;this.meteor=35;for(const u of this.units)if(u.side===1){u.hp-=65;this.effects.push({x:u.x,life:.6,kind:'meteor'});}return true;}
 tick(dt){if(this.result)return;this.time+=dt;this.corpses=this.corpses.filter(u=>(u.stateTime+=dt)<DEATH_DURATION);this.meteor=Math.max(0,this.meteor-dt);this.gold[0]+=dt*(7+this.level*3);this.gold[1]+=dt*(this.scenario.income+Math.min(this.scenario.ramp,this.time/70))*this.difficulty.enemyIncome;this.aiTimer-=dt;
 if(this.aiTimer<=0){const pattern=this.scenario.pattern;if(this.recruit(pattern[this.aiIndex%pattern.length],1))this.aiIndex++;this.aiTimer=this.scenario.cadence*this.difficulty.enemyCadence;}
 for(let s=0;s<2;s++){const q=this.queues[s];if(q.length){q[0].left-=dt;if(q[0].left<=0){const {type}=q.shift();const hp=Math.round(TYPES[type].hp*(s===0?1+.08*(this.perks.vitality||0):1));this.units.push({...TYPES[type],hp,maxHp:hp,type,side:s,x:s?1080:120,cool:0,state:"walk",stateTime:0,id:this.nextId++});}}}
 const damage=new Map();for(const u of this.units){if(u.hp<=0)continue;u.stateTime=(u.stateTime||0)+dt;u.cool-=dt;if(u.state==='attack'&&u.stateTime>=Math.min(.6,u.interval*.8)){u.state='idle';u.stateTime=0;}const direction=u.side?-1:1;let target=null;let distance=Infinity;for(const other of this.units){if(other.side===u.side||other.hp<=0)continue;const d=(other.x-u.x)*direction;if(d>=-12&&d<distance){target=other;distance=d;}}
 const baseX=u.side?85:1115;const baseDistance=(baseX-u.x)*direction;const reach=target?contactDistance(u,target):halfWidth(u);const attackUnit=target&&distance<=reach+.01;const attackBase=!target&&baseDistance<=reach+.01;
 if(attackUnit||attackBase){if(u.cool<=0){u.cool=u.interval;u.state="attack";u.stateTime=0;if(attackUnit)damage.set(target,(damage.get(target)||0)+u.damage);else this.bases[1-u.side]=Math.max(0,this.bases[1-u.side]-u.damage);this.effects.push({x:attackUnit?u.x+direction*halfWidth(u):baseX,life:.14,kind:'hit'});}}
 else{if(u.state!=="walk"){u.state="walk";u.stateTime=0;}let move=u.speed*dt;move=Math.min(move,Math.max(0,(target?distance:baseDistance)-reach));u.x+=direction*move;}}
 for(const [u,d] of damage)u.hp-=d;
 this.units=this.units.filter(u=>{if(u.hp>0)return true;this.corpses.push({...u,hp:0,state:'death',stateTime:0});this.gold[1-u.side]+=8;if(u.side===1)this.kills++;return false;});this.effects=this.effects.filter(e=>(e.life-=dt)>0);
 if(this.bases[0]<=0||this.bases[1]<=0)this.result=this.bases[0]<=0?'defeat':'victory';
 }
}
