import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { supabase } from "../../../utils/supabase";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: driver } = await supabase
    .from("drivers")
    .select("name,number,role,bio,photo_url,championship")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!driver) return { title: "Pilot no trobat" };

  const description = driver.bio || `${driver.name}, ${driver.role} de VelociCAT Racing Team.`;
  return {
    title: `${driver.name} | Pilot`,
    description,
    alternates: { canonical: `/pilots/${slug}` },
    openGraph: {
      type: "profile",
      title: `${driver.name} | VelociCAT`,
      description,
      images: driver.photo_url ? [{ url: driver.photo_url, alt: driver.name }] : undefined,
    },
    twitter: {
      card: driver.photo_url ? "summary_large_image" : "summary",
      title: `${driver.name} | VelociCAT`,
      description,
      images: driver.photo_url ? [driver.photo_url] : undefined,
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const { data: p } = await supabase.from("drivers").select("*,rally_cars(model,fia_group)").eq("slug", slug).eq("published", true).maybeSingle();
  if (!p) notFound();
  const { data: r } = await supabase.from("rally_results").select("*,rally_events(name),rally_cars(model)").eq("driver_id", p.id).eq("published", true).order("season", { ascending: false });
  return <PageShell><section className="bg-gray-950 text-white"><div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center">{p.photo_url ? <img src={p.photo_url} alt={p.name} className="h-[420px] w-full rounded-2xl object-cover" /> : <div className="flex h-[420px] items-center justify-center rounded-2xl bg-gray-800 text-8xl font-black text-yellow-400">#{p.number || "—"}</div>}<div><p className="font-black uppercase text-yellow-400">#{p.number || "—"} · {p.role}</p><h1 className="mt-3 text-5xl font-black italic uppercase">{p.name}</h1><p className="mt-5 text-xl text-gray-300">{p.bio}</p><p className="mt-5 font-bold">{p.championship || ""}</p></div></div></section><section className="mx-auto max-w-6xl px-4 py-16"><h2 className="text-3xl font-black uppercase italic">Palmarès i resultats</h2><div className="mt-8 space-y-4">{r?.length ? r.map((x: any) => <div key={x.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5"><div><b>{x.rally_events?.name || "Rally"}</b><p className="text-sm text-gray-500">{x.season} · {x.rally_cars?.model || ""}</p></div><div className="font-black">{x.category_position ? "P" + x.category_position + " classe" : ""}{x.overall_position ? " · P" + x.overall_position + " general" : ""}</div></div>) : <p className="text-gray-500">Encara no hi ha resultats publicats.</p>}</div></section></PageShell>;
}