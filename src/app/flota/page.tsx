import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "../../components/PageShell";
import { supabase } from "../../utils/supabase";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Flota de Ral·li i Lloguer de Competició | VelociCAT Racing Team",
  description:
    "Descobreix els vehicles de competició de VelociCAT Racing Team. Cotxes de ral·li preparats per a lloguer amb assistència integral i vehicles oficials de l'escuderia.",
  alternates: { canonical: "/flota" },
  openGraph: {
    title: "Flota de Ral·li i Lloguer de Competició | VelociCAT",
    description: "Vehicles preparats per competir en ral·lis, ral·lisprint i pujades en costa a Catalunya.",
  },
};

export default async function Page() {
  const { data } = await supabase.from("rally_cars").select("*").order("model");

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-black uppercase tracking-wider text-red-600">Màquines de competició</p>
            <h1 className="mt-2 text-5xl font-black italic uppercase sm:text-6xl text-gray-900">
              La nostra <span className="text-red-600">flota</span>
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-gray-600">
              Vehicles preparats sota normativa FIA i mantinguts amb màxima cura per VelociCAT. Consulta la disponibilitat per a lloguer en ral·lis, ral·li-sprints i pujades.
            </p>
          </div>
          <Link
            href="/contacte"
            className="rounded-xl bg-gray-950 px-6 py-3 font-black uppercase text-white shadow-sm transition hover:bg-gray-800"
          >
            Consultar disponibilitat
          </Link>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {data?.map((c) => (
            <Link
              href={"/flota/" + c.id}
              key={c.id}
              className="group overflow-hidden rounded-2xl bg-gray-950 text-white shadow-lg transition duration-200 hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between"
            >
              <div>
                <div className="relative h-64 w-full overflow-hidden bg-gray-900">
                  {c.photos?.[0] ? (
                    <img
                      src={c.photos[0]}
                      alt={c.model}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-600 font-bold">
                      Sense foto
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    <span className="rounded bg-red-600 px-2.5 py-1 text-xs font-black uppercase text-white shadow">
                      {c.fia_group}
                    </span>
                    <span className="rounded bg-yellow-400 px-2.5 py-1 text-xs font-black uppercase text-red-800 shadow">
                      {c.ownership === "particular" ? "Particular" : "Lloguer"}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h2 className="text-2xl font-black italic uppercase text-white group-hover:text-yellow-400 transition-colors">
                    {c.model}
                  </h2>
                  <p className="mt-2 text-sm text-gray-400">
                    {c.ownership === "particular"
                      ? "Vehicle de competició oficial de l'equip."
                      : "Disponible per lloguer amb suport mecànic complet."}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-800 p-6 pt-4 flex items-center justify-between">
                {c.ownership === "particular" ? (
                  <span className="text-xs font-bold uppercase text-gray-500">No llogable</span>
                ) : c.daily_rate ? (
                  <div>
                    <span className="text-xs text-gray-400 block font-medium">Tarifa ral·li</span>
                    <span className="text-lg font-black text-yellow-400">{c.daily_rate}€</span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-gray-400">Tarifa a consultar</span>
                )}
                <span className="text-xs font-black uppercase text-white group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  Veure fitxa &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  );
}