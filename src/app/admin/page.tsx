"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [cotxes, setCotxes] = useState<any[]>([]);
  const [esdeveniments, setEsdeveniments] = useState<any[]>([]);
  
  const [reserves, setReserves] = useState<any[]>([]);
  
  // ESTATS MODAL COTXES
  const [mostrarModalCotxe, setMostrarModalCotxe] = useState(false);
  const [cotxeEditant, setCotxeEditant] = useState<any>(null);
  const [formCotxe, setFormCotxe] = useState<{model: string, fia_group: string, daily_rate: string, sprint_rate: string, rentable_rally: boolean, rentable_sprint: boolean, status: string, ownership: string, photos: string[]}>({ 
    model: "", fia_group: "", daily_rate: "0", sprint_rate: "0", rentable_rally: true, rentable_sprint: false, status: "disponible", ownership: "escuderia", photos: [] 
  });
  const [arxiusFotos, setArxiusFotos] = useState<FileList | null>(null);
  const [pujantFotos, setPujantFotos] = useState(false);

  // ESTATS MODAL ESDEVENIMENTS
  const [mostrarModalEvent, setMostrarModalEvent] = useState(false);
  const [eventEditant, setEventEditant] = useState<any>(null);
  const [formEvent, setFormEvent] = useState<{name: string, start_date: string, end_date: string, event_type: string, assigned_cars: number[]}>({ 
    name: "", start_date: "", end_date: "", event_type: "rally", assigned_cars: [] 
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const admin = session?.user?.app_metadata?.role === "admin";
      setSession(session);
      setIsAdmin(admin);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const admin = session?.user?.app_metadata?.role === "admin";
      setSession(session);
      setIsAdmin(admin);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && isAdmin) {
      carregarCotxes();
      carregarEsdeveniments();
      carregarReserves();
    }
  }, [session, isAdmin]);

  // --- FLOTA ---
  const carregarCotxes = async () => {
    const { data } = await supabase.from('rally_cars').select('*').order('model');
    if (data) setCotxes(data);
  };
  const obrirModalNouCotxe = () => {
    setCotxeEditant(null);
    setFormCotxe({model:"",fia_group:"",daily_rate:"0",sprint_rate:"0",rentable_rally:true,rentable_sprint:false,status:"disponible",ownership:"escuderia",photos:[]});
    setArxiusFotos(null);
    setMostrarModalCotxe(true);
  };
  const obrirModalEditarCotxe = (cotxe: any) => {
    setCotxeEditant(cotxe);
    setFormCotxe({ model: cotxe.model, fia_group: cotxe.fia_group, daily_rate: String(cotxe.daily_rate ?? 0), sprint_rate: String(cotxe.sprint_rate ?? 0), rentable_rally: cotxe.rentable_rally ?? true, rentable_sprint: cotxe.rentable_sprint ?? false, status: cotxe.status, ownership: cotxe.ownership || "escuderia", photos: cotxe.photos || [] });
    setArxiusFotos(null);
    setMostrarModalCotxe(true);
  };
  const desenllacarFoto = (index: number) => {
    const novesFotos = [...formCotxe.photos];
    novesFotos.splice(index, 1);
    setFormCotxe({ ...formCotxe, photos: novesFotos });
  };
  const moureFoto = (index: number, direccio: 'esquerra' | 'dreta') => {
    const novesFotos = [...formCotxe.photos];
    if (direccio === 'esquerra' && index > 0) {
      const temp = novesFotos[index - 1];
      novesFotos[index - 1] = novesFotos[index];
      novesFotos[index] = temp;
    } else if (direccio === 'dreta' && index < novesFotos.length - 1) {
      const temp = novesFotos[index + 1];
      novesFotos[index + 1] = novesFotos[index];
      novesFotos[index] = temp;
    }
    setFormCotxe({ ...formCotxe, photos: novesFotos });
  };
  const pujarFotosImgBB = async () => {
    if (!arxiusFotos || arxiusFotos.length === 0) return [];
    const urls: string[] = [];
 
    
    for (let i = 0; i < arxiusFotos.length; i++) {
      const formData = new FormData();
      formData.append('image', arxiusFotos[i]);
      // S'ha eliminat l'expiració perquè les fotos siguin PERMANENTS
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Cal iniciar sessió per pujar imatges.');
        const res = await fetch('/api/upload-image', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "No s'ha pogut pujar la imatge.");
        if (typeof data?.url !== "string") throw new Error("Resposta d'upload invàlida.");
        urls.push(data.url);
      } catch (e) {
        console.error("Error pujant imatge", e);
        setError(e instanceof Error ? e.message : "Error desconegut pujant una imatge.");
      }
    }
    return urls;
  };
  const guardarCotxe = async () => {
    if (!formCotxe.model.trim() || !formCotxe.fia_group.trim() || (formCotxe.ownership === "escuderia" && (Number(formCotxe.daily_rate) < 0 || Number(formCotxe.sprint_rate) < 0 || !Number.isFinite(Number(formCotxe.daily_rate)) || !Number.isFinite(Number(formCotxe.sprint_rate))))) {
      alert("Omple el model i el grup FIA, i indica preus vàlids."); return;
    }
    setPujantFotos(true);
    const novesUrls = await pujarFotosImgBB();
    const fotosFinals = [...formCotxe.photos, ...novesUrls];
    const dadesAGuardar = { ...formCotxe, daily_rate: formCotxe.ownership === "particular" ? 0 : Number(formCotxe.daily_rate || 0), sprint_rate: formCotxe.ownership === "particular" ? 0 : Number(formCotxe.sprint_rate || 0), rentable_rally: formCotxe.ownership === "escuderia" && formCotxe.rentable_rally, rentable_sprint: formCotxe.ownership === "escuderia" && formCotxe.rentable_sprint, photos: fotosFinals };
    
    const result = cotxeEditant
      ? await supabase.from('rally_cars').update(dadesAGuardar).eq('id', cotxeEditant.id)
      : await supabase.from('rally_cars').insert([dadesAGuardar]);

    setPujantFotos(false);
    if (result.error) {
      setError("No s'ha pogut guardar el vehicle: " + result.error.message);
      return;
    }
    setMostrarModalCotxe(false);
    carregarCotxes();
  };
  const eliminarCotxe = async (id: number) => {
    if(confirm("Estàs segur que vols eliminar aquest vehicle?")) {
      const { error } = await supabase.from('rally_cars').delete().eq('id', id);
      if (error) {
        setError("No s'ha pogut eliminar el vehicle: " + error.message);
        return;
      }
      carregarCotxes();
    }
  };
  const actualitzarEstatCotxe = async (id: number, nouEstat: string) => {
    const { error } = await supabase.from('rally_cars').update({ status: nouEstat }).eq('id', id);
    if (error) {
      setError("No s'ha pogut actualitzar l'estat del vehicle: " + error.message);
      return;
    }
    carregarCotxes();
  };

  // --- ESDEVENIMENTS ---
  const carregarEsdeveniments = async () => {
    const { data } = await supabase.from('rally_events').select('*').order('start_date', { ascending: true });
    if (data) setEsdeveniments(data);
  };
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
      assigned_cars: event.assigned_cars || [] 
    });
    setMostrarModalEvent(true);
  };
  const guardarEsdeveniment = async () => {
    if (!formEvent.name || !formEvent.start_date || !formEvent.end_date) {
      alert("Omple els camps bàsics de la cursa."); return;
    }
    const result = eventEditant
      ? await supabase.from('rally_events').update(formEvent).eq('id', eventEditant.id)
      : await supabase.from('rally_events').insert([formEvent]);

    if (result.error) {
      setError("No s'ha pogut guardar l'esdeveniment: " + result.error.message);
      return;
    }
    setMostrarModalEvent(false);
    carregarEsdeveniments();
  };
  const eliminarEsdeveniment = async (id: number) => {
    if(confirm("Estàs segur que vols cancel·lar i eliminar aquest esdeveniment?")) {
      const { error } = await supabase.from('rally_events').delete().eq('id', id);
      if (error) {
        setError("No s'ha pogut eliminar l'esdeveniment: " + error.message);
        return;
      }
      carregarEsdeveniments();
    }
  };

  // --- RESERVES DE LLOGUER ---
  const carregarReserves = async () => {
    const { data } = await supabase
      .from('event_bookings')
      .select('*, customers(name, phone), rally_cars(model), rally_events(name, start_date)')
      .order('id', { ascending: false });
    if (data) setReserves(data);
  };
  const actualitzarEstatReserva = async (id: number, nouEstat: string) => {
    const { error } = await supabase.from('event_bookings').update({ status: nouEstat }).eq('id', id);
    if (error) {
      setError("No s'ha pogut actualitzar la reserva: " + error.message);
      return;
    }
    carregarReserves(); 
  };
  const eliminarReserva = async (id: number) => {
    if(confirm("Segur que vols eliminar i cancel·lar aquesta reserva definitivament?")) {
      const { error } = await supabase.from('event_bookings').delete().eq('id', id);
      if (error) {
        setError("No s'ha pogut eliminar la reserva: " + error.message);
        return;
      }
      carregarReserves();
    }
  };

  // --- LOGIN ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Correu o contrasenya incorrectes.");
    setLoading(false);
  };
  const handleLogout = async () => { await supabase.auth.signOut(); };

  if (loading && !session) return <div className="min-h-screen flex items-center justify-center font-bold text-xl">Carregant...</div>;

  if (session && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full border-t-8 border-red-600 text-center">
          <h1 className="text-3xl font-black italic text-gray-900 uppercase mb-4">
            Accés <span className="text-red-600">Denegat</span>
          </h1>
          <p className="text-gray-600 font-medium mb-6">
            Aquest panell està restringit a usuaris administradors.
          </p>
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-gray-900 text-white font-black uppercase rounded shadow hover:bg-gray-800"
          >
            Tancar Sessió
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full border-t-8 border-red-600">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black italic text-gray-900 uppercase">Accés <span className="text-red-600">Admin</span></h1>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <input type="email" required placeholder="Correu electrònic" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-3 focus:outline-none focus:border-red-600" />
            <input type="password" required placeholder="Contrasenya" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-3 focus:outline-none focus:border-red-600" />
            {error && <p className="text-red-600 font-bold text-sm bg-red-50 p-3 rounded">{error}</p>}
            <button disabled={loading} type="submit" className="mt-4 w-full py-4 bg-yellow-400 text-red-700 font-black text-lg uppercase rounded shadow hover:bg-yellow-500">Entrar al Panell</button>
          </form>
        </div>
      </div>
    );
  }

  // --- RENDERITZAT PANELL ---
  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      <header className="bg-gray-900 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-50">
        <div className="text-xl font-black italic uppercase">VelociCAT <span className="text-yellow-400">Admin</span></div><a href="/admin/content" className="ml-4 rounded bg-yellow-400 px-3 py-2 text-xs font-black uppercase text-red-700">CMS Escuderia</a>
        <button onClick={handleLogout} className="px-4 py-2 bg-red-600 hover:bg-red-700 font-bold rounded text-sm uppercase">Tancar Sessió</button>
      </header>

      <main className="max-w-7xl mx-auto p-6 mt-6">
        
        {/* FILA SUPERIOR: FLOTA */}
        <div className="mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg border-t-8 border-yellow-400 flex flex-col h-[650px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-black italic uppercase text-gray-800">La Flota</h3>
              <button onClick={obrirModalNouCotxe} className="bg-yellow-400 text-red-700 font-bold uppercase text-sm px-4 py-2 rounded shadow hover:bg-yellow-500 transition-colors">+ Nou Cotxe</button>
            </div>
            
            <div className="overflow-y-auto flex-grow pr-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              {cotxes.map((cotxe) => (
                <div key={cotxe.id} className="mb-4 p-4 border-2 border-gray-100 rounded-lg bg-gray-50 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-xl text-gray-900 italic uppercase">{cotxe.model}</h4>
                      <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs font-bold uppercase">{cotxe.fia_group}</span>
                      <div className="ml-2 text-gray-600 font-bold text-xs">Rally: {cotxe.daily_rate} € · Rally-sprint / Pujada en costa: {cotxe.sprint_rate ?? 0} €</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => obrirModalEditarCotxe(cotxe)} className="text-gray-500 hover:text-blue-600 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                      <button onClick={() => eliminarCotxe(cotxe.id)} className="text-gray-500 hover:text-red-600 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                    </div>
                  </div>
                  <div className="flex gap-2 border-t pt-3 mt-1">
                     <button onClick={() => actualitzarEstatCotxe(cotxe.id, 'disponible')} className={`flex-1 text-xs font-bold uppercase py-1.5 rounded transition-colors ${cotxe.status === 'disponible' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>Disponible</button>
                      <button onClick={() => actualitzarEstatCotxe(cotxe.id, 'manteniment')} className={`flex-1 text-xs font-bold uppercase py-1.5 rounded transition-colors ${cotxe.status === 'manteniment' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>Manteniment</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FILA INFERIOR: ESDEVENIMENTS I RESERVES */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-lg border-t-8 border-gray-900 flex flex-col h-[650px]">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black italic uppercase text-gray-800">Calendari d'esdeveniments</h3>
                <button onClick={obrirModalNouEvent} className="bg-gray-900 text-white font-bold uppercase text-sm px-4 py-2 rounded shadow hover:bg-gray-800 transition-colors">+ Nou</button>
             </div>
             
             <div className="overflow-y-auto flex-grow pr-2">
               {esdeveniments.map((esdeveniment) => (
                 <div key={esdeveniment.id} className="mb-4 p-4 border-2 border-gray-100 rounded-lg bg-gray-50 flex flex-col gap-2">
                   <div className="flex justify-between items-start">
                     <div><h4 className="font-bold text-lg text-gray-900 uppercase">{esdeveniment.name}</h4><p className="text-xs font-bold uppercase text-red-600">{esdeveniment.event_type === "rally_sprint" ? "Rally-sprint" : esdeveniment.event_type === "pujada_costa" ? "Pujada en costa" : "Rally"}</p></div>
                     <div className="flex gap-2">
                       <button onClick={() => obrirModalEditarEvent(esdeveniment)} className="text-gray-500 hover:text-blue-600 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                       <button onClick={() => eliminarEsdeveniment(esdeveniment.id)} className="text-gray-500 hover:text-red-600 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                     </div>
                   </div>
                   <div className="flex flex-col text-sm text-gray-600 mt-2 font-medium">
                      <span>🟢 Inici: {new Date(esdeveniment.start_date).toLocaleDateString()}</span>
                      <span>🏁 Final: {new Date(esdeveniment.end_date).toLocaleDateString()}</span>
                   </div>
                   <div className="mt-2 text-xs font-bold text-gray-500">
                     VEHICLES ASSIGNATS: {esdeveniment.assigned_cars ? esdeveniment.assigned_cars.length : 0}
                   </div>
                 </div>
               ))}
             </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border-t-8 border-green-500 flex flex-col h-[650px]">
            <h3 className="text-2xl font-black italic uppercase mb-4 text-gray-800">Sol·licituds de Lloguer</h3>
            <div className="overflow-y-auto flex-grow pr-2">
              {reserves.length === 0 ? (
                <p className="text-gray-500 font-medium">No hi ha cap reserva actualment.</p>
              ) : (
                reserves.map((reserva) => (
                  <div key={reserva.id} className="mb-4 p-4 border-2 border-gray-100 rounded-lg bg-gray-50 border-l-4 border-l-yellow-400">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-lg text-gray-900">{reserva.customers?.name}</h4>
                        <p className="text-sm text-gray-600 font-medium font-mono">{reserva.customers?.phone}</p>
                      </div>
                      <span className={`px-3 py-1 rounded text-xs font-black uppercase ${reserva.status === 'pendent' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                        {reserva.status}
                      </span>
                    </div>
                    
                    <div className="bg-white p-3 rounded border text-sm mb-4">
                      <p><span className="font-bold text-gray-700">Cotxe:</span> {reserva.rally_cars?.model}</p>
                      <p><span className="font-bold text-gray-700">{reserva.rally_events?.event_type === "rally_sprint" ? "Rally-sprint" : reserva.rally_events?.event_type === "pujada_costa" ? "Pujada en costa" : "Rally"}:</span> {reserva.rally_events?.name}</p><p><span className="font-bold text-gray-700">Tarifa:</span> {reserva.rental_rate ?? "—"} € / cursa</p>
                    </div>
                    
                    <div className="flex gap-2">
                      {reserva.status === 'pendent' && (
                        <button onClick={() => actualitzarEstatReserva(reserva.id, 'confirmada')} className="flex-1 bg-gray-900 text-white text-xs font-bold uppercase py-2 rounded hover:bg-green-600 transition-colors">
                          Confirmar Reserva
                        </button>
                      )}
                      <button onClick={() => eliminarReserva(reserva.id)} className="bg-red-100 text-red-600 px-3 py-2 rounded hover:bg-red-200 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>
      </main>

      {/* MODAL COTXES */}
      {mostrarModalCotxe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full border-t-8 border-yellow-400 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black italic uppercase mb-6 text-gray-800">{cotxeEditant ? "Editar Cotxe" : "Nou Cotxe"}</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase mb-1">Model</label>
                <input type="text" value={formCotxe.model} onChange={(e) => setFormCotxe({...formCotxe, model: e.target.value})} className="w-full border-2 border-gray-300 rounded px-3 py-2 focus:border-red-600 outline-none" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 uppercase mb-1">Grup FIA</label>
                  <input type="text" value={formCotxe.fia_group} onChange={(e) => setFormCotxe({...formCotxe, fia_group: e.target.value})} className="w-full border-2 border-gray-300 rounded px-3 py-2 outline-none uppercase" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 uppercase mb-1">Propietat</label>
                  <select value={formCotxe.ownership} onChange={(e) => setFormCotxe({ ...formCotxe, ownership: e.target.value })} className="w-full border-2 border-gray-300 rounded px-3 py-2"><option value="escuderia">Propietat de l'escuderia</option><option value="particular">Vehicle particular</option></select>
                </div>
              </div>
              {formCotxe.ownership === "escuderia" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 uppercase mb-1">Preu per a rallys (€ / cursa)</label>
                    <input type="number" min="0" step="0.01" value={formCotxe.daily_rate} onChange={(e) => setFormCotxe({...formCotxe, daily_rate: e.target.value})} className="w-full border-2 border-gray-300 rounded px-3 py-2 outline-none" />
                    <label className="mt-2 flex items-center gap-2 text-sm font-bold text-gray-700"><input type="checkbox" checked={formCotxe.rentable_rally} onChange={(e) => setFormCotxe({...formCotxe, rentable_rally: e.target.checked})} /> Disponible per a rallys</label>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 uppercase mb-1">Preu per a rally-sprint i Pujada en costa (€ / cursa)</label>
                    <input type="number" min="0" step="0.01" value={formCotxe.sprint_rate} onChange={(e) => setFormCotxe({...formCotxe, sprint_rate: e.target.value})} className="w-full border-2 border-gray-300 rounded px-3 py-2 outline-none" />
                    <label className="mt-2 flex items-center gap-2 text-sm font-bold text-gray-700"><input type="checkbox" checked={formCotxe.rentable_sprint} onChange={(e) => setFormCotxe({...formCotxe, rentable_sprint: e.target.checked})} /> Disponible per a rally-sprint i Pujada en costa</label>
                  </div>
                </div>
              ) : <p className="text-sm text-gray-600">Els vehicles particulars no es poden llogar.</p>}

              {formCotxe.photos && formCotxe.photos.length > 0 && (
                <div className="mt-2">
                  <label className="block text-sm font-bold text-gray-700 uppercase mb-2">Fotos Actuals</label>
                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {formCotxe.photos.map((url, idx) => (
                      <div key={idx} className="relative w-28 flex-shrink-0 flex flex-col gap-2">
                        <div className="relative h-24 group">
                          <img src={url} alt="Cotxe" className="w-full h-full object-cover rounded border-2 border-gray-200" />
                          <button onClick={() => desenllacarFoto(idx)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs hover:bg-red-700 shadow-lg">X</button>
                        </div>
                        <div className="flex justify-between px-1">
                          <button onClick={() => moureFoto(idx, 'esquerra')} disabled={idx === 0} className="text-gray-500 hover:text-blue-600 disabled:opacity-20"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg></button>
                          <button onClick={() => moureFoto(idx, 'dreta')} disabled={idx === formCotxe.photos.length - 1} className="text-gray-500 hover:text-blue-600 disabled:opacity-20"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-2 p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded text-center">
                <label className="block text-sm font-bold text-gray-700 uppercase mb-2">Afegir Noves Fotos</label>
                <input type="file" multiple accept="image/*" onChange={(e) => setArxiusFotos(e.target.files)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-bold file:bg-yellow-400 file:text-red-700 hover:file:bg-yellow-500 cursor-pointer" />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setMostrarModalCotxe(false)} disabled={pujantFotos} className="flex-1 bg-gray-200 font-bold uppercase py-3 rounded">Cancel·lar</button>
              <button onClick={guardarCotxe} disabled={pujantFotos} className="flex-1 bg-yellow-400 text-red-700 font-black uppercase py-3 rounded shadow disabled:opacity-50">
                {pujantFotos ? "Pujant..." : (cotxeEditant ? "Guardar" : "Afegir")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ESDEVENIMENTS AMB ASSIGNACIÓ DE COTXES */}
      {mostrarModalEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full border-t-8 border-gray-900 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black italic uppercase mb-6 text-gray-800">{eventEditant ? "Editar esdeveniment" : "Nou esdeveniment"}</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase mb-1">Nom de l'Esdeveniment</label>
                <input type="text" placeholder="Ex: Rally Costa Brava" value={formEvent.name} onChange={(e) => setFormEvent({...formEvent, name: e.target.value})} className="w-full border-2 border-gray-300 rounded px-3 py-2 focus:border-gray-900 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase mb-1">Modalitat</label>
                <select value={formEvent.event_type} onChange={(e) => setFormEvent({...formEvent, event_type: e.target.value})} className="w-full border-2 border-gray-300 rounded px-3 py-2">
                  <option value="rally">Rally</option>
                  <option value="rally_sprint">Rally-sprint</option>
                  <option value="pujada_costa">Pujada en costa</option>
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 uppercase mb-1">Data d'inici</label>
                  <input type="date" value={formEvent.start_date} onChange={(e) => setFormEvent({...formEvent, start_date: e.target.value})} className="w-full border-2 border-gray-300 rounded px-3 py-2 outline-none" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 uppercase mb-1">Data final</label>
                  <input type="date" value={formEvent.end_date} onChange={(e) => setFormEvent({...formEvent, end_date: e.target.value})} className="w-full border-2 border-gray-300 rounded px-3 py-2 outline-none" />
                </div>
              </div>

              {/* SECCIÓ: COTXES ASSIGNATS */}
              <div className="mt-4">
                <label className="block text-sm font-bold text-gray-700 uppercase mb-2">Vehicles Assignats a la Cursa</label>
                <div className="max-h-48 overflow-y-auto border-2 border-gray-300 rounded p-2 bg-gray-50 flex flex-col gap-2">
                  {cotxes.length === 0 ? (
                    <p className="text-xs text-gray-500 italic p-2">No hi ha vehicles a la flota.</p>
                  ) : (
                    cotxes.map(cotxe => (
                      <label key={cotxe.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-200 rounded border border-transparent hover:border-gray-300 transition-colors">
                        <input
                          type="checkbox"
                          checked={formEvent.assigned_cars.includes(cotxe.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormEvent({...formEvent, assigned_cars: [...formEvent.assigned_cars, cotxe.id]});
                            } else {
                              setFormEvent({...formEvent, assigned_cars: formEvent.assigned_cars.filter(id => id !== cotxe.id)});
                            }
                          }}
                          className="w-5 h-5 text-gray-900 focus:ring-gray-900 border-gray-400 rounded cursor-pointer"
                        />
                        <span className="text-sm font-bold text-gray-800 uppercase italic flex-grow">{cotxe.model}</span>
                        <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold uppercase">{cotxe.fia_group}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setMostrarModalEvent(false)} className="flex-1 bg-gray-200 font-bold uppercase py-3 rounded hover:bg-gray-300">Cancel·lar</button>
              <button onClick={guardarEsdeveniment} className="flex-1 bg-gray-900 text-white font-black uppercase py-3 rounded shadow hover:bg-gray-800">
                {eventEditant ? "Guardar Canvis" : "Crear esdeveniment"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}