# M11 — Private photos and guided profile

M11 adds photos without creating a public member gallery or weakening the
controlled-introduction model.

## Implemented foundation

- Private Supabase Storage bucket: `member-profile-photos`.
- Member-owned paths under `<auth.uid()>/...`.
- Maximum five photos, positions 1–5, and exactly one optional primary photo.
- Guarded member RPCs for registration, primary selection, ordering, and
  removal.
- Review states: `pending`, `approved`, `needs_changes`, and `rejected`.
- Service-role-only moderation with append-only private review events.
- Native Arabic/English photo manager with primary and supporting slots,
  review-state presentation, ordering, deletion confirmation, and private
  self-preview URLs.
- Account entry point for private photos.
- SDK 54-compatible `expo-image-picker` and `expo-image-manipulator`
  integration.
- System photo selection without requesting broad access to the full library.
- Automatic centered 4:5 portrait crop, maximum 1280 px output width, JPEG
  recompression, minimum-resolution validation, and an 8 MB post-processing
  limit.
- Visible preparation, upload, and registration progress states.
- Private member-folder upload followed by guarded metadata registration.
- Orphan cleanup when Storage succeeds but metadata registration fails.
- Durable private cleanup queue when immediate Storage deletion fails after a
  delete, replacement, or failed registration.
- Service-role cleanup worker with retry/backoff and stale-claim recovery.
- Cleanup jobs are member-path constrained and inaccessible to authenticated
  clients except through the narrow self-queue RPC.
- One-command preview dependency bootstrap that removes the stale SDK 57 graph,
  installs the pinned SDK 54 stack, and runs mobile checks.
- Guarded introduction photo references that expose opaque photo IDs rather than
  storage paths.
- Five-minute signed introduction URLs issued by the `introduction-photo-url`
  Edge Function only after server authorization.
- Approved-photo disclosure currently opens only for a mutually accepted
  introduction when the owner selected `after_mutual_interest`.
- Other privacy choices remain closed until their specific workflow exists.

## Security invariants

1. Anonymous users cannot read photo metadata or objects.
2. One authenticated member cannot read another member's photo metadata or
   storage folder.
3. A member cannot approve their own photo.
4. A pending, rejected, or changes-required photo never resolves for an
   introduction.
5. A participant cannot see the other person's photos before mutual acceptance.
6. A non-participant cannot list photo references for an introduction.
7. Raw private storage paths are service-role-only.
8. Signed introduction URLs are short-lived and returned with no-store response
   headers.
9. Missing explicit-approval, blurred-photo, and family-involvement workflows
   fail closed rather than silently revealing a full image.
10. If Storage upload succeeds but metadata registration fails, the client
    removes the orphan object before reporting failure where possible.
11. If immediate cleanup fails, a constrained server-owned retry job is queued
    rather than silently abandoning the private object.
12. Selected images are re-encoded before upload rather than preserving the
    original library object and its unsupported format.

## Remaining implementation

- Generate and review the new committed SDK 54 lockfile after running the
  preview bootstrap on a networked development machine.
- Wire the replace-photo action into the native photo manager and surface the
  reset-to-pending review state clearly.
- Deploy and schedule the photo cleanup worker on hosted staging.
- Moderation operating surface for photo review.
- Blurred derivative generation.
- Explicit member approval and family-involvement disclosure workflows.
- Multiple-photo paging inside an authorized introduction.
- Hosted staging migration/function deployment and two-member physical-device
  acceptance.

## Exit acceptance

M11 exits when two staging members can upload, review, order, replace, and
remove private photos, cleanup retries complete reliably, and only approved
photos permitted by the selected privacy workflow appear through a controlled
introduction on physical iPhone and Android devices.
