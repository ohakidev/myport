// Browser glue only; rendering, input, state, and persistence belong to Rust/WASM.
const button = document.getElementById('load-play');
const status = document.getElementById('play-load-status');
let runtime;
let mounted = false;
button.addEventListener('click', async () => {
  button.disabled = true;
  button.textContent = 'Loading playground…';
  status.textContent = 'Preparing the garden. Case studies remain available.';
  try {
    runtime ??= await import('./myport_play.js');
    if (!mounted) {
      await runtime.default({ module_or_path: new URL('./myport_play_bg.wasm?v=0.4.2', import.meta.url) });
      document.getElementById('play-game').hidden = false;
      runtime.init();
      mounted = true;
    }
    document.getElementById('play-entry').hidden = true;
    document.getElementById('play-root').dataset.state = 'ready';
    document.getElementById('play-canvas').focus();
  } catch (error) {
    runtime?.dispose();
    mounted = false;
    document.getElementById('play-game').hidden = true;
    status.textContent = 'The garden could not start on this browser. Retry, or read the work without WebGL.';
    button.disabled = false;
    button.textContent = 'Retry playground';
    button.focus();
    console.warn('Playground initialization failed:', error);
  }
});
window.addEventListener('pagehide', () => {
  if (mounted) runtime?.dispose();
});
