/**
 * Webhook Stripe : c'est la SEULE source de vérité pour le statut Premium.
 * On ne fait jamais confiance au navigateur pour dire « j'ai payé ».
 *
 * Événements à activer dans Stripe :
 *   checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
 */
import type Stripe from "stripe";
import { adminClient, json, stripe } from "@/lib/server";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return json({ error: "Webhook non configuré" }, 400);

  let event: Stripe.Event;
  try {
    // le corps brut est indispensable pour vérifier la signature
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch (e) {
    return json({ error: `Signature invalide : ${e instanceof Error ? e.message : e}` }, 400);
  }

  const db = adminClient();

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    const userId = s.client_reference_id ?? s.metadata?.user_id;
    if (userId) {
      const { error } = await db
        .from("profiles")
        .update({ is_premium: true, stripe_customer_id: typeof s.customer === "string" ? s.customer : s.customer?.id })
        .eq("id", userId);
      if (error) return json({ error: error.message }, 500); // Stripe réessaiera
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const active = event.type === "customer.subscription.updated" && ["active", "trialing", "past_due"].includes(sub.status);
    const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const { error } = await db.from("profiles").update({ is_premium: active }).eq("stripe_customer_id", customer);
    if (error) return json({ error: error.message }, 500);
  }

  return json({ received: true });
}
