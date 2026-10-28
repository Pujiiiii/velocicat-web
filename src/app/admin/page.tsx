"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { supabase } from "../../utils/supabase";
import EventRecommendationsModal from "../../components/admin/EventRecommendationsModal";

type Row = Record<string, any>;
type Option = {
  id: number;
  label: string;
  eventType?: string;
  number?: string;
  carId?: number;
  role?: string;
  fiaGroup?: string;
  startDate?: string;
};
type Relations = { events: Option[]; drivers: Option[]; cars: Option[] };

type Tab =
  | "flota"
  | "events"
  | "bookings"
  | "results"
  | "drivers"
  | "news"
  | "gallery"
  | "sponsors"
  | "live"
  | "contacts"
  | "profile";

const tabMeta: Record<Tab, { label: string; icon: string }> = {
  flota: { label: "La Flota", icon: "🏎️" },
  events: { label: "Rallys", icon: "🏁" },
  bookings: { label: "Reserves", icon: "📅" },
  results: { label: "Resultats", icon: "🏆" },
  drivers: { label: "Equip & Pilots", icon: "👥" },
  news: { label: "Notícies", icon: "📰" },
  gallery: { label: "Galeria", icon: "📸" },
  sponsors: { label: "Patrocinadors", icon: "🤝" },
  live: { label: "Rally LIVE", icon: "🔴" },
  contacts: { label: "Missatges", icon: "💬" },
  profile: { label: "Escuderia", icon: "⚙️" },
};

const cmsTableOf: Record<string, string> = {
  profile: "team_profile",
  drivers: "drivers",
  news: "news_posts",
  sponsors: "sponsors",
  results: "rally_results",
  gallery: "gallery_items",
  live: "live_updates",
  contacts: "contact_messages",
};

