(() => {
  // Projeção esférica em Canvas: superfície gira, iluminação permanece fixa.
  const palettes = [
    ['#205b9d','#66bfa0','#bfdad3'], ['#a84e43','#e79768','#ffc49a'],
    ['#b28154','#e6be7e','#ffe4b4'], ['#335a9b','#7ca9dc','#c5ddef'],
    ['#745191','#ba91d1','#e0c6ec'], ['#697b90','#b2c0c8','#e2e7de']
  ].map(row => row.map(hex => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16))));
  const cache = new Map();
  function sprite(skin = 0, diameter = 48, now = 0, still = false) {
    skin = Number.isInteger(skin) && skin >= 0 && skin < 6 ? skin : 0;
    const size = diameter > 220 ? 160 : diameter > 80 ? 96 : 48;
    const frame = still ? 0 : Math.floor(now / 120) % 96;
    const key = `${skin}:${size}:${frame}`;
    if (cache.has(key)) { const hit=cache.get(key);cache.delete(key);cache.set(key,hit);return hit; }
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const g=canvas.getContext('2d'), angle=frame/96*Math.PI*2, palette=palettes[skin];
    const c=Math.cos(angle),s=Math.sin(angle);
    for(let py=0;py<size;py++) for(let px=0;px<size;px++) {
      const nx=(px+.5-size/2)/(size/2), ny=(py+.5-size/2)/(size/2), d=nx*nx+ny*ny;
      if(d>1)continue;
      const nz=Math.sqrt(1-d), x=nx*c+nz*s, z=nz*c-nx*s, y=ny;
      const terrain=Math.sin(x*7+z*3)+Math.sin(y*8-x*3)+.5*Math.sin(z*13+y*4);
      const fine=Math.sin(x*33+y*21+z*27)*Math.sin(y*29-z*17);
      let tone=0;
      if(skin===0) tone=terrain>.3?1:0;
      else if(skin===2||skin===3) {
        const band=Math.sin(y*(skin===2?23:16)+Math.sin(x*5+z*4)*.6);
        tone=band>.25?1:0;
        if(band>.9)tone=2;
      } else { tone=terrain>0?1:0; if(fine>.7)tone=Math.max(0,tone-1); }
      if(skin===0 && Math.abs(y)>.85+.03*Math.sin(x*12)) tone=2;
      if(skin===5) {
        const crater=Math.sin(x*17+z*7)*Math.sin(y*19-z*5);
        tone=crater>.72?0:crater>.45?2:1;
      }
      const diffuse=Math.max(0,-nx*.4-ny*.45+nz*.8);
      const light=.34+Math.round(diffuse*7)/7*.68;
      const rgb=palette[tone].map(v=>Math.max(0,Math.min(255,Math.round(v*light+fine*3))));
      g.fillStyle=`rgb(${rgb.join(',')})`;g.fillRect(px,py,1,1);
    }
    cache.set(key,canvas);
    if(cache.size>72)cache.delete(cache.keys().next().value);
    return canvas;
  }
  window.OrbitalPlanetArt={sprite};
})();
