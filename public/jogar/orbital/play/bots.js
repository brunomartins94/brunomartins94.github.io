import { WORLD, radius } from './engine.js';

export const DIFFICULTIES = Object.freeze({
  easy: { reaction: 800, vision: 500, hunt: .15, powers: .5, boost: false },
  normal: { reaction: 400, vision: 850, hunt: .65, powers: 1.5, boost: true },
  hard: { reaction: 150, vision: 1200, hunt: 1, powers: 2.5, boost: true }
});

// Bots only submit movement intent, using the same physics as the human.
export function decideBot(game, p, level, personality = 1, random = Math.random) {
  const policy = DIFFICULTIES[level] || DIFFICULTIES.normal;
  const tick = game.snapshotTick || 0;
  let threat, prey, danger = Infinity, preyDistance = Infinity;
  for (const other of game.players.values()) {
    if (other.id === p.id) continue;
    const d = Math.hypot(other.x - p.x, other.y - p.y);
    if (d > policy.vision) continue;
    if (other.mass >= p.mass * 1.2 && d < danger) { threat = other; danger = d; }
    if (p.mass >= other.mass * 1.25 && other.effects.shield <= tick && p.effects.shield <= tick && d < preyDistance) { prey = other; preyDistance = d; }
  }
  let dx = 0, dy = 0, boost = false;
  if (threat) {
    dx = p.x - threat.x; dy = p.y - threat.y;
    // Steer along boundaries instead of getting pinned against them.
    const edge = radius(p.mass) + 120;
    if (p.x < edge) dx = Math.abs(dx) + 150;
    if (p.x > WORLD - edge) dx = -Math.abs(dx) - 150;
    if (p.y < edge) dy = Math.abs(dy) + 150;
    if (p.y > WORLD - edge) dy = -Math.abs(dy) - 150;
    boost = policy.boost && danger < 350 && p.mass > 30;
  } else if (prey && random() < policy.hunt * personality) {
    dx = prey.x - p.x; dy = prey.y - p.y;
    boost = policy.boost && preyDistance < 450 && p.mass > prey.mass * 1.4;
  } else {
    let target, best = Infinity;
    for (const [items, weight] of [[game.food, 1], [game.powers, policy.powers * personality]]) {
      for (const item of items.values()) {
        const distance = Math.hypot(item.x - p.x, item.y - p.y);
        if (distance > policy.vision || (item.ready && item.ready > tick)) continue;
        const cost = distance / weight;
        if (cost < best) { best = cost; target = item; }
      }
    }
    if (target) { dx = target.x - p.x; dy = target.y - p.y; }
    else { dx = WORLD / 2 - p.x; dy = WORLD / 2 - p.y; }
  }
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length, boost };
}