const requiredFields: Partial<Record<Tab, string[]>> = {
  profile: ["name"],
  drivers: ["name", "role"],
  news: ["title", "slug"],
  sponsors: ["name"],
  results: ["season"],
  gallery: ["image_url"],
  live: ["event_id", "message"],
};

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("flota");

  // Dades principals
  const [cotxes, setCotxes] = useState<any[]>([]);
  const [esdeveniments, setEsdeveniments] = useState<any[]>([]);
  const [reserves, setReserves] = useState<any[]>([]);
  const [contactesNousCount, setContactesNousCount] = useState(0);
  const [resultatsTotalCount, setResultatsTotalCount] = useState(0);

  // CMS
  const [cmsRows, setCmsRows] = useState<Row[]>([]);
  const [editingItem, setEditingItem] = useState<Row | null>(null);
  const [relations, setRelations] = useState<Relations>({ events: [], drivers: [], cars: [] });
  const [carFilterResults, setCarFilterResults] = useState<number | "all">("all");
  const [mostrarModalConsolidar, setMostrarModalConsolidar] = useState(false);
  const [consolidarEventId, setConsolidarEventId] = useState<number | null>(null);
  const [recomanacionsEvent, setRecomanacionsEvent] = useState<any | null>(null);
  const [allContacts, setAllContacts] = useState<any[]>([]);

  // ESTATS MODAL COTXES
  const [mostrarModalCotxe, setMostrarModalCotxe] = useState(false);
  const [cotxeEditant, setCotxeEditant] = useState<any>(null);
  const [formCotxe, setFormCotxe] = useState<{
    model: string;
    fia_group: string;
    daily_rate: string;
    sprint_rate: string;
    rentable_rally: boolean;
    rentable_sprint: boolean;
    status: string;
    ownership: string;
    photos: string[];
  }>({
    model: "",
    fia_group: "",
    daily_rate: "0",
    sprint_rate: "0",
    rentable_rally: true,
    rentable_sprint: false,
    status: "disponible",
    ownership: "escuderia",
    photos: [],
  });
  const [arxiusFotos, setArxiusFotos] = useState<FileList | null>(null);
  const [pujantFotos, setPujantFotos] = useState(false);
  const [errorModalCotxe, setErrorModalCotxe] = useState("");

  // ESTATS MODAL ESDEVENIMENTS
  const [mostrarModalEvent, setMostrarModalEvent] = useState(false);
  const [eventEditant, setEventEditant] = useState<any>(null);
  const [formEvent, setFormEvent] = useState<{
    name: string;
    start_date: string;
    end_date: string;
    event_type: string;
    assigned_cars: number[];
  }>({
    name: "",
    start_date: "",
    end_date: "",
    event_type: "rally",
    assigned_cars: [],
  });

  // Carregar relations
  const loadRelations = useCallback(async () => {
    const [eventsRes, driversRes, carsRes] = await Promise.all([
      supabase.from("rally_events").select("id,name,start_date,event_type").order("start_date", { ascending: false }),
      supabase.from("drivers").select("id,name,number,car_id,role").order("name"),
      supabase.from("rally_cars").select("id,model,fia_group").order("model"),
    ]);

    setRelations({
      events: (eventsRes.data || []).map((e: any) => ({
        id: Number(e.id),
        label: String(e.name) + (e.start_date ? " · " + e.start_date : ""),
        eventType: e.event_type,
        startDate: e.start_date,
      })),
      drivers: (driversRes.data || []).map((d: any) => ({
        id: Number(d.id),
        label: String(d.name) + (d.number ? " #" + d.number : ""),
        number: d.number ? String(d.number) : "",
        carId: d.car_id ? Number(d.car_id) : undefined,
        role: d.role,
      })),
      cars: (carsRes.data || []).map((c: any) => ({
        id: Number(c.id),
        label: String(c.model) + (c.fia_group ? " · " + c.fia_group : ""),
        fiaGroup: c.fia_group,
      })),
    });
  }, []);

  const carregarCotxes = useCallback(async () => {
    const { data } = await supabase.from("rally_cars").select("*").order("model");
    if (data) setCotxes(data);
  }, []);

  const carregarEsdeveniments = useCallback(async () => {
    const { data } = await supabase.from("rally_events").select("*").order("start_date", { ascending: true });
    if (data) setEsdeveniments(data);
  }, []);

  const carregarReserves = useCallback(async () => {
    const { data } = await supabase
      .from("event_bookings")
      .select("*, customers(name, phone), rally_cars(model), rally_events(name, start_date)")
      .order("id", { ascending: false });
    if (data) setReserves(data);
  }, []);

  const carregarComptadors = useCallback(async () => {
    const [msgRes, resRes] = await Promise.all([
      supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("rally_results").select("id", { count: "exact", head: true }),
    ]);
    if (msgRes.count !== null) setContactesNousCount(msgRes.count);
    if (resRes.count !== null) setResultatsTotalCount(resRes.count);
  }, []);

  const carregarContactes = useCallback(async () => {
    const { data } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
    if (data) setAllContacts(data);
  }, []);

  // Carregar CMS Rows
  const carregarCmsRows = useCallback(async (tabName: Tab) => {
    const table = cmsTableOf[tabName];
    if (!table) return;

    let q = supabase.from(table).select("*");
    if (tabName === "news") q = q.order("created_at", { ascending: false });
    else if (tabName === "profile") q = q.order("id").limit(1);
    else if (tabName === "results") q = q.order("season", { ascending: false }).order("id", { ascending: false });
    else if (tabName === "live") q = q.order("created_at", { ascending: false });
    else q = q.order("id", { ascending: false });

    const { data, error: qErr } = await q;
    if (qErr) {
      setError("No s’ha pogut carregar les dades: " + qErr.message);
    } else {
      setCmsRows(data || []);
    }
  }, []);

  // Auth initialization
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      const admin = s?.user?.app_metadata?.role === "admin";
      setSession(s);
      setIsAdmin(admin);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      const admin = s?.user?.app_metadata?.role === "admin";
      setSession(s);
      setIsAdmin(admin);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Dades quan entra admin
  useEffect(() => {
    if (session && isAdmin) {
      carregarCotxes();
      carregarEsdeveniments();
      carregarReserves();
      carregarContactes();
      carregarComptadors();
      loadRelations();
    }
  }, [session, isAdmin, carregarCotxes, carregarEsdeveniments, carregarReserves, carregarContactes, carregarComptadors, loadRelations]);

  // Canvi de pestanya CMS
  useEffect(() => {
    if (session && isAdmin && cmsTableOf[activeTab]) {
      carregarCmsRows(activeTab);
    }
  }, [session, isAdmin, activeTab, carregarCmsRows]);

  // LOGIN & LOGOUT
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError("Correu o contrasenya incorrectes.");
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- COTXES ---
  const obrirModalNouCotxe = () => {
    setCotxeEditant(null);
    setFormCotxe({
      model: "",
      fia_group: "",
      daily_rate: "0",
      sprint_rate: "0",
      rentable_rally: true,
      rentable_sprint: false,
      status: "disponible",
      ownership: "escuderia",
      photos: [],
    });
    setArxiusFotos(null);
    setErrorModalCotxe("");
    setMostrarModalCotxe(true);
  };

  const obrirModalEditarCotxe = (cotxe: any) => {
    setCotxeEditant(cotxe);
    setFormCotxe({
      model: cotxe.model,
      fia_group: cotxe.fia_group,
      daily_rate: String(cotxe.daily_rate ?? 0),
      sprint_rate: String(cotxe.sprint_rate ?? 0),
      rentable_rally: cotxe.rentable_rally ?? true,
      rentable_sprint: cotxe.rentable_sprint ?? false,
      status: cotxe.status,
      ownership: cotxe.ownership || "escuderia",
      photos: cotxe.photos || [],
    });
    setArxiusFotos(null);
    setErrorModalCotxe("");
    setMostrarModalCotxe(true);
  };

  const desenllacarFoto = (index: number) => {
    const novesFotos = [...formCotxe.photos];
    novesFotos.splice(index, 1);
    setFormCotxe({ ...formCotxe, photos: novesFotos });
  };

  const moureFoto = (index: number, direccio: "esquerra" | "dreta") => {
    const novesFotos = [...formCotxe.photos];
    if (direccio === "esquerra" && index > 0) {
      const temp = novesFotos[index - 1];
      novesFotos[index - 1] = novesFotos[index];
      novesFotos[index] = temp;
    } else if (direccio === "dreta" && index < novesFotos.length - 1) {
      const temp = novesFotos[index + 1];
      novesFotos[index + 1] = novesFotos[index];
      novesFotos[index] = temp;
    }
    setFormCotxe({ ...formCotxe, photos: novesFotos });
  };

  const pujarFotosStorage = async (): Promise<string[] | null> => {
    if (!arxiusFotos || arxiusFotos.length === 0) return [];
    setErrorModalCotxe("");

    for (let i = 0; i < arxiusFotos.length; i++) {
      if (arxiusFotos[i].size > 8 * 1024 * 1024) {
        setErrorModalCotxe(`La imatge "${arxiusFotos[i].name}" supera el límit permès de 8 MB.`);
        return null;
      }
    }

    const {
      data: { session: s },
    } = await supabase.auth.getSession();
    if (!s?.access_token) {
      setErrorModalCotxe("Cal iniciar sessió per poder pujar imatges.");
      return null;
    }

    const urls: string[] = [];
    for (let i = 0; i < arxiusFotos.length; i++) {
      const formData = new FormData();
      formData.append("image", arxiusFotos[i]);

      try {
        const res = await fetch("/api/upload-image", {
          method: "POST",
          headers: { Authorization: `Bearer ${s.access_token}` },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "No s'ha pogut pujar la imatge.");
        if (typeof data?.url !== "string") throw new Error("Resposta del servidor d'imatges no vàlida.");
        urls.push(data.url);
      } catch (e) {
        setErrorModalCotxe(e instanceof Error ? e.message : "Error desconegut pujant una imatge.");
        return null;
      }
    }
    return urls;
  };

  const guardarCotxe = async () => {
    if (
      !formCotxe.model.trim() ||
      !formCotxe.fia_group.trim() ||
      (formCotxe.ownership === "escuderia" &&
        (Number(formCotxe.daily_rate) < 0 ||
          Number(formCotxe.sprint_rate) < 0 ||
          !Number.isFinite(Number(formCotxe.daily_rate)) ||
          !Number.isFinite(Number(formCotxe.sprint_rate))))
    ) {
      setErrorModalCotxe("Omple el model i el grup FIA, i indica preus vàlids.");
      return;
    }
    setPujantFotos(true);
    const novesUrls = await pujarFotosStorage();
    if (novesUrls === null) {
      setPujantFotos(false);
      return;
    }
    const fotosFinals = [...formCotxe.photos, ...novesUrls];
    const dadesAGuardar = {
      ...formCotxe,
      daily_rate: formCotxe.ownership === "particular" ? 0 : Number(formCotxe.daily_rate || 0),
      sprint_rate: formCotxe.ownership === "particular" ? 0 : Number(formCotxe.sprint_rate || 0),
      rentable_rally: formCotxe.ownership === "escuderia" && formCotxe.rentable_rally,
      rentable_sprint: formCotxe.ownership === "escuderia" && formCotxe.rentable_sprint,
      photos: fotosFinals,
    };

    const result = cotxeEditant
      ? await supabase.from("rally_cars").update(dadesAGuardar).eq("id", cotxeEditant.id)
      : await supabase.from("rally_cars").insert([dadesAGuardar]);

    setPujantFotos(false);
    if (result.error) {
      setErrorModalCotxe("No s'ha pogut guardar el vehicle: " + result.error.message);
      return;
    }
    setMostrarModalCotxe(false);
    setSuccessMsg(cotxeEditant ? "Vehicle actualitzat correctament" : "Vehicle afegit a la flota");
    carregarCotxes();
    loadRelations();
  };

  const eliminarCotxe = async (id: number) => {
    if (confirm("Estàs segur que vols eliminar aquest vehicle de la flota?")) {
      const { error: err } = await supabase.from("rally_cars").delete().eq("id", id);
      if (err) {
        setError("No s'ha pogut eliminar el vehicle: " + err.message);
        return;
      }
      setSuccessMsg("Vehicle eliminat de la flota");
      carregarCotxes();
      loadRelations();
    }
  };

  const actualitzarEstatCotxe = async (id: number, nouEstat: string) => {
    const { error: err } = await supabase.from("rally_cars").update({ status: nouEstat }).eq("id", id);
    if (err) {
      setError("No s'ha pogut actualitzar l'estat del vehicle: " + err.message);
      return;
    }
    carregarCotxes();
  };

  // --- ESDEVENIMENTS ---
  const obrirModalNouEvent = () => {
    setEventEditant(null);
    setFormEvent({ name: "", start_date: "", end_date: "", event_type: "rally", assigned_cars: [] });
    setMostrarModalEvent(true);
  };

  const obrirModalEditarEvent = (event: any) => {
    setEventEditant(event);
    setFormEvent({
      name: event.name,
      start_date: event.start_date,
      end_date: event.end_date,
      event_type: event.event_type || "rally",
      assigned_cars: event.assigned_cars || [],
    });
    setMostrarModalEvent(true);
  };

  const guardarEsdeveniment = async () => {
    if (!formEvent.name || !formEvent.start_date || !formEvent.end_date) {
      alert("Omple els camps bàsics de la cursa.");
      return;
    }
    const result = eventEditant
      ? await supabase.from("rally_events").update(formEvent).eq("id", eventEditant.id)
      : await supabase.from("rally_events").insert([formEvent]);

    if (result.error) {
      setError("No s'ha pogut guardar l'esdeveniment: " + result.error.message);
      return;
    }
    setMostrarModalEvent(false);
    setSuccessMsg(eventEditant ? "Rally actualitzat" : "Rally creat correctament");
    carregarEsdeveniments();
    loadRelations();
  };

  const eliminarEsdeveniment = async (id: number) => {
    if (confirm("Estàs segur que vols cancel·lar i eliminar aquest esdeveniment?")) {
      const { error: err } = await supabase.from("rally_events").delete().eq("id", id);
      if (err) {
        setError("No s'ha pogut eliminar l'esdeveniment: " + err.message);
        return;
      }
      setSuccessMsg("Esdeveniment eliminat");
      carregarEsdeveniments();
      loadRelations();
    }
  };

  // --- RESERVES ---
  const actualitzarEstatReserva = async (id: number, nouEstat: string) => {
    const { error: err } = await supabase.from("event_bookings").update({ status: nouEstat }).eq("id", id);
    if (err) {
      setError("No s'ha pogut actualitzar la reserva: " + err.message);
      return;
    }
    setSuccessMsg("Estat de la reserva actualitzat a: " + nouEstat);
    carregarReserves();
  };

  const eliminarReserva = async (id: number) => {
    if (confirm("Segur que vols eliminar definitivament aquesta reserva?")) {
      const { error: err } = await supabase.from("event_bookings").delete().eq("id", id);
      if (err) {
        setError("No s'ha pogut eliminar la reserva: " + err.message);
        return;
      }
      setSuccessMsg("Reserva eliminada");
      carregarReserves();
    }
  };

  // --- CMS GENÈRIC (Resultats, Pilots, Notícies, etc.) ---
  function makeSlug(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  const eliminarCmsItem = async (id: number) => {
    const table = cmsTableOf[activeTab];
    if (!table) return;
    if (!confirm("Vols eliminar aquest element? Aquesta acció no es pot desfer.")) return;

    const { error: err } = await supabase.from(table).delete().eq("id", id);
    if (err) {
      setError("No s’ha pogut eliminar l’element: " + err.message);
      return;
    }
    setSuccessMsg("Element eliminat correctament");
    carregarCmsRows(activeTab);
    carregarComptadors();
  };

  const guardarCmsItem = async (data: Row) => {
    const table = cmsTableOf[activeTab];
    if (!table) return;

    if (["drivers", "news"].includes(activeTab)) {
      const source = String(data.slug || data.name || data.title || "");
      data = { ...data, slug: makeSlug(source) };
    }

    for (const key of requiredFields[activeTab] || []) {
      if (data[key] === null || data[key] === undefined || String(data[key]).trim() === "") {
        const fieldLabels: Record<string, string> = {
          name: "nom",
          slug: "slug",
          title: "títol",
          season: "temporada",
          image_url: "imatge",
          event_id: "rally",
          message: "missatge",
        };
        setError("Error: el camp «" + (fieldLabels[key] || key) + "» és obligatori.");
        return;
      }
    }

    const urlFields = [
      "hero_image",
      "logo_url",
      "photo_url",
      "cover_image",
      "image_url",
      "instagram_url",
      "facebook_url",
      "youtube_url",
      "tiktok_url",
      "social_url",
      "website_url",
    ];
    for (const key of urlFields) {
      const value = String(data[key] || "").trim();
      if (value) {
        try {
          const url = new URL(value);
          if (!["http:", "https:"].includes(url.protocol)) throw new Error();
        } catch {
          setError(`Error: El camp «${key}» ha de ser una URL vàlida.`);
          return;
        }
      }
    }

    if (data.email) {
      const em = String(data.email).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        setError("Error: introdueix una adreça de correu vàlida.");
        return;
      }
    }

    const allowedFields: Record<string, string[]> = {
      profile: [
        "name",
        "tagline",
        "story",
        "hero_image",
        "logo_url",
        "location",
        "email",
        "phone",
        "instagram_url",
        "facebook_url",
        "youtube_url",
        "tiktok_url",
      ],
      drivers: [
        "name",
        "slug",
        "number",
        "role",
        "bio",
        "photo_url",
        "car_id",
        "championship",
        "season",
        "social_url",
        "published",
      ],
      news: ["title", "slug", "excerpt", "content", "cover_image", "category", "published", "published_at"],
      sponsors: ["name", "logo_url", "website_url", "tier", "description", "published", "sort_order"],
      results: [
        "event_id",
        "driver_id",
        "copilot_id",
        "car_id",
        "season",
        "category",
        "overall_position",
        "category_position",
        "status",
        "time",
        "gap",
        "summary",
        "published",
      ],
      gallery: ["title", "image_url", "caption", "category", "event_id", "season", "published"],
      live: ["event_id", "driver_id", "stage", "position", "category_position", "time", "gap", "message", "is_live"],
      contacts: [],
    };

    const clean: Row = {};
    for (const key of allowedFields[activeTab] || []) {
      if (key in data) clean[key] = data[key];
    }

    if (activeTab === "results") {
      const event = relations.events.find((e) => e.id === Number(clean.event_id));
      if (clean.driver_id == null) {
        setError("Error: cal seleccionar un pilot per al resultat.");
        return;
      }
      if (event?.eventType === "rally" || event?.eventType === "rally_sprint") {
        if (clean.copilot_id == null) {
          setError("Error: el copilot és obligatori en rally i rally sprint.");
          return;
        }
      } else if (event?.eventType === "pujada_costa") {
        clean.copilot_id = null;
      }
    }

    if (activeTab === "drivers" && clean.car_id != null) {
      const cId = Number(clean.car_id);
      if (!Number.isInteger(cId) || !relations.cars.some((c) => c.id === cId)) clean.car_id = null;
    }

    if (activeTab === "news" && clean.published && !clean.published_at) {
      clean.published_at = new Date().toISOString();
    }

    const res = editingItem?.id
      ? await supabase.from(table).update(clean).eq("id", editingItem.id)
      : await supabase.from(table).insert(clean);

    if (res.error) {
      setError("Error guardant: " + res.error.message);
      return;
    }

    setSuccessMsg(editingItem ? "Canvis desats correctament" : "Element creat amb èxit");
    setEditingItem(null);
    carregarCmsRows(activeTab);
    carregarComptadors();
  };

  const finalitzarRallyLive = async () => {
    const activeRows = cmsRows.filter((r) => r.is_live);
    if (activeRows.length === 0) {
      alert("No hi ha cap tram actiu en directe per arxivar.");
      return;
    }

    const choice = window.confirm(
      `Vols finalitzar el ral·li i arxivar els ${activeRows.length} trams actius?\n\n- Prem ACCEPTAR per obrir l'assistent i publicar els Resultats Oficials a partir dels temps del Live.\n- Prem CANCEL·LAR si només vols arxivar els trams directament sense publicar resultats.`
    );

    if (choice) {
      const activeEvId = activeRows[0]?.event_id ? Number(activeRows[0].event_id) : null;
      setConsolidarEventId(activeEvId);
      setMostrarModalConsolidar(true);
      return;
    }

    const confirmJustArchive = window.confirm(
      `Segur que vols només arxivar els ${activeRows.length} trams del Live sense generar resultats oficials?`
    );
    if (!confirmJustArchive) return;

    try {
      const { error: err } = await supabase.from("live_updates").update({ is_live: false }).eq("is_live", true);
      if (err) throw err;
      setSuccessMsg(`S'han arxivat correctament els ${activeRows.length} trams. El ral·li ha quedat marcat com a finalitzat.`);
      carregarCmsRows("live");
    } catch (e: any) {
      setError("Error arxivant els trams: " + e.message);
    }
  };

  // Filtre de resultats
  const filteredResults =
    activeTab === "results"
      ? carFilterResults === "all"
        ? cmsRows
        : cmsRows.filter((r) => Number(r.car_id) === Number(carFilterResults))
      : cmsRows;

  // Renderitzat de càrrega o login
  if (loading && !session) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white">
        <div className="text-2xl font-black italic">
          VELOCI<span className="text-yellow-400">CAT</span> Admin
        </div>
        <p className="mt-4 font-bold text-gray-400 animate-pulse">Carregant el panell d'administració...</p>
      </div>
    );
  }

  if (session && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border-t-8 border-red-600 text-center">
          <h1 className="text-3xl font-black italic text-gray-900 uppercase mb-4">
            Accés <span className="text-red-600">Restringit</span>
          </h1>
          <p className="text-gray-600 font-medium mb-6">
            Aquest compte no disposa de privilegis d'administrador. Contacta amb l'escuderia per a obtenir accés.
          </p>
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-gray-900 text-white font-black uppercase rounded-lg shadow hover:bg-gray-800 transition"
          >
            Tancar Sessió
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border-t-8 border-yellow-400">
          <div className="text-center mb-8">
            <span className="text-xs font-black uppercase tracking-wider text-red-600 bg-red-50 px-3 py-1 rounded-full">
              Panell Unificat
            </span>
            <h1 className="text-3xl font-black italic text-gray-950 uppercase mt-3">
              VELOCI<span className="text-yellow-500">CAT</span> Admin
            </h1>
            <p className="text-sm text-gray-500 mt-1">Gestió completa de la flota, curses, resultats i contingut</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Correu electrònic</label>
              <input
                type="email"
                required
                placeholder="admin@velocicat.cat"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-red-600 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Contrasenya</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-red-600 transition"
              />
            </div>
            {error && <p className="text-red-700 font-bold text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{error}</p>}
            <button
              disabled={loading}
              type="submit"
              className="mt-2 w-full py-4 bg-yellow-400 text-red-700 font-black text-lg uppercase rounded-lg shadow-md hover:bg-yellow-500 transition duration-150"
            >
              Entrar al Panell
            </button>
          </form>
          <div className="mt-6 text-center">
            <Link href="/" className="text-xs font-bold text-gray-500 hover:text-gray-900 transition">
              ← Tornar al web públic
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const reservesPendentsCount = reserves.filter((r) => r.status === "pendent").length;

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      {/* CAPÇALERA PRINCIPAL UNIFICADA */}
      <header className="sticky top-0 z-40 bg-gray-950 text-white shadow-lg border-b border-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-xl font-black italic uppercase tracking-wider">
              VELOCI<span className="text-yellow-400">CAT</span>
              <span className="ml-2 text-xs font-black uppercase text-gray-400 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
                Panell Unificat
              </span>
            </div>
            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-yellow-400 transition"
            >
              Veure web públic ↗
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-400 hidden md:inline">
              Sessió: <b className="text-gray-200">{session?.user?.email}</b>
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-black uppercase text-white shadow hover:bg-red-700 transition"
            >
              Tancar Sessió
            </button>
          </div>
        </div>

        {/* BARRA DE PESTANYES UNIFICADA */}
        <div className="bg-gray-900 border-t border-gray-800/80 px-4">
          <div className="mx-auto max-w-7xl flex gap-1 overflow-x-auto py-2 scrollbar-thin">
            {(Object.keys(tabMeta) as Tab[]).map((tabKey) => {
              const meta = tabMeta[tabKey];
              const isActive = activeTab === tabKey;
              return (
                <button
                  key={tabKey}
                  onClick={() => {
                    setActiveTab(tabKey);
                    setEditingItem(null);
                    setError("");
                    setSuccessMsg("");
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-black uppercase whitespace-nowrap transition duration-150 ${
                    isActive
                      ? "bg-yellow-400 text-red-700 shadow-md transform -translate-y-0.5"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <span>{meta.icon}</span>
                  <span>{meta.label}</span>

                  {tabKey === "bookings" && reservesPendentsCount > 0 && (
                    <span className="rounded-full bg-red-600 px-1.5 py-0.2 text-[10px] font-black text-white">
                      {reservesPendentsCount}
                    </span>
                  )}
                  {tabKey === "contacts" && contactesNousCount > 0 && (
                    <span className="rounded-full bg-blue-500 px-1.5 py-0.2 text-[10px] font-black text-white">
                      {contactesNousCount}
                    </span>
                  )}
                  {tabKey === "flota" && cotxes.length > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                        isActive ? "bg-red-700 text-yellow-300" : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {cotxes.length}
                    </span>
                  )}
                  {tabKey === "results" && resultatsTotalCount > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                        isActive ? "bg-red-700 text-yellow-300" : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {resultatsTotalCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* MISSATGES DE NOTIFICACIÓ */}
      <div className="mx-auto max-w-7xl px-4 pt-4">
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-red-100 border border-red-300 p-4 font-bold text-red-800 shadow-sm">
            <span>{error}</span>
            <button onClick={() => setError("")} className="font-black text-red-700 hover:text-red-900 ml-4">
              ✕
            </button>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-green-100 border border-green-300 p-4 font-bold text-green-800 shadow-sm">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg("")} className="font-black text-green-700 hover:text-green-900 ml-4">
              ✕
            </button>
          </div>
        )}
      </div>

      <main className="mx-auto max-w-7xl px-4 pt-2">
        {/* ========================================================= */}
        {/* PESTANYA: LA FLOTA */}
        {/* ========================================================= */}
        {activeTab === "flota" && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm border">
              <div>
                <h1 className="text-3xl font-black italic uppercase text-gray-900">La Flota de Vehicles</h1>
                <p className="text-sm font-medium text-gray-500 mt-1">
                  Gestiona els cotxes de competició, tarifes de lloguer i fotografies
                </p>
              </div>
              <button
                onClick={obrirModalNouCotxe}
                className="rounded-lg bg-yellow-400 px-5 py-2.5 font-black uppercase text-red-700 shadow-sm hover:bg-yellow-500 transition duration-150 hover:-translate-y-0.5"
              >
                + Afegir Nou Cotxe
              </button>
            </div>

            {/* KPI resum de la flota */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <span className="text-xs font-bold uppercase text-gray-500">Total Flota</span>
                <p className="mt-1 text-2xl font-black text-gray-950">{cotxes.length}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <span className="text-xs font-bold uppercase text-gray-500">Disponibles Lloguer</span>
                <p className="mt-1 text-2xl font-black text-emerald-600">
                  {cotxes.filter((c) => c.ownership !== "particular" && (c.rentable_rally !== false || c.rentable_sprint)).length}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <span className="text-xs font-bold uppercase text-gray-500">Vehicles Particulars</span>
                <p className="mt-1 text-2xl font-black text-yellow-600">
                  {cotxes.filter((c) => c.ownership === "particular").length}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <span className="text-xs font-bold uppercase text-gray-500">Grups FIA</span>
                <p className="mt-1 text-2xl font-black text-gray-900">
                  {new Set(cotxes.map((c) => c.fia_group).filter(Boolean)).size}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cotxes.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-sm flex flex-col justify-between transition hover:shadow-md"
                >
                  <div>
                    {c.photos?.[0] ? (
                      <div className="relative h-48 w-full bg-gray-900">
                        <img src={c.photos[0]} alt={c.model} className="h-full w-full object-cover" />
                        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-[11px] font-bold text-white">
                          {c.photos.length} {c.photos.length === 1 ? "foto" : "fotos"}
                        </span>
                      </div>
                    ) : (
                      <div className="h-48 w-full bg-gray-900 flex items-center justify-center text-gray-600 font-bold">
                        Sense fotos
                      </div>
                    )}

                    <div className="p-5">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-red-600 px-2.5 py-0.5 text-xs font-black uppercase text-white">
                          {c.fia_group}
                        </span>
                        <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-bold uppercase text-red-700">
                          {c.ownership === "particular" ? "Particular" : "Escuderia"}
                        </span>
                      </div>

                      <h2 className="mt-3 text-2xl font-black italic uppercase text-gray-900">{c.model}</h2>

                      <div className="mt-3 space-y-1 text-xs font-medium text-gray-600">
                        <div>
                          <b className="text-gray-900">Rally:</b>{" "}
                          {c.rentable_rally !== false ? `${c.daily_rate} €` : "No disponible"}
                        </div>
                        <div>
                          <b className="text-gray-900">Sprint / Pujada:</b>{" "}
                          {c.rentable_sprint ? `${c.sprint_rate ?? 0} €` : "No disponible"}
                        </div>
                      </div>

                      {/* Enllaços ràpids per al cotxe */}
                      <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2 text-xs">
                        <Link
                          href={`/flota/${c.id}`}
                          target="_blank"
                          className="font-bold text-gray-600 hover:text-red-600 transition flex items-center gap-1"
                        >
                          Fitxa pública ↗
                        </Link>
                        <button
                          onClick={() => {
                            setActiveTab("results");
                            setCarFilterResults(c.id);
                          }}
                          className="font-black text-yellow-600 hover:text-yellow-700 transition"
                        >
                          Veure resultats →
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <div className="flex gap-2 border-t pt-3">
                      <button
                        onClick={() => actualitzarEstatCotxe(c.id, "disponible")}
                        className={`flex-1 text-xs font-bold uppercase py-2 rounded-lg transition ${
                          c.status === "disponible"
                            ? "bg-green-600 text-white shadow-sm"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        Disponible
                      </button>
                      <button
                        onClick={() => actualitzarEstatCotxe(c.id, "manteniment")}
                        className={`flex-1 text-xs font-bold uppercase py-2 rounded-lg transition ${
                          c.status === "manteniment"
                            ? "bg-orange-500 text-white shadow-sm"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        Manteniment
                      </button>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => obrirModalEditarCotxe(c)}
                        className="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-black uppercase text-white hover:bg-gray-800 transition shadow-sm"
                      >
                        Editar Vehicle
                      </button>
                      <button
                        onClick={() => eliminarCotxe(c.id)}
                        className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-black uppercase text-red-700 hover:bg-red-100 transition"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* PESTANYA: RALLYS I ESDEVENIMENTS */}
        {/* ========================================================= */}
        {activeTab === "events" && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm border">
              <div>
                <h1 className="text-3xl font-black italic uppercase text-gray-900">Calendari de Rallys & Curses</h1>
                <p className="text-sm font-medium text-gray-500 mt-1">
                  Programa oficial de proves, dates i assignació de cotxes
                </p>
              </div>
              <button
                onClick={obrirModalNouEvent}
                className="rounded-lg bg-gray-950 px-5 py-2.5 font-black uppercase text-white shadow-sm hover:bg-gray-800 transition duration-150 hover:-translate-y-0.5"
              >
                + Afegir Rally
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {esdeveniments.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm flex flex-col justify-between transition hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-yellow-400 px-2.5 py-0.5 text-xs font-black uppercase text-red-700">
                        {ev.event_type === "rally_sprint"
                          ? "Rally-sprint"
                          : ev.event_type === "pujada_costa"
                          ? "Pujada en costa"
                          : "Rally"}
                      </span>
                      <Link
                        href={`/rallys/${ev.id}`}
                        target="_blank"
                        className="text-xs font-bold text-gray-500 hover:text-red-600 transition"
                      >
                        Fitxa cursa ↗
                      </Link>
                    </div>

                    <h2 className="mt-3 text-2xl font-black uppercase text-gray-900">{ev.name}</h2>

                    <div className="mt-4 space-y-1.5 text-sm text-gray-600 font-medium">
                      <div className="flex items-center gap-2">
                        <span>🟢 Inici:</span>
                        <b>{new Date(ev.start_date).toLocaleDateString("ca-ES")}</b>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>🏁 Final:</span>
                        <b>{new Date(ev.end_date).toLocaleDateString("ca-ES")}</b>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t">
                      <p className="text-xs font-bold uppercase text-gray-500">
                        Vehicles assignats: {ev.assigned_cars?.length || 0}
                      </p>
                      {ev.assigned_cars?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {ev.assigned_cars.map((carId: number) => {
                            const found = cotxes.find((c) => c.id === carId);
                            return (
                              <span
                                key={carId}
                                className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-700"
                              >
                                {found?.model || `#${carId}`}
                              </span>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-2 pt-3 border-t">
                    <button
                      onClick={() => setRecomanacionsEvent(ev)}
                      className="w-full rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-300 text-gray-950 font-black uppercase text-xs px-3.5 py-2.5 shadow-sm transition flex items-center justify-center gap-2 border border-yellow-300 hover:shadow-md"
                    >
                      <span>🎯 Recomanacions de Lloguer (IA)</span>
                      {ev.assigned_cars?.length ? (
                        <span className="rounded-full bg-gray-950/10 px-2 py-0.5 text-[10px] font-black">
                          {ev.assigned_cars.length} {ev.assigned_cars.length === 1 ? "vehicle" : "vehicles"}
                        </span>
                      ) : null}
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => obrirModalEditarEvent(ev)}
                        className="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-black uppercase text-white hover:bg-gray-800 transition"
                      >
                        Editar Cursa
                      </button>
                      <button
                        onClick={() => eliminarEsdeveniment(ev.id)}
                        className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-black uppercase text-red-700 hover:bg-red-100 transition"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* PESTANYA: RESERVES DE LLOGUER */}
        {/* ========================================================= */}
        {activeTab === "bookings" && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm border">
              <div>
                <h1 className="text-3xl font-black italic uppercase text-gray-900">Sol·licituds de Lloguer</h1>
                <p className="text-sm font-medium text-gray-500 mt-1">
                  Gestió de reserves dels vehicles de competició de l'equip
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-yellow-100 px-3 py-1 text-xs font-black uppercase text-yellow-800">
                  {reservesPendentsCount} pendents
                </span>
                <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-bold uppercase text-gray-700">
                  Total: {reserves.length}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {reserves.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed bg-white p-12 text-center font-bold text-gray-500">
                  No hi ha cap reserva registrada actualment.
                </div>
              ) : (
                reserves.map((reserva) => (
                  <div
                    key={reserva.id}
                    className="rounded-2xl border bg-white p-6 shadow-sm flex flex-wrap items-center justify-between gap-4 transition hover:shadow-md"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                            reserva.status === "pendent"
                              ? "bg-yellow-200 text-yellow-900"
                              : reserva.status === "confirmada"
                              ? "bg-green-200 text-green-900"
                              : reserva.status === "finalitzada"
                              ? "bg-blue-100 text-blue-900"
                              : "bg-gray-200 text-gray-800"
                          }`}
                        >
                          {reserva.status}
                        </span>
                        <h2 className="text-xl font-black text-gray-900">{reserva.customers?.name || "Client"}</h2>
                        {reserva.customers?.phone && (
                          <a
                            href={`tel:${reserva.customers.phone}`}
                            className="font-mono text-xs font-bold text-blue-600 hover:underline"
                          >
                            📞 {reserva.customers.phone}
                          </a>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 font-medium">
                        <div>
                          <b>Vehicle:</b> {reserva.rally_cars?.model || "—"}
                        </div>
                        <div>
                          <b>Rally:</b> {reserva.rally_events?.name || "—"}
                        </div>
                        {reserva.rental_rate && (
                          <div>
                            <b>Tarifa:</b> {reserva.rental_rate} €
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {reserva.status !== "confirmada" && (
                        <button
                          onClick={() => actualitzarEstatReserva(reserva.id, "confirmada")}
                          className="rounded-lg bg-green-600 px-3.5 py-2 text-xs font-black uppercase text-white hover:bg-green-700 transition shadow-sm"
                        >
                          Confirmar
                        </button>
                      )}
                      {reserva.status !== "pendent" && (
                        <button
                          onClick={() => actualitzarEstatReserva(reserva.id, "pendent")}
                          className="rounded-lg bg-yellow-400 px-3 py-2 text-xs font-black uppercase text-red-700 hover:bg-yellow-500 transition"
                        >
                          Marcar Pendent
                        </button>
                      )}
                      {reserva.status !== "finalitzada" && (
                        <button
                          onClick={() => actualitzarEstatReserva(reserva.id, "finalitzada")}
                          className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-black uppercase text-white hover:bg-gray-800 transition"
                        >
                          Finalitzar
                        </button>
                      )}
                      <button
                        onClick={() => eliminarReserva(reserva.id)}
                        className="rounded-lg bg-red-100 px-3 py-2 text-xs font-black uppercase text-red-700 hover:bg-red-200 transition"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* PESTANYES CMS: RESULTATS, PILOTS, NOTÍCIES, GALERIA, ETC. */}
        {/* ========================================================= */}
        {cmsTableOf[activeTab] && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm border">
              <div>
                <h1 className="text-3xl font-black italic uppercase text-gray-900">{tabMeta[activeTab].label}</h1>
                <p className="text-sm font-medium text-gray-500 mt-1">
                  Gestió de continguts i publicació al web oficial
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {activeTab === "live" && (
                  <button
                    onClick={() => {
                      const activeEvId =
                        cmsRows.find((r) => r.is_live)?.event_id ||
                        cmsRows[0]?.event_id ||
                        relations.events[0]?.id ||
                        null;
                      setConsolidarEventId(activeEvId ? Number(activeEvId) : null);
                      setMostrarModalConsolidar(true);
                    }}
                    className="rounded-lg bg-yellow-400 px-4 py-2.5 font-black uppercase text-red-700 shadow-sm hover:bg-yellow-500 transition duration-150 hover:-translate-y-0.5 text-xs flex items-center gap-1.5"
                  >
                    <span>📊</span>
                    Consolidar a Resultats
                  </button>
                )}

                {activeTab === "results" && (
                  <button
                    onClick={() => {
                      setConsolidarEventId(relations.events[0]?.id || null);
                      setMostrarModalConsolidar(true);
                    }}
                    className="rounded-lg bg-yellow-400 px-4 py-2.5 font-black uppercase text-red-700 shadow-sm hover:bg-yellow-500 transition duration-150 hover:-translate-y-0.5 text-xs flex items-center gap-1.5"
                  >
                    <span>📥</span>
                    Importar des de LIVE
                  </button>
                )}

                {activeTab === "live" && cmsRows.some((r) => r.is_live) && (
                  <button
                    onClick={finalitzarRallyLive}
                    className="rounded-lg bg-red-600 px-4 py-2.5 font-black uppercase text-white shadow-sm hover:bg-red-700 transition duration-150 hover:-translate-y-0.5 text-xs flex items-center gap-1.5"
                  >
                    <span>🏁</span>
                    Finalitzar Ral·li ({cmsRows.filter((r) => r.is_live).length} actius)
                  </button>
                )}

                {activeTab !== "contacts" && !(activeTab === "profile" && cmsRows.length > 0) && (
                  <button
                    onClick={() => {
                      setError("");
                      setSuccessMsg("");
                      setEditingItem(
                        activeTab === "profile"
                          ? { published: true, name: "VelociCAT" }
                          : activeTab === "results"
                          ? {
                              published: true,
                              season: new Date().getFullYear(),
                              status: "finished",
                              car_id: carFilterResults !== "all" ? carFilterResults : null,
                            }
                          : { published: true, is_live: true, season: new Date().getFullYear() }
                      );
                    }}
                    className="rounded-lg bg-gray-950 px-5 py-2.5 font-black uppercase text-white shadow-sm hover:bg-gray-800 transition duration-150 hover:-translate-y-0.5"
                  >
                    + Crear {tabMeta[activeTab].label}
                  </button>
                )}
              </div>
            </div>

            {/* SECCIÓ ESPECIAL D'EXTRACIÓ AUTOMÀTICA PER A RALLY LIVE */}
            {activeTab === "live" && (
              <LiveSyncStation
                events={relations.events}
                drivers={relations.drivers}
                liveRows={cmsRows}
                onRefresh={() => carregarCmsRows("live")}
                onSuccess={(msg) => setSuccessMsg(msg)}
                onError={(msg) => setError(msg)}
              />
            )}

            {/* Filtre específic per a resultats */}
            {activeTab === "results" && (
              <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border">
                <span className="text-xs font-bold uppercase text-gray-600">Filtrar per vehicle:</span>
                <select
                  value={carFilterResults}
                  onChange={(e) =>
                    setCarFilterResults(e.target.value === "all" ? "all" : Number(e.target.value))
                  }
                  className="rounded-lg border px-3 py-1.5 text-xs font-bold text-gray-800"
                >
                  <option value="all">Tots els vehicles ({cmsRows.length})</option>
                  {relations.cars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} ({cmsRows.filter((r) => Number(r.car_id) === c.id).length})
                    </option>
                  ))}
                </select>
                {carFilterResults !== "all" && (
                  <button
                    onClick={() => setCarFilterResults("all")}
                    className="text-xs font-bold text-red-600 hover:underline"
                  >
                    Netejar filtre
                  </button>
                )}
              </div>
            )}

            <div className={`grid gap-8 ${activeTab === "contacts" ? "grid-cols-1" : "lg:grid-cols-[1fr_1.3fr]"}`}>
              {/* FORMULARI EDITOR (si s'està editant o creant) */}
              {editingItem && activeTab !== "contacts" && (
                <CmsEditor
                  key={editingItem ? `${activeTab}-${editingItem.id ?? "nou"}` : `${activeTab}-nou`}
                  tab={activeTab}
                  row={editingItem}
                  relations={relations}
                  onSave={guardarCmsItem}
                  onCancel={() => setEditingItem(null)}
                />
              )}

              {/* LLISTA D'ITEMS */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h2 className="text-lg font-black uppercase text-gray-900">
                    Llistat de {tabMeta[activeTab].label} ({filteredResults.length})
                  </h2>
                </div>

                {filteredResults.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed p-8 text-center font-bold text-gray-500">
                    No hi ha cap element registrat en aquest apartat.
                  </div>
                ) : (
                  filteredResults.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl border border-gray-200 p-4 shadow-sm hover:border-gray-300 transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <CmsSummary tab={activeTab} row={r} relations={relations} />
                        </div>

                        {activeTab !== "contacts" && (
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => {
                                setError("");
                                setSuccessMsg("");
                                setEditingItem(r);
                              }}
                              className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-black uppercase text-gray-800 hover:bg-gray-200 transition"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => eliminarCmsItem(r.id)}
                              className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-black uppercase text-red-700 hover:bg-red-200 transition"
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>

                      {activeTab === "contacts" && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                          <button
                            onClick={async () => {
                              const nouEstat = r.status === "new" ? "read" : "new";
                              const { error: err } = await supabase
                                .from("contact_messages")
                                .update({ status: nouEstat })
                                .eq("id", r.id);
                              if (err) {
                                setError("No s'ha pogut canviar l'estat: " + err.message);
                                return;
                              }
                              setSuccessMsg("Estat actualitzat");
                              carregarCmsRows("contacts");
                              carregarComptadors();
                            }}
                            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-black uppercase text-white hover:bg-gray-800 transition"
                          >
                            {r.status === "new" ? "Marcar com a llegit" : "Marcar com a nou"}
                          </button>
                          <button
                            onClick={() => eliminarCmsItem(r.id)}
                            className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-black uppercase text-red-700 hover:bg-red-200 transition"
                          >
                            Eliminar missatge
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL NOU / EDITAR COTXE */}
      {/* ========================================================= */}
      {mostrarModalCotxe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-2xl font-black italic uppercase text-gray-900">
                {cotxeEditant ? "Editar Vehicle" : "Nou Vehicle a la Flota"}
              </h2>
              <button
                onClick={() => setMostrarModalCotxe(false)}
                className="text-gray-400 hover:text-gray-900 font-black text-xl"
              >
                ✕
              </button>
            </div>

            {errorModalCotxe && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg text-sm font-bold">
                {errorModalCotxe}
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Model del Vehicle *</label>
                <input
                  type="text"
                  placeholder="p. ex. FORD FOCUS MK1 1.6 16V"
                  value={formCotxe.model}
                  onChange={(e) => setFormCotxe({ ...formCotxe, model: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2 font-bold focus:border-red-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Grup FIA *</label>
                  <input
                    type="text"
                    placeholder="p. ex. Gr. A, Rally4, N..."
                    value={formCotxe.fia_group}
                    onChange={(e) => setFormCotxe({ ...formCotxe, fia_group: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Propietat</label>
                  <select
                    value={formCotxe.ownership}
                    onChange={(e) => setFormCotxe({ ...formCotxe, ownership: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 focus:border-red-600 focus:outline-none"
                  >
                    <option value="escuderia">Vehicle de l'escuderia</option>
                    <option value="particular">Vehicle particular</option>
                  </select>
                </div>
              </div>

              {formCotxe.ownership === "escuderia" && (
                <div className="rounded-xl bg-gray-50 p-4 border space-y-3">
                  <p className="text-xs font-black uppercase text-gray-700">Tarifes de lloguer per a pilots</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Tarifa Rally (€)</label>
                      <input
                        type="number"
                        value={formCotxe.daily_rate}
                        onChange={(e) => setFormCotxe({ ...formCotxe, daily_rate: e.target.value })}
                        className="w-full border rounded-lg px-3 py-1.5 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Tarifa Sprint / Pujada (€)</label>
                      <input
                        type="number"
                        value={formCotxe.sprint_rate}
                        onChange={(e) => setFormCotxe({ ...formCotxe, sprint_rate: e.target.value })}
                        className="w-full border rounded-lg px-3 py-1.5 font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formCotxe.rentable_rally}
                        onChange={(e) => setFormCotxe({ ...formCotxe, rentable_rally: e.target.checked })}
                      />
                      Lloguer disponible per a Rally
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formCotxe.rentable_sprint}
                        onChange={(e) => setFormCotxe({ ...formCotxe, rentable_sprint: e.target.checked })}
                      />
                      Lloguer disponible per a Sprint
                    </label>
                  </div>
                </div>
              )}

              {/* FOTOGRAFIES DEL VEHICLE */}
              <div className="space-y-2 border-t pt-4">
                <label className="block text-xs font-bold uppercase text-gray-700">
                  Fotografies del Vehicle ({formCotxe.photos.length})
                </label>
                {formCotxe.photos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {formCotxe.photos.map((url, idx) => (
                      <div key={url + idx} className="relative group rounded-lg overflow-hidden border bg-gray-900">
                        <img src={url} alt="Cotxe" className="h-20 w-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => moureFoto(idx, "esquerra")}
                              className="text-white bg-gray-800 p-1 rounded text-xs hover:bg-gray-700"
                            >
                              ←
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => desenllacarFoto(idx)}
                            className="text-white bg-red-600 p-1 rounded text-xs hover:bg-red-700"
                          >
                            ✕
                          </button>
                          {idx < formCotxe.photos.length - 1 && (
                            <button
                              type="button"
                              onClick={() => moureFoto(idx, "dreta")}
                              className="text-white bg-gray-800 p-1 rounded text-xs hover:bg-gray-700"
                            >
                              →
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setArxiusFotos(e.target.files)}
                    className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-gray-900 file:text-white hover:file:bg-gray-800 cursor-pointer"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Pots seleccionar diverses fotos simultàniament (màxim 8 MB cadascuna).
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
              <button
                type="button"
                onClick={() => setMostrarModalCotxe(false)}
                className="rounded-lg px-4 py-2 font-bold text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel·lar
              </button>
              <button
                type="button"
                disabled={pujantFotos}
                onClick={guardarCotxe}
                className="rounded-lg bg-yellow-400 px-6 py-2 font-black uppercase text-red-700 hover:bg-yellow-500 transition shadow-sm"
              >
                {pujantFotos ? "Pujant fotografies..." : cotxeEditant ? "Desar Canvis" : "Crear Vehicle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL NOU / EDITAR ESDEVENIMENT */}
      {/* ========================================================= */}
      {mostrarModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-2xl font-black italic uppercase text-gray-900">
                {eventEditant ? "Editar Esdeveniment" : "Nou Rally o Cursa"}
              </h2>
              <button
                onClick={() => setMostrarModalEvent(false)}
                className="text-gray-400 hover:text-gray-900 font-black text-xl"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Nom de la cursa *</label>
                <input
                  type="text"
                  placeholder="p. ex. Rally Lloret de Mar"
                  value={formEvent.name}
                  onChange={(e) => setFormEvent({ ...formEvent, name: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2 font-bold focus:border-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Tipus de prova</label>
                <select
                  value={formEvent.event_type}
                  onChange={(e) => setFormEvent({ ...formEvent, event_type: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2 focus:border-red-600 focus:outline-none"
                >
                  <option value="rally">Rally (amb copilot)</option>
                  <option value="rally_sprint">Rally-sprint (amb copilot)</option>
                  <option value="pujada_costa">Pujada en costa (individual)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Data d'inici *</label>
                  <input
                    type="date"
                    value={formEvent.start_date}
                    onChange={(e) => setFormEvent({ ...formEvent, start_date: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Data de finalització *</label>
                  <input
                    type="date"
                    value={formEvent.end_date}
                    onChange={(e) => setFormEvent({ ...formEvent, end_date: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Assignar vehicles de la flota per a aquest rally:
                </label>
                <div className="space-y-1 max-h-36 overflow-y-auto border rounded-lg p-3">
                  {cotxes.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formEvent.assigned_cars.includes(c.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormEvent({ ...formEvent, assigned_cars: [...formEvent.assigned_cars, c.id] });
                          } else {
                            setFormEvent({
                              ...formEvent,
                              assigned_cars: formEvent.assigned_cars.filter((id) => id !== c.id),
                            });
                          }
                        }}
                      />
                      {c.model} ({c.fia_group})
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
              <button
                type="button"
                onClick={() => setMostrarModalEvent(false)}
                className="rounded-lg px-4 py-2 font-bold text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel·lar
              </button>
              <button
                type="button"
                onClick={guardarEsdeveniment}
                className="rounded-lg bg-gray-950 px-6 py-2 font-black uppercase text-white hover:bg-gray-800 transition shadow-sm"
              >
                {eventEditant ? "Desar Canvis" : "Crear Cursa"}
              </button>
            </div>
          </div>
        </div>
      )}
      {mostrarModalConsolidar && (
        <ConsolidarResultatsModal
          initialEventId={consolidarEventId}
          events={relations.events}
          drivers={relations.drivers}
          cars={relations.cars}
          onClose={() => setMostrarModalConsolidar(false)}
          onSuccess={(msg) => setSuccessMsg(msg)}
          onError={(msg) => setError(msg)}
          onRefreshLive={() => carregarCmsRows("live")}
          onRefreshResults={() => {
            if (activeTab === "results") carregarCmsRows("results");
            carregarComptadors();
          }}
        />
      )}
      {recomanacionsEvent && (
        <EventRecommendationsModal
          event={recomanacionsEvent}
          cars={cotxes}
          bookings={reserves}
          contacts={allContacts}
          onClose={() => setRecomanacionsEvent(null)}
          onGoToBookings={() => {
            setRecomanacionsEvent(null);
            setActiveTab("bookings");
          }}
        />
      )}
    </div>
  );
}

// =========================================================================
// MODAL DE CONSOLIDACIÓ: TRASPÀS DE RALLY LIVE A RESULTATS OFICIALS
// =========================================================================

function ConsolidarResultatsModal({
  initialEventId,
  events,
  drivers,
  cars,
  onClose,
  onSuccess,
  onError,
  onRefreshLive,
  onRefreshResults,
}: {
  initialEventId: number | null;
  events: Option[];
  drivers: Option[];
  cars: Option[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  onRefreshLive: () => void;
  onRefreshResults: () => void;
}) {
  const [selectedEventId, setSelectedEventId] = useState<number | null>(
    initialEventId || (events[0] ? events[0].id : null)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archiveLive, setArchiveLive] = useState(true);
  const [publishResults, setPublishResults] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedEventId) {
      setLoading(false);
      setRows([]);
      return;
    }

    let cancel = false;
    const carregarTrams = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("live_updates")
          .select("*,drivers(id,name,number,car_id,role)")
          .eq("event_id", selectedEventId)
          .order("id", { ascending: true });

        if (error) throw error;
        if (cancel) return;

        if (!data || data.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }

        // Agrupar per pilot (driver_id)
        const map = new Map<number, any[]>();
        data.forEach((u) => {
          const dId = u.driver_id ? Number(u.driver_id) : 0;
          if (!map.has(dId)) map.set(dId, []);
          map.get(dId)!.push(u);
        });

        const extractedRows: any[] = [];
        for (const [dId, updates] of map.entries()) {
          const latest = updates[updates.length - 1];
          const driverObj = drivers.find((d) => d.id === dId) || latest.drivers;
          const defaultCarId = driverObj?.carId || (cars[0] ? cars[0].id : null);
          const carObj = cars.find((c) => c.id === defaultCarId);
          const defaultCat = carObj?.fiaGroup || "Rally";
          const isDnf = /dnf|abandó|avaria|accident|sortida/i.test(latest.message || "");

          extractedRows.push({
            driver_id: dId || (drivers[0] ? drivers[0].id : null),
            driver_name: driverObj?.label || (driverObj?.name ? driverObj.name : "Pilot no assignat"),
            copilot_id: null,
            car_id: defaultCarId,
            category: defaultCat,
            overall_position: latest.position != null ? String(latest.position) : "",
            category_position: latest.category_position != null ? String(latest.category_position) : "",
            time: latest.time || "",
            gap: latest.gap || "",
            status: isDnf ? "dnf" : "finished",
            summary: latest.stage ? `Oficialitzat des del Live (${latest.stage})` : (latest.message || ""),
            latestStage: latest.stage || "Últim tram",
            included: true,
          });
        }

        setRows(extractedRows);
      } catch (err: any) {
        if (!cancel) onError("Error carregant dades del Live: " + err.message);
      } finally {
        if (!cancel) setLoading(false);
      }
    };

    carregarTrams();
    return () => {
      cancel = true;
    };
  }, [selectedEventId, drivers, cars, onError]);

  const updateRow = (index: number, patch: Partial<any>) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedEventId) {
      alert("Selecciona un ral·li vàlid.");
      return;
    }

    const selectedRows = rows.filter((r) => r.included && r.driver_id);
    if (selectedRows.length === 0) {
      alert("No hi ha cap pilot seleccionat per consolidar.");
      return;
    }

    setSaving(true);
    try {
      const ev = events.find((e) => e.id === Number(selectedEventId));
      const season = ev?.startDate ? new Date(ev.startDate).getFullYear() : new Date().getFullYear();

      let savedCount = 0;
      for (const row of selectedRows) {
        const { data: existing } = await supabase
          .from("rally_results")
          .select("id")
          .eq("event_id", Number(selectedEventId))
          .eq("driver_id", Number(row.driver_id))
          .maybeSingle();

        const payload = {
          event_id: Number(selectedEventId),
          driver_id: Number(row.driver_id),
          copilot_id: row.copilot_id ? Number(row.copilot_id) : null,
          car_id: row.car_id ? Number(row.car_id) : null,
          season: Number(season),
          category: row.category ? String(row.category).trim() : null,
          overall_position: row.overall_position !== "" ? Number(row.overall_position) : null,
          category_position: row.category_position !== "" ? Number(row.category_position) : null,
          status: row.status || "finished",
          time: row.time ? String(row.time).trim() : null,
          gap: row.gap ? String(row.gap).trim() : null,
          summary: row.summary ? String(row.summary).trim() : null,
          published: publishResults,
        };

        if (existing) {
          const { error: updErr } = await supabase
            .from("rally_results")
            .update(payload)
            .eq("id", existing.id);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase
            .from("rally_results")
            .insert(payload);
          if (insErr) throw insErr;
        }
        savedCount++;
      }

      if (archiveLive) {
        await supabase
          .from("live_updates")
          .update({ is_live: false })
          .eq("event_id", Number(selectedEventId));
      }

      onRefreshLive();
      onRefreshResults();
      onSuccess(
        `S'han publicat correctament ${savedCount} resultats oficials a la web, flota i pilots!`
      );
      onClose();
    } catch (err: any) {
      onError("Error consolidant els resultats: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl my-8 border border-gray-200">
        <div className="flex justify-between items-start border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-yellow-400 px-2 py-0.5 text-xs font-black uppercase text-red-950">
                Live &rarr; Resultats Oficials
              </span>
            </div>
            <h2 className="text-2xl font-black italic uppercase text-gray-900 mt-1">
              Consolidar Resultats Oficials
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Genera automàticament els resultats definitius a partir de l'últim tram registrat al Live de cada pilot.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 font-black text-2xl transition"
          >
            ✕
          </button>
        </div>

        {/* Selector de ral·li */}
        <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs font-black uppercase text-gray-700 mb-1">
              Ral·li de referència:
            </label>
            <select
              value={selectedEventId || ""}
              onChange={(e) => setSelectedEventId(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm font-bold text-gray-900 bg-white"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>

          <div className="text-right">
            <span className="text-xs text-gray-500 font-bold block">Estat del Live:</span>
            <span className="text-xs font-black uppercase text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full inline-block mt-0.5">
              {rows.length} {rows.length === 1 ? "pilot detectat" : "pilots detectats"}
            </span>
          </div>
        </div>

        {/* Llistat de pilots detectats */}
        <div className="mt-6">
          {loading ? (
            <div className="p-12 text-center text-gray-500 font-bold animate-pulse">
              Carregant trams i agrupant temps finals per pilot...
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center rounded-xl border-2 border-dashed border-gray-300">
              <p className="font-bold text-gray-700">
                Aquest ral·li no té cap tram registrat a la secció Rally LIVE.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Pots introduir temps des del Sincronitzador Automàtic o triar un altre ral·li.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {rows.map((row, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-4 transition ${
                    row.included
                      ? "border-gray-300 bg-white shadow-sm"
                      : "border-gray-200 bg-gray-50 opacity-60"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={row.included}
                        onChange={(e) => updateRow(idx, { included: e.target.checked })}
                        className="h-4 w-4 rounded text-red-600 focus:ring-red-500"
                      />
                      <span className="text-base font-black italic uppercase text-gray-900">
                        {row.driver_name}
                      </span>
                    </label>

                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className="text-gray-500">Últim tram:</span>
                      <span className="bg-yellow-100 text-red-800 px-2 py-0.5 rounded font-black">
                        {row.latestStage}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {/* Vehicle */}
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">Cotxe assignat:</label>
                      <select
                        value={row.car_id || ""}
                        onChange={(e) => {
                          const cid = Number(e.target.value);
                          const cObj = cars.find((c) => c.id === cid);
                          updateRow(idx, {
                            car_id: cid,
                            category: cObj?.fiaGroup || row.category,
                          });
                        }}
                        className="w-full border rounded-lg p-2 font-bold bg-white text-gray-900"
                      >
                        {cars.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Copilot */}
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">Copilot (opcional):</label>
                      <select
                        value={row.copilot_id || ""}
                        onChange={(e) =>
                          updateRow(idx, {
                            copilot_id: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="w-full border rounded-lg p-2 font-bold bg-white text-gray-900"
                      >
                        <option value="">Sense copilot / No definit</option>
                        {drivers
                          .filter((d) => d.id !== row.driver_id)
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.label}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Posició General */}
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">Pos. General:</label>
                      <input
                        type="number"
                        placeholder="Ex: 4"
                        value={row.overall_position}
                        onChange={(e) => updateRow(idx, { overall_position: e.target.value })}
                        className="w-full border rounded-lg p-2 font-black text-gray-900"
                      />
                    </div>

                    {/* Posició Categoria */}
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">Pos. Classe:</label>
                      <input
                        type="number"
                        placeholder="Ex: 1"
                        value={row.category_position}
                        onChange={(e) => updateRow(idx, { category_position: e.target.value })}
                        className="w-full border rounded-lg p-2 font-black text-gray-900"
                      />
                    </div>

                    {/* Temps Total */}
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">Temps Total:</label>
                      <input
                        type="text"
                        placeholder="Ex: 1:12:45.3"
                        value={row.time}
                        onChange={(e) => updateRow(idx, { time: e.target.value })}
                        className="w-full border rounded-lg p-2 font-mono font-bold text-gray-900"
                      />
                    </div>

                    {/* Diferència */}
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">Diferència:</label>
                      <input
                        type="text"
                        placeholder="Ex: +18.2s"
                        value={row.gap}
                        onChange={(e) => updateRow(idx, { gap: e.target.value })}
                        className="w-full border rounded-lg p-2 font-mono font-bold text-gray-900"
                      />
                    </div>

                    {/* Categoria */}
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">Categoria:</label>
                      <input
                        type="text"
                        placeholder="Ex: Rally4"
                        value={row.category}
                        onChange={(e) => updateRow(idx, { category: e.target.value })}
                        className="w-full border rounded-lg p-2 font-bold text-gray-900"
                      />
                    </div>

                    {/* Estat */}
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">Estat de cursa:</label>
                      <select
                        value={row.status}
                        onChange={(e) => updateRow(idx, { status: e.target.value })}
                        className="w-full border rounded-lg p-2 font-bold bg-white text-gray-900"
                      >
                        <option value="finished">Classificat / Finalitzat</option>
                        <option value="dnf">DNF (Abandó / Avaria)</option>
                        <option value="dsq">DSQ (Desqualificat)</option>
                        <option value="dns">DNS (No va sortir)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Opcions addicionals i botons d'acció */}
        <div className="mt-6 border-t pt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-gray-700 bg-gray-50 p-3 rounded-xl border">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={archiveLive}
                onChange={(e) => setArchiveLive(e.target.checked)}
                className="h-4 w-4 rounded text-red-600 focus:ring-red-500"
              />
              <span>Arxivar els trams del Live (marcar la cursa com a finalitzada a la web)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={publishResults}
                onChange={(e) => setPublishResults(e.target.checked)}
                className="h-4 w-4 rounded text-red-600 focus:ring-red-500"
              />
              <span>Publicar directament a la web (visible a Resultats, Cotxe i Pilot)</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border px-5 py-2.5 text-xs font-black uppercase text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
            >
              Cancel·lar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || rows.filter((r) => r.included).length === 0}
              className="rounded-lg bg-red-600 px-6 py-2.5 text-xs font-black uppercase text-white shadow hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Publicant resultats...
                </>
              ) : (
                <>
                  <span>💾</span>
                  Confirmar i Publicar Resultats ({rows.filter((r) => r.included).length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// COMPONENT LIVE SYNC STATION: EXTRACCIÓ I SINCRONITZACIÓ DE TEMPS
// =========================================================================

function LiveSyncStation({
  events,
  drivers,
  liveRows,
  onRefresh,
  onSuccess,
  onError,
}: {
  events: Option[];
  drivers: Option[];
  liveRows: Row[];
  onRefresh: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [selectedEventId, setSelectedEventId] = useState<number | "">("");
  const [selectedDriverId, setSelectedDriverId] = useState<number | "">("");
  const [timingUrl, setTimingUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "text">("url");

  const [loading, setLoading] = useState(false);
  const [detectedStages, setDetectedStages] = useState<any[]>([]);
  const [selectedStages, setSelectedStages] = useState<Record<string, boolean>>({});
  const [extractSource, setExtractSource] = useState<string>("");
  const [autoSync, setAutoSync] = useState(false);
  const [countdown, setCountdown] = useState(120);
  const [importing, setImporting] = useState(false);

  // Inicialització per defecte
  useEffect(() => {
    if (events.length > 0 && selectedEventId === "") {
      setSelectedEventId(events[0].id);
    }
    if (drivers.length > 0 && selectedDriverId === "") {
      setSelectedDriverId(drivers[0].id);
    }
  }, [events, drivers, selectedEventId, selectedDriverId]);

  // Recuperar URL guardada de localStorage quan canvia el ral·li
  useEffect(() => {
    if (selectedEventId !== "") {
      try {
        const saved = localStorage.getItem("velocicat_live_url_" + selectedEventId);
        if (saved) setTimingUrl(saved);
      } catch {
        // Ignorar errors de localStorage
      }
    }
  }, [selectedEventId]);

  // Executar extracció
  const extractTimes = useCallback(
    async (isAuto = false) => {
      if (inputMode === "url" && !timingUrl.trim()) {
        if (!isAuto) onError("Introdueix la URL oficial on es publiquen els temps.");
        return;
      }
      if (inputMode === "text" && !rawText.trim()) {
        if (!isAuto) onError("Enganxa el contingut o taula de la web oficial de temps.");
        return;
      }

      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Cal tenir la sessió iniciada.");

        const selEv = events.find((e) => e.id === Number(selectedEventId));
        const selDr = drivers.find((d) => d.id === Number(selectedDriverId));

        const res = await fetch("/api/extract-rally-times", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            url: inputMode === "url" ? timingUrl.trim() : undefined,
            rawText: inputMode === "text" ? rawText.trim() : undefined,
            driverName: selDr ? selDr.label.replace(/#\d+/, "").trim() : "VelociCAT",
            driverNumber: selDr?.number || undefined,
            rallyName: selEv ? selEv.label : undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Error connectant amb la web de temps.");

        if (Array.isArray(data.stages)) {
          setDetectedStages(data.stages);
          setExtractSource(data.source === "ai" ? "Intel·ligència Artificial (IA)" : "Parser de taules automàtic");

          // Seleccionar per defecte els nous trams
          const newMap: Record<string, boolean> = {};
          data.stages.forEach((st: any) => {
            const alreadyExists = liveRows.some(
              (r) =>
                Number(r.event_id) === Number(selectedEventId) &&
                String(r.stage).trim().toUpperCase() === String(st.stage).trim().toUpperCase()
            );
            newMap[st.stage] = !alreadyExists;
          });
          setSelectedStages(newMap);

          // Guardar URL per a aquest ral·li
          if (inputMode === "url" && timingUrl.trim() && selectedEventId !== "") {
            try {
              localStorage.setItem("velocicat_live_url_" + selectedEventId, timingUrl.trim());
            } catch {
              // Ignore
            }
          }

          if (!isAuto) {
            onSuccess(
              `S'han detectat ${data.stages.length} trams (${data.source === "ai" ? "amb IA" : "amb parser de taules"}).`
            );
          }
        }
      } catch (err: any) {
        if (!isAuto) onError(err.message || "Error analitzant els temps.");
      } finally {
        setLoading(false);
      }
    },
    [inputMode, timingUrl, rawText, selectedEventId, selectedDriverId, events, drivers, liveRows, onSuccess, onError]
  );

  // Timer per a auto-sync cada 120 segons (2 minuts)
  const extractRef = useRef(extractTimes);
  useEffect(() => {
    extractRef.current = extractTimes;
  }, [extractTimes]);

  useEffect(() => {
    if (!autoSync) {
      setCountdown(120);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          extractRef.current(true);
          return 120;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoSync]);

  // Importar trams seleccionats a Supabase
  const importStages = async () => {
    const toImport = detectedStages.filter((st) => selectedStages[st.stage] !== false);
    if (toImport.length === 0) {
      onError("No hi ha cap tram seleccionat per a importar.");
      return;
    }

    setImporting(true);
    let count = 0;
    try {
      for (const st of toImport) {
        // Comprovar si ja existia per a aquest rally i pilot
        const existing = liveRows.find(
          (r) =>
            Number(r.event_id) === Number(selectedEventId) &&
            String(r.stage).trim().toUpperCase() === String(st.stage).trim().toUpperCase()
        );

        const payload = {
          event_id: Number(selectedEventId),
          driver_id: selectedDriverId ? Number(selectedDriverId) : null,
          stage: st.stage,
          time: st.time,
          gap: st.gap,
          position: st.position,
          category_position: st.category_position,
          message: st.message || (st.position ? `Tram finalitzat en P${st.position}` : "Temps registrat"),
          is_live: true,
        };

        if (existing) {
          await supabase.from("live_updates").update(payload).eq("id", existing.id);
        } else {
          await supabase.from("live_updates").insert(payload);
        }
        count++;
      }

      onSuccess(`S'han publicat ${count} trams correctament al Rally LIVE!`);
      onRefresh();
    } catch (err: any) {
      onError("Error important els trams: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const selDriver = drivers.find((d) => d.id === Number(selectedDriverId));

  return (
    <div className="rounded-2xl bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6 text-white shadow-xl border border-yellow-400/40 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 items-center justify-center">
              <span className="h-2.5 w-2.5 animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-red-600" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-yellow-400">
              Sincronitzador Automàtic de Temps
            </span>
          </div>
          <h2 className="text-2xl font-black italic uppercase mt-1">Live Timing Extractor</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Vincula la URL del cronometratge oficial (Fotomotor, TiemposOnline, etc.) per extreure temps sense haver d'escriure'ls a mà.
          </p>
        </div>

        {/* Toggle Auto-Sync */}
        <div className="flex items-center gap-3 bg-gray-900 px-4 py-2 rounded-xl border border-gray-800">
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
              className="h-4 w-4 rounded accent-yellow-400 cursor-pointer"
            />
            <span>Auto-sincronitzar cada 2 min</span>
          </label>
          {autoSync && (
            <span className="rounded bg-yellow-400 px-2 py-0.5 font-mono text-[11px] font-black text-gray-950">
              {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
            </span>
          )}
        </div>
      </div>

      {/* CONFIGURACIÓ DE RAL·LI I PILOT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Ral·li en curs *</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white font-bold focus:border-yellow-400 focus:outline-none"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Pilot a seguir *</label>
          <select
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white font-bold focus:border-yellow-400 focus:outline-none"
          >
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          {selDriver?.number && (
            <span className="text-[11px] text-yellow-400 font-bold mt-1 block">
              Dorsal associat: #{selDriver.number}
            </span>
          )}
        </div>
      </div>

      {/* SECTOR D'ENTRADA DE FONT: URL O TEXT */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInputMode("url")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition ${
              inputMode === "url"
                ? "bg-yellow-400 text-gray-950 shadow"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            🌐 URL Oficial de Temps
          </button>
          <button
            type="button"
            onClick={() => setInputMode("text")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition ${
              inputMode === "text"
                ? "bg-yellow-400 text-gray-950 shadow"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            📋 Enganxar taula/text de la web (Pla B)
          </button>
        </div>

        {inputMode === "url" ? (
          <div className="space-y-1">
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://fotomotor.es/... o https://tiemposonline.es/..."
                value={timingUrl}
                onChange={(e) => setTimingUrl(e.target.value)}
                className="flex-1 rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-sm text-white focus:border-yellow-400 focus:outline-none"
              />
              {timingUrl && (
                <a
                  href={timingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-gray-800 px-3 py-2.5 text-xs font-bold text-gray-300 hover:text-white hover:bg-gray-700 transition"
                  title="Obrir enllaç en una pestanya nova"
                >
                  ↗ Obrir
                </a>
              )}
            </div>
            <p className="text-[11px] text-gray-400">
              Introdueix l'enllaç directe a la pàgina de temps o classificació del ral·li.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <textarea
              rows={4}
              placeholder="Copia la taula o text de la web del ral·li i enganxa-la aquí directament..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full rounded-lg bg-gray-900 border border-gray-700 p-3 text-xs text-white focus:border-yellow-400 focus:outline-none font-mono"
            />
            <p className="text-[11px] text-gray-400">
              Útil si la web oficial utilitza proteccions o bloqueja l'accés directe des del servidor.
            </p>
          </div>
        )}
      </div>

      {/* BOTÓ D'ACCSIÓ PRINCIPAL */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => extractTimes(false)}
          className="rounded-lg bg-yellow-400 px-6 py-2.5 font-black uppercase text-gray-950 hover:bg-yellow-500 transition shadow-lg hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-950 border-t-transparent" />
              <span>Analitzant i extreient temps...</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>Analitzar i extreure temps ara</span>
            </>
          )}
        </button>

        {extractSource && (
          <span className="text-xs font-medium text-gray-400">
            Motor utilitzat: <b className="text-yellow-400">{extractSource}</b>
          </span>
        )}
      </div>

      {/* RESULTATS DETECTATS I TAULA D'IMPORTACIÓ */}
      {detectedStages.length > 0 && (
        <div className="rounded-xl bg-gray-900 p-5 border border-gray-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
            <div>
              <h3 className="text-lg font-black uppercase text-white">
                Trams detectats ({detectedStages.length})
              </h3>
              <p className="text-xs text-gray-400">
                Selecciona els trams que vols publicar al Rally LIVE
              </p>
            </div>

            <button
              type="button"
              disabled={importing}
              onClick={importStages}
              className="rounded-lg bg-green-500 px-5 py-2 text-xs font-black uppercase text-gray-950 hover:bg-green-400 transition shadow disabled:opacity-50"
            >
              {importing ? "Publicant..." : `📥 Publicar al Rally LIVE (${Object.values(selectedStages).filter(Boolean).length})`}
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {detectedStages.map((st, idx) => {
              const alreadyExists = liveRows.some(
                (r) =>
                  Number(r.event_id) === Number(selectedEventId) &&
                  String(r.stage).trim().toUpperCase() === String(st.stage).trim().toUpperCase()
              );

              return (
                <div
                  key={st.stage + idx}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-950 p-3 border border-gray-800/80 hover:border-gray-700 transition"
                >
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedStages[st.stage] !== false}
                      onChange={(e) =>
                        setSelectedStages({ ...selectedStages, [st.stage]: e.target.checked })
                      }
                      className="h-4 w-4 rounded accent-yellow-400 cursor-pointer"
                    />
                    <div>
                      <b className="text-sm text-yellow-400">{st.stage}</b>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300 mt-0.5">
                        {st.time && <span>⏱️ <b>{st.time}</b></span>}
                        {st.gap && <span>Dif: <b>{st.gap}</b></span>}
                        {st.position && <span>Posició: <b>P{st.position}</b></span>}
                        {st.category_position && <span>Cat: <b>P{st.category_position}</b></span>}
                      </div>
                    </div>
                  </label>

                  <div className="flex items-center gap-2">
                    {alreadyExists ? (
                      <span className="rounded bg-gray-800 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-300">
                        Ja al Live (s'actualitzarà)
                      </span>
                    ) : (
                      <span className="rounded bg-green-900/60 border border-green-700 px-2 py-0.5 text-[10px] font-bold uppercase text-green-300">
                        Nou tram
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// COMPONENTS AUXILIARS CMS: Summary i Editor
// =========================================================================

function CmsSummary({ tab, row, relations }: { tab: Tab; row: Row; relations: Relations }) {
  if (tab === "profile") {
    return (
      <div>
        <b className="text-base text-gray-900">{row.name}</b>
        <p className="text-xs text-gray-500 mt-0.5">{row.tagline || "Sense tagline"}</p>
        <p className="text-xs text-gray-400 mt-1">
          {row.email || ""} {row.phone ? `· ${row.phone}` : ""} {row.location ? `· ${row.location}` : ""}
        </p>
      </div>
    );
  }

  if (tab === "drivers") {
    const car = relations.cars.find((c) => c.id === row.car_id);
    return (
      <div className="flex items-center gap-3">
        {row.photo_url ? (
          <img src={row.photo_url} alt={row.name} className="h-12 w-12 rounded-full object-cover border" />
        ) : (
          <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center font-black text-gray-600 text-sm">
            #{row.number || "—"}
          </div>
        )}
        <div>
          <b className="text-base text-gray-900">
            {row.name} {row.number ? `#${row.number}` : ""}
          </b>
          <p className="text-xs text-gray-500">
            {row.role} {car ? `· ${car.label}` : ""} {row.championship ? `· ${row.championship}` : ""}
          </p>
          <span
            className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
              row.published ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {row.published ? "Visible al web" : "Esborrany"}
          </span>
        </div>
      </div>
    );
  }

  if (tab === "news") {
    return (
      <div className="flex items-center gap-3">
        {row.cover_image && (
          <img src={row.cover_image} alt={row.title} className="h-14 w-20 rounded-lg object-cover border shrink-0" />
        )}
        <div>
          <b className="text-base text-gray-900">{row.title}</b>
          <p className="text-xs text-gray-500 mt-0.5">
            {row.category} · Slug: <code className="text-[11px] bg-gray-100 px-1 rounded">{row.slug}</code>
          </p>
          <span
            className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
              row.published ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {row.published ? "Publicada" : "Esborrany"}
          </span>
        </div>
      </div>
    );
  }

  if (tab === "sponsors") {
    return (
      <div className="flex items-center gap-3">
        {row.logo_url && (
          <img src={row.logo_url} alt={row.name} className="h-10 w-20 object-contain bg-gray-50 rounded p-1 border" />
        )}
        <div>
          <b className="text-base text-gray-900">{row.name}</b>
          <p className="text-xs text-gray-500">
            Tier: {row.tier} · Ordre: {row.sort_order ?? 0}
          </p>
        </div>
      </div>
    );
  }

  if (tab === "results") {
    const ev = relations.events.find((e) => e.id === Number(row.event_id));
    const dr = relations.drivers.find((d) => d.id === Number(row.driver_id));
    const cp = relations.drivers.find((d) => d.id === Number(row.copilot_id));
    const cr = relations.cars.find((c) => c.id === Number(row.car_id));

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="rounded bg-yellow-400 px-2 py-0.5 text-xs font-black uppercase text-red-700">
            Temporada {row.season}
          </span>
          <span className="text-xs font-bold text-gray-700">{ev ? ev.label : `Ral·li #${row.event_id || "—"}`}</span>
          <span
            className={`rounded px-1.5 py-0.2 text-[10px] font-bold uppercase ${
              row.published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
            }`}
          >
            {row.published ? "Publicat" : "Ocult"}
          </span>
        </div>

        <div className="text-sm font-black text-gray-900">
          🏎️ {cr ? cr.label : `Vehicle #${row.car_id || "—"}`}
        </div>

        <p className="text-xs font-medium text-gray-600">
          👤 Pilot: <b>{dr ? dr.label : `#${row.driver_id || "—"}`}</b>
          {cp ? (
            <span>
              {" "}
              · 🧭 Copilot: <b>{cp.label}</b>
            </span>
          ) : null}
          {row.category ? ` · Categoria: ${row.category}` : ""}
        </p>

        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="text-red-600 uppercase">
            {row.status === "dnf"
              ? "DNF"
              : row.status === "dsq"
              ? "DSQ"
              : row.status === "dns"
              ? "DNS"
              : row.category_position
              ? `P${row.category_position} Cat.`
              : "Classificat"}
            {row.overall_position ? ` (P${row.overall_position} General)` : ""}
          </span>
          {(row.time || row.gap) && (
            <span className="text-gray-500 font-mono">
              ⏱️ {row.time || "—"} {row.gap ? `· ${row.gap}` : ""}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (tab === "gallery") {
    return (
      <div className="flex items-center gap-3">
        {row.image_url && <img src={row.image_url} alt="Galeria" className="h-14 w-20 rounded-lg object-cover border" />}
        <div>
          <b className="text-base text-gray-900">{row.title || "Fotografia"}</b>
          <p className="text-xs text-gray-500">
            {row.category} · Temporada {row.season || "—"} · Ral·li #{row.event_id || "—"}
          </p>
        </div>
      </div>
    );
  }

  if (tab === "live") {
    const ev = relations.events.find((e) => e.id === Number(row.event_id));
    const dr = relations.drivers.find((d) => d.id === Number(row.driver_id));
    return (
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-xs font-black uppercase ${
                row.is_live ? "bg-red-600 text-white animate-pulse" : "bg-gray-200 text-gray-700"
              }`}
            >
              {row.is_live ? "LIVE" : "Arxivat"}
            </span>
            <b className="text-base text-gray-900">{row.stage || "Tram"}</b>
          </div>
          {row.time && (
            <span className="font-mono text-xs font-black bg-gray-900 text-yellow-400 px-2 py-0.5 rounded">
              ⏱️ {row.time}
            </span>
          )}
        </div>

        <p className="text-xs text-gray-600 mt-1 font-medium">
          {ev?.label || "Rally"} · 👤 <b>{dr?.label || "Pilot"}</b>
          {row.position ? ` · P${row.position} General` : ""}
          {row.category_position ? ` · P${row.category_position} Cat.` : ""}
          {row.gap ? ` (${row.gap})` : ""}
        </p>
        {row.message && <p className="text-xs text-gray-700 mt-1.5 italic bg-gray-50 p-2 rounded border">{row.message}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <b className="text-base text-gray-900">{row.name}</b>
        <span
          className={`rounded px-2 py-0.5 text-xs font-black uppercase ${
            row.status === "new" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
          }`}
        >
          {row.status === "new" ? "Nou" : "Llegit"}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-0.5">
        Assumpte: <b>{row.subject}</b> · {new Date(row.created_at).toLocaleDateString("ca-ES")}
      </p>
      <p className="text-xs text-gray-600 mt-0.5 font-mono">
        ✉️ {row.email || "Sense correu"} {row.phone ? `· 📞 ${row.phone}` : ""}
      </p>
      <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border">{row.message}</p>
    </div>
  );
}

function CmsEditor({
  tab,
  row,
  relations,
  onSave,
  onCancel,
}: {
  tab: Tab;
  row: Row | null;
  relations: Relations;
  onSave: (r: Row) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Row>(row || {});
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");

  if (tab === "contacts") return null;

  const fields: Record<Exclude<Tab, "contacts" | "flota" | "events" | "bookings">, Array<[string, string, string]>> = {
    profile: [
      ["name", "Nom de l'escuderia", "input"],
      ["tagline", "Frase breu de presentació", "input"],
      ["story", "Història de l'equip", "area"],
      ["hero_image", "Imatge principal de portada", "image"],
      ["logo_url", "Logotip de l'escuderia", "image"],
      ["location", "Ubicació", "input"],
      ["email", "Correu electrònic", "input"],
      ["phone", "Telèfon de contacte", "input"],
      ["instagram_url", "Instagram", "input"],
      ["facebook_url", "Facebook", "input"],
      ["youtube_url", "YouTube", "input"],
      ["tiktok_url", "TikTok", "input"],
    ],
    drivers: [
      ["name", "Nom del membre", "input"],
      ["slug", "Adreça web curta (slug)", "input"],
      ["number", "Dorsal", "input"],
      ["role", "Funció (Pilot, Copilot, Cap d'equip...)", "input"],
      ["car_id", "Vehicle assignat", "relation-car"],
      ["championship", "Campionat en què competeix", "input"],
      ["season", "Temporada", "number"],
      ["photo_url", "Fotografia", "image"],
      ["social_url", "Enllaç al perfil social", "input"],
      ["bio", "Biografia", "area"],
    ],
    news: [
      ["title", "Títol de la notícia", "input"],
      ["slug", "Adreça web curta (slug)", "input"],
      ["category", "Categoria (Actualitat, Crònica, etc.)", "input"],
      ["cover_image", "Imatge de portada", "image"],
      ["excerpt", "Resum breu de la notícia", "area"],
      ["content", "Contingut complet", "area"],
    ],
    sponsors: [
      ["name", "Nom del patrocinador", "input"],
      ["tier", "Categoria (Partner Principal, Col·laborador...)", "input"],
      ["logo_url", "Logotip", "image"],
      ["website_url", "Lloc web oficial", "input"],
      ["description", "Descripció", "area"],
      ["sort_order", "Ordre de visualització", "number"],
    ],
    results: [
      ["season", "Temporada (Any)", "number"],
      ["event_id", "Rally / Cursa", "relation-event"],
      ["car_id", "Vehicle de la flota", "relation-car"],
      ["driver_id", "Pilot", "relation-driver"],
      ["copilot_id", "Copilot (si aplica)", "relation-copilot"],
      ["category", "Categoria de participació", "input"],
      ["overall_position", "Posició a la classificació general", "number"],
      ["category_position", "Posició dins la categoria", "number"],
      ["status", "Estat del resultat", "status"],
      ["time", "Temps total", "input"],
      ["gap", "Diferència respecte al líder", "input"],
      ["summary", "Resum o comentari del resultat", "area"],
    ],
    gallery: [
      ["title", "Títol de la fotografia", "input"],
      ["image_url", "Imatge", "image"],
      ["caption", "Peu de foto", "area"],
      ["category", "Categoria", "input"],
      ["event_id", "Ral·li", "relation-event"],
      ["season", "Temporada", "number"],
    ],
    live: [
      ["event_id", "Ral·li", "relation-event"],
      ["driver_id", "Pilot", "relation-driver"],
      ["stage", "Tram", "input"],
      ["position", "Posició general", "number"],
      ["category_position", "Posició a la categoria", "number"],
      ["time", "Temps", "input"],
      ["gap", "Diferència de temps", "input"],
      ["message", "Missatge o comentari", "area"],
    ],
  };

  const numeric = new Set(["season", "overall_position", "category_position", "sort_order", "position"]);
  const selectedEvent =
    tab === "results" ? relations.events.find((e) => e.id === Number(form.event_id)) : undefined;

  const required = (name: string) =>
    requiredFields[tab]?.includes(name) ||
    (tab === "results" && name === "driver_id") ||
    (tab === "results" &&
      name === "copilot_id" &&
      (selectedEvent?.eventType === "rally" || selectedEvent?.eventType === "rally_sprint"));

  const relationOptions: Record<string, Option[]> = {
    event_id: relations.events,
    driver_id: relations.drivers,
    copilot_id: relations.drivers,
    car_id: relations.cars,
  };

  const currentTabFields = fields[tab as keyof typeof fields] || [];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const payload = { ...form };
        numeric.forEach((k) => {
          if (k in payload) payload[k] = payload[k] === "" ? null : Number(payload[k]);
        });
        ["event_id", "driver_id", "copilot_id", "car_id"].forEach((k) => {
          if (k in payload) payload[k] = payload[k] === "" ? null : Number(payload[k]);
        });
        if (["drivers", "news", "sponsors", "results", "gallery", "live"].includes(tab)) {
          payload.published = form.published !== false;
        }
        if (tab === "live") {
          payload.is_live = form.is_live !== false;
        }
        onSave(payload);
      }}
      className="rounded-2xl bg-white p-6 shadow-sm border"
    >
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h2 className="text-xl font-black uppercase text-gray-900">{row?.id ? "Editar Element" : "Nou Element"}</h2>
          <p className="text-xs text-gray-500 mt-0.5">Els camps amb * són obligatoris</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-xs font-black uppercase text-gray-500 hover:bg-gray-100 transition"
        >
          Tancar
        </button>
      </div>

      <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {currentTabFields.map(([name, label, type]) => {
          if (tab === "results" && name === "copilot_id" && selectedEvent?.eventType === "pujada_costa") {
            return null;
          }

          return (
            <div key={name}>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                {label}
                {required(name) ? <span className="text-red-600"> *</span> : <span className="text-gray-400 font-normal"> (opcional)</span>}
              </label>

              {type === "area" ? (
                <textarea
                  required={required(name)}
                  value={form[name] ?? ""}
                  onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-red-600 focus:outline-none"
                />
              ) : type === "image" ? (
                <div className="space-y-2">
                  <input
                    type="url"
                    required={requiredFields[tab]?.includes(name)}
                    placeholder="https://..."
                    value={form[name] ?? ""}
                    onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-red-600 focus:outline-none"
                  />
                  {form[name] && (
                    <img
                      src={String(form[name])}
                      alt="Previsualització"
                      className="max-h-36 max-w-full rounded-lg border object-contain bg-gray-50 p-1"
                    />
                  )}
                  <label
                    className={`inline-flex cursor-pointer items-center justify-center rounded-lg border bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-800 shadow-sm hover:bg-gray-100 transition ${
                      uploadingField === name ? "pointer-events-none opacity-60" : ""
                    }`}
                  >
                    <span>{uploadingField === name ? "Pujant la imatge…" : "Pujar imatge des del disc"}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      disabled={uploadingField === name}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        if (file.size > 8 * 1024 * 1024) {
                          setUploadError("La imatge ha de pesar menys de 8 MB.");
                          return;
                        }
                        setUploadingField(name);
                        setUploadError("");
                        try {
                          const {
                            data: { session: s },
                          } = await supabase.auth.getSession();
                          if (!s?.access_token) throw new Error("Cal iniciar sessió de nou.");
                          const body = new FormData();
                          body.append("image", file);
                          const response = await fetch("/api/upload-image", {
                            method: "POST",
                            headers: { Authorization: "Bearer " + s.access_token },
                            body,
                          });
                          const result = await response.json();
                          if (!response.ok || !result.url) {
                            throw new Error(result.error || "No s'ha pogut pujar la imatge.");
                          }
                          setForm((current) => ({ ...current, [name]: result.url }));
                        } catch (err) {
                          setUploadError(err instanceof Error ? err.message : "Error pujant la imatge.");
                        } finally {
                          setUploadingField(null);
                        }
                      }}
                      className="sr-only"
                    />
                  </label>
                  {uploadError && <span className="block text-xs font-bold text-red-600">{uploadError}</span>}
                </div>
              ) : type.startsWith("relation-") ? (
                <select
                  required={required(name)}
                  value={form[name] ?? ""}
                  onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-red-600 focus:outline-none"
                >
                  <option value="">Selecciona...</option>
                  {(relationOptions[name] || []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : type === "status" ? (
                <select
                  value={form[name] ?? "finished"}
                  onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-red-600 focus:outline-none"
                >
                  <option value="finished">Finalitzat</option>
                  <option value="dnf">DNF — No ha acabat</option>
                  <option value="dsq">DSQ — Desqualificat</option>
                  <option value="dns">DNS — No ha sortit</option>
                </select>
              ) : (
                <input
                  required={required(name)}
                  type={type === "number" ? "number" : "text"}
                  value={form[name] ?? ""}
                  onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-red-600 focus:outline-none"
                />
              )}
            </div>
          );
        })}

        {tab !== "profile" && (
          <label className="mt-4 flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
            <input
              type="checkbox"
              checked={form.published !== false}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
            />
            Publicat al web públic
          </label>
        )}

        {tab === "live" && (
          <label className="mt-2 flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_live !== false}
              onChange={(e) => setForm({ ...form, is_live: e.target.checked })}
            />
            Mostrar com a directe actiu (LIVE)
          </label>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 font-bold text-gray-600 hover:bg-gray-100 transition"
        >
          Cancel·lar
        </button>
        <button
          type="submit"
          className="rounded-lg bg-yellow-400 px-6 py-2 font-black uppercase text-red-700 hover:bg-yellow-500 transition shadow-sm"
        >
          Desar canvis
        </button>
      </div>
    </form>
  );
}