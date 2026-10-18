export const WORLD = 12000, TICK = 50, START_MASS = 25;
export const POWER_SPACING = 650;
export const radius = mass => Math.sqrt(mass) * 4;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round = v => Math.round(v * 10) / 10;

export function createGame({ foodCount = 10400, powerCount } = {}) {
  const players = new Map(), food = new Map(), powers = new Map(), revivals = new Map();
  const impacts = [];
  let contacts = new Set();
  let foodId = 0, powerId = 0, tick = 0;
  const durations = { magnet: 200, shield: 160, haste: 160, vision: 240 };
  const powerTypes = Object.keys(durations);
  const powerTarget = () => powerCount ?? Math.min(240, 120 + players.size * 2);
  let nextPowerTick = 20;
  function addPower(type, x, y) {
    if (x === undefined || y === undefined) {
      const counts=Array(64).fill(0),cell=WORLD/8;
      for(const p of powers.values())counts[Math.min(7,Math.floor(p.y/cell))*8+Math.min(7,Math.floor(p.x/cell))]++;
      const min=Math.min(...counts),sectors=counts.flatMap((n,i)=>n===min?[i]:[]);
      let found=false;
      for(let attempt=0;attempt<100;attempt++) {
        const sector=sectors[Math.floor(Math.random()*sectors.length)];
        x=clamp((sector%8+Math.random())*cell,100,WORLD-100);y=clamp((Math.floor(sector/8)+Math.random())*cell,100,WORLD-100);
        // Parte da reposição acompanha regiões habitadas, sem aparecer sobre jogadores.
        if(players.size && attempt<25 && Math.random()<.35) {
          const p=[...players.values()][Math.floor(Math.random()*players.size)],angle=Math.random()*Math.PI*2,distance=800+Math.random()*1200;
          x=clamp(p.x+Math.cos(angle)*distance,100,WORLD-100);y=clamp(p.y+Math.sin(angle)*distance,100,WORLD-100);
        }
        if([...powers.values()].every(p=>Math.hypot(p.x-x,p.y-y)>=POWER_SPACING) && [...players.values()].every(p=>Math.hypot(p.x-x,p.y-y)>radius(p.mass)+300)){found=true;break;}
      }
      if(!found)return null;
    }
    const power = { id: ++powerId, type, x, y, expires: tick+3600+Math.floor(Math.random()*2400) }; powers.set(power.id, power); return power;
  }
  function addFood(x = Math.random() * (WORLD - 20) + 10, y = Math.random() * (WORLD - 20) + 10, mass = 1, ready = tick) {
    const f = { id: ++foodId, x: clamp(x, 8, WORLD - 8), y: clamp(y, 8, WORLD - 8), mass, ready };
    food.set(f.id, f);
    return f;
  }
  function spawn(id, name, { mass = START_MASS, revived = false, skin = 0 } = {}) {
    let x, y;
    for (let i = 0; i < 80; i++) {
      x = 80 + Math.random() * (WORLD - 160); y = 80 + Math.random() * (WORLD - 160);
      if(players.size>0 && players.size<12 && i<40){
        const anchor=[...players.values()][Math.floor(Math.random()*players.size)],angle=Math.random()*Math.PI*2,distance=1400+Math.random()*1400;
        x=clamp(anchor.x+Math.cos(angle)*distance,80,WORLD-80);y=clamp(anchor.y+Math.sin(angle)*distance,80,WORLD-80);
      }
      if ([...players.values()].every(p => Math.hypot(p.x - x, p.y - y) > radius(p.mass) + radius(mass) + 150)) break;
    }
    const p = { id, name: String(name || 'Viajante').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 18) || 'Viajante', x, y,
      mass, score: 0, revived, skin: Number.isInteger(skin) && skin >= 0 && skin < 6 ? skin : 0,
      effects: { magnet: 0, shield: revived ? tick + 60 : 0, haste: 0, vision: 0 },
      hue: Math.floor(Math.random() * 360), input: { x: 0, y: 0, boost: false }, lastInput: Date.now(), boosting: false };
    revivals.delete(id);
    players.set(id, p);
    return p;
  }
  function prepareRevive(id, now = Date.now()) {
    const offer = revivals.get(id);
    if (players.has(id) || !offer || offer.expires < now) return null;
    offer.token ||= globalThis.crypto.randomUUID();
    return offer.token;
  }
  function revive(id, token, now = Date.now()) {
    const offer = revivals.get(id);
    if (!offer || !offer.token || offer.token !== token || offer.expires < now || players.has(id)) return null;
    // O limite e a recompensa são autoritativos. O callback do anúncio vem do SDK no cliente.
    const p = spawn(id, offer.name, { mass: Math.max(START_MASS, offer.mass * .5), revived: true, skin: offer.skin });
    p.hue = offer.hue;
    return p;
  }
  function step(now = Date.now()) {
    tick++;
    const deaths = [];
    impacts.length = 0;
    const nextContacts = new Set();
    for (const [id, offer] of revivals) if (offer.expires < now) revivals.delete(id);
    // Cada coletável é atraído pelo ímã mais próximo, uma única vez por tick.
    const magnets=[...players.values()].filter(p=>p.effects.magnet>tick);
    for (const f of magnets.length ? food.values() : []) {
      if (f.ready > tick) continue;
      let nearest, best = Infinity;
      for (const p of magnets) {
        const distance = Math.hypot(p.x - f.x, p.y - f.y);
        if (p.effects.magnet > tick && distance < radius(p.mass) + 240 && distance < best) { nearest = p; best = distance; }
      }
      if (nearest && best > 0) {
        const pull = Math.min(best, 360 * TICK / 1000) / best;
        f.x += (nearest.x - f.x) * pull; f.y += (nearest.y - f.y) * pull;
      }
    }
    const buckets=new Map(),cellSize=256;
    for(const f of food.values()){const key=`${Math.floor(f.x/cellSize)},${Math.floor(f.y/cellSize)}`;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(f);}
    for (const p of players.values()) {
      const input = now - p.lastInput < 1000 ? p.input : { x: 0, y: 0, boost: false };
      const length = Math.hypot(input.x, input.y);
      p.boosting = input.boost && length > 0 && p.mass > 1;
      if (p.boosting) p.mass = Math.max(1, p.mass * Math.pow(0.98, TICK / 1000));
      const speed = 220 * Math.pow(START_MASS / Math.max(START_MASS, p.mass), 0.15) * (p.boosting ? 1.8 : 1) * (p.effects.haste > tick ? 1.35 : 1);
      const r = radius(p.mass), scale = speed * TICK / 1000 / Math.max(1, length);
      p.x = clamp(p.x + input.x * scale, r, WORLD - r);
      p.y = clamp(p.y + input.y * scale, r, WORLD - r);
      for (const power of powers.values()) {
        if (Math.hypot(p.x - power.x, p.y - power.y) <= r + 14) {
          p.effects[power.type] = tick + durations[power.type]; powers.delete(power.id);
        }
      }
      const reach=radius(10000)+4,nearby=[];
      for(let bx=Math.floor((p.x-reach)/cellSize);bx<=Math.floor((p.x+reach)/cellSize);bx++)for(let by=Math.floor((p.y-reach)/cellSize);by<=Math.floor((p.y+reach)/cellSize);by++)nearby.push(...(buckets.get(`${bx},${by}`)||[]));
      for (const f of nearby) {
        if(!food.has(f.id))continue;
        if (f.ready <= tick && Math.hypot(p.x - f.x, p.y - f.y) <= radius(p.mass) + 4) {
          p.score += f.mass; p.mass = Math.min(10000, p.mass + f.mass); food.delete(f.id);
        }
      }
    }
    const sorted = [...players.values()].sort((a, b) => b.mass - a.mass);
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      if (!players.has(a.id)) continue;
      for (let j = i + 1; j < sorted.length; j++) {
        const b = sorted[j];
        if (!players.has(b.id)) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) > radius(a.mass) + radius(b.mass)) continue;
        const key = [a.id, b.id].sort().join(':');
        nextContacts.add(key);
        // Um impacto por entrada em contato, inclusive com massas iguais ou escudo.
        if (!contacts.has(key)) impacts.push({ a: a.id, b: b.id, x: round((a.x + b.x) / 2), y: round((a.y + b.y) / 2) });
        if (a.mass < b.mass * 1.2 || a.effects.shield > tick || b.effects.shield > tick) continue;
        players.delete(b.id);
        if (!b.revived) revivals.set(b.id, { name: b.name, hue: b.hue, skin: b.skin, mass: b.mass, expires: now + 600000, token: null });
        deaths.push({ id: b.id, killer: a.name, mass: round(b.mass), canRevive: !b.revived });
        const count = Math.min(50, Math.max(6, Math.ceil(b.mass / 2)));
        for (let n = 0; n < count; n++) {
          const angle = Math.random() * Math.PI * 2, distance = Math.random() * (radius(b.mass) + 55);
          addFood(b.x + Math.cos(angle) * distance, b.y + Math.sin(angle) * distance, b.mass / count, tick + 10);
        }
      }
    }
    contacts = nextContacts;
    for (const p of players.values()) {
      const r = radius(p.mass); p.x = clamp(p.x, r, WORLD - r); p.y = clamp(p.y, r, WORLD - r);
    }
    while (food.size < foodCount) addFood();
    while (food.size > foodCount + 3000) food.delete(food.keys().next().value);
    for(const [id,p] of powers)if(p.expires<=tick)powers.delete(id);
    if(tick>=nextPowerTick){
      const target=powerTarget(),batch=Math.min(4,Math.max(1,Math.ceil(players.size/12)));
      for(let i=0;i<batch && powers.size<target;i++)addPower(powerTypes[Math.floor(Math.random()*powerTypes.length)]);
      nextPowerTick=tick+10+Math.floor(Math.random()*21);
    }
    return deaths;
  }
  for (let i = 0; i < foodCount; i++) addFood();
  for (let i = 0; i < powerTarget(); i++) addPower(powerTypes[Math.floor(Math.random()*powerTypes.length)]);
  function snapshot() {
    // Tuplas e arredondamento reduzem o estado; só o servidor determina posição e massa.
    return { t: 'state', n: tick, p: [...players.values()].map(p => [p.id, round(p.x), round(p.y), round(p.mass), p.name, p.hue, +p.boosting,
      ...powerTypes.map(type => Math.max(0, p.effects[type] - tick) * TICK), p.skin, Math.floor(p.score)]),
      u: [...powers.values()].map(p => [p.id, p.x, p.y, p.type]),
      f: [...food.values()].map(f => [f.id, round(f.x), round(f.y), round(f.mass)]) };
  }
  function viewSnapshot(state,id) {
    const p=players.get(id);if(!p)return state;
    const [width,height]=p.view || [1920,1080], margin=500;
    const visible=entity=>Math.abs(entity[1]-p.x)<=width/2+margin && Math.abs(entity[2]-p.y)<=height/2+margin;
    return {...state,f:state.f.filter(visible),u:state.u.filter(visible)};
  }
  return { players, food, powers, revivals, impacts, spawn, step, snapshot, viewSnapshot, powerTarget, addFood, addPower, prepareRevive, revive };
}

