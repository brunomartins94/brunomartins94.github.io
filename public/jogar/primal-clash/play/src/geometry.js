// World-space dimensions shared by rendering and melee collision.
export const BODY_WIDTH = {raptor:76,brachio:99,trike:103};
export const halfWidth = unit => BODY_WIDTH[unit.type]/2;
export const contactDistance = (a,b) => halfWidth(a)+halfWidth(b);
