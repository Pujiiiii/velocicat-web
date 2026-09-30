import PageShell from "../../components/PageShell";
import { supabase } from "../../utils/supabase";

export const revalidate = 15;

type LiveUpdate = {
  id: number;
  event_id: number | null;
  driver_id: number | null;
  stage: string | null;
  position: number | null;
  category_position: number | null;
  time: string | null;
  gap: string | null;
  message: string | null;
  is_live: boolean;
  created_at: string;
  rally_events: { name: string } | null;
  drivers: { name: string } | null;
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

  const active = (activeResult.data || []) as unknown as LiveUpdate[];
  const recent = (recentResult.data || []) as unknown as LiveUpdate[];

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-black uppercase text-red-700">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
            En directe
          </span>
          <span className="text-sm font-bold text-gray-500">
            Actualitzat automàticament cada 15 segons
          </span>
        </div>
        <h1 className="mt-5 text-5xl font-black italic uppercase sm:text-6xl">
          Rally <span className="text-red-600">LIVE</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-gray-600">
          Seguiment de les actualitzacions publicades per l’equip durant els rallys.
        </p>

        <div className="mt-10">
          <h2 className="text-2xl font-black uppercase">En curs</h2>
          {active.length ? (
            <div className="mt-5 space-y-4">
              {active.map((item) => (
                <article key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black uppercase text-red-600">
                        {item.rally_events?.name || "Rally"}
                        {item.stage ? " · " + item.stage : ""}
                      </p>
                      <h3 className="mt-2 text-2xl font-black italic">
                        {item.drivers?.name || "VelociCAT"}
                      </h3>
                    </div>
                    <div className="flex gap-3">
                      {item.position != null && (
                        <div className="rounded-lg bg-gray-950 px-4 py-2 text-center text-white">
                          <div className="text-xs font-bold uppercase text-gray-400">General</div>
                          <div className="text-2xl font-black">P{item.position}</div>
                        </div>
                      )}
                      {item.category_position != null && (
                        <div className="rounded-lg bg-yellow-400 px-4 py-2 text-center text-gray-950">
                          <div className="text-xs font-bold uppercase">Categoria</div>
                          <div className="text-2xl font-black">P{item.category_position}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  {item.message && <p className="mt-4 whitespace-pre-wrap text-gray-700">{item.message}</p>}
                  {(item.time || item.gap) && (
                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t pt-4 text-sm font-bold text-gray-600">
                      {item.time && <span>Temps: {item.time}</span>}
                      {item.gap && <span>Diferència: {item.gap}</span>}
                    </div>
                  )}
                  <p className="mt-4 text-xs text-gray-400">
                    {new Date(item.created_at).toLocaleString("ca-ES", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Madrid" })}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border-2 border-dashed border-gray-300 p-10 text-center">
              <h3 className="text-xl font-black">Ara mateix no hi ha cap seguiment actiu</h3>
              <p className="mt-2 text-gray-500">Quan l’equip publiqui actualitzacions des del CMS, apareixeran aquí.</p>
            </div>
          )}
        </div>

        {recent.length > 0 && (
          <div className="mt-14">
            <h2 className="text-2xl font-black uppercase">Últimes actualitzacions arxivades</h2>
            <div className="mt-5 space-y-3">
              {recent.map((item) => (
                <article key={item.id} className="rounded-xl bg-gray-100 p-4">
                  <p className="font-black">{item.rally_events?.name || "Rally"}{item.stage ? " · " + item.stage : ""}</p>
                  <p className="mt-1 text-gray-700">{item.message || item.drivers?.name || "Actualització"}</p>
                  <p className="mt-2 text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleString("ca-ES", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Madrid" })}
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </PageShell>
  );
}
