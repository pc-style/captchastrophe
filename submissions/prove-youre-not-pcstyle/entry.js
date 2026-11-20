export default function mount(element, context) {
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  const panel = document.createElement('section');
  panel.className = 'pcstyle-review';
  panel.dataset.theme = context.theme;
  panel.innerHTML = `
    <style>
      .pcstyle-review {
        --paper: #fffaf1; --ink: #23211c; --tile: #f1ede4;
        --line: #898172; --accent: #a33020; --on-accent: #fff;
        box-sizing: border-box; width: min(100%, 27rem); margin: 0 auto;
        padding: clamp(.7rem, 4vw, 1.25rem); border: 1px solid var(--line);
        background: var(--paper); color: var(--ink); font: 1rem/1.4 system-ui, sans-serif;
      }
      .pcstyle-review[data-theme="dark"] {
        --paper: #27221e; --ink: #fff6e8; --tile: #37312b;
        --line: #988a7b; --accent: #ffae9d; --on-accent: #281611;
      }
      .pcstyle-review h2 { margin: 0; font: bold clamp(1.4rem, 5vw, 2rem)/1.1 Georgia, serif; }
      .pcstyle-review p { margin: .65rem 0; }
      .pcstyle-review .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .3rem; }
      .pcstyle-review button { font: inherit; cursor: pointer; }
      .pcstyle-review button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
      .pcstyle-review .grid button {
        display: grid; place-items: center; min-height: 44px; aspect-ratio: 1.55;
        border: 1px solid var(--line); border-radius: 0; color: var(--ink); background: var(--tile);
        font-size: 1.35rem; font-weight: bold;
      }
      .pcstyle-review .grid button[aria-pressed="true"] { background: var(--accent); color: var(--on-accent); }
      .pcstyle-review .action {
        min-height: 44px; padding: .5rem .9rem; border: 0; border-radius: 0;
        background: var(--accent); color: var(--on-accent); font-weight: bold;
      }
      .pcstyle-review [role="status"] { min-height: 1.4em; }
    </style>
    <h2>Prove You’re Not pcstyle</h2>
    <p id="pcstyle-prompt">Select every square containing a <strong>good CAPTCHA</strong>.</p>
    <div class="grid" role="group" aria-labelledby="pcstyle-prompt"></div>
    <p role="status"></p>
    <button type="button" class="action">Verify</button>
  `;

  const grid = panel.querySelector('.grid');
  const prompt = panel.querySelector('#pcstyle-prompt');
  const status = panel.querySelector('[role="status"]');
  const action = panel.querySelector('.action');
  let phase = 'verify';

  function mark(tile, selected) {
    tile.setAttribute('aria-pressed', String(selected));
    tile.firstElementChild.textContent = selected ? '✓' : '';
  }

  const tiles = Array.from({ length: 9 }, (_, index) => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.setAttribute('aria-label', `Square ${index + 1}, blank`);
    const check = document.createElement('span');
    check.setAttribute('aria-hidden', 'true');
    tile.append(check);
    mark(tile, false);
    tile.addEventListener('click', () => {
      mark(tile, tile.getAttribute('aria-pressed') === 'false');
      status.textContent = '';
    }, options);
    grid.append(tile);
    return tile;
  });

  action.addEventListener('click', event => {
    if (phase === 'rejected') {
      // A double-click on Verify still targets this button after its label changes.
      if (event.detail > 1) return;
      phase = 'appeal';
      prompt.textContent = 'We selected all nine squares on your behalf. Uncheck each square you dispute.';
      for (const tile of tiles) {
        mark(tile, true);
        tile.disabled = false;
      }
      status.textContent = 'Appeal form opened.';
      action.textContent = 'File appeal';
      tiles[0].focus();
      return;
    }

    if (tiles.some(tile => tile.getAttribute('aria-pressed') === 'true')) {
      status.textContent = phase === 'verify'
        ? 'Those squares are blank. Please verify your selection.'
        : 'Appeal returned. You still have blank squares marked as good CAPTCHAs.';
      return;
    }

    if (phase === 'verify') {
      phase = 'rejected';
      for (const tile of tiles) tile.disabled = true;
      status.textContent = 'Rejected. The designer insists there’s at least one.';
      action.textContent = 'Dispute rejection';
      return;
    }

    status.textContent = 'Appeal upheld. The record now shows zero good CAPTCHAs.';
    for (const tile of tiles) tile.disabled = true;
    action.disabled = true;
    context.succeed();
  }, options);

  const unsubscribe = context.onThemeChange(theme => { panel.dataset.theme = theme; });
  element.append(panel);
  context.setState('active');
  return () => {
    listeners.abort();
    unsubscribe();
    panel.remove();
  };
}
