import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const memberPhotoBucket = "member-profile-photos";
const signedUrlLifetimeSeconds = 90;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const responseHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "private, no-store, max-age=0",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, x-client-info, apikey",
  "access-control-allow-methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  });
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
    console.error("introduction_photo_url.configuration_missing");
    return jsonResponse({ error: "service_unavailable" }, 503);
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;

  if (!token) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  let body: { introductionId?: unknown; photoId?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const introductionId =
    typeof body.introductionId === "string" ? body.introductionId : "";
  const photoId = typeof body.photoId === "string" ? body.photoId : "";

  if (!uuidPattern.test(introductionId) || !uuidPattern.test(photoId)) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const { data: pathData, error: pathError } = await admin.rpc(
    "resolve_introduction_photo_path_for_service",
    {
      p_viewer_user_id: userData.user.id,
      p_introduction_id: introductionId,
      p_photo_id: photoId,
    },
  );

  if (pathError || typeof pathData !== "string") {
    return jsonResponse({ error: "photo_unavailable" }, 404);
  }

  const { data: signedData, error: signedError } = await admin.storage
    .from(memberPhotoBucket)
    .createSignedUrl(pathData, signedUrlLifetimeSeconds);

  if (signedError || !signedData?.signedUrl) {
    console.error("introduction_photo_url.signing_failed");
    return jsonResponse({ error: "photo_unavailable" }, 404);
  }

  return jsonResponse(
    {
      photoId,
      signedUrl: signedData.signedUrl,
      expiresIn: signedUrlLifetimeSeconds,
    },
    200,
  );
});
