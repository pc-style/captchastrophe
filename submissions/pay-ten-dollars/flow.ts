export const WALLET_CENTS = 1_000;
export const PROOF_CENTS = 1_000;
export const INCONVENIENCE_FEE_CENTS = 200;
export const PREMIUM_CENTS = 100;

export type FeePayer = 'you' | 'split' | 'merchant';

export type State =
  | { readonly kind: 'fee'; readonly payer: FeePayer; readonly notice: 'none' | 'insufficient' }
  | { readonly kind: 'offer'; readonly payer: 'merchant' }
  | { readonly kind: 'review'; readonly payer: 'merchant'; readonly premium: boolean }
  | { readonly kind: 'paid' };

export type Event =
  | { readonly kind: 'choose-payer'; readonly payer: FeePayer }
  | { readonly kind: 'review-fee' }
  | { readonly kind: 'choose-premium'; readonly premium: boolean }
  | { readonly kind: 'remove-premium' }
  | { readonly kind: 'edit-fee' }
  | { readonly kind: 'authorize' };

export function initialState(): State {
  return { kind: 'fee', payer: 'you', notice: 'none' };
}

function inconvenienceCents(payer: FeePayer): number {
  switch (payer) {
    case 'you':
      return INCONVENIENCE_FEE_CENTS;
    case 'split':
      return INCONVENIENCE_FEE_CENTS / 2;
    case 'merchant':
      return 0;
    default: {
      const exhaustive: never = payer;
      return exhaustive;
    }
  }
}

export function totals(state: State) {
  const feeCents = state.kind === 'fee' ? inconvenienceCents(state.payer) : 0;
  const premiumCents = state.kind === 'review' && state.premium ? PREMIUM_CENTS : 0;
  const totalCents = PROOF_CENTS + feeCents + premiumCents;
  const balanceCents = state.kind === 'paid' ? WALLET_CENTS - totalCents : WALLET_CENTS;
  const shortfallCents = state.kind === 'paid' ? 0 : Math.max(0, totalCents - balanceCents);
  return { proofCents: PROOF_CENTS, feeCents, premiumCents, totalCents, balanceCents, shortfallCents };
}

export function transition(state: State, event: Event): State {
  switch (state.kind) {
    case 'fee':
      if (event.kind === 'choose-payer') {
        return { kind: 'fee', payer: event.payer, notice: 'none' };
      }
      if (event.kind === 'review-fee') {
        if (state.payer === 'merchant' && totals(state).shortfallCents === 0) {
          return { kind: 'offer', payer: 'merchant' };
        }
        return { ...state, notice: 'insufficient' };
      }
      return state;
    case 'offer':
      return event.kind === 'choose-premium'
        ? { kind: 'review', payer: state.payer, premium: event.premium }
        : state;
    case 'review':
      if (event.kind === 'edit-fee') {
        return { kind: 'fee', payer: state.payer, notice: 'none' };
      }
      if (event.kind === 'remove-premium' && state.premium) {
        return { ...state, premium: false };
      }
      if (event.kind === 'authorize' && totals(state).totalCents === WALLET_CENTS) {
        return { kind: 'paid' };
      }
      return state;
    case 'paid':
      return state;
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}
