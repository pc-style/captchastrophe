# Pay $10 to be human

A fake institutional checkout gives you ten imaginary dollars and asks you to spend all of them proving your humanity. Negotiate an inconvenience fee, consider Premium Human, and review the receipt before authorizing the play money payment.

Created by Chaitanya Swaroop. GitHub attribution: mgamergo.

## Controls

Use the native buttons with a pointer or Tab, Enter, and Space. Selected fee buttons show a checkmark and expose their pressed state.

1. Choose **You pay**, **Split it**, or **Merchant pays**. The itemized receipt updates immediately.
2. Select **Review play money total**. An over-budget choice stays on the fee screen and reports the exact shortfall.
3. Select **Add premium (+$1.00 play money)** or **Remain standard human**.
4. Review the total. **Remove premium** makes an upgraded order affordable. **Edit fee payer** returns to the fee choices and checks the budget again.
5. Select **Authorize $10.00 in play money** when the reviewed total fits the wallet. The receipt appears and the shell enables Continue.

Stage changes focus the new heading. Totals and errors use a persistent polite status region. The outer shell owns Continue, Reset, Exit, theme, and mute controls.

## Payment and lifecycle

Play money only. Real charge: $0. No payment service, card fields, credentials, free-text inputs, external links, network calls, persistence, audio, or requested browser capabilities are used.

`flow.ts` owns pure state transitions and integer-cent totals. `entry.ts` owns the mounted DOM and scoped CSS. Only a reviewed total of 1,000 imaginary cents can enter the absorbing paid state. The mount commits that state before signaling success. Duplicate and stale actions cannot spend again.

An aborted mount adds no contents. Abort and returned cleanup remove the owned DOM, styles, and event listener. Cleanup is idempotent. Reset creates an independent wallet. Inherited shell tokens and scoped dark-theme selectors react to live theme changes without subscriptions.

## Local commands

Run from the repository root with Node 24 and the locked Bun toolchain. Install dependencies with `bun install --frozen-lockfile` if needed.

Start the local entry:

```sh
node scripts/dev-play.ts pay-ten-dollars
```

Open the printed URL and select Launch. Restart the local server after source changes. Stop it when finished.

Run the focused checks:

```sh
bun run validate
bunx --no-install tsc --ignoreConfig --target ES2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --noEmit --strict --lib es2023,dom,dom.iterable --skipLibCheck submissions/pay-ten-dollars/entry.ts submissions/pay-ten-dollars/flow.ts submissions/pay-ten-dollars/flow.test.ts submissions/pay-ten-dollars/mount.test.ts
bun submissions/pay-ten-dollars/flow.test.ts
```

The explicit typecheck includes this directory because the root TypeScript configuration excludes submissions. The self-running flow checks use original assertion code and import only `./flow.ts`. They cover fee choices, exact shortfalls, premium removal, editing and re-entry, premature authorization, repeated authorization, and the absorbing paid state.

The full repository checks before submission are:

```sh
bun run typecheck
bun run test
bun run build
```

Browser verification must also cover light and dark themes, keyboard focus and announcements, narrow layouts, success, reset, rapid reset, abort, exit, and cleanup. Flow tests alone do not establish those behaviors. Human playtest pending.

The mounted browser regressions also use the existing tools. With the local server running, bundle them:

```sh
bunx --no-install esbuild submissions/pay-ten-dollars/mount.test.ts --bundle --format=esm --platform=browser --outfile=.dev-play/mount-tests.js
```

Open `http://127.0.0.1:5174`, then run this in its browser console:

```js
await import("/mount-tests.js").then(module => module.runMountChecks())
```

The seven checks exercise pointer double-click review protection, synchronous focus reentrancy, an already-aborted mount, stale controls after cleanup and abort, abort during success, and independent mounted wallets. They use the real mounted DOM and throw on a failed assertion.
