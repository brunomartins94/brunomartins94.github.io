import { createSoloSession } from './solo-session.js';
import { WORLD, TICK } from './engine.js';

let session, paused = false;
self.onmessage = ({data}) => {
  if (data.t === 'join') {
    session = createSoloSession(data);
    paused = false;
    self.postMessage({t:'joined', id:'human'});
    self.postMessage(session.game.viewSnapshot(session.game.snapshot(), 'human'));
  } else if (data.t === 'input') session?.input(data);
  else if (data.t === 'pause') paused = data.paused === true;
};
setInterval(() => {
  if (!session || paused || !session.game.players.has('human')) return;
  const deaths = session.step();
  for (const hit of session.game.impacts) if (hit.a === 'human' || hit.b === 'human') self.postMessage({t:'impact', x:hit.x, y:hit.y});
  for (const death of deaths) if (death.id === 'human') self.postMessage({...death, t:'dead', canRevive:false});
  if (session.game.players.has('human')) self.postMessage(session.game.viewSnapshot(session.game.snapshot(), 'human'));
}, TICK);
self.postMessage({t:'hello', id:'human', world:WORLD, tick:TICK});
