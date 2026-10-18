(() => {
  'use strict';
  const i18n = window.OrbitalI18n, t = i18n.t, powerIcons = window.OrbitalUI.powerIcons;
  let connectionKey = 'connecting', rewardKey = '', lastDeath = null;
  function setConnection(key) { connectionKey = key; $('connection').textContent = t(key); }
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const mini = $('minimap').getContext('2d');
  const powerStyle = { magnet: { symbol: '∩', name: 'Ímã', color: '#c4b4f3' }, shield: { symbol: '◇', name: 'Escudo', color: '#99ded8' }, haste: { symbol: 'ϟ', name: 'Cometa', color: '#f4c799' }, vision: { symbol: '⊕', name: 'Observatório', color: '#a8c9ff' } };
  const skins = [
    { name: 'Gaia', colors: ['#142c46', '#287caa', '#73dba7', '#c2f1d5'], trail: '#73dba7' },
    { name: 'Marte', colors: ['#452638', '#b3544b', '#ed9368', '#ffd5a3'], trail: '#ed9368' },
    { name: 'Titã', colors: ['#443143', '#aa7756', '#ecc37d', '#ffe5b3'], trail: '#ecc37d' },
    { name: 'Netuno', colors: ['#242c61', '#4059b4', '#7fbaf0', '#c2edff'], trail: '#7fbaf0' },
    { name: 'Aurora', colors: ['#392552', '#7b52a3', '#c99ae7', '#f3d3ff'], trail: '#c99ae7' },
    { name: 'Luna', colors: ['#32394b', '#718096', '#b1c4d1', '#eef3e7'], trail: '#b1c4d1' }
  ];
  const planetSprites = skins.map((skin, index) => window.OrbitalPlanetArt.sprite(index, 48, 0, true));
  let selectedSkin = 0;
  try { const saved = Number(localStorage.getItem('orbital.skin')); if (Number.isInteger(saved) && saved >= 0 && saved < 6) selectedSkin = saved; } catch {}
  const skinButtons = skins.map((skin, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'skin-option';
    button.setAttribute('aria-label', `Planeta ${skin.name}`);
    const icon = document.createElement('canvas'); icon.width = icon.height = 48;
    const g = icon.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(planetSprites[index], 0, 0, 48, 48);
    const name = document.createElement('span'); name.textContent = skin.name; button.append(icon, name);
    button.addEventListener('click', () => { selectedSkin = index; updateSkins(); try { localStorage.setItem('orbital.skin', String(index)); } catch {} });
    return button;
  });
  function updateSkins() { skinButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(selectedSkin === index))); }
  $('skins').replaceChildren(...skinButtons); updateSkins();
  const config = window.ORBITAL_CONFIG || {};
  const solo = config.singlePlayer === true;
  const rewardedAdsEnabled = config.rewardedAdsEnabled !== false;
  const localUrl = location.host ? `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}` : 'ws://localhost:3000';
  const endpoints = [...new Set([config.wsUrl || localUrl, config.fallbackUrl].filter(Boolean))];
  let ws, endpoint = 0, retry = 0, id, active = false, world = 12000, snapshots = [];
  let width = innerWidth, height = innerHeight, camera = { x: 6000, y: 6000 };
  let zoom = 1, shake = 0, previousFrame = 0, cameraReady = false, trailClock = 0;
  let playerScreen = { x: width / 2, y: height / 2 };
  const particles = [], trailPositions = new Map();
  const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pointer = { x: width / 2, y: height / 2 }, pointerActive = false, boost = false, sdkPlaying = false;
  const visibleFood = new Map(), visiblePowers = new Map();
  let room = null, pendingRoom = null, autoJoin = false, joinedRoom = false;
  let sdkReady = false, sdkInitializing = false, multiplayerSetup = false, roomSignature = '';
  
  function publishRoom() {
    if (solo || !sdkReady || !joinedRoom || !room) return;
    const signature = JSON.stringify(room);
    if (signature === roomSignature) return;
    try {
      window.CrazyGames.SDK.game.updateRoom({roomId:room.roomId, isJoinable:room.isJoinable, inviteParams:{roomId:room.roomId}});
      roomSignature = signature;
    } catch (error) { console.debug('CrazyGames room:', error); }
  }
  function acceptInvite(params) {
    if (!params || typeof params.roomId !== 'string') return;
    pendingRoom = params.roomId; autoJoin = true; tryAutoJoin();
  }
  function tryAutoJoin() {
    if (!autoJoin || !room || ws?.readyState !== 1) return;
    autoJoin = false;
    send({t:'join', name:$('nickname').value, skin:selectedSkin, delta:true, roomId:pendingRoom || undefined});
  }
  function setupMultiplayer() {
    if (solo || multiplayerSetup) return;
    const sdk = window.CrazyGames.SDK;
    sdk.game.addJoinRoomListener?.(acceptInvite);
    multiplayerSetup = true;
    // O nome da conta ajuda amigos a se reconhecerem; não é autenticação do backend.
    Promise.resolve(sdk.user?.getUser?.()).then(user => {
      if (user?.username) $('nickname').value = user.username;
      if (sdk.game.inviteParams?.roomId) acceptInvite(sdk.game.inviteParams);
      else if (sdk.game.isInstantMultiplayer && !active) { autoJoin = true; tryAutoJoin(); }
    }).catch(error => { console.debug('CrazyGames user:', error); if (sdk.game.inviteParams?.roomId) acceptInvite(sdk.game.inviteParams); else if (sdk.game.isInstantMultiplayer && !active) { autoJoin = true; tryAutoJoin(); } });
  }
  function initializeSDK() {
    const sdk = window.CrazyGames?.SDK;
    if (!sdk || sdkInitializing || sdkReady) return;
    sdkInitializing = true;
    // v3 só aceita chamadas depois que init termina; falha não trava o jogo local.
    Promise.resolve().then(() => sdk.init?.()).then(() => {
      sdkReady = true; setupMultiplayer(); sdkSync(); publishRoom();
    }).catch(error => console.debug('CrazyGames init:', error));
  }
  initializeSDK();
  setInterval(initializeSDK, 500);
  let adBusy = false, adStage = '', adGeneration = 0, adTimer;
  function rewardMessage(key) { rewardKey = key; $('adStatus').textContent = key ? t(key) : ''; }
  function finishAd(text = '') {
    clearTimeout(adTimer); adBusy = false; adStage = ''; adGeneration++;
    $('revive').disabled = false; $('respawn').disabled = false; rewardMessage(text);
  }
  function requestReward() {
    if (!rewardedAdsEnabled) return;
    if (active || adBusy || ws?.readyState !== 1) return;
    if (!window.CrazyGames?.SDK?.ad?.requestAd) { rewardMessage('unavailable'); return; }
    adBusy = true; adStage = 'prepare'; adGeneration++;
    $('revive').disabled = true; $('respawn').disabled = true;
    rewardMessage('preparing'); send({ t: 'reward_prepare' });
    adTimer = setTimeout(() => finishAd('noResponse'), 8000);
  }
  function showReward(token) {
    if (!adBusy || adStage !== 'prepare') return;
    clearTimeout(adTimer); adStage = 'watch';
    const generation = adGeneration, socket = ws;
    const valid = () => generation === adGeneration && socket === ws && !active;
    let settled = false;
    rewardMessage('loadingAd');
    try {
      window.CrazyGames.SDK.ad.requestAd('rewarded', {
        adStarted: () => { if (valid() && !settled) rewardMessage('watchingAd'); },
        adError: () => { if (valid() && !settled) { settled = true; finishAd('adFailed'); } },
        adFinished: () => {
          if (!valid() || settled) return;
          settled = true; adStage = 'claim'; rewardMessage('returning');
          // A recompensa é solicitada somente após conclusão, nunca em adError.
          send({ t: 'reward_claim', token });
          adTimer = setTimeout(() => finishAd('confirmFailed'), 8000);
        }
      });
    } catch { if (valid() && !settled) { settled = true; finishAd('openFailed'); } }
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  function sdkSync() {
    if (!sdkReady || !window.CrazyGames?.SDK?.game || sdkPlaying === active) return;
    sdkPlaying = active;
    try {
      // Sincroniza início e morte confirmados pelo servidor com o SDK inicializado.
      const result = active ? window.CrazyGames.SDK.game.gameplayStart() : window.CrazyGames.SDK.game.gameplayStop();
      Promise.resolve(result).catch(error => console.debug('CrazyGames:', error));
    } catch (error) { console.debug('CrazyGames:', error); }
  }
  setInterval(sdkSync, 500);
  function resize() {
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  addEventListener('resize', resize); resize();
  function connect() {
    setConnection(retry ? 'reconnecting' : 'connecting');
    try { ws = solo ? new window.OrbitalLocalSession() : new WebSocket(endpoints[endpoint % endpoints.length]); }
    catch { setConnection('offline'); return; }
    const timeout = setTimeout(() => ws.close(), 5000);
    ws.addEventListener('open', () => { clearTimeout(timeout); });
    ws.addEventListener('message', event => {
      let message; try { message = JSON.parse(event.data); } catch { return; }
      if (message.t === 'hello') {
        retry = 0; id = message.id; world = message.world;
        setConnection(solo ? 'soloReady' : 'connected'); $('play').disabled = false; room = message.room || null; tryAutoJoin();
      } else if (message.t === 'room') {
        room = message; publishRoom();
      } else if (message.t === 'join_error') {
        pendingRoom = null; autoJoin = false;
        $('connection').textContent = t(['roomFull', 'roomMissing'].includes(message.code) ? message.code : 'offline');
        $('play').disabled = false;
      } else if (message.t === 'joined') {
        room = message.room || room; joinedRoom = true; pendingRoom = null; publishRoom();
        finishAd(); $('revive').hidden = true; $('reviveInfo').hidden = true;
        id = message.id; active = true; snapshots = []; visibleFood.clear(); visiblePowers.clear(); boost = false;
        cameraReady = false; zoom = 1; shake = 0; particles.length = 0; trailPositions.clear();
        pointer = { x: width / 2, y: height / 2 };
        pointerActive = false;
        $('menu').hidden = true; $('gameOver').hidden = true; $('respawn').disabled = false; sdkSync();
      } else if (message.t === 'state' && active) {
        // Reconstrói a visão antes de interpolar. Clientes antigos continuam recebendo snapshots completos.
        for (const [key,map] of [['f',visibleFood],['u',visiblePowers]]) {
          if (Array.isArray(message[key])) { map.clear(); for (const row of message[key]) map.set(row[0],row); }
          else { for (const id of message[key+'r'] || []) map.delete(id); for (const row of message[key+'d'] || []) map.set(row[0],row); }
          message[key]=[...map.values()];
        }
        // Buffer de 100 ms: interpola snapshots autoritativos, sem inventar posições locais.
        snapshots.push({ ...message, at: performance.now(), byId: new Map(message.p.map(p => [p[0], p])), foodById: new Map(message.f.map(f => [f[0], f])) });
        if (snapshots.length > 12) snapshots.shift();
        updateHUD(message);
      } else if (message.t === 'dead') {
        active = false; boost = false; sdkSync();
        finishAd(); $('revive').hidden = !rewardedAdsEnabled || !message.canRevive; $('reviveInfo').hidden = !rewardedAdsEnabled || !message.canRevive;
        $('effects').replaceChildren();
        if (rewardedAdsEnabled && !message.canRevive) rewardMessage('used');
        lastDeath = message; $('deathDetail').textContent = t('death', {killer: message.killer, mass: Math.floor(message.mass)});
        $('gameOver').hidden = false;
      } else if (message.t === 'reward_ready') {
        showReward(message.token);
      } else if (message.t === 'reward_error') {
        finishAd('rewardError');
      } else if (message.t === 'impact' && active) {
        // O tremor nasce de uma colisão confirmada pelo servidor, não de previsão local.
        if (!reducedMotion) shake = Math.min(12, shake + 8);
        for (let i = 0; i < 18; i++) addParticle(message.x, message.y, '#f8ddaa', 100);
      }
    });
    ws.addEventListener('close', () => {
      clearTimeout(timeout);
      if (sdkReady && joinedRoom) { try { window.CrazyGames.SDK.game.leftRoom?.(); } catch {} }
      joinedRoom = false; room = null; roomSignature = '';
      active = false; boost = false; sdkSync(); snapshots = [];
      finishAd(); $('effects').replaceChildren();
      particles.length = 0; trailPositions.clear(); cameraReady = false; shake = 0;
      $('menu').hidden = false; $('gameOver').hidden = true; $('play').disabled = true;
      setConnection('lost');
      $('mass').textContent = '—'; $('leaders').replaceChildren(); $('online').textContent = t('online', {n: 0});
      endpoint++; setTimeout(connect, Math.min(5000, 700 * 2 ** Math.min(retry++, 3)));
    });
    ws.addEventListener('error', () => { setConnection('offline'); });
  }
  function send(data) {
    if(data.t==='input')data.view=[Math.ceil(width/zoom),Math.ceil(height/zoom)];
    if (ws?.readyState === 1) ws.send(JSON.stringify(data));
  }
  function join() { if (ws?.readyState !== 1 || active || adBusy) return; send({ t: 'join', name: $('nickname').value, skin: selectedSkin, difficulty: solo ? $('difficulty').value : undefined, delta: true, roomId: pendingRoom || undefined }); }
  $('joinForm').addEventListener('submit', event => { event.preventDefault(); join(); });
  $('respawn').addEventListener('click', () => { if (solo) { $('gameOver').hidden = true; $('menu').hidden = false; } else join(); });
  document.addEventListener('visibilitychange', () => { if (solo) send({t:'pause', paused:document.hidden}); });
  $('revive').addEventListener('click', requestReward);
  canvas.addEventListener('mousemove', e => { pointerActive = true; pointer = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') { pointerActive = true; pointer = { x: e.clientX, y: e.clientY }; } });
  canvas.addEventListener('pointerdown', e => { if (!active || (e.pointerType === 'mouse' && e.button !== 0)) return; pointerActive = true; pointer = { x: e.clientX, y: e.clientY }; if (e.pointerType === 'mouse') { boost = true; canvas.setPointerCapture(e.pointerId); } });
  canvas.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') resetInput(); else if (e.button === 0) boost = false; });
  addEventListener('pointerup', e => { if (e.pointerType === 'mouse' && e.button === 0) boost = false; });
  canvas.addEventListener('lostpointercapture', () => { boost = false; });
  canvas.addEventListener('pointercancel', resetInput);
  function resetInput() { pointerActive = false; boost = false; pointer = { x: width / 2, y: height / 2 }; if (active) send({ t: 'input', x: 0, y: 0, boost: false }); }
  addEventListener('blur', resetInput);
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetInput(); });
  $('touchBoost').addEventListener('pointerdown', e => { e.preventDefault(); $('touchBoost').setPointerCapture(e.pointerId); boost = true; });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) $('touchBoost').addEventListener(type, () => { boost = false; });
  setInterval(() => {
    if (!active) return;
    if (!pointerActive) { send({ t: 'input', x: 0, y: 0, boost: false }); return; }
    const dx = pointer.x - playerScreen.x, dy = pointer.y - playerScreen.y;
    const distance = Math.hypot(dx, dy), scale = Math.max(80, distance);
    send({ t: 'input', x: distance < 8 ? 0 : dx / scale, y: distance < 8 ? 0 : dy / scale, boost });
  }, 50);
  function updateHUD(state) {
    const me = state.p.find(p => p[0] === id);
    if (me) { $('mass').textContent = Math.floor(solo ? me[12] || 0 : me[3]); $('boostState').textContent = t(me[6] ? 'boost' : 'idle'); }
    if (me) $('effects').replaceChildren(...['magnet', 'shield', 'haste', 'vision'].flatMap((type, i) => {
      if (!me[7 + i]) return [];
      const el = document.createElement('span'), style = powerStyle[type]; el.className = 'effect'; el.style.color = style.color;
      const icon = document.createElement('canvas'); icon.width = icon.height = 20; const g = icon.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(powerIcons[type],0,0,20,20); const label = document.createElement('span'); label.textContent = `${t(type)} · ${Math.ceil(me[7 + i] / 1000)}s`; el.append(icon,label); return [el];
    }));
    $('online').textContent = t('online', {n: state.p.length});
    $('leaders').replaceChildren(...[...state.p].sort((a, b) => (solo ? b[12] - a[12] : b[3] - a[3])).slice(0, 5).map((p, i) => {
      const li = document.createElement('li'); if (p[0] === id) li.className = 'self';
      for (const [className, text] of [['rank', String(i + 1).padStart(2, '0')], ['name', p[4]], ['score', String(Math.floor(solo ? p[12] || 0 : p[3]))]]) {
        const span = document.createElement('span'); span.className = className; span.textContent = text; li.append(span);
      } return li;
    }));
  }
  function circle(x, y, r, fill, stroke) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }
  function drawMinimap(me) {
    const size = 152, scale = size / world;
    mini.setTransform(2, 0, 0, 2, 0, 0); mini.clearRect(0, 0, size, size);
    mini.strokeStyle = '#273950'; mini.lineWidth = .5;
    for (let i = 0; i <= 4; i++) { const v = i * size / 4; mini.beginPath(); mini.moveTo(v, 0); mini.lineTo(v, size); mini.moveTo(0, v); mini.lineTo(size, v); mini.stroke(); }
    mini.strokeStyle = '#4b6680'; mini.strokeRect(.5, .5, size - 1, size - 1);
    if (!me || !active) return;
    const x = me[1] * scale, y = me[2] * scale;
    const left = Math.max(0, (camera.x - width / (2 * zoom)) * scale), top = Math.max(0, (camera.y - height / (2 * zoom)) * scale);
    const right = Math.min(size, (camera.x + width / (2 * zoom)) * scale), bottom = Math.min(size, (camera.y + height / (2 * zoom)) * scale);
    mini.fillStyle = '#69e2c213'; mini.fillRect(left, top, right - left, bottom - top);
    mini.strokeStyle = '#69e2c275'; mini.strokeRect(left, top, right - left, bottom - top);
    mini.beginPath(); mini.arc(x, y, 6, 0, Math.PI * 2); mini.fillStyle = '#69e2c22a'; mini.fill();
    mini.beginPath(); mini.arc(x, y, 2.8, 0, Math.PI * 2); mini.fillStyle = '#9bf2d8'; mini.fill();
  }
  function addParticle(x, y, color, speed = 16) {
    if (particles.length >= 700) return;
    const angle = Math.random() * Math.PI * 2;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .7 + Math.random() * .35, maxLife: 1.05, size: 2 + Math.floor(Math.random() * 3), color });
  }
  function draw(now) {
    requestAnimationFrame(draw);
    const dt = Math.min(.05, Math.max(0, (now - (previousFrame || now - 16)) / 1000)); previousFrame = now;
    const target = now - 100;
    while (snapshots.length > 2 && snapshots[1].at <= target) snapshots.shift();
    const a = snapshots[0], b = snapshots[1] || a;
    const mix = a && b.at > a.at ? Math.max(0, Math.min(1, (target - a.at) / (b.at - a.at))) : 1;
    const rendered = b ? b.p.map(p => {
      const old = a.byId.get(p[0]) || p;
      return [p[0], lerp(old[1], p[1], mix), lerp(old[2], p[2], mix), lerp(old[3], p[3], mix), ...p.slice(4)];
    }) : [];
    const me = rendered.find(p => p[0] === id);
    if (me) {
      if (!cameraReady) { camera = { x: me[1], y: me[2] }; cameraReady = true; }
      const follow = 1 - Math.exp(-12 * dt);
      camera.x = lerp(camera.x, me[1], follow); camera.y = lerp(camera.y, me[2], follow);
    }
    const growthZoom = me ? Math.min(1, Math.min(110, Math.min(width,height)*.18) / (Math.sqrt(me[3])*4)) : 1;
    const wantedZoom = active && me ? growthZoom * Math.max(.52, (me[6] ? .84 : 1) * (me[9] > 0 ? .84 : 1) * (me[10] > 0 ? .68 : 1)) : 1;
    zoom = lerp(zoom, wantedZoom, 1 - Math.exp(-3.5 * dt));
    shake *= Math.exp(-11 * dt);
    const shakeX = reducedMotion ? 0 : Math.sin(now * .083) * shake;
    const shakeY = reducedMotion ? 0 : Math.cos(now * .107) * shake;
    playerScreen = me ? { x: width / 2 + (me[1] - camera.x) * zoom, y: height / 2 + (me[2] - camera.y) * zoom } : { x: width / 2, y: height / 2 };
    ctx.fillStyle = '#080e1e'; ctx.fillRect(0, 0, width, height);
    const viewW = width / zoom, viewH = height / zoom;
    const ox = viewW / 2 - camera.x, oy = viewH / 2 - camera.y;
    const visible = (x, y, margin = 30) => x + ox >= -margin && x + ox <= viewW + margin && y + oy >= -margin && y + oy <= viewH + margin;
    ctx.save(); ctx.translate(width / 2 + shakeX, height / 2 + shakeY); ctx.scale(zoom, zoom); ctx.translate(-camera.x, -camera.y);
    ctx.fillStyle = '#0d1729'; ctx.fillRect(0, 0, world, world);
    // Estrelas determinísticas: leves, estáveis no mundo e sem imagens externas.
    for (let i = 0; i < 1600; i++) {
      const x = (i * 733 + 137) % world, y = (i * 1297 + 349) % world;
      if (!visible(x, y)) continue;
      ctx.fillStyle = i % 5 === 0 ? '#bed3ed65' : '#bed3ed28';
      ctx.fillRect(x, y, i % 5 === 0 ? 3 : 2, i % 5 === 0 ? 3 : 2);
      if (i % 17 === 0) { ctx.fillRect(x - 3, y + 1, 9, 1); ctx.fillRect(x + 1, y - 3, 1, 9); }
    }
    ctx.strokeStyle = '#1b2c4166'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = Math.max(0, Math.floor(-ox / 120) * 120); x <= Math.min(world, viewW - ox); x += 120) { ctx.moveTo(x, 0); ctx.lineTo(x, world); }
    for (let y = Math.max(0, Math.floor(-oy / 120) * 120); y <= Math.min(world, viewH - oy); y += 120) { ctx.moveTo(0, y); ctx.lineTo(world, y); }
    ctx.stroke(); ctx.strokeStyle = '#486885'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, world, world);
    if (b) for (const f of b.f) {
      if (!visible(f[1], f[2])) continue;
      const previous = a.foodById?.get(f[0]) || f;
      const fx = lerp(previous[1], f[1], mix), fy = lerp(previous[2], f[2], mix);
      const color = ['#91dfc6', '#c4b4f3', '#f4c799', '#e5b2cc'][f[0] % 4];
      const size = Math.min(12, 4 + Math.floor(Math.sqrt(f[3])));
      ctx.fillStyle = color + '12'; ctx.fillRect(Math.round(fx) - size, Math.round(fy) - size, size * 2, size * 2);
      ctx.fillStyle = color; ctx.fillRect(Math.round(fx) - size / 2, Math.round(fy) - size / 2, size, size);
      ctx.fillStyle = '#ffffff90'; ctx.fillRect(Math.round(fx) - size / 2, Math.round(fy) - size / 2, 2, 2);
    }
    if (b) for (const power of b.u || []) {
      const [, x, y, type] = power, style = powerStyle[type];
      if (!style || !visible(x, y, 50)) continue;
      const bob = reducedMotion ? 0 : Math.round(Math.sin(now / 450 + power[0]) * 3);
      ctx.fillStyle = style.color + '12'; ctx.fillRect(x - 23, y + bob - 23, 46, 46);
      ctx.fillStyle = '#18243a'; ctx.fillRect(x - 16, y + bob - 16, 32, 32);
      ctx.strokeStyle = style.color; ctx.lineWidth = 2; ctx.strokeRect(x - 16, y + bob - 16, 32, 32);
      ctx.font = 'bold 20px OrbitalPixel, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = style.color; ctx.drawImage(powerIcons[type], x - 12, y + bob - 12, 24, 24);
      ctx.font = '10px OrbitalPixel, sans-serif'; ctx.fillText(t(type), x, y + 32);
    }
    trailClock += dt;
    const emitTrail = trailClock >= (reducedMotion ? .16 : .045);
    if (emitTrail) trailClock = 0;
    const present = new Set(rendered.map(p => p[0]));
    for (const key of trailPositions.keys()) if (!present.has(key)) trailPositions.delete(key);
    for (const p of rendered) {
      const old = trailPositions.get(p[0]);
      if (active && emitTrail && old && visible(p[1], p[2], 100)) {
        const dx = p[1] - old.x, dy = p[2] - old.y, dist = Math.hypot(dx, dy);
        if (dist > .1) {
          const r = Math.sqrt(p[3]) * 4, color = skins[p[11] || 0].trail;
          for (let i = 0; i < (p[6] || p[9] > 0 ? 3 : 1); i++) addParticle(p[1] - dx / dist * r + (Math.random() - .5) * r * .5, p[2] - dy / dist * r + (Math.random() - .5) * r * .5, color);
        }
      }
      if (emitTrail || !old) trailPositions.set(p[0], { x: p[1], y: p[2] });
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i]; particle.life -= dt;
      if (particle.life <= 0) { particles.splice(i, 1); continue; }
      particle.x += particle.vx * dt; particle.y += particle.vy * dt;
      if (!visible(particle.x, particle.y)) continue;
      ctx.globalAlpha = Math.min(.8, particle.life / particle.maxLife); ctx.fillStyle = particle.color;
      ctx.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
    rendered.sort((p, q) => p[3] - q[3]);
    for (const p of rendered) {
      const r = Math.sqrt(p[3]) * 4, own = p[0] === id, skin = p[11] || 0, color = skins[skin].trail;
      if (!visible(p[1], p[2], r + 250)) continue;
      if (p[6]) circle(p[1], p[2], r + 9 + Math.sin(now / 90) * 2, '#69e2c209', color);
      if (p[7] > 0) {
        ctx.save(); ctx.setLineDash([4, 12]); circle(p[1], p[2], r + 240, '#c4b4f304', '#c4b4f333'); ctx.restore();
        circle(p[1], p[2], r + 15, '#c4b4f306', '#c4b4f380');
      }
      if (p[8] > 0) circle(p[1], p[2], r + 8, '#99ded815', '#99ded8');
      if (p[9] > 0) { ctx.save(); ctx.setLineDash([9, 9]); circle(p[1], p[2], r + 20, '#f4c79904', '#f4c79980'); ctx.restore(); }
      if (p[10] > 0) { ctx.strokeStyle = '#a8c9ff88'; ctx.lineWidth = 2; const d = r + 25; for (const sx of [-1, 1]) for (const sy of [-1, 1]) { ctx.beginPath(); ctx.moveTo(p[1] + sx * d, p[2] + sy * (d - 7)); ctx.lineTo(p[1] + sx * d, p[2] + sy * d); ctx.lineTo(p[1] + sx * (d - 7), p[2] + sy * d); ctx.stroke(); } }
      const art = window.OrbitalPlanetArt.sprite(skin, r * 2 * zoom, now, reducedMotion);
      ctx.drawImage(art, Math.round(p[1] - r), Math.round(p[2] - r), r * 2, r * 2);
      ctx.fillStyle = '#f1f7ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `600 ${Math.max(11, Math.min(18, r * .5))}px OrbitalPixel, sans-serif`;
      ctx.fillText(p[4], p[1], p[2] - r - 14, Math.max(75, r * 2.4));
      if (own) { ctx.font = '9px OrbitalPixel, sans-serif'; ctx.fillStyle = color; ctx.fillText(t('you'), p[1], p[2] + r + 17); }
    }
    ctx.restore();
    drawMinimap(me);
  }
  function soloLabels() { if (!solo) return; for (const [id,key] of Object.entries({difficultyLabel:'difficulty',easyOption:'easy',normalOption:'normal',hardOption:'hard',soloInfo:'soloInfo',massLabel:'points',respawn:'newGame'})) $(id).textContent=t(key); }
  soloLabels();
  i18n.onChange(() => {
    soloLabels();
    setConnection(connectionKey); rewardMessage(rewardKey);
    if (active && snapshots.length) updateHUD(snapshots[snapshots.length - 1]);
    else { $('online').textContent = t('online', {n: 0}); $('boostState').textContent = t('idle'); }
    if (lastDeath) $('deathDetail').textContent = t('death', {killer:lastDeath.killer, mass:Math.floor(lastDeath.mass)});
  });
  $('boostState').textContent = t('idle'); $('online').textContent = t('online', {n:0});
  connect(); requestAnimationFrame(draw);
})();


