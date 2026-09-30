"use client";

import { useState } from "react";
import { supabase } from "../utils/supabase";

export default function WorkshopForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [issue, setIssue] = useState("");
  const [status, setStatus] = useState("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    const { error } = await supabase.rpc("create_workshop_request", {
      p_name: name,
      p_phone: phone,
      p_issue: issue,
    });

    if (error) {
      console.error("Error creant cita:", error);
      setStatus("error");
      return;
    }

    setStatus("success");
    setName("");
    setPhone("");
    setIssue("");
  };

  if (status === "success") {
    return (
      <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-6 rounded-md text-left">
        <p className="font-black uppercase mb-2">Sol·licitud rebuda!</p>
        <p className="font-medium text-sm">Ens posarem en contacte amb tu ben aviat per confirmar la data i l'hora exacta de la teva visita.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left w-full mt-6">
      <div>
        <label className="block text-sm font-black text-gray-700 uppercase mb-1 italic">El teu Nom</label>
        <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors bg-gray-50" placeholder="Nom i Cognoms" />
      </div>

      <div>
        <label className="block text-sm font-black text-gray-700 uppercase mb-1 italic">Telèfon de contacte</label>
        <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border-2 border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors bg-gray-50" placeholder="Ex: 123 456 789" />
      </div>

      <div>
        <label className="block text-sm font-black text-gray-700 uppercase mb-1 italic">Què li passa al cotxe?</label>
        <textarea required value={issue} onChange={(e) => setIssue(e.target.value)} rows={3} className="w-full border-2 border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors bg-gray-50" placeholder="Descriu el problema o manteniment necessari..."></textarea>
      </div>

      {status === "error" && <p className="text-red-600 font-bold text-sm">Hi ha hagut un error tècnic. Torna-ho a provar.</p>}

      <button disabled={status === "loading"} type="submit" className="mt-2 w-full py-4 bg-yellow-400 text-red-700 font-black text-lg uppercase rounded shadow-lg hover:bg-yellow-500 hover:scale-[1.02] disabled:opacity-50 transition-all border-2 border-transparent focus:border-red-600">
        {status === "loading" ? "Enviant les dades..." : "Sol·licitar Cita"}
      </button>
    </form>
  );
}
