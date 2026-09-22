/**
 * src/engine/dial.js — stub. Installs ctx.actions.setDial: every tagged mesh is visible when its
 * registry level <= dial and no chip rule hides it (userData.chipHidden). Groups are untouched.
 * The interaction lane replaces this file wholesale.
 */

export function init(ctx) {
  ctx.actions.setDial = (level) => {
    const l = Math.min(3, Math.max(1, Math.round(Number(level) || 1)));
    ctx.state.dial = l;
    ctx.root.traverse((o) => {
      if (o.isMesh && o.userData.part) o.visible = !o.userData.chipHidden && o.userData.level <= l;
    });
    ctx.emit('dial', l);
  };
  ctx.actions.setDial(ctx.state.dial);
}
