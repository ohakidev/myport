// One scheduler owns each effect; hidden/offscreen effects never keep a frame loop alive.
export function createAnimationLoop(element: Element, draw: (time: number) => boolean, enabled: boolean) {
  let frame = 0;
  let visible = false;
  let disposed = false;
  const stop = () => { cancelAnimationFrame(frame); frame = 0; };
  const tick = (time: number) => {
    frame = 0;
    if (!disposed && visible && !document.hidden && draw(time)) start();
  };
  const start = () => {
    if (disposed) return;
    if (!enabled) { draw(0); return; }
    if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick);
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start(); else stop();
  });
  const onVisibility = () => { if (document.hidden) stop(); else start(); };
  draw(0);
  if (enabled) {
    observer.observe(element);
    document.addEventListener("visibilitychange", onVisibility);
  }
  return {
    start,
    dispose() {
      disposed = true;
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
