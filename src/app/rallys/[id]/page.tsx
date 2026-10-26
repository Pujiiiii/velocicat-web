import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import PageShell from "../../../components/PageShell";
import { supabase } from "../../../utils/supabase";

export const revalidate = 15;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const eventId = Number(id);
  if (!eventId || isNaN(eventId)) return { title: "Ral·li no trobat" };

  const { data: e } = await supabase.from("rally_events").select("*").eq("id", eventId).maybeSingle();
  if (!e) return { title: "Ral·li no trobat" };

  const year = e.start_date ? new Date(e.start_date).getFullYear() : "";
  const title = `${e.name} ${year} | Calendari i Resultats VelociCAT`;
  const description = `Tota la informació, temps en directe i resultats oficials de ${e.name} amb VelociCAT Racing Team.`;

  return {
    title,
    description,
    alternates: { canonical: `/rallys/${eventId}` },
    openGraph: {
      type: "website",
      title,
      description,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const eventId = Number(id);
  if (!eventId || isNaN(eventId)) notFound();

  const { data: e } = await supabase.from("rally_events").select("*").eq("id", eventId).maybeSingle();
  if (!e) notFound();

  const [{ data: live }, { data: r }] = await Promise.all([
    supabase
      .from("live_updates")
      .select("*,drivers(name,number)")
      .eq("event_id", eventId)
      .eq("is_live", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("rally_results")
      .select("*,driver:drivers!driver_id(name),copilot:drivers!copilot_id(name),rally_cars(model)")
      .eq("event_id", eventId)
      .eq("published", true)
      .order("category_position", { ascending: true }),
  ]);

  const eventTypeLabel =
    e.event_type === "rally_sprint"
      ? "Rally-sprint"
      : e.event_type === "pujada_costa"
      ? "Pujada en costa"
      : "Rally";

  return (
    <PageShell>
      <section className="bg-gray-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-yellow-400 px-3 py-1 text-xs font-black uppercase text-red-950">
              {eventTypeLabel}
            </span>
            {e.championship && (
              <span className="rounded bg-gray-800 px-3 py-1 text-xs font-bold uppercase text-gray-300">
                {e.championship}
              </span>
            )}
          </div>
          <h1 className="mt-3 text-5xl font-black italic uppercase sm:text-6xl">{e.name}</h1>
          <p className="mt-4 text-xl text-gray-400 font-medium">
            {new Date(e.start_date).toLocaleDateString("ca-ES", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {e.end_date && e.end_date !== e.start_date && (
              <>
                {" — "}
                {new Date(e.end_date).toLocaleDateString("ca-ES", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </>
            )}
            {e.location ? ` · ${e.location}` : ""}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Secció En Directe */}
          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 items-center justify-center">
                  <span className="h-2.5 w-2.5 animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-red-600" />
                </span>
                <h2 className="text-2xl font-black uppercase italic text-gray-900">En directe</h2>
              </div>
              <Link
                href="/live"
                className="text-xs font-black uppercase text-red-600 hover:underline"
              >
                Veure tot el Live &rarr;
              </Link>
            </div>

            {live?.length ? (
              <div className="mt-5 space-y-3">
                {live.map((u: any) => (
                  <div
                    key={u.id}
                    className="rounded-xl bg-gray-950 p-4 text-white shadow transition hover:bg-gray-900"
                  >
                    <div className="flex items-center justify-between font-black">
                      <span className="text-yellow-400">
                        {u.stage || "Tram"} · {u.drivers?.name || "VelociCAT"}
                      </span>
                      {u.position != null && (
                        <span className="rounded bg-red-600 px-2 py-0.5 text-xs text-white">
                          P{u.position}
                        </span>
                      )}
                    </div>
                    {(u.time || u.gap || u.message) && (
                      <p className="mt-2 text-sm text-gray-300">
                        {u.time && <span className="font-mono font-bold">⏱️ {u.time}</span>}
                        {u.gap && <span className="font-mono text-gray-400"> (dif: {u.gap})</span>}
                        {u.message && <span className="block mt-1 text-gray-300">{u.message}</span>}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                <p className="text-gray-500 font-bold">El seguiment en directe s'activarà durant la prova.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Les actualitzacions de temps tram a tram es publicaran automàticament aquí.
                </p>
              </div>
            )}
          </div>

          {/* Secció Resultats */}
          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-2xl font-black uppercase italic text-gray-900">Resultats</h2>
              {r?.length ? (
                <span className="rounded-full bg-yellow-400 px-2.5 py-0.5 text-xs font-black uppercase text-red-800">
                  {r.length} {r.length === 1 ? "pilot" : "pilots"}
                </span>
              ) : null}
            </div>

            {r?.length ? (
              <div className="mt-5 space-y-3">
                {r.map((x: any) => (
                  <div
                    key={x.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-4 border border-gray-200"
                  >
                    <div>
                      <p className="font-black text-gray-900">
                        {x.driver?.name || "VelociCAT"}
                        {x.copilot?.name ? ` / ${x.copilot.name}` : ""}
                      </p>
                      <p className="text-xs font-bold text-gray-500">
                        {x.rally_cars?.model || ""}
                        {x.category ? ` · Categoria ${x.category}` : ""}
                      </p>
                      {x.time && (
                        <p className="mt-1 text-xs font-mono font-bold text-gray-600">
                          ⏱️ {x.time} {x.gap ? `· Dif: ${x.gap}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-red-600">
                        {x.status === "dnf"
                          ? "DNF"
                          : x.status === "dsq"
                          ? "DSQ"
                          : x.category_position
                          ? `P${x.category_position}`
                          : "Classificat"}
                      </span>
                      {x.overall_position && (
                        <span className="block text-xs font-bold uppercase text-gray-500">
                          P{x.overall_position} general
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                <p className="text-gray-500 font-bold">Els resultats oficials apareixeran un cop finalitzada la prova.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-4">
          <Link
            href="/contacte"
            className="rounded-xl bg-red-600 px-6 py-3.5 font-black uppercase text-white shadow-md transition hover:bg-red-700"
          >
            Contactar amb l'equip
          </Link>
          <Link
            href="/#calendari"
            className="rounded-xl bg-gray-200 px-6 py-3.5 font-black uppercase text-gray-800 transition hover:bg-gray-300"
          >
            &larr; Tornar al calendari
          </Link>
        </div>
      </section>
    </PageShell>
  );
}