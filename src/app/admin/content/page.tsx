"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../utils/supabase";

export default function ContentAdmin() {
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [tab, setTab] = useState("drivers");
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAdmin(data.session?.user?.app_metadata?.role === "admin");
      setReady(true);
    });
  }, []);

  async function load() {
    const [a, b, c, d] = await Promise.all([
      supabase.from("drivers").select("*").order("name"),
      supabase.from("news_posts").select("*").order("created_at", { ascending: false }),
      supabase.from("sponsors").select("*").order("sort_order"),
      supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
    ]);
    setDrivers(a.data || []);
    setNews(b.data || []);
    setSponsors(c.data || []);
    setContacts(d.data || []);
  }

  useEffect(() => {
    if (admin) load();
  }, [admin]);

  if (!ready) return <div className="p-10 font-bold">Carregant...</div>;
  if (!admin)
    return (
      <div className="mx-auto max-w-lg p-10 text-center">
        <h1 className="text-3xl font-black">Accés restringit</h1>
        <a href="/admin" className="mt-5 inline-block rounded bg-gray-900 px-5 py-3 font-black text-white">
          Anar a l'admin
        </a>
      </div>
    );

  async function addDriver(e: any) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("drivers").insert({
      name: f.get("name"),
      slug: f.get("slug"),
      number: f.get("number"),
      role: f.get("role"),
      bio: f.get("bio"),
      championship: f.get("championship"),
      season: Number(f.get("season")) || null,
      photo_url: f.get("photo_url"),
      published: true,
    });
    setMessage(error?.message || "Pilot guardat");
    e.currentTarget.reset();
    load();
  }

  async function addNews(e: any) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("news_posts").insert({
      title: f.get("title"),
      slug: f.get("slug"),
      excerpt: f.get("excerpt"),
      content: f.get("content"),
      cover_image: f.get("cover_image"),
      category: f.get("category"),
      published: true,
      published_at: new Date().toISOString(),
    });
    setMessage(error?.message || "Notícia publicada");
    e.currentTarget.reset();
    load();
  }

  async function addSponsor(e: any) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("sponsors").insert({
      name: f.get("name"),
      logo_url: f.get("logo_url"),
      website_url: f.get("website_url"),
      tier: f.get("tier"),
      description: f.get("description"),
      published: true,
    });
    setMessage(error?.message || "Patrocinador guardat");
    e.currentTarget.reset();
    load();
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-gray-950 px-5 py-4 text-white">
        <b className="text-xl italic">VELOCI<span className="text-yellow-400">CAT</span> CMS</b>
        <a href="/admin" className="rounded bg-red-600 px-4 py-2 font-black">Admin principal</a>
      </header>
      <div className="mx-auto max-w-7xl p-5 md:p-8">
        <div className="flex flex-wrap gap-2">
          {["drivers", "news", "sponsors", "contacts"].map((x) => (
            <button key={x} onClick={() => setTab(x)} className={"rounded px-4 py-2 font-black uppercase " + (tab === x ? "bg-yellow-400 text-red-700" : "bg-white")}>
              {x === "drivers" ? "Pilots" : x === "news" ? "Notícies" : x === "sponsors" ? "Patrocinadors" : "Contactes"}
            </button>
          ))}
        </div>
        {message && <p className="mt-4 rounded bg-green-100 p-3 font-bold">{message}</p>}
        {tab === "drivers" && (
          <section className="mt-6 grid gap-8 lg:grid-cols-2">
            <Form title="Nou pilot" onSubmit={addDriver} fields={[["name","Nom"],["slug","Slug"],["number","Dorsal"],["role","Rol"],["championship","Campionat"],["season","Temporada"],["photo_url","URL foto"],["bio","Bio"]]} />
            <List title="Pilots" items={drivers} render={(x: any) => <b>{x.name} <span className="text-gray-500">#{x.number || "—"}</span></b>} />
          </section>
        )}
        {tab === "news" && (
          <section className="mt-6 grid gap-8 lg:grid-cols-2">
            <Form title="Nova notícia" onSubmit={addNews} fields={[["title","Títol"],["slug","Slug"],["category","Categoria"],["cover_image","URL portada"],["excerpt","Extracte"],["content","Contingut"]]} />
            <List title="Notícies" items={news} render={(x: any) => <b>{x.title}</b>} />
          </section>
        )}
        {tab === "sponsors" && (
          <section className="mt-6 grid gap-8 lg:grid-cols-2">
            <Form title="Nou patrocinador" onSubmit={addSponsor} fields={[["name","Nom"],["tier","Nivell"],["logo_url","URL logo"],["website_url","Web"],["description","Descripció"]]} />
            <List title="Patrocinadors" items={sponsors} render={(x: any) => <b>{x.name} <span className="text-gray-500">· {x.tier}</span></b>} />
          </section>
        )}
        {tab === "contacts" && (
          <List title="Missatges rebuts" items={contacts} render={(x: any) => <div><b>{x.name} · {x.subject}</b><p className="text-sm text-gray-500">{x.email || x.phone || ""}</p><p className="mt-2">{x.message}</p></div>} />
        )}
      </div>
    </main>
  );
}

function Form({
  title,
  onSubmit,
  fields,
}: {
  title: string;
  onSubmit: any;
  fields: [string, string][];
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow">
      <h2 className="text-2xl font-black uppercase">{title}</h2>
      {fields.map(([name, label]) => {
        const multiline = ["bio", "content", "excerpt", "description"].includes(name);
        return (
          <div key={name} className="mt-4">
            <label className="mb-1 block text-sm font-bold">{label}</label>
            {multiline ? (
              <textarea name={name} rows={4} className="w-full rounded border px-3 py-2" />
            ) : (
              <input
                name={name}
                required={["name", "slug", "title"].includes(name)}
                className="w-full rounded border px-3 py-2"
              />
            )}
          </div>
        );
      })}
      <button className="mt-6 w-full rounded bg-gray-950 py-3 font-black uppercase text-white">
        Guardar
      </button>
    </form>
  );
}

function List({
  title,
  items,
  render,
}: {
  title: string;
  items: any[];
  render: (x: any) => any;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <h2 className="text-2xl font-black uppercase">{title}</h2>
      <div className="mt-5 space-y-3">
        {items.map((x) => (
          <div key={x.id} className="rounded border p-4">{render(x)}</div>
        ))}
      </div>
    </div>
  );
}
