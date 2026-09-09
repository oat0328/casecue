import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { validatePromo, applyPromoPricing, BASE_PRICE } from "../../shared/promoValidation.ts";

// Buyer-facing promo code check (shown at checkout BEFORE redirecting to Wix).
// Preview only — create-checkout re-validates and enforces the price server-side.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (_) {
      user = null;
    }

    const body = await req.json().catch(() => ({}));
    const check = await validatePromo(base44, String(body.code || ''), user);
    if (!check.ok) {
      return Response.json({ valid: false, reason: check.reason });
    }

    const promo = check.promo;

    // Interest tracking (best-effort) for the conversion-rate metric.
    try {
      await base44.asServiceRole.entities.PromoCode.update(promo.id, {
        validation_count: (Number(promo.validation_count) || 0) + 1,
      });
    } catch (_) { /* non-fatal */ }

    const pricing = applyPromoPricing(promo, BASE_PRICE);
    const v = Number(promo.value) || 0;
    let discountLabel = 'Discount';
    let amountSaved = '—';
    let finalLabel = `$${pricing.finalPrice.toFixed(2)}/mo`;
    if (promo.discount_type === 'percent_off') {
      discountLabel = `${v}% off every month`;
      amountSaved = `$${(BASE_PRICE - pricing.finalPrice).toFixed(2)}/mo saved`;
    } else if (promo.discount_type === 'fixed_off') {
      discountLabel = `$${v.toFixed(2)} off every month`;
      amountSaved = `$${(BASE_PRICE - pricing.finalPrice).toFixed(2)}/mo saved`;
    } else if (promo.discount_type === 'first_month_free') {
      discountLabel = 'First month free';
      amountSaved = `$${BASE_PRICE.toFixed(2)} (first month)`;
      finalLabel = `$${BASE_PRICE.toFixed(2)}/mo after`;
    } else if (promo.discount_type === 'months_free') {
      const months = Math.max(1, v);
      discountLabel = `First ${months} months free`;
      amountSaved = `$${(BASE_PRICE * months).toFixed(2)} (first ${months} months)`;
      finalLabel = `$${BASE_PRICE.toFixed(2)}/mo after`;
    } else if (promo.discount_type === 'trial_extension') {
      discountLabel = `${14 + v}-day free trial`;
      amountSaved = `${v} extra free days`;
      finalLabel = `$${BASE_PRICE.toFixed(2)}/mo after`;
    }

    return Response.json({
      valid: true,
      promo: {
        code: promo.code,
        description: promo.description || '',
        discount_type: promo.discount_type,
        value: promo.value,
        founding_member: !!promo.founding_member,
        beta_tester: !!promo.beta_tester,
      },
      breakdown: {
        original_price: `$${BASE_PRICE.toFixed(2)}/mo`,
        discount_label: discountLabel,
        amount_saved: amountSaved,
        final_price: finalLabel,
        billing_note: pricing.billingNote
          ? `${pricing.billingNote} Billed as shown on the checkout page. Cancel anytime.`
          : 'Billed as shown on the checkout page. Cancel anytime.',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}