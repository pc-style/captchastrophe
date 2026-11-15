import mount from './entry.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function fixture(onSuccess?: (controller: AbortController) => void) {
  const host = document.createElement('div');
  document.body.append(host);
  const controller = new AbortController();
  let calls = 0;
  const cleanup = mount(host, {
    signal: controller.signal,
    succeed() { calls += 1; onSuccess?.(controller); },
  });
  function button(selector: string): HTMLButtonElement {
    const result = host.querySelector(selector);
    assert(result instanceof HTMLButtonElement, `Missing button ${selector}`);
    return result;
  }
  return {
    host, controller, cleanup, button,
    click(selector: string) { button(selector).click(); },
    calls() { return calls; },
    remove() { cleanup(); host.remove(); },
  };
}

function toReview(test: ReturnType<typeof fixture>): void {
  test.click('[data-payer="merchant"]');
  test.click('[data-action="review-fee"]');
  test.click('[data-action="standard"]');
}

export function runMountChecks(): string[] {
  const passed: string[] = [];
  const reentrant = fixture();
  try {
    let activated = false;
    reentrant.host.addEventListener('focusin', (event) => {
      if (!activated && event.target instanceof HTMLElement && event.target.textContent === 'Review your imaginary payment') {
        activated = true;
        reentrant.click('[data-action="authorize"]');
      }
    });
    toReview(reentrant);
    assert(activated && reentrant.calls() === 1, 'Synchronous focus reentrancy must signal success exactly once');
    passed.push('Synchronous focus reentrancy signals once');
  } finally { reentrant.remove(); }

  const doubleClick = fixture();
  try {
    doubleClick.click('[data-payer="merchant"]');
    doubleClick.click('[data-action="review-fee"]');
    doubleClick.button('[data-action="standard"]').dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    doubleClick.button('[data-action="authorize"]').dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }));
    assert(doubleClick.calls() === 0, 'A continued pointer double-click must not authorize the replacement review button');
    assert(!doubleClick.button('[data-action="authorize"]').disabled, 'Review must remain ready for a deliberate authorization');
    doubleClick.click('[data-action="authorize"]');
    assert(doubleClick.calls() === 1, 'A separate activation must still authorize');
    passed.push('Pointer double-click cannot skip review');
  } finally { doubleClick.remove(); }

  const abortedHost = document.createElement('div');
  const aborted = new AbortController();
  aborted.abort();
  let abortedCalls = 0;
  const abortedCleanup = mount(abortedHost, { signal: aborted.signal, succeed() { abortedCalls += 1; } });
  abortedCleanup();
  abortedCleanup();
  assert(abortedHost.childElementCount === 0 && abortedCalls === 0, 'An already-aborted mount must stay empty and never succeed');
  passed.push('Already-aborted mount stays empty');

  for (const mode of ['cleanup', 'abort']) {
    const test = fixture();
    try {
      toReview(test);
      const stale = test.button('[data-action="authorize"]');
      if (mode === 'cleanup') { test.cleanup(); test.cleanup(); } else { test.controller.abort(); }
      stale.click();
      assert(test.calls() === 0 && test.host.childElementCount === 0, `${mode} must remove DOM and deactivate stale controls`);
      passed.push(`${mode} removes DOM and deactivates stale controls`);
    } finally { test.remove(); }
  }

  const successAbort = fixture(controller => controller.abort());
  try {
    toReview(successAbort);
    successAbort.click('[data-action="authorize"]');
    assert(successAbort.calls() === 1 && successAbort.host.childElementCount === 0, 'Reentrant abort from succeed must be safe');
    passed.push('Abort from success callback is safe');
  } finally { successAbort.remove(); }

  const first = fixture();
  const second = fixture();
  try {
    toReview(first);
    first.click('[data-action="authorize"]');
    assert(first.calls() === 1 && first.host.querySelector('.pt-safety')?.textContent?.includes('wallet: $0.00'), 'The paid wallet must be empty');
    assert(second.calls() === 0 && second.host.querySelector('.pt-safety')?.textContent?.includes('wallet: $10.00'), 'A second mount must retain an independent full wallet');
    passed.push('Mounted attempts own independent wallets');
  } finally { first.remove(); second.remove(); }
  return passed;
}
