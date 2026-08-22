import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };
const photoBucket = "member-profile-photos";
const signedUrlSeconds = 120;

type RequestBody = { photoId?: unknown };
type ModerationAccess = {
  moderation_role?: unknown;
  can_review?: unknown;
  can_enforce?: unknown;
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return respond({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const publishableKey =
    Deno.env.get("SUPABASE_ANON_KEY")?.trim() ||
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const authorization = request.headers.get("authorization")?.trim();

  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !authorization) {
    return respond({ error: "unauthorized" }, 401);
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return respond({ error: "invalid_request" }, 400);
  }

  if (!isUuid(body.photoId)) {
    return respond({ error: "invalid_photo" }, 400);
  }

  const memberClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await memberClient.auth.getUser();
  if (userError || !user) {
    return respond({ error: "unauthorized" }, 401);
  }

  const { data: accessRows, error: accessError } = await memberClient.rpc(
    "get_my_moderation_access",
  );
  const access = Array.isArray(accessRows)
    ? (accessRows[0] as ModerationAccess | undefined)
    : undefined;

  if (accessError || access?.can_review !== true) {
    return respond({ error: "not_found" }, 404);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: photo, error: photoError } = await admin
    .from("member_profile_photos")
    .select("storage_path")
    .eq("id", body.photoId)
    .maybeSingle();

  if (photoError || !photo?.storage_path) {
    return respond({ error: "not_found" }, 404);
  }

  const { data: signed, error: signedError } = await admin.storage
    .from(photoBucket)
    .createSignedUrl(photo.storage_path, signedUrlSeconds);

  if (signedError || !signed?.signedUrl) {
    console.error("moderation_photo_url.sign_failed");
    return respond({ error: "photo_unavailable" }, 503);
  }

  return respond({
    signedUrl: signed.signedUrl,
    expiresInSeconds: signedUrlSeconds,
  });
});
