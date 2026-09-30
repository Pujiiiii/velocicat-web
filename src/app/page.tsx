import Link from "next/link";
import { supabase } from "../utils/supabase";
import PageShell from "../components/PageShell";
import EventCatalog from "../components/EventCatalog";

export const revalidate = 30;

export default async function Home() {
  const [
    { data: cars },
    { data: events },
    { data: results },
    { data: news },
    { data: drivers },
    { data: profile },
    { data: sponsors },
    { data: bookings },
  ] = await Promise.all([
    supabase.from("rally_cars").select("*").order("model"),
    supabase.from("rally_events").select("*").order("start_date", { ascending: true }),
    supabase
      .from("rally_results")
      .select("*,rally_events(name),drivers(name)")
      .eq("published", true)
      .order("season", { ascending: false })
      .order("id", { ascending: false })
      .limit(3),
    supabase
      .from("news_posts")
      .select("*")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(3),
    supabase.from("drivers").select("*").eq("published", true).order("name").limit(4),
    supabase.from("team_profile").select("*").limit(1).maybeSingle(),
    supabase.from("sponsors").select("*").eq("published", true).order("sort_order").limit(8),
    supabase.rpc("get_public_booking_status"),
  ]);

  const nextEvent = events?.find(
    (e) => e.end_date >= new Date().toISOString().slice(0, 10),
  );

  return (
    <PageShell>
      <section className="relative overflow-hidden bg-gray-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(220,38,38,.45),transparent_45%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-28 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
          <div>
            <p className="font-black uppercase tracking-[.35em] text-yellow-400">
              VELOCI CAT RACING TEAM
            </p>
            <h1 className="mt-5 text-6xl font-black uppercase italic leading-none md:text-8xl">
              Portem la passió
              <br />
              <span className="text-red-600">al límit.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-xl text-gray-300">
              {profile?.tagline ||
                "Escuderia de rally, competició i vehicles preparats per devorar el crono."}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/rallys"
                className="rounded bg-yellow-400 px-7 py-4 font-black uppercase text-red-700"
              >
                Calendari
              </Link>
              <Link
                href="/escuderia"
                className="rounded border-2 border-white px-7 py-4 font-black uppercase"
              >
                Coneix l'equip
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur">
            {nextEvent ? (
              <>
                <p className="font-black uppercase text-yellow-400">Pròxima cursa</p>
                <h2 className="mt-3 text-4xl font-black italic uppercase">
                  {nextEvent.name}
                </h2>
                <p className="mt-3 text-gray-400">
                  {new Date(nextEvent.start_date).toLocaleDateString("ca-ES")} —{" "}
                  {new Date(nextEvent.end_date).toLocaleDateString("ca-ES")}
                </p>
                <Link
                  href={"/rallys/" + nextEvent.id}
                  className="mt-8 inline-block font-black uppercase underline"
                >
                  Veure rally →
                </Link>
              </>
            ) : (
              <>
                <p className="font-black uppercase text-yellow-400">Temporada</p>
                <h2 className="mt-3 text-4xl font-black italic">
                  Preparats per la propera sortida.
                </h2>
                <p className="mt-3 text-gray-400">
                  El calendari de l'equip apareixerà aquí.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="grid gap-5 md:grid-cols-3">
          <Stat n={String(drivers?.length || 0)} t="Pilots publicats" />
          <Stat n={String(cars?.length || 0)} t="Vehicles" />
          <Stat n={String(results?.length || 0)} t="Resultats recents" />
        </div>
      </section>

      <section className="bg-gray-100 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-black uppercase text-red-600">Competició</p>
              <h2 className="mt-2 text-4xl font-black italic uppercase">
                Últims resultats
              </h2>
            </div>
            <Link href="/resultats" className="font-black uppercase">
              Tots →
            </Link>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {results?.length ? (
              results.map((r: any) => (
                <div key={r.id} className="rounded-2xl bg-gray-950 p-6 text-white">
                  <p className="text-sm font-black text-yellow-400">
                    {r.rally_events?.name || "Rally"}
                  </p>
                  <h3 className="mt-2 text-2xl font-black italic">
                    {r.drivers?.name || "VelociCAT"}
                  </h3>
                  <p className="mt-5 text-3xl font-black">
                    {r.category_position ? "P" + r.category_position : "—"}
                  </p>
                  <p className="text-gray-400">{r.category || "Classificació"}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500">Afegeix resultats des del CMS.</p>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-black uppercase text-red-600">Equip</p>
            <h2 className="mt-2 text-4xl font-black italic uppercase">
              Els nostres pilots
            </h2>
          </div>
          <Link href="/pilots" className="font-black uppercase">
            Veure tots →
          </Link>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {drivers?.map((d: any) => (
            <Link
              key={d.id}
              href={"/pilots/" + d.slug}
              className="overflow-hidden rounded-2xl bg-gray-950 text-white"
            >
              {d.photo_url ? (
                <img src={d.photo_url} alt={d.name} className="h-64 w-full object-cover" />
              ) : (
                <div className="h-64 bg-gray-800" />
              )}
              <div className="p-5">
                <p className="text-xs font-black text-yellow-400">#{d.number || "—"}</p>
                <h3 className="mt-1 text-2xl font-black italic uppercase">{d.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-gray-950 py-20 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-black uppercase text-yellow-400">Actualitat</p>
              <h2 className="mt-2 text-4xl font-black italic uppercase">
                Últimes notícies
              </h2>
            </div>
            <Link href="/noticies" className="font-black uppercase">
              Totes →
            </Link>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {news?.length ? (
              news.map((n: any) => (
                <Link
                  href={"/noticies/" + n.slug}
                  key={n.id}
                  className="rounded-2xl bg-white/5 p-6 hover:bg-white/10"
                >
                  <p className="text-xs font-black uppercase text-yellow-400">
                    {n.category}
                  </p>
                  <h3 className="mt-2 text-2xl font-black italic">{n.title}</h3>
                  <p className="mt-3 text-gray-400">{n.excerpt}</p>
                </Link>
              ))
            ) : (
              <p className="text-gray-500">Les notícies de l'equip apareixeran aquí.</p>
            )}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {cars?.map((c: any) => (
              <Link
                key={c.id}
                href={"/flota/" + c.id}
                className="rounded-2xl border p-5"
              >
                <p className="text-xs font-black uppercase text-red-600">{c.fia_group}</p>
                <h3 className="mt-2 text-xl font-black italic uppercase">{c.model}</h3>
                <p className="mt-3 font-bold">{c.daily_rate}€ / cursa</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {(sponsors || []).length > 0 && (
        <section className="border-t py-14">
          <div className="mx-auto max-w-7xl px-4 text-center">
            <p className="font-black uppercase text-gray-500">Amb el suport de</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-10">
              {(sponsors || []).map((s: any) => (
                <a
                  key={s.id}
                  href={s.website_url || "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.logo_url ? (
                    <img
                      src={s.logo_url}
                      alt={s.name}
                      className="h-14 max-w-40 object-contain grayscale hover:grayscale-0"
                    />
                  ) : (
                    <b>{s.name}</b>
                  )}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <EventCatalog
        events={events || []}
        cars={cars || []}
        bookings={bookings || []}
      />
    </PageShell>
  );
}

function Stat({ n, t }: { n: string; t: string }) {
  return (
    <div className="rounded-2xl border-2 border-gray-100 p-7">
      <div className="text-5xl font-black text-red-600">{n}</div>
      <p className="mt-2 font-black uppercase text-gray-500">{t}</p>
    </div>
  );
}
