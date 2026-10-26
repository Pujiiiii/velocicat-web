"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

export type LiveItem = {
  id: number;
  event_id: number | null;
  driver_id: number | null;
  stage: string | null;
  position: number | null;
  category_position: number | null;
  time: string | null;
  gap: string | null;
  message: string | null;
  is_live: boolean;
  created_at: string;
  rally_events: { name: string } | null;
  drivers: { name: string } | null;
};

interface Props {
  initialActive: LiveItem[];
  initialRecent: LiveItem[];
}

const REFRESH_INTERVAL_SECONDS = 20;

export default function LiveFeedClient({ initialActive, initialRecent }: Props) {
  const [active, setActive] = useState<LiveItem[]>(initialActive);
  const [recent, setRecent] = useState<LiveItem[]>(initialRecent);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL_SECONDS);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const fetchLiveUpdates = useCallback(async () => {
    setLoading(true);
    try {
      const [activeRes, recentRes] = await Promise.all([
        supabase
          .from("live_updates")
          .select("*,rally_events(name),drivers(name)")
          .eq("is_live", true)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("live_updates")
          .select("*,rally_events(name),drivers(name)")
          .eq("is_live", false)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (activeRes.data) setActive(activeRes.data as unknown as LiveItem[]);
      if (recentRes.data) setRecent(recentRes.data as unknown as LiveItem[]);
      setLastRefreshedAt(new Date());
      setSecondsLeft(REFRESH_INTERVAL_SECONDS);
    } catch (err) {
      console.error("Error refreshing live updates:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Interval de compte enrere i refresc periòdic
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          fetchLiveUpdates();
          return REFRESH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchLiveUpdates]);

  const latestActive = active[0];

  return (
    <div className="space-y-10">
      {/* Barra d'estat de connexió en viu */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gray-950 p-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          <span className="flex h-3.5 w-3.5 items-center justify-center">
            <span className="h-3 w-3 animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-red-600" />
          </span>
          <span className="text-xs font-black uppercase tracking-wider text-white">
            Canal de Temps en Directe
          </span>
          <span className="hidden sm:inline-block text-xs font-semibold text-gray-400">
            · S'actualitza automàticament en <b className="text-yellow-400 font-mono">{secondsLeft}s</b>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-medium hidden md:inline-block">
            Última actualització: {lastRefreshedAt.toLocaleTimeString("ca-ES", { timeZone: "Europe/Madrid" })}
          </span>
          <button
            onClick={() => {
              setSecondsLeft(REFRESH_INTERVAL_SECONDS);
              fetchLiveUpdates();
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-800 px-3.5 py-1.5 text-xs font-black uppercase text-white transition hover:bg-gray-700 disabled:opacity-50"
          >
            <svg
              className={`h-4 w-4 ${loading ? "animate-spin text-yellow-400" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {loading ? "Actualitzant..." : "Refrescar ara"}
          </button>
        </div>
      </div>

      {/* Hero destacat de l'últim tram si hi ha ral·li en directe */}
      {latestActive && (
        <div className="rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-red-900 p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-red-500/50 pb-5">
            <div>
              <span className="inline-block rounded-full bg-yellow-400 px-3 py-1 text-xs font-black uppercase text-red-950">
                Últim Tram Registrat
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black italic uppercase">
                {latestActive.rally_events?.name || "Ral·li en Directe"}
              </h2>
              <p className="text-red-100 font-bold mt-1 text-base">
                {latestActive.stage ? `Tram: ${latestActive.stage}` : "Actualització d'etapa"} · Pilot:{" "}
                <span className="text-white font-black">{latestActive.drivers?.name || "VelociCAT"}</span>
              </p>
            </div>

            <div className="flex items-center gap-4">
              {latestActive.position != null && (
                <div className="rounded-2xl bg-gray-950/80 px-5 py-3 text-center border border-white/10 backdrop-blur-sm">
                  <div className="text-xs font-bold uppercase text-gray-400">Pos. General</div>
                  <div className="text-4xl font-black text-white">P{latestActive.position}</div>
                </div>
              )}
              {latestActive.category_position != null && (
                <div className="rounded-2xl bg-yellow-400 px-5 py-3 text-center shadow-lg text-gray-950">
                  <div className="text-xs font-black uppercase text-red-950">Classe</div>
                  <div className="text-4xl font-black">P{latestActive.category_position}</div>
                </div>
              )}
            </div>
          </div>

          {(latestActive.time || latestActive.gap || latestActive.message) && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                {(latestActive.time || latestActive.gap) && (
                  <p className="text-xl font-mono font-bold tracking-tight">
                    {latestActive.time && <span>⏱️ Temps: <span className="font-black text-yellow-300">{latestActive.time}</span></span>}
                    {latestActive.gap && <span className="text-red-200"> · Dif: {latestActive.gap}</span>}
                  </p>
                )}
                {latestActive.message && (
                  <p className="text-base text-red-50 font-medium mt-1">{latestActive.message}</p>
                )}
              </div>
              <span className="text-xs text-red-200 font-mono">
                {new Date(latestActive.created_at).toLocaleTimeString("ca-ES", { timeZone: "Europe/Madrid" })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Llistat complet de trams actius */}
      <div>
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-2xl font-black uppercase text-gray-900 flex items-center gap-2">
            Cronometratge Tram a Tram
            {active.length > 0 && (
              <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs text-white font-black">
                {active.length} {active.length === 1 ? "tram" : "trams"}
              </span>
            )}
          </h2>
        </div>

        {active.length ? (
          <div className="mt-6 space-y-4">
            {active.map((item, idx) => {
              const posBadgeColor =
                item.position === 1
                  ? "bg-amber-400 text-gray-950"
                  : item.position === 2
                  ? "bg-slate-300 text-gray-950"
                  : item.position === 3
                  ? "bg-amber-700 text-white"
                  : "bg-gray-950 text-white";

              return (
                <article
                  key={item.id}
                  className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                    idx === 0 ? "border-red-400 ring-2 ring-red-100" : "border-gray-200"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-red-600">
                          {item.rally_events?.name || "Rally"}
                        </span>
                        {item.stage && (
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-black text-gray-800">
                            {item.stage}
                          </span>
                        )}
                        {idx === 0 && (
                          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-black text-red-700 uppercase animate-pulse">
                            Més recent
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 text-2xl font-black italic text-gray-900">
                        {item.drivers?.name || "VelociCAT"}
                      </h3>
                    </div>

                    <div className="flex gap-2">
                      {item.position != null && (
                        <div className={`rounded-xl px-4 py-2 text-center font-black ${posBadgeColor}`}>
                          <div className="text-[10px] font-bold uppercase opacity-80">General</div>
                          <div className="text-2xl font-black leading-tight">P{item.position}</div>
                        </div>
                      )}
                      {item.category_position != null && (
                        <div className="rounded-xl bg-yellow-400 px-4 py-2 text-center text-gray-950 font-black">
                          <div className="text-[10px] font-bold uppercase opacity-80">Classe</div>
                          <div className="text-2xl font-black leading-tight">P{item.category_position}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {item.message && (
                    <p className="mt-3 whitespace-pre-wrap text-gray-700 text-sm font-medium">
                      {item.message}
                    </p>
                  )}

                  {(item.time || item.gap) && (
                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t pt-3 text-sm font-bold text-gray-600">
                      {item.time && (
                        <span className="font-mono">
                          ⏱️ Temps: <b className="text-gray-950">{item.time}</b>
                        </span>
                      )}
                      {item.gap && (
                        <span className="font-mono text-gray-500">
                          Diferència: <b className="text-gray-700">{item.gap}</b>
                        </span>
                      )}
                    </div>
                  )}

                  <p className="mt-3 text-xs text-gray-400">
                    {new Date(item.created_at).toLocaleString("ca-ES", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Europe/Madrid",
                    })}
                  </p>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">
              🏁
            </div>
            <h3 className="mt-4 text-xl font-black text-gray-900">
              Ara mateix no hi ha cap seguiment en directe actiu
            </h3>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Quan l'equip estigui competint i el cronometratge oficial s'actualitzi, veuràs els temps tram a tram aquí automàticament sense haver de refrescar.
            </p>
          </div>
        )}
      </div>

      {/* Històric d'actualitzacions arxivades */}
      {recent.length > 0 && (
        <div className="mt-14 border-t pt-10">
          <h2 className="text-xl font-black uppercase text-gray-800">
            Últimes actualitzacions d'etapes anteriors
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {recent.map((item) => (
              <article key={item.id} className="rounded-xl bg-gray-100 p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-red-600">
                    {item.rally_events?.name || "Rally"}
                  </span>
                  {item.stage && (
                    <span className="text-xs font-bold text-gray-700 font-mono">{item.stage}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-800 font-medium">
                  {item.message || item.drivers?.name || "Actualització de tram"}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>{item.time ? `⏱️ ${item.time}` : ""}</span>
                  <span>
                    {new Date(item.created_at).toLocaleDateString("ca-ES", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
