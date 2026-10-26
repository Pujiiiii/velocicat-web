import type { Metadata } from "next";
import PageShell from "../../components/PageShell";
import LiveFeedClient, { LiveItem } from "../../components/LiveFeedClient";
import { supabase } from "../../utils/supabase";

export const revalidate = 15;

export const metadata: Metadata = {
  title: "Rally LIVE en Directe | VelociCAT Racing Team",
  description:
    "Seguiment en directe dels temps, trams i posicions de VelociCAT Racing Team a les proves del Campionat de Catalunya de Ral·lis. S'actualitza automàticament.",
  alternates: { canonical: "/live" },
  openGraph: {
    title: "Rally LIVE en Directe | VelociCAT",
    description: "Temps tram a tram i posicions oficials en viu de l'equip VelociCAT Racing Team.",
  },
};

export default async function LivePage() {
  const [activeResult, recentResult] = await Promise.all([
    supabase
      .from("live_updates")
      .select("*,rally_events(name),drivers(name)")
      .eq("is_live", true)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("live_updates")
      .select("*,rally_events(name),drivers(name)")
      .eq("is_live", false)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const initialActive = (activeResult.data || []) as unknown as LiveItem[];
  const initialRecent = (recentResult.data || []) as unknown as LiveItem[];

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-black uppercase text-red-700">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
              En directe
            </span>
            <span className="text-sm font-bold text-gray-500">
              Cronometratge i seguiment oficial
            </span>
          </div>
          <h1 className="mt-5 text-5xl font-black italic uppercase sm:text-6xl text-gray-900">
            Rally <span className="text-red-600">LIVE</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-600">
            Seguiment en temps real de les etapes i trams disputats per l'equip VelociCAT. La informació es refresca automàticament sense necessitat de recarregar la pàgina.
          </p>
        </div>

        <div className="mt-10">
          <LiveFeedClient initialActive={initialActive} initialRecent={initialRecent} />
        </div>
      </section>
    </PageShell>
  );
}
