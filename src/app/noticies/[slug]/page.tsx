import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { supabase } from "../../../utils/supabase";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: news } = await supabase
    .from("news_posts")
    .select("title,excerpt,cover_image,published_at")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!news) return { title: "Notícia no trobada" };

  return {
    title: news.title,
    description: news.excerpt || `Últimes notícies de VelociCAT Racing Team: ${news.title}`,
    alternates: { canonical: `/noticies/${slug}` },
    openGraph: {
      type: "article",
      title: news.title,
      description: news.excerpt || undefined,
      images: news.cover_image ? [{ url: news.cover_image, alt: news.title }] : undefined,
      publishedTime: news.published_at || undefined,
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const { data: n } = await supabase.from("news_posts").select("*").eq("slug", slug).eq("published", true).maybeSingle();
  if (!n) notFound();
  return <PageShell><article className="mx-auto max-w-4xl px-4 py-16"><p className="font-black uppercase text-red-600">{n.category}</p><h1 className="mt-3 text-5xl font-black italic uppercase">{n.title}</h1>{n.published_at && <p className="mt-3 text-sm text-gray-500">{new Date(n.published_at).toLocaleDateString("ca-ES")}</p>}{n.cover_image && <img src={n.cover_image} alt={n.title} className="mt-10 max-h-[560px] w-full rounded-2xl object-cover" />}{n.excerpt && <p className="mt-10 text-xl font-bold text-gray-600">{n.excerpt}</p>}<div className="mt-8 whitespace-pre-line text-lg leading-8 text-gray-800">{n.content}</div></article></PageShell>;
}