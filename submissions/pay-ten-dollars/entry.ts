import { initialState, totals, transition, type Event, type State } from './flow.ts';

type Context = { readonly signal: AbortSignal; succeed(): void };

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  node.append(...children);
  return node;
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const css = `
.pay-ten {
  --pt-blue: #174a8b;
  --pt-navy: #123159;
  --pt-soft: #edf3fb;
  --pt-on-blue: #ffffff;
  box-sizing: border-box;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: clamp(16px, 3vw, 30px);
  border-top: 5px solid var(--pt-navy);
  color: var(--ink, #1d1d1f);
  background: var(--surface, #ffffff);
  font: 15px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif;
  overflow-wrap: anywhere;
}
html[data-theme='dark'] .pay-ten {
  --pt-blue: #a9cbff;
  --pt-navy: #d2e4ff;
  --pt-soft: #1a2b42;
  --pt-on-blue: #102744;
}
.pay-ten *, .pay-ten *::before, .pay-ten *::after { box-sizing: border-box; }
.pay-ten h2, .pay-ten h3, .pay-ten p, .pay-ten dl { margin: 0; }
.pay-ten .pt-office {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line, #e1dfda);
  color: var(--pt-blue);
  font-size: 12px;
}
.pay-ten h2 { margin-top: 20px; color: var(--pt-navy); font-size: clamp(25px, 4vw, 36px); line-height: 1.15; letter-spacing: -.035em; }
.pay-ten .pt-intro { max-width: 58ch; margin-top: 10px; color: var(--muted, #66666c); }
.pay-ten .pt-safety {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin: 22px 0;
  padding: 12px 14px;
  background: var(--pt-soft);
  color: var(--pt-navy);
  border: 1px solid var(--pt-blue);
  font-size: 14px;
}
.pay-ten .pt-safety strong { font-weight: 750; }
.pay-ten .pt-layout { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr); gap: 30px; align-items: start; }
.pay-ten .pt-work, .pay-ten .pt-stage { min-width: 0; }
.pay-ten h3 { color: var(--pt-navy); font-size: 21px; line-height: 1.25; margin-bottom: 10px; }
.pay-ten .pt-stage p { margin-bottom: 18px; max-width: 55ch; }
.pay-ten fieldset { min-width: 0; margin: 20px 0; padding: 0; border: 0; }
.pay-ten legend { padding: 0; margin-bottom: 10px; font-weight: 650; }
.pay-ten button {
  min-height: 46px;
  min-width: 0;
  padding: 10px 14px;
  border: 1px solid var(--pt-blue);
  border-radius: 4px;
  background: var(--surface, #ffffff);
  color: var(--pt-blue);
  font: inherit;
  font-weight: 600;
  line-height: 1.4;
  text-align: left;
  overflow-wrap: anywhere;
  cursor: pointer;
}
.pay-ten button:hover:enabled { background: var(--pt-soft); }
.pay-ten button:focus-visible, .pay-ten h3:focus {
  outline: 3px solid var(--pt-blue);
  outline-offset: 3px;
}
.pay-ten .pt-choices { display: grid; gap: 8px; }
.pay-ten .pt-choices button { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; width: 100%; }
.pay-ten .pt-choices button span { font-size: 13px; font-weight: 400; }
.pay-ten .pt-choices button[aria-pressed='true'] { background: var(--pt-soft); border-width: 2px; padding: 9px 13px; }
.pay-ten .pt-choices button[aria-pressed='true'] strong::before { content: '✓ '; }
.pay-ten .pt-actions { display: grid; gap: 10px; margin-top: 18px; }
.pay-ten .pt-primary { background: var(--pt-blue); color: var(--pt-on-blue); }
.pay-ten .pt-primary:hover:enabled { background: var(--pt-navy); }
.pay-ten button:disabled { opacity: .6; cursor: not-allowed; }
.pay-ten .pt-receipt { min-width: 0; padding: 20px; background: var(--pt-soft); border-top: 3px solid var(--pt-blue); }
.pay-ten .pt-receipt-heading { color: var(--pt-navy); font-size: 14px; font-weight: 650; }
.pay-ten .pt-price { margin: 6px 0 0; color: var(--pt-navy); font-size: 66px; line-height: 1.1; letter-spacing: -.06em; font-weight: 750; font-variant-numeric: tabular-nums; }
.pay-ten .pt-price-note { color: var(--pt-blue); font-size: 13px; margin-bottom: 18px; }
.pay-ten .pt-row { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--line, #e1dfda); }
.pay-ten dt { min-width: 0; }
.pay-ten dd { margin: 0; flex-shrink: 0; font-variant-numeric: tabular-nums; }
.pay-ten .pt-total { font-size: 18px; font-weight: 750; color: var(--pt-navy); padding-top: 14px; border-bottom: 0; }
.pay-ten .pt-receipt-note { padding-top: 14px; margin-top: 14px; border-top: 1px dashed var(--pt-blue); font-size: 13px; color: var(--pt-blue); }
.pay-ten .pt-feedback { margin-top: 22px; padding: 12px 14px; border-left: 3px solid var(--pt-blue); background: var(--pt-soft); color: var(--pt-navy); }
.pay-ten .pt-feedback[data-error='true'] { background: var(--warn-bg, #fcf0ed); border-color: var(--warn-ink, #7a2a1a); color: var(--warn-ink, #7a2a1a); }
.pay-ten .pt-footer { margin-top: 20px; color: var(--muted, #66666c); font-size: 12px; }
.pay-ten [hidden] { display: none !important; }
@media (max-width: 680px) {
  .pay-ten .pt-layout { grid-template-columns: minmax(0, 1fr); gap: 24px; }
  .pay-ten .pt-receipt { padding: 16px; }
  .pay-ten .pt-price { font-size: 56px; }
}
`;

