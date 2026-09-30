import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const apiKey = process.env.IMGBB_API_KEY;
  if (!supabaseUrl || !anonKey || !apiKey) {
    return NextResponse.json({ error: "Configuració del servidor incompleta." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, anonKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Sessió no vàlida." }, { status: 401 });

  const formData = await request.formData();
  const image = formData.get("image");
  if (!(image instanceof File)) return NextResponse.json({ error: "Falta la imatge." }, { status: 400 });
  if (!ALLOWED_TYPES.has(image.type)) return NextResponse.json({ error: "Format no admès." }, { status: 415 });
  if (image.size === 0 || image.size > MAX_BYTES) return NextResponse.json({ error: "La imatge ha de pesar menys de 8 MB." }, { status: 413 });

  const upload = new FormData();
  upload.append("image", image);
  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`, {
      method: "POST", body: upload, signal: AbortSignal.timeout(20_000),
    });
    const result = await response.json();
    if (!response.ok || !result?.data?.url) {
      return NextResponse.json({ error: "No s'ha pogut pujar la imatge." }, { status: 502 });
    }
    return NextResponse.json({ url: result.data.url });
  } catch {
    return NextResponse.json({ error: "El servei d'imatges no respon." }, { status: 502 });
  }
}
