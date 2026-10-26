"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

export default function LiveBanner({ initialLive }: { initialLive?: boolean }) {
  const [isLive, setIsLive] = useState(initialLive ?? false);
  const [eventName, setEventName] = useState<string>("Ral·li en curs");

  useEffect(() => {
    async function checkLive() {
      const { data } = await supabase
        .from("live_updates")
        .select("id,stage,rally_events(name)")
        .eq("is_live", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setIsLive(true);
        const name = (data as any)?.rally_events?.name;
        if (name) setEventName(name);
      } else {
        setIsLive(false);
      }
    }

    checkLive();

    // Comprovar periòdicament cada 45 segons si hi ha cursa en directe
    const interval = setInterval(checkLive, 45000);
    return () => clearInterval(interval);
  }, []);

  if (!isLive) return null;

  return (
    <aside aria-label="Seguiment en directe" className="relative z-50 bg-gradient-to-r from-red-600 via-red-700 to-yellow-500 px-4 py-2 text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2 font-black uppercase tracking-wide">
          <span className="flex h-2.5 w-2.5 items-center justify-center">
            <span className="h-2.5 w-2.5 animate-ping rounded-full bg-white opacity-90" />
            <span className="relative h-2 w-2 rounded-full bg-white" />
          </span>
          <span>EN DIRECTE:</span>
          <span className="text-yellow-200 font-extrabold">{eventName}</span>
          <span className="hidden md:inline text-white/90 font-medium">
            · Segueix els temps de VelociCAT tram a tram
          </span>
        </div>

        <Link
          href="/live"
          className="rounded-full bg-gray-950 px-3.5 py-1 text-xs font-black uppercase text-yellow-400 hover:bg-black transition duration-150 hover:scale-105 shadow shrink-0"
        >
          Obrir Rally LIVE →
        </Link>
      </div>
    </aside>
  );
}
