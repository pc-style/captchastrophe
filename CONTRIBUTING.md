# Make a terrible captcha

Bring a premise. Keep the site around it pleasant. Read the [rules](docs/rules.md).

1. Fork `pc-style/captchastrophe`, clone your fork and make a branch.
2. Copy `template/ts/` or `template/js/` to `submissions/<your-id>/`. Set the manifest ID to that directory name and fill in the concept and attribution. The starter is neutral wiring, not an entry idea.
3. Check accepted submissions and open PRs, including drafts. Compare interactions, not titles. Agents: use [no-repeats](.agents/skills/no-repeats/SKILL.md).
4. Implement the [mount interface](sdk/README.md). Keep changes inside your directory. Ask for new packages through the dependency issue template.
5. Build and play locally. Get someone to actually try it. Run [break-it](.agents/skills/break-it/SKILL.md), [not-annoying-enough](.agents/skills/not-annoying-enough/SKILL.md) and [preflight](.agents/skills/preflight/SKILL.md).
6. Inspect your diff, commit your entry, push your branch and open one PR against `main`. Use the PR template. [submit](.agents/skills/submit/SKILL.md) covers checks and feedback.

```sh
bun install --frozen-lockfile
node scripts/dev-play.ts your-id
# In another terminal, after playing:
bun run validate
bun run typecheck
bun run test
bun run build
```

Use Node 24. No npx. Bunx is allowed. TS and plain JS both work; the shell doesn't pick your interaction framework for you.

PR CI starts when CodeRabbit approves the current head commit. Until then `checks` stays pending or shows "Waiting for CodeRabbit". After you push fixes, wait for CodeRabbit to review the new commit; comment `@coderabbitai review` if it doesn't. CodeRabbit's approval only unlocks CI. A human accepts entries.

Once CI passes, single-entry PRs get a fork preview automatically. A maintainer can also trigger the same workflow by hand. It checks for CodeRabbit approval, validates the current successful CI artifact and publishes only static assets. Hosting access must be configured first; a passing build is not a hosted preview. Never post a fake preview link.
