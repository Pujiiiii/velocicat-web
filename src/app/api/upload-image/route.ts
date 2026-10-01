import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const MAX_BYTES = 8 * 1024 * 1024;
const BUCKET = "cms-images";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function matchesMagicBytes(type: string, bytes: Uint8Array) {
  const startsWith = (signature: number[]) =>
    signature.every((value, index) => bytes[index] === value);

  if (type === "image/jpeg") return startsWith([0xff, 0xd8, 0xff]);
  if (type === "image/png") return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (type === "image/webp") {
    return startsWith([0x52, 0x49, 0x46, 0x46]) &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  if (type === "image/avif") {
    return bytes.length >= 12 &&
      bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70 &&
      (bytes.slice(8, 12).every((value, index) => value === [0x61, 0x76, 0x69, 0x66][index]) ||
        bytes.slice(8, 12).every((value, index) => value === [0x61, 0x76, 0x69, 0x73][index]));
  }
  return false;
}

function extensionFor(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "avif";
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Configuració del servidor incompleta." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Sessió no vàlida." }, { status: 401 });

  if (user.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Accés denegat." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BYTES + 256 * 1024) {
    return NextResponse.json({ error: "La imatge ha de pesar menys de 8 MB." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "La petició d'imatge no és vàlida." }, { status: 400 });
  }

  const image = formData.get("image");
  if (!(image instanceof File)) return NextResponse.json({ error: "Falta la imatge." }, { status: 400 });
  if (!ALLOWED_TYPES.has(image.type)) return NextResponse.json({ error: "Format no admès." }, { status: 415 });
  if (image.size === 0 || image.size > MAX_BYTES) {
    return NextResponse.json({ error: "La imatge ha de pesar menys de 8 MB." }, { status: 413 });
  }

  const header = new Uint8Array(await image.slice(0, 32).arrayBuffer());
  if (!matchesMagicBytes(image.type, header)) {
    return NextResponse.json({ error: "El contingut de la imatge no coincideix amb el format declarat." }, { status: 415 });
  }

  const path = `admin/${crypto.randomUUID()}.${extensionFor(image.type)}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, image, {
      contentType: image.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    console.error("Supabase Storage upload failed", {
      message: uploadError.message,
      path,
      type: image.type,
      size: image.size,
    });
    return NextResponse.json({
      error: `No s'ha pogut desar la imatge a Supabase Storage: ${uploadError.message}`,
    }, { status: 502 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    console.error("Supabase Storage public URL missing", { path });
    return NextResponse.json({ error: "La imatge s'ha pujat però no s'ha pogut obtenir la URL pública." }, { status: 502 });
  }

  return NextResponse.json({ url: data.publicUrl });
}
