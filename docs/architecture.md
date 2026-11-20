# Architecture

Implementation contract. Deployment status and remaining verification live in [maintainers](maintainers.md).

## Pieces

- `site/`: trusted static Vite/TypeScript gallery, based on design C. No contestant framework requirement.
- `submissions/<id>/`: manifest, entry module and local assets. Stable ID equals directory name.
- `sdk/index.d.ts`: mount context, callbacks and cleanup interface.
- `play/`: shared instruction, mount area, Continue, success/reset and capability helpers.
- `template/ts/`, `template/js/`: copyable neutral wiring.
- `fixtures/`: neutral test entries, excluded from normal builds and the public index.
- `scripts/`: validation, build, local preview, browser proof and static publishing.
- `convex/`: Auth v2, GitHub identity, votes, aggregate rankings and private moderation.
- `.github/`: CI, protected publishing, cleanup, metadata refresh, templates and code ownership.

Node 24, bun only. `validate`, `typecheck`, `test`, `build` are deterministic without hosted credentials. `build:play -- --include-fixtures` includes test fixtures when invoked directly as `node scripts/build-play.ts --include-fixtures`.

## Entry contract

Strict manifest: id, title, description, author.github, entry, capabilities, optional layout, concept.action/sequence/difficulty/success. Review status and rankings never come from it. TypeScript, JavaScript and MJS entries work. Approved packages have pinned versions; filesystem input boundaries are enforced during bundling. Source scanning is not a security proof.

Entry exports `mount(element, ctx)` (default or named). It can return cleanup, synchronously or asynchronously. `ctx` supplies theme, declared capabilities, muted state, abort signal, theme/mute subscriptions, setState, succeed and requestLayout. Declared camera/microphone helpers track and stop streams. Reset cleans up then mounts afresh. Continue requires succeed and performs teardown before the success view.

The parent provides Reset, Exit and cooperative Mute. Exit removes the iframe. No iframe code receives auth data.

## Isolation

Production publishes **one static Worker per entry**, plus a gallery Worker. Separate origins prevent entry-to-entry storage and DOM access. Published entry headers apply CSP sandbox to direct visits too. Each iframe uses `sandbox="allow-scripts allow-same-origin"` only across the origin boundary. Capability delegation is explicit, never universal. Network connections and nested frames are blocked by CSP. Browser permissions remain authoritative.

Messages are versioned `{v:1,type,...}`. Frame→parent: ready, state, success, layout, capability-denied. Parent→frame: theme, mute, reset. The parent verifies source, origin and shape; layout is clamped. No vote, token or navigation message exists.

## Data and votes

`dist/site/data/index.json` contains sanitized trusted metadata. Accepted status comes from main. Pre-review metadata is read through GitHub's API without executing PR code. `data/config.json`, written by publishing, contains the per-entry origin map and whether voting is enabled. The gallery refuses same-origin or missing play hosts.

Auth uses Convex Auth v2's GitHub integration and its live-session lookup. The user table stores the verified numeric GitHub ID; public account creation time is fetched server-side. Votes are serialized in a Convex mutation with an indexed `(userId,submissionId)` lookup. Same-direction repeats are no-ops. Removal leaves a tombstone so first-vote activity cannot be reset. Rate windows are bounded arrays on account rows. Moderation fixes counters and daily aggregates atomically and records an audit event.

Top is the 95% Wilson lower bound. Trending uses active votes first cast in the current or six previous UTC days, minimum three voters. Per-entry daily buckets avoid vote scans; ranking responses paginate by 50. Gallery refresh cadence is ten minutes. Recent and Unrated provide another route to new entries. Accepted and pre-review are separate.

## Pipeline

`CI`: public fork code, read-only token, no secrets, no caches. On PRs it runs on review submission and first requires CodeRabbit's latest verdict on the head commit to be an approval. The gate fails rather than skips, because a skipped `checks` job would satisfy the required check. Validate/typecheck/test/build and upload static play assets.

`Publish authorized fork preview`: runs automatically from main after a successful CodeRabbit-gated CI run, or by maintainer dispatch. An unprivileged job finds the open single-entry PR for that head. Then, in the preview environment, it checks out only main, verifies the PR contains one entry and no infrastructure changes, verifies CodeRabbit approved the current head, finds successful CI for its current head/repository, downloads that artifact by ID and validates paths/types/sizes/no symlinks/no hosting config. Build the gallery from main with auth disabled. Upload only static assets and comment a commit-specific preview link. Never execute artifact code in a privileged job.

`Deploy production`: reviewed main build, credentials supplied only to the publish step. `Refresh pre-review metadata`: twice hourly, gallery-only build. `Clean closed previews`: nightly, removes only names matching the preview convention for closed PRs. All publishing stays disabled until hosting is configured.
