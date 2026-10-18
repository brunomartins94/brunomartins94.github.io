import { createGame, TICK } from './engine.js';
import { decideBot, DIFFICULTIES } from './bots.js';

export function createSoloSession({ name, skin, difficulty = 'normal' }, options = {}) {
  const level = Object.hasOwn(DIFFICULTIES, difficulty) ? difficulty : 'normal';
  const game = createGame(options);
  game.spawn('human', name, { skin });
  const names = ['Lyra', 'Vega', 'Atlas', 'Nova', 'Sirius', 'Cosmo', 'Órion', 'Íris', 'Kepler'];
  const bots = names.map((name, i) => {
    const id = `bot-${i}`;
    game.spawn(id, `${name} · Bot`, { skin: i % 6 });
    return { id, name: `${name} · Bot`, skin: i % 6, next: 0, respawn: 0, personality: .8 + i * .05 };
  });
  let elapsed = 0;
  return { game, level, bots,
    input(m) {
      const p = game.players.get('human');
      if (!p || !Number.isFinite(m.x) || !Number.isFinite(m.y)) return;
      p.input = {x:Math.max(-1,Math.min(1,m.x)), y:Math.max(-1,Math.min(1,m.y)), boost:m.boost === true};
      p.lastInput = elapsed;
      if (Array.isArray(m.view) && m.view.length === 2 && m.view.every(Number.isFinite)) p.view = m.view;
    },
    step() {
      elapsed += TICK;
      game.snapshotTick = elapsed / TICK;
      for (const bot of bots) {
        let p = game.players.get(bot.id);
        if (!p && elapsed >= bot.respawn) { p = game.spawn(bot.id, bot.name, {skin:bot.skin}); bot.next = 0; }
        if (!p) continue;
        if (elapsed >= bot.next) {
          p.input = decideBot(game, p, level, bot.personality);
          bot.next = elapsed + DIFFICULTIES[level].reaction;
        }
        p.lastInput = elapsed;
      }
      const deaths = game.step(elapsed);
      for (const death of deaths) {
        const bot = bots.find(bot => bot.id === death.id);
        if (bot) bot.respawn = elapsed + 3000;
      }
      return deaths;
    }
  };
}
