import {BODY_WIDTH} from './geometry.js';
export const DEATH_DURATION = 1.2;
export const SPRITE_ROWS = {raptor:0,brachio:3,trike:6};
export function animationFrame(unit){
 const death=unit.state==='death';
 const row=SPRITE_ROWS[unit.type]+(death?2:unit.state==='attack'?1:0);
 const duration=death?DEATH_DURATION:unit.state==='attack'?Math.min(.6,unit.interval*.8):.7;
 const frame=unit.state==='idle'?0:death?Math.min(5,Math.floor(unit.stateTime/duration*6)):Math.floor(unit.stateTime/duration*6)%6;
 return {row,frame,alpha:death?Math.min(1,Math.max(0,(DEATH_DURATION-unit.stateTime)/.25)):1};
}
export function createSpriteRenderer(){
 const sheet=new Image();sheet.src=new URL('../assets/dinosaurs-daylight.png',import.meta.url).href;
 const cuts=[0,148,285,416,562,704,835,970,1103,1254];
 return function drawDinosaur(ctx,u){
  if(!sheet.complete||!sheet.naturalWidth)return;
  const {row,frame,alpha}=animationFrame(u),sx=sheet.naturalWidth/6,scale=sheet.naturalHeight/1254;
  const sy=cuts[row]*scale,sh=(cuts[row+1]-cuts[row])*scale;
  const width=BODY_WIDTH[u.type],height=width*sh/sx;
  // Ground shadow stays in world space when the enemy sprite is mirrored.
  ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='rgba(67,57,32,.13)';ctx.beginPath();ctx.ellipse(u.x-5,372,width*.36,4.5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(53,49,28,.19)';ctx.beginPath();ctx.ellipse(u.x,371,width*.23,2.5,0,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=alpha;ctx.translate(u.x,376);ctx.scale(u.side?-1:1,1);
  ctx.drawImage(sheet,frame*sx,sy,sx,sh,-width/2,-height,width,height);ctx.restore();
  const barY=376-(u.type==='raptor'?49:u.type==='brachio'?65:57);
  if(u.state!=='death'){ctx.fillStyle='#15261e';ctx.fillRect(u.x-21,barY,42,5);ctx.fillStyle=u.side?'#ed8c68':'#b7d961';ctx.fillRect(u.x-20,barY+1,40*Math.max(0,u.hp/u.maxHp),3);}
 };
}
