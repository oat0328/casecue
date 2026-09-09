// Shared promo-code validation + pricing. Used by BOTH validatePromoCode
// (buyer-facing preview) and create-checkout (server-side enforcement).
// The checkout re-validates at session creation — the client's "applied"
// state is never trusted for pricing.

export const BASE_PRICE = 24.99;

export async function validatePromo(base44, codeRaw, appUser) {
  const code = String(codeRaw || '').trim().toUpperCase();
  if (!code) return { ok: false, reason: 'Enter a promo code', promo: null };

  const found = await base44.asServiceRole.entities.PromoCode.filter({ code });
  const promo = (found || [])[0];
  if (!promo || !promo.active) return { ok: false, reason: 'Promo code not found or inactive', promo: null };

  const today = new Date().toISOString().slice(0, 10);
  if (promo.start_date && String(promo.start_date) > today) {
    return { ok: false, reason: "This promo code hasn't started yet", promo: null };
  }
  if (promo.expiration_date && String(promo.expiration_date) < today) {
    return { ok: false, reason: 'This promo code has expired', promo: null };
  }
  if (Number(promo.max_uses) > 0 && (promo.redemptions || []).length >= Number(promo.max_uses)) {
    return { ok: false, reason: 'This promo code has reached its usage limit', promo: null };
  }
  if (promo.single_use_per_user && appUser && (promo.redemptions || []).some((r) => r.user_id === appUser.id)) {
    return { ok: false, reason: "You've already used this promo code", promo: null };
  }
  const domains = (promo.allowed_email_domains || []).map((d) => String(d).toLowerCase().replace(/^@/, ''));
  if (domains.length && (!appUser?.email || !domains.some((d) => appUser.email.toLowerCase().endsWith('@' + d)))) {
    return { ok: false, reason: "Your email isn't eligible for this promo code", promo: null };
  }
  const invites = (promo.invite_emails || []).map((e) => String(e).toLowerCase());
  if (invites.length && (!appUser?.email || !invites.includes(appUser.email.toLowerCase()))) {
    return { ok: false, reason: 'This promo code is invite-only', promo: null };
  }
  return { ok: true, reason: '', promo };
}

export function applyPromoPricing(promo, basePrice) {
  let finalPrice = basePrice;
  let trialPeriod = { frequency: 'DAY', interval: 14 };
  let billingNote = '';
  if (!promo) return { finalPrice, trialPeriod, billingNote };

  const v = Number(promo.value) || 0;
  if (promo.discount_type === 'percent_off') {
    finalPrice = basePrice * (1 - v / 100);
    billingNote = `${v}% off every month.`;
  } else if (promo.discount_type === 'fixed_off') {
    finalPrice = basePrice - v;
    billingNote = `$${v.toFixed(2)} off every month.`;
  } else if (promo.discount_type === 'first_month_free') {
    trialPeriod = { frequency: 'MONTH', interval: 1 };
    billingNote = 'First month free.';
  } else if (promo.discount_type === 'months_free') {
    const months = Math.max(1, v);
    trialPeriod = { frequency: 'MONTH', interval: months };
    billingNote = `First ${months} months free.`;
  } else if (promo.discount_type === 'trial_extension') {
    trialPeriod = { frequency: 'DAY', interval: 14 + v };
    billingNote = `${14 + v}-day free trial.`;
  }
  if (finalPrice < 0.5) finalPrice = 0.5; // Wix rejects charges under 0.50
  return { finalPrice, trialPeriod, billingNote };
}