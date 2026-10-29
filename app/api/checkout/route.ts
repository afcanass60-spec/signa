/** Crée une session de paiement Stripe pour l'abonnement Premium. */
import { adminClient, json, siteUrl, stripe, userFromRequest } from "@/lib/server";

export async function POST(req: Request) {
  try {
    const user = await userFromRequest(req);
    if (!user) return json({ error: "Connecte-toi pour t'abonner." }, 401);
    const price = process.env.STRIPE_PRICE_ID;
    if (!price) return json({ error: "STRIPE_PRICE_ID manquant dans la configuration." }, 500);

    const { data: profile } = await adminClient()
      .from("profiles")
      .select("stripe_customer_id, is_premium")
      .eq("id", user.id)
      .single();
    if (profile?.is_premium) return json({ error: "Tu es déjà abonné." }, 400);

    const base = siteUrl(req);
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
      ...(profile?.stripe_customer_id ? { customer: profile.stripe_customer_id } : { customer_email: user.email }),
      allow_promotion_codes: true,
      success_url: `${base}/progression?abonnement=ok`,
      cancel_url: `${base}/tarifs`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Erreur inconnue" }, 500);
  }
}
