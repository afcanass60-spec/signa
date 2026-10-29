/** Ouvre le portail client Stripe (gérer ou résilier son abonnement). */
import { adminClient, json, siteUrl, stripe, userFromRequest } from "@/lib/server";

export async function POST(req: Request) {
  try {
    const user = await userFromRequest(req);
    if (!user) return json({ error: "Connecte-toi d'abord." }, 401);
    const { data: profile } = await adminClient()
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();
    if (!profile?.stripe_customer_id) return json({ error: "Aucun abonnement trouvé." }, 404);

    const session = await stripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl(req)}/progression`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Erreur inconnue" }, 500);
  }
}
