(() => {
  const i18n = window.OrbitalI18n, $ = id => document.getElementById(id);
  const patterns = {
    magnet: ['............','..##....##..','..##....##..','..##....##..','..##....##..','..##....##..','..###..###..','...######...','....####....','............'],
    shield: ['............','.....##.....','..########..','..########..','..########..','...######...','...######...','....####....','.....##.....','............'],
    haste: ['......###...','.....###....','....###.....','...######...','..######....','.....##.....','....##......','...##.......','..#.........','............'],
    vision: ['............','....####....','..##....##..','.##..##..##.','##..####..##','.##..##..##.','..##....##..','....####....','............','............']
  };
  const colors = {magnet:'#c4b4f3',shield:'#99ded8',haste:'#f4c799',vision:'#a8c9ff'};
  const powerIcons = Object.fromEntries(Object.entries(patterns).map(([type, rows]) => {
    const icon = document.createElement('canvas'); icon.width = icon.height = 12; const ctx = icon.getContext('2d');
    rows.forEach((row,y) => [...row].forEach((pixel,x) => { if (pixel === '#') { ctx.fillStyle = y < 3 ? '#f0f6ff' : colors[type]; ctx.fillRect(x,y+1,1,1); } }));
    return [type,icon];
  }));
  const flag = country => {
    const rect = (x,y,w,h,c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
    const circle = (x,y,r,c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
    const horizontal = colors => colors.map((c,i) => rect(0,i*18/colors.length,28,18/colors.length,c)).join('');
    const flags = {
      BR: rect(0,0,28,18,'#159447')+'<path d="M14 2L26 9L14 16L2 9Z" fill="#ffde45"/>'+circle(14,9,5,'#2546a2')+'<path d="M10 7Q15 6 18 10" fill="none" stroke="white" stroke-width="1"/>',
      US: Array.from({length:13},(_,i)=>rect(0,i*18/13,28,18/13,i%2?'#fff':'#c73c4b')).join('')+rect(0,0,12,10,'#34457b')+Array.from({length:12},(_,i)=>circle(2+(i%4)*2.7,2+Math.floor(i/4)*3,.55,'white')).join(''),
      BD: rect(0,0,28,18,'#006a4e')+circle(12,9,5,'#f42a41'),
      IN: horizontal(['#ff9933','#fff','#138808'])+circle(14,9,2.4,'#234796')+circle(14,9,1.5,'#fff'),
      TR: rect(0,0,28,18,'#e8323e')+circle(11,9,5,'#fff')+circle(13,8,4,'#e8323e')+'<path d="M20 5L21 8L24 8L21.5 10L22.5 13L20 11L17.5 13L18.5 10L16 8L19 8Z" fill="white"/>',
      ES: rect(0,0,28,18,'#aa151b')+rect(0,4.5,28,9,'#f1bf00')+rect(7,7,3,5,'#aa151b'),
      FR: rect(0,0,10,18,'#244ca1')+rect(10,0,9,18,'#fff')+rect(19,0,9,18,'#ed4555'),
      DE: horizontal(['#171717','#d53b37','#ffce44']), ID: horizontal(['#e53b3e','#fff']), RU: horizontal(['#fff','#3152b3','#d53b37'])
    };
    const image = document.createElement('img'); image.setAttribute('src', 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="18" viewBox="0 0 28 18">${flags[country]}</svg>`)); image.setAttribute('alt',country); image.width=28;image.height=18;return image;
  };
  const buttons = i18n.languages.map(([code,country,name]) => {
    const button = document.createElement('button');button.type='button';button.className='language-option';
    const label = document.createElement('span');label.textContent=name;button.append(flag(country),label);button.setAttribute('lang',code);
    button.addEventListener('click',()=>{i18n.setLocale(code);$('languagePanel').open=false;});return button;
  });
  $('languageOptions').replaceChildren(...buttons);
  const iconElements = Object.keys(powerIcons).map(type => {
    const el=document.createElement('span'),icon=document.createElement('canvas');el.className='power-icon';icon.width=icon.height=24;
    const ctx=icon.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(powerIcons[type],0,0,24,24);el.append(icon);el.setAttribute('role','img');return [type,el];
  });
  $('powerIcons').replaceChildren(...iconElements.map(([,el])=>el));
  function translate() {
    const [code,country,name]=i18n.languages.find(([code])=>code===i18n.locale);
    const label=document.createElement('span');label.textContent=name;$('selectedLanguage').replaceChildren(flag(country),label);
    buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i18n.languages[i][0]===code)));
    for(const [id,key] of Object.entries({skinLabel:'choose',nicknameLabel:'name',play:'play',massLabel:'mass',mapLabel:'map',mapHint:'mapHint',overTitle:'over',overEyebrow:'end',revive:'revive',reviveInfo:'reviveInfo',respawn:'respawn'})) $(id).textContent=i18n.t(key);
    const controls = {
      'pt-BR':['Mova o mouse para mover o planeta','Segure o botão esquerdo para acelerar'], en:['Move the mouse to steer your planet','Hold the left mouse button to boost'],
      bn:['গ্রহ সরাতে মাউস নাড়ান','বুস্টের জন্য বাম বোতাম ধরে রাখুন'], hi:['ग्रह को चलाने के लिए माउस हिलाएँ','बूस्ट के लिए बायाँ बटन दबाए रखें'],
      tr:['Gezegeni hareket ettirmek için fareyi hareket ettir','Hızlanmak için sol tuşu basılı tut'], es:['Mueve el ratón para dirigir el planeta','Mantén el botón izquierdo para acelerar'],
      fr:['Déplacez la souris pour diriger la planète','Maintenez le clic gauche pour accélérer'], de:['Bewege die Maus, um den Planeten zu steuern','Halte die linke Maustaste zum Boosten'],
      id:['Gerakkan mouse untuk mengarahkan planet','Tahan tombol kiri untuk boost'], ru:['Двигайте мышью, чтобы управлять планетой','Удерживайте левую кнопку для ускорения']
    }[code];
    ['moveControl','boostControl'].forEach((id,index)=>{ $(id).setAttribute('aria-label',controls[index]); $(id).setAttribute('title',controls[index]); });
    iconElements.forEach(([type,el])=>{el.setAttribute('title',i18n.t(type));el.setAttribute('aria-label',i18n.t(type));});
    document.documentElement.lang=code;
  }
  i18n.onChange(translate);translate();window.OrbitalUI={powerIcons};
})();

