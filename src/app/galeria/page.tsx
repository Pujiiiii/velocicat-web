import type { Metadata } from "next";
import PageShell from "../../components/PageShell";
import GalleryViewer, { GalleryItem } from "../../components/GalleryViewer";
import { supabase } from "../../utils/supabase";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Galeria Multimèdia | VelociCAT Racing Team",
  description:
    "Descobreix la galeria oficial de VelociCAT Racing Team: fotografies de ral·lis, parcs d'assistència, la nostra flota de vehicles i moments de podi a Catalunya.",
  alternates: { canonical: "/galeria" },
  openGraph: {
    title: "Galeria Multimèdia | VelociCAT Racing Team",
    description: "Imatges exclusives i moments destacats de competició de l'equip de ral·lis VelociCAT.",
  },
};

export default async function Page() {
  const { data } = await supabase
    .from("gallery_items")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });

  const items = (data || []) as unknown as GalleryItem[];

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
        <div>
          <p className="font-black uppercase tracking-wider text-red-600">Multimèdia</p>
          <h1 className="mt-2 text-5xl font-black italic uppercase sm:text-6xl text-gray-900">
            Galeria <span className="text-red-600">oficial</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-600">
            Els millors moments de la temporada sobre l'asfalt i la terra. Fes clic sobre qualsevol imatge per visualitzar-la a pantalla completa.
          </p>
        </div>

        <GalleryViewer items={items} />
      </section>
    </PageShell>
  );
}