import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import PageShell from "../../../components/PageShell";
import { supabase } from "../../../utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const carId = Number(id);
  if (!carId || isNaN(carId)) return { title: "Vehicle no trobat" };

  const { data: c } = await supabase.from("rally_cars").select("*").eq("id", carId).maybeSingle();
  if (!c) return { title: "Vehicle no trobat" };

  const title = `${c.model} (${c.fia_group}) | Flota VelociCAT`;
  const description =
    c.ownership === "particular"
      ? `${c.model} - Vehicle particular de competició de l'equip VelociCAT Racing Team (Grup ${c.fia_group}).`
      : `${c.model} - Vehicle de ral·li disponible per a lloguer de competició (Grup ${c.fia_group}). Tarifes a partir de ${
          c.daily_rate ? `${c.daily_rate}€/ral·li` : "consultar"
        }.`;
  const image = c.photos?.[0];

  return {
    title,
    description,
    alternates: { canonical: `/flota/${carId}` },
    openGraph: {
      type: "website",
      title,
      description,
      images: image ? [{ url: image, alt: c.model }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const carId = Number(id);
  if (!carId || isNaN(carId)) notFound();

  const [{ data: c }, { data: profile }, { data: r }] = await Promise.all([
    supabase.from("rally_cars").select("*").eq("id", carId).maybeSingle(),
    supabase.from("team_profile").select("phone").maybeSingle(),
    supabase
      .from("rally_results")
      .select("*,rally_events(name,event_type),driver:drivers!driver_id(name),copilot:drivers!copilot_id(name)")
      .eq("car_id", carId)
      .eq("published", true)
      .order("season", { ascending: false })
      .order("id", { ascending: false }),
  ]);

  if (!c) notFound();

  // Netejar telèfon per al link de WhatsApp
  const rawPhone = profile?.phone ? String(profile.phone).replace(/\D/g, "") : "";
  const phone = rawPhone.length === 9 ? `34${rawPhone}` : rawPhone;
  const waText = encodeURIComponent(
    `Hola VelociCAT! M'agradaria consultar la disponibilitat del vehicle de competició ${c.model} (${c.fia_group}) per a un lloguer de ral·li.`
  );
  const waUrl = phone ? `https://wa.me/${phone}?text=${waText}` : `/contacte`;

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
                  className="h-64 w-full rounded-2xl object-cover shadow-sm transition hover:opacity-95"
                />
              ))
            ) : (
              <div className="h-64 rounded-2xl bg-gray-900" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-red-600 px-3 py-1 text-xs font-black uppercase text-white shadow-sm">
                {c.fia_group}
              </span>
              <span className="rounded bg-yellow-400 px-3 py-1 text-xs font-black uppercase text-red-700 shadow-sm">
                {c.ownership === "particular" ? "Vehicle particular" : "Vehicle de l'escuderia"}
              </span>
            </div>
            <h1 className="mt-4 text-5xl font-black italic uppercase text-gray-900">{c.model}</h1>

            {c.ownership === "particular" ? (
              <p className="mt-5 text-xl font-black text-gray-700">
                Vehicle particular — no disponible per lloguer.
              </p>
            ) : (
              <div className="mt-5 space-y-2">
                <p className="text-lg font-bold text-gray-900">Tarifes de lloguer</p>
                {c.rentable_rally !== false && (
                  <p className="text-3xl font-black text-gray-950">
                    {c.daily_rate}€ <span className="text-base font-medium text-gray-500">/ rally</span>
                  </p>
                )}
                {c.rentable_sprint && (
                  <p className="text-2xl font-black text-gray-950">
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
              Vehicle preparat per competir, amb manteniment i assistència professional per part de l'equip VelociCAT Racing Team.
            </p>

            {c.ownership !== "particular" && (
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href={waUrl}
                  target={phone ? "_blank" : undefined}
                  rel={phone ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 font-black uppercase text-white shadow-md transition hover:bg-emerald-700 hover:shadow-lg"
                >
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.299.144.35.49 1.196.533 1.284.043.088.072.19.014.305-.058.115-.087.19-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.144.39-.086s1.011.477 1.184.563c.173.087.289.13.332.202.043.073.043.419-.101.824z" />
                  </svg>
                  Consultar per WhatsApp
                </a>
                <Link
                  href="/#calendari"
                  className="inline-block rounded-xl bg-yellow-400 px-6 py-4 font-black uppercase text-red-700 shadow-md transition hover:bg-yellow-500"
                >
                  Consultar reserves
                </Link>
              </div>
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
                        <span>
                          {" "}
                          · Copilot: <span className="font-bold text-gray-900">{x.copilot.name}</span>
                        </span>
                      )}
                      {x.category && (
                        <span>
                          {" "}
                          · Categoria: <span className="font-bold">{x.category}</span>
                        </span>
                      )}
                    </p>
                    {(x.time || x.gap) && (
                      <p className="text-xs font-mono font-bold text-gray-600">
                        ⏱️ Temps: {x.time || "—"}
                        {x.gap ? ` · Dif: ${x.gap}` : ""}
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
                <p className="text-gray-500 font-bold">
                  Encara no hi ha resultats publicats per a aquest vehicle.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Els resultats que s'introdueixin al panell d'administració apareixeran aquí automàticament.
                </p>
              </div>
            )}
          </div>
        </section>
      </section>
    </PageShell>
  );
}