import { initialState, totals, transition, WALLET_CENTS, type Event, type FeePayer, type State } from './flow.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function merchantOffer(): State {
  const fee = transition(initialState(), { kind: 'choose-payer', payer: 'merchant' });
  const offer = transition(fee, { kind: 'review-fee' });
  assert(offer.kind === 'offer', 'Merchant-covered fees must reach the offer');
  return offer;
}

function review(premium: boolean): State {
  const state = transition(merchantOffer(), { kind: 'choose-premium', premium });
  assert(state.kind === 'review', 'A premium choice must reach review');
  return state;
}

const events: Event[] = [
  { kind: 'choose-payer', payer: 'you' },
  { kind: 'choose-payer', payer: 'split' },
  { kind: 'choose-payer', payer: 'merchant' },
  { kind: 'review-fee' },
  { kind: 'choose-premium', premium: true },
  { kind: 'choose-premium', premium: false },
  { kind: 'remove-premium' },
  { kind: 'edit-fee' },
  { kind: 'authorize' },
];

const tests = [
  {
    name: 'All fee choices use exact cents and enforce the budget',
    run() {
      const initial = initialState();
      assert(initial.kind === 'fee' && initial.payer === 'you', 'The initial fee payer must be you');
      const choices: { payer: FeePayer; feeCents: number }[] = [
        { payer: 'you', feeCents: 200 },
        { payer: 'split', feeCents: 100 },
        { payer: 'merchant', feeCents: 0 },
      ];
      for (const { payer, feeCents } of choices) {
        const selected = transition(initial, { kind: 'choose-payer', payer });
        const amount = totals(selected);
        assert(amount.feeCents === feeCents, `${payer}: incorrect fee`);
        assert(amount.totalCents === 1_000 + feeCents, `${payer}: incorrect total`);
        assert(amount.shortfallCents === feeCents, `${payer}: incorrect shortfall`);
        assert(amount.balanceCents === 1_000, 'A selection must not spend money');
        const attempted = transition(selected, { kind: 'review-fee' });
        if (payer === 'merchant') {
          assert(attempted.kind === 'offer', 'An affordable fee choice must advance');
        } else {
          assert(attempted.kind === 'fee' && attempted.payer === payer, 'Over-budget review must retain the selection');
          assert(attempted.notice === 'insufficient', 'Over-budget review must expose an error');
          assert(transition(attempted, { kind: 'authorize' }) === attempted, 'An error must not enable authorization');
          const corrected = transition(attempted, { kind: 'choose-payer', payer: 'merchant' });
          assert(corrected.kind === 'fee' && corrected.notice === 'none', 'Changing the payer must clear the old error');
        }
      }
      assert(initial.kind === 'fee' && initial.payer === 'you' && initial.notice === 'none', 'Transitions must leave their input unchanged');
    },
  },
  {
    name: 'Only review can authorize, and stale actions cannot skip stages',
    run() {
      const initial = initialState();
      for (const event of events.filter((event) => event.kind !== 'choose-payer' && event.kind !== 'review-fee')) {
        assert(transition(initial, event) === initial, `Fee stage accepted ${event.kind}`);
      }
      const offer = merchantOffer();
      for (const event of events.filter((event) => event.kind !== 'choose-premium')) {
        assert(transition(offer, event) === offer, `Offer stage accepted ${event.kind}`);
      }
      const standard = review(false);
      for (const event of events.filter((event) => event.kind === 'choose-payer' || event.kind === 'choose-premium' || event.kind === 'review-fee')) {
        assert(transition(standard, event) === standard, `Review accepted stale ${event.kind}`);
      }
    },
  },
  {
    name: 'Premium blocks authorization until removed',
    run() {
      const premium = review(true);
      assert(totals(premium).premiumCents === 100 && totals(premium).totalCents === 1_100, 'Premium must cost exactly 100 cents');
      assert(totals(premium).shortfallCents === 100, 'Premium must report the exact shortfall');
      assert(transition(premium, { kind: 'authorize' }) === premium, 'Premium must block authorization');
      const standard = transition(premium, { kind: 'remove-premium' });
      assert(standard.kind === 'review' && !standard.premium, 'Removing premium must retain review');
      assert(totals(standard).totalCents === 1_000 && totals(standard).shortfallCents === 0, 'Removing premium must restore affordability');
      assert(transition(standard, { kind: 'remove-premium' }) === standard, 'Removing premium twice must be harmless');
      const paid = transition(standard, { kind: 'authorize' });
      assert(paid.kind === 'paid', 'Standard review must authorize');
      assert(totals(paid).balanceCents === 0, 'Payment must consume the imaginary wallet');
    },
  },
  {
    name: 'Editing retains merchant selection and rechecks review eligibility',
    run() {
      for (const premium of [true, false]) {
        const edited = transition(review(premium), { kind: 'edit-fee' });
        assert(edited.kind === 'fee' && edited.payer === 'merchant', 'Editing must retain the merchant selection');
        assert(transition(edited, { kind: 'authorize' }) === edited, 'Editing must revoke review authorization');
        for (const payer of ['you', 'split'] satisfies FeePayer[]) {
          const changed = transition(edited, { kind: 'choose-payer', payer });
          const blocked = transition(changed, { kind: 'review-fee' });
          assert(blocked.kind === 'fee' && blocked.notice === 'insufficient', 'An edited over-budget fee must be blocked again');
          assert(transition(blocked, { kind: 'choose-premium', premium: false }) === blocked, 'A stale offer action must not bypass the fee');
          assert(transition(blocked, { kind: 'authorize' }) === blocked, 'A stale authorization must not bypass the fee');
        }
        const reentered = transition(edited, { kind: 'review-fee' });
        assert(reentered.kind === 'offer', 'Merchant re-entry must revisit the offer');
        const upgraded = transition(reentered, { kind: 'choose-premium', premium: true });
        assert(transition(upgraded, { kind: 'authorize' }) === upgraded, 'Re-entry must recheck premium affordability');
      }
    },
  },
  {
    name: 'Paid is absorbing, including duplicate authorization and stale edits',
    run() {
      const paid = transition(review(false), { kind: 'authorize' });
      assert(paid.kind === 'paid', 'Standard review must reach paid');
      for (const event of events) {
        assert(transition(paid, event) === paid, `Paid accepted ${event.kind}`);
        assert(totals(paid).balanceCents === 0, 'Stale actions must not change the balance');
      }
      assert(totals(initialState()).balanceCents === WALLET_CENTS, 'A fresh attempt must restore its own wallet');
    },
  },
  {
    name: 'Every reachable transition preserves payment and balance invariants',
    run() {
      const queue = [initialState()];
      const visited = new Set<string>();
      let reachedPaid = false;
      for (let index = 0; index < queue.length; index += 1) {
        const current = queue[index];
        if (!current) throw new Error('Missing queued state');
        const key = JSON.stringify(current);
        if (visited.has(key)) continue;
        visited.add(key);
        for (const event of events) {
          const next = transition(current, event);
          const amount = totals(next);
          assert(Object.values(amount).every(Number.isInteger), 'All arithmetic must use integer cents');
          assert(amount.balanceCents === (next.kind === 'paid' ? 0 : 1_000), 'Only paid may consume the wallet');
          if (next.kind === 'paid' && current.kind !== 'paid') {
            reachedPaid = true;
            assert(current.kind === 'review' && !current.premium && event.kind === 'authorize', 'Only an affordable reviewed authorization may pay');
          }
          if (!visited.has(JSON.stringify(next))) queue.push(next);
        }
      }
      assert(reachedPaid, 'The complete interaction must have an achievable success condition');
    },
  },
];

for (const test of tests) {
  test.run();
  console.info(`PASS ${test.name}`);
}
console.info(`${tests.length} flow checks passed.`);