export default function mount(el: HTMLElement, ctx: Context): () => void {
  if (ctx.signal.aborted) return () => {};

  let state = initialState();
  let disposed = false;
  const listeners = new AbortController();
  const root = h('article', { class: 'pay-ten', 'aria-label': 'Imaginary humanity checkout' });
  const wallet = h('span');
  const stage = h('section', { class: 'pt-stage', 'aria-label': 'Checkout controls' });
  const receipt = h('aside', { class: 'pt-receipt', 'aria-label': 'Itemized play money receipt' });
  const feedback = h('p', { class: 'pt-feedback', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
  let refreshControls = () => {};

  function button(label: string, action: string, primary = false): HTMLButtonElement {
    return h('button', { type: 'button', 'data-action': action, class: primary ? 'pt-primary' : '' }, label);
  }

  function renderStage(): void {
    const heading = h('h3', { tabindex: '-1' });
    refreshControls = () => {};
    switch (state.kind) {
      case 'fee': {
        heading.textContent = 'A small fee for your inconvenience';
        const choices = h('div', { class: 'pt-choices' });
        const payerButtons = [
          { payer: 'you', label: 'You pay', cost: '+$2.00 play money' },
          { payer: 'split', label: 'Split it', cost: '+$1.00 play money' },
          { payer: 'merchant', label: 'Merchant pays', cost: '+$0.00 play money' },
        ].map(({ payer, label, cost }) => {
          const choice = h('button', { type: 'button', 'data-payer': payer, 'aria-pressed': 'false', 'aria-label': `${label} ${cost}` },
            h('strong', {}, label), h('span', {}, cost));
          choices.append(choice);
          return { payer, choice };
        });
        stage.replaceChildren(heading,
          h('p', {}, 'The proof costs $10 in play money. Processing your humanity costs extra. Choose who covers that part.'),
          h('fieldset', {}, h('legend', {}, 'Who pays the inconvenience fee?'), choices),
          button('Review play money total', 'review-fee', true));
        refreshControls = () => {
          if (state.kind !== 'fee') return;
          for (const { payer, choice } of payerButtons) {
            choice.setAttribute('aria-pressed', String(state.payer === payer));
          }
        };
        break;
      }
      case 'offer':
        heading.textContent = 'Would you like to be a Premium Human?';
        stage.replaceChildren(heading,
          h('p', {}, 'Fewer existential doubts. Only $1.00 extra in play money. Still no explanation of what any of this is for.'),
          h('div', { class: 'pt-actions' },
            button('Add premium (+$1.00 play money)', 'add-premium'),
            button('Remain standard human', 'standard')));
        break;
      case 'review': {
        heading.textContent = 'Review your imaginary payment';
        const remove = button('Remove premium', 'remove-premium');
        const authorize = button('Authorize $10.00 in play money', 'authorize', true);
        stage.replaceChildren(heading,
          h('p', {}, 'Your fee negotiation is on file. Check the receipt before spending your entirely fictional savings.'),
          h('div', { class: 'pt-actions' }, remove, button('Edit fee payer', 'edit-fee'), authorize));
        refreshControls = () => {
          if (state.kind !== 'review') return;
          remove.hidden = !state.premium;
          authorize.disabled = totals(state).shortfallCents > 0;
        };
        break;
      }
      case 'paid':
        heading.textContent = 'Humanity provisionally approved';
        stage.replaceChildren(heading,
          h('p', {}, 'A robot abandoned checkout at the inconvenience fee. You stayed and suffered. Humanity proven.'),
          h('p', {}, 'Your $10 in imaginary money is gone. Your existential doubts remain. Use Continue when you have recovered.'));
        break;
      default: {
        const exhaustive: never = state;
        return exhaustive;
      }
    }
  }

  function refresh(): void {
    const amounts = totals(state);
    wallet.textContent = `Imaginary wallet: ${money(amounts.balanceCents)}`;
    refreshControls();
    function row(label: string, value: string, total = false): HTMLElement {
      return h('div', { class: total ? 'pt-row pt-total' : 'pt-row' }, h('dt', {}, label), h('dd', {}, value));
    }
    receipt.replaceChildren(
      h('p', { class: 'pt-receipt-heading' }, state.kind === 'paid' ? 'Receipt of probable humanity' : 'Proof of humanity'),
      h('p', { class: 'pt-price' }, '$10'),
      h('p', { class: 'pt-price-note' }, 'Base price in play money'),
      h('dl', {},
        row('One standard human', money(amounts.proofCents)),
        row('Your inconvenience fee', money(amounts.feeCents)),
        row('Premium Human', money(amounts.premiumCents)),
        row(state.kind === 'paid' ? 'Play money spent' : 'Play money total', money(amounts.totalCents), true),
        row('Real charge', '$0')),
      h('p', { class: 'pt-receipt-note' }, amounts.feeCents === 0
        ? 'Inconvenience fee covered by the merchant. A historic concession.'
        : 'The merchant would like to thank you for paying to pay.'));

    const feeError = state.kind === 'fee' && state.notice === 'insufficient';
    const premiumError = state.kind === 'review' && state.premium;
    feedback.dataset.error = String(feeError || premiumError);
    if (feeError) {
      feedback.textContent = `You are ${money(amounts.shortfallCents)} short in play money. Your imaginary wallet is insufficiently imaginary. Change who pays the fee.`;
    } else if (premiumError) {
      feedback.textContent = `Total: ${money(amounts.totalCents)} in play money. You are ${money(amounts.shortfallCents)} short. Remove premium to authorize the imaginary payment.`;
    } else if (state.kind === 'paid') {
      feedback.textContent = 'Paid with $10.00 in play money. Imaginary wallet: $0.00. Real charge: $0.';
    } else {
      feedback.textContent = `Total: ${money(amounts.totalCents)} in play money. ${amounts.shortfallCents > 0
        ? `${money(amounts.shortfallCents)} above your imaginary wallet.`
        : 'Within your imaginary wallet.'}`;
    }
  }

  function dispatch(event: Event): void {
    if (disposed || ctx.signal.aborted || state.kind === 'paid') return;
    const previous = state;
    const next = transition(previous, event);
    if (next === previous) return;
    state = next;
    if (state.kind !== previous.kind) renderStage();
    refresh();
    if (state.kind !== previous.kind) {
      stage.querySelector('h3')?.focus();
    } else if (event.kind === 'remove-premium') {
      stage.querySelector<HTMLButtonElement>('[data-action="authorize"]')?.focus();
    }
    if (next.kind === 'paid' && !disposed && !ctx.signal.aborted) ctx.succeed();
  }

  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element) || event.detail > 1) return;
    const control = event.target.closest('button');
    if (!(control instanceof HTMLButtonElement) || !root.contains(control) || control.disabled) return;
    switch (control.dataset.payer) {
      case 'you': dispatch({ kind: 'choose-payer', payer: 'you' }); return;
      case 'split': dispatch({ kind: 'choose-payer', payer: 'split' }); return;
      case 'merchant': dispatch({ kind: 'choose-payer', payer: 'merchant' }); return;
    }
    switch (control.dataset.action) {
      case 'review-fee': dispatch({ kind: 'review-fee' }); break;
      case 'add-premium': dispatch({ kind: 'choose-premium', premium: true }); break;
      case 'standard': dispatch({ kind: 'choose-premium', premium: false }); break;
      case 'remove-premium': dispatch({ kind: 'remove-premium' }); break;
      case 'edit-fee': dispatch({ kind: 'edit-fee' }); break;
      case 'authorize': dispatch({ kind: 'authorize' }); break;
    }
  }, { signal: listeners.signal });

  function cleanup(): void {
    if (disposed) return;
    disposed = true;
    listeners.abort();
    ctx.signal.removeEventListener('abort', cleanup);
    root.remove();
  }

  root.append(h('style', {}, css),
    h('header', {},
      h('div', { class: 'pt-office' }, h('strong', {}, 'Bureau of probable humanity'), h('span', {}, 'Invoice H-010')),
      h('h2', {}, 'Pay $10 to be human'),
      h('p', { class: 'pt-intro' }, 'Bots do not have credit cards. Neither do you. We gave you play money.')),
    h('div', { class: 'pt-safety' }, h('strong', {}, 'Play money only'), wallet, h('strong', {}, 'Real charge: $0')),
    h('div', { class: 'pt-layout' }, h('div', { class: 'pt-work' }, stage, feedback), receipt),
    h('p', { class: 'pt-footer' }, 'This office accepts imaginary money and very real frustration.'));
  renderStage();
  refresh();
  el.append(root);
  ctx.signal.addEventListener('abort', cleanup, { once: true });
  return cleanup;
}
