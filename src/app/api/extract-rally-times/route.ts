import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../utils/supabase";

export const maxDuration = 30; // 30s timeout per a peticions externes

export type ExtractedStage = {
  stage: string;
  time: string | null;
  gap: string | null;
  position: number | null;
  category_position: number | null;
  message: string | null;
  status: "finished" | "dnf" | "dsq" | "dns";
};

// Converteix HTML a text net estructurat per taules
function htmlToStructuredText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/t[dh]>/gi, " | ")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, "\n### $1 ###\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

// Parser Heurístic Autònom (Sense necessitat d'IA)
function heuristicRallyExtractor(
  text: string,
  driverName?: string,
  driverNumber?: string | number
): ExtractedStage[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const stages: ExtractedStage[] = [];

  const stageHeaderRegex = /(?:TC|SS|Tram|Tramo|PE|Manga|Pujada|Subida)\s*[-:]?\s*([0-9A-Za-z]+)(?:[^\n\r|#]*)/i;
  const timeRegex = /\b(\d{1,2}[:'’]\d{2}(?:[.,'”]\d{1,3})?)\b/;
  const gapRegex = /(\+\s*\d+[:'’\d.,]+|\+0[.,0]*|\bLíder\b|\bLeader\b)/i;
  const dnfRegex = /\b(DNF|Abandono|Retirat|Averia|Salida|DSQ|DNS)\b/i;

  // Paraules clau del nom per cercar (ex: "Laura", "Banus")
  const nameParts = driverName
    ? driverName
        .split(/\s+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 2)
    : [];

  const numberStr = driverNumber != null ? String(driverNumber).trim() : "";

  let currentStage = "TC1";
  const seenStages = new Set<string>();

  for (const line of lines) {
    // Comprovar si la línia és una capçalera de tram
    const stageMatch = line.match(stageHeaderRegex);
    if (stageMatch) {
      const detected = stageMatch[0].trim().replace(/\s+/g, " ");
      if (detected.length < 40) {
        currentStage = detected;
      }
    }

    // Comprovar si aquesta fila conté el pilot o el dorsal
    let matchesDriver = false;
    if (nameParts.length > 0) {
      matchesDriver = nameParts.some((part) => new RegExp(`\\b${part}\\b`, "i").test(line));
    }
    if (!matchesDriver && numberStr) {
      matchesDriver =
        new RegExp(`(?:^|[|\\s#])${numberStr}(?:[|\\s]|$)`).test(line) ||
        line.includes(`| ${numberStr} |`) ||
        line.includes(` #${numberStr} `);
    }

    if (matchesDriver) {
      // Evitem duplicar el mateix tram
      const stageKey = currentStage.toUpperCase();
      if (seenStages.has(stageKey)) continue;
      seenStages.add(stageKey);

      const tMatch = line.match(timeRegex);
      const gMatch = line.match(gapRegex);
      const isDnf = dnfRegex.test(line);

      // Cerca de posició (ex: "P2" o la primera columna numèrica)
      const pMatch = line.match(/(?:^|[|\s])(?:P|Pos\.?|#)?\s*(\d{1,3})(?:[|\s]|$)/i);
      const position = pMatch ? parseInt(pMatch[1], 10) : null;

      stages.push({
        stage: currentStage,
        time: tMatch ? tMatch[1].replace(/['’]/g, ":").replace(/['”]/g, ".") : null,
        gap: gMatch ? gMatch[1].replace(/\s+/g, "") : null,
        position: position && position < 200 ? position : null,
        category_position: null,
        message: isDnf ? "DNF - Incidència en tram" : position ? `Tram finalitzat en P${position}` : "Temps registrat",
        status: isDnf ? "dnf" : "finished",
      });
    }
  }

  return stages;
}

// Extractor amb IA (Gemini Flash)
async function aiRallyExtractor(
  apiKey: string,
  modelName: string,
  rawText: string,
  driverName?: string,
  driverNumber?: string | number,
  rallyName?: string
): Promise<ExtractedStage[] | null> {
  const prompt = `Ets un assistent especialitzat en dades de cronometratge de ral·lis.
Tens a continuació el text net o taules HTML d'una pàgina oficial de temps en directe d'un ral·li.

Pilot a cercar: "${driverName || "VelociCAT"}"
Dorsal: "${driverNumber || ""}"
Ral·li: "${rallyName || ""}"

Extreu TOTS els trams cronometrats (TC1, TC2, TC3, Manga 1, etc.) on aparegui aquest pilot o dorsal.
Retorna EXCLUSIVAMENT un array JSON vàlid amb aquesta estructura exacte, sense cap text ni bloc markdown al voltant:
[
  {
    "stage": "TC1",
    "time": "06:14.2",
    "gap": "+4.1s",
    "position": 12,
    "category_position": 2,
    "message": "Bon ritme",
    "status": "finished"
  }
]

Regles:
- "status" només pot ser: "finished", "dnf", "dsq", "dns".
- "position" i "category_position" han de ser números enters o null.
- "time" i "gap" han de ser strings o null.
- Si no trobes cap temps, retorna [].

Contingut de la web de temps:
${rawText.slice(0, 40000)}
`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) {
      console.warn(`Gemini API (${modelName}) error status:`, res.status);
      return null;
    }

    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return null;

    let textToParse = candidateText.trim();
    if (textToParse.startsWith("```")) {
      textToParse = textToParse.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    }

    const parsed = JSON.parse(textToParse);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        stage: String(item.stage || "TC"),
        time: item.time ? String(item.time) : null,
        gap: item.gap ? String(item.gap) : null,
        position: Number.isInteger(item.position) ? item.position : null,
        category_position: Number.isInteger(item.category_position) ? item.category_position : null,
        message: item.message ? String(item.message) : null,
        status: ["finished", "dnf", "dsq", "dns"].includes(item.status) ? item.status : "finished",
      }));
    }
  } catch (err) {
    console.error("Error executant AI extractor:", err);
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verificació d'autenticació admin
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Sessió no vàlida o no autenticada." }, { status: 401 });
    }

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(token);
    if (authErr || !user || user.app_metadata?.role !== "admin") {
      return NextResponse.json({ error: "Accés restringit només a administradors." }, { status: 403 });
    }

    const body = await req.json();
    const { url, rawText, driverName, driverNumber, rallyName } = body;

    let contentToAnalyze = "";
    let pageTitle = "";

    // 2. Obtenir contingut: o bé des de la URL o bé des de rawText enganxat
    if (url && typeof url === "string" && url.trim()) {
      const cleanUrl = url.trim();
      try {
        const parsedUrl = new URL(cleanUrl);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          return NextResponse.json({ error: "La URL ha de ser http o https." }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "Format de URL no vàlid." }, { status: 400 });
      }

      // Fetch de la web amb headers de navegador real
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      try {
        const response = await fetch(cleanUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ca,es-ES;q=0.9,es;q=0.8,en;q=0.7",
          },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          return NextResponse.json(
            { error: `La web de cronometratge ha respost amb error HTTP ${response.status}.` },
            { status: 502 }
          );
        }

        const html = await response.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) pageTitle = titleMatch[1].trim();

        contentToAnalyze = htmlToStructuredText(html);
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr.name === "AbortError") {
          return NextResponse.json(
            { error: "La web de cronometratge ha trigat massa a respondre (temps d'espera esgotat)." },
            { status: 504 }
          );
        }
        return NextResponse.json(
          { error: "No s'ha pogut connectar amb la URL indicada. Comprova l'enllaç o enganxa el text manualment." },
          { status: 502 }
        );
      }
    } else if (rawText && typeof rawText === "string") {
      contentToAnalyze = rawText.trim();
    } else {
      return NextResponse.json(
        { error: "Cal proporcionar una URL o bé enganxar el text de la web." },
        { status: 400 }
      );
    }

    if (!contentToAnalyze || contentToAnalyze.length < 20) {
      return NextResponse.json(
        { error: "El contingut obtingut està buit o no conté dades suficients." },
        { status: 422 }
      );
    }

    // 3. Executar extracció: primer amb Gemini IA si hi ha clau, o amb el parser heurístic
    const geminiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
    let stages: ExtractedStage[] = [];
    let source: "ai" | "heuristic" = "heuristic";

    if (geminiKey) {
      const aiResults = await aiRallyExtractor(geminiKey, geminiModel, contentToAnalyze, driverName, driverNumber, rallyName);
      if (aiResults && aiResults.length > 0) {
        stages = aiResults;
        source = "ai";
      }
    }

    // Si la IA no ha retornat res o no hi ha clau, usem el parser heurístic
    if (stages.length === 0) {
      stages = heuristicRallyExtractor(contentToAnalyze, driverName, driverNumber);
      source = "heuristic";
    }

    return NextResponse.json({
      success: true,
      source,
      pageTitle: pageTitle || rallyName || "Rally Live Timing",
      totalDetected: stages.length,
      stages,
    });
  } catch (err: any) {
    console.error("Error al servidor extract-rally-times:", err);
    return NextResponse.json({ error: err?.message || "Error intern del servidor analitzant els temps." }, { status: 500 });
  }
}
