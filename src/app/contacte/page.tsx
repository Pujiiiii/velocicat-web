"use client";

import { FormEvent, useState } from "react";
import PageShell from "../../components/PageShell";
import { supabase } from "../../utils/supabase";

export default function Page() {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") || "").trim(),
      email: String(data.get("email") || "").trim() || null,
      phone: String(data.get("phone") || "").trim() || null,
      subject: String(data.get("subject") || "").trim(),
      message: String(data.get("message") || "").trim(),
    };

    const { error } = await supabase.from("contact_messages").insert(payload);
    setState(error ? "error" : "success");
    if (!error) form.reset();
  }

  const fieldClass =
    "mb-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400";

  return (
    <PageShell>
      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:py-16 md:grid-cols-2 md:gap-12">
        <section className="self-center">
          <p className="font-black uppercase tracking-widest text-red-600">Parlem</p>
          <h1 className="mt-2 text-4xl font-black italic uppercase sm:text-5xl">
            Contacte
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-600">
            Reserves, competició, patrocinis, premsa o qualsevol consulta relacionada amb
            VelociCAT.
          </p>
        </section>

        <form
          onSubmit={submit}
          className="rounded-2xl bg-gray-950 p-5 text-white shadow-xl sm:p-7"
        >
          <label htmlFor="contact-name" className="sr-only">Nom</label>
          <input
            id="contact-name"
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
            placeholder="Nom"
            className={fieldClass}
          />

          <label htmlFor="contact-email" className="sr-only">Correu electrònic</label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            placeholder="Correu electrònic"
            className={fieldClass}
          />

          <label htmlFor="contact-phone" className="sr-only">Telèfon</label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={30}
            placeholder="Telèfon"
            className={fieldClass}
          />

          <label htmlFor="contact-subject" className="sr-only">Motiu de contacte</label>
          <select id="contact-subject" name="subject" className={fieldClass} defaultValue="Reserva de vehicle">
            <option className="bg-white text-gray-950">Reserva de vehicle</option>
            <option className="bg-white text-gray-950">Patrocini</option>
            <option className="bg-white text-gray-950">Premsa</option>
            <option className="bg-white text-gray-950">Col·laboració</option>
            <option className="bg-white text-gray-950">Altres</option>
          </select>

          <label htmlFor="contact-message" className="sr-only">Missatge</label>
          <textarea
            id="contact-message"
            name="message"
            required
            minLength={10}
            maxLength={4000}
            placeholder="Missatge"
            rows={6}
            className={fieldClass + " resize-y"}
          />

          {state === "success" && (
            <p role="status" aria-live="polite" className="mb-4 rounded-lg border border-green-700 bg-green-950 p-3 font-bold text-green-100">
              Missatge rebut.
            </p>
          )}
          {state === "error" && (
            <p role="alert" className="mb-4 rounded-lg border border-red-700 bg-red-950 p-3 font-bold text-red-100">
              No s&apos;ha pogut enviar. Torna-ho a provar.
            </p>
          )}

          <button
            type="submit"
            disabled={state === "loading"}
            className="w-full rounded bg-yellow-400 py-4 font-black uppercase text-red-700"
          >
            {state === "loading" ? "Enviant..." : "Enviar missatge"}
          </button>
        </form>
      </main>
    </PageShell>
  );
}
