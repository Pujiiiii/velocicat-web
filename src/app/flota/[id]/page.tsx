import { notFound } from "next/navigation";
import Link from "next/link";
import PageShell from "../../../components/PageShell";
import { supabase } from "../../../utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const carId = Number(id);
  if (!carId || isNaN(carId)) notFound();

  const { data: c } = await supabase.from("rally_cars").select("*").eq("id", carId).maybeSingle();
  if (!c) notFound();

  const { data: r } = await supabase
    .from("rally_results")
    .select("*,rally_events(name,event_type),driver:drivers!driver_id(name),copilot:drivers!copilot_id(name)")
    .eq("car_id", carId)
    .eq("published", true)
    .order("season", { ascending: false })
    .order("id", { ascending: false });

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {c.photos?.length ? (
              c.photos.map((p: string) => (
                <img
                  key={p}
                  src={p}
                  alt={c.model}
                  loading="lazy"
                  decoding="async"
                  className="h-64 w-full rounded-2xl object-cover"
                />
              ))
            ) : (
              <div className="h-64 rounded-2xl bg-gray-900" />
            )}
          </div>
          <div>
            <span className="rounded bg-red-600 px-3 py-1 text-xs font-black uppercase text-white">
              {c.fia_group}
            </span>
            <span className="ml-2 rounded bg-yellow-400 px-3 py-1 text-xs font-black uppercase text-red-700">
              {c.ownership === "particular" ? "Vehicle particular" : "Vehicle de l'escuderia"}
            </span>
            <h1 className="mt-4 text-5xl font-black italic uppercase">{c.model}</h1>

            {c.ownership === "particular" ? (
              <p className="mt-5 text-xl font-black text-gray-700">
                Vehicle particular — no disponible per lloguer.
              </p>
            ) : (
              <div className="mt-5 space-y-2">
                <p className="text-lg font-bold">Tarifes de lloguer</p>
                {c.rentable_rally !== false && (
                  <p className="text-2xl font-black">
                    {c.daily_rate}€ <span className="text-base font-medium text-gray-500">/ rally</span>
                  </p>
                )}
                {c.rentable_sprint && (
                  <p className="text-2xl font-black">
                    {c.sprint_rate ?? 0}€{" "}
                    <span className="text-base font-medium text-gray-500">
                      / rally-sprint o Pujada en costa
                    </span>
                  </p>
                )}
                {c.rentable_rally === false && !c.rentable_sprint && (
                  <p className="text-gray-600">Aquest vehicle no està disponible per lloguer.</p>
                )}
              </div>
            )}

            <p className="mt-6 text-gray-600">
              Vehicle preparat per competir i mantingut per l'equip.
            </p>

            {c.ownership !== "particular" && (
              <Link
                href="/#calendari"
                className="mt-8 inline-block rounded bg-yellow-400 px-6 py-4 font-black uppercase text-red-700 transition hover:bg-yellow-500"
              >
                Consultar reserves
              </Link>
            )}
          </div>
        </div>

        <section className="mt-16">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-3xl font-black uppercase italic">Historial de competició</h2>
              <p className="text-sm font-medium text-gray-500 mt-1">
                Resultats oficials aconseguits amb aquest vehicle
              </p>
            </div>
            {r?.length ? (
              <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-black uppercase text-red-700">
                {r.length} {r.length === 1 ? "resultat" : "resultats"}
              </span>
            ) : null}
          </div>

          <div className="mt-6 space-y-4">
            {r?.length ? (
              r.map((x: any) => (
                <div
                  key={x.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-wrap justify-between items-center gap-4 transition hover:border-gray-300 hover:shadow-md"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-yellow-500 bg-gray-950 px-2 py-0.5 rounded">
                        Temporada {x.season}
                      </span>
                      {x.rally_events?.event_type && (
                        <span className="text-xs font-bold uppercase text-gray-500">
                          {x.rally_events.event_type === "rally_sprint"
                            ? "Rally-sprint"
                            : x.rally_events.event_type === "pujada_costa"
                            ? "Pujada en costa"
                            : "Rally"}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-black italic uppercase text-gray-900">
                      {x.rally_events?.name || "Rally"}
                    </h3>
                    <p className="text-sm text-gray-600 font-medium">
                      Pilot: <span className="font-bold text-gray-900">{x.driver?.name || "VelociCAT"}</span>
                      {x.copilot?.name && (
                        <span> · Copilot: <span className="font-bold text-gray-900">{x.copilot.name}</span></span>
                      )}
                      {x.category && <span> · Categoria: <span className="font-bold">{x.category}</span></span>}
                    </p>
                    {(x.time || x.gap) && (
                      <p className="text-xs font-mono font-bold text-gray-600">
                        ⏱️ Temps: {x.time || "—"}{x.gap ? ` · Dif: ${x.gap}` : ""}
                      </p>
                    )}
                    {x.summary && <p className="text-sm text-gray-500 italic pt-1">{x.summary}</p>}
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-red-600">
                      {x.status === "dnf"
                        ? "DNF"
                        : x.status === "dsq"
                        ? "DSQ"
                        : x.status === "dns"
                        ? "DNS"
                        : x.category_position
                        ? "P" + x.category_position
                        : "Classificat"}
                    </span>
                    {x.overall_position && (
                      <span className="block text-xs font-bold text-gray-500 uppercase mt-0.5">
                        P{x.overall_position} general
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                <p className="text-gray-500 font-bold">Encara no hi ha resultats publicats per a aquest vehicle.</p>
                <p className="text-xs text-gray-400 mt-1">Els resultats que s'introdueixin al panell d'administració apareixeran aquí automàticament.</p>
              </div>
            )}
          </div>
        </section>
      </section>
    </PageShell>
  );
}