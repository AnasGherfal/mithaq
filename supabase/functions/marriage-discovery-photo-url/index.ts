import { ImageMagick, initializeImageMagick } from "npm:@imagemagick/magick-wasm@0.0.42";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const memberPhotoBucket = "member-profile-photos";
const signedUrlLifetimeSeconds = 5 * 60;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const wasmBytes = await Deno.readFile(
  new URL(
    "magick.wasm",
    import.meta.resolve("npm:@imagemagick/magick-wasm@0.0.42"),
  ),
);
await initializeImageMagick(wasmBytes);

const responseHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "private, no-store, max-age=0",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, x-client-info, apikey",
  "access-control-allow-methods": "POST, OPTIONS",
};

type PhotoPathRow = {
  storage_path?: unknown;
  display_mode?: unknown;
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  });
}

function mimeForPath(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: responseHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("marriage_discovery_photo.configuration_missing");
    return jsonResponse({ error: "service_unavailable" }, 503);
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;
  if (!token) return jsonResponse({ error: "unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  let body: { candidateUserId?: unknown; photoId?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const candidateUserId =
    typeof body.candidateUserId === "string" ? body.candidateUserId : "";
  const photoId = typeof body.photoId === "string" ? body.photoId : "";
  if (!uuidPattern.test(candidateUserId) || !uuidPattern.test(photoId)) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const { data: pathData, error: pathError } = await admin.rpc(
    "resolve_marriage_discovery_photo_path_for_service",
    {
      p_viewer_user_id: userData.user.id,
      p_candidate_user_id: candidateUserId,
      p_photo_id: photoId,
    },
  );

  const row = Array.isArray(pathData) ? (pathData[0] as PhotoPathRow | undefined) : undefined;
  const storagePath = typeof row?.storage_path === "string" ? row.storage_path : null;
  const displayMode = row?.display_mode === "full" || row?.display_mode === "blurred"
    ? row.display_mode
    : null;

  if (pathError || !storagePath || !displayMode) {
    return jsonResponse({ error: "photo_unavailable" }, 404);
  }

  if (displayMode === "full") {
    const { data: signedData, error: signedError } = await admin.storage
      .from(memberPhotoBucket)
      .createSignedUrl(storagePath, signedUrlLifetimeSeconds);

    if (signedError || !signedData?.signedUrl) {
      console.error("marriage_discovery_photo.signing_failed");
      return jsonResponse({ error: "photo_unavailable" }, 404);
    }

    return jsonResponse(
      {
        photoId,
        displayMode,
        signedUrl: signedData.signedUrl,
        expiresIn: signedUrlLifetimeSeconds,
      },
      200,
    );
  }

  const { data: original, error: downloadError } = await admin.storage
    .from(memberPhotoBucket)
    .download(storagePath);

  if (downloadError || !original) {
    console.error("marriage_discovery_photo.download_failed");
    return jsonResponse({ error: "photo_unavailable" }, 404);
  }

  const source = new Uint8Array(await original.arrayBuffer());
  const blurred = ImageMagick.read(source, (image): Uint8Array => {
    image.resize(80, 100);
    image.blur(35, 12);
    return image.write((data) => data);
  });
  const blurredBytes = Uint8Array.from(blurred);
  const mimeType = mimeForPath(storagePath);

  return jsonResponse(
    {
      photoId,
      displayMode,
      imageDataUrl: `data:${mimeType};base64,${bytesToBase64(blurredBytes)}`,
      expiresIn: 0,
    },
    200,
  );
});
