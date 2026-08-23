# M11 private photos — active implementation contract

M11 begins with a private-by-default storage and metadata boundary. The mobile
picker/upload experience will be added only after the SDK 54 preview dependency
lock is reproducible; the security contract is established first.

## Implemented foundation

- Private `member-profile-photos` Supabase Storage bucket.
- 8 MB object limit and JPEG/PNG/WebP allowlist.
- Member-owned object paths under `<auth.uid()>/<random-file-name>`.
- Self-only Storage read/delete policies and guarded own-folder upload policy.
- Self-only `member_profile_photos` metadata with a maximum of five positions.
- Exactly one primary photo per member.
- Review states: `pending`, `approved`, `needs_changes`, and `rejected`.
- No authenticated direct metadata writes; all mutations use reviewed RPCs.
- Guarded register, list, primary-selection, reorder, and removal functions.
- Registration requires an active account and completed waitlist submission.
- RLS and RPC regression coverage in `350_private_member_photos.sql`.

## Upload sequence

1. The client creates a random file name inside the authenticated member folder.
2. The client compresses/crops locally and uploads to the private bucket.
3. The client calls `register_member_photo` with the exact object path.
4. The server validates account state, submission state, ownership, object
   existence, type, position, and the five-photo limit.
5. New metadata enters `pending` review and is not eligible for introduction
   disclosure.

## Removal sequence

1. The client calls `remove_member_photo`.
2. The server removes only owned metadata, promotes the next primary when
   necessary, and returns the object path.
3. The client removes that returned object through the member-owned Storage
   delete policy.
4. A later maintenance worker may remove private orphan objects left by failed
   client cleanup; orphan objects are never public.

## Disclosure rules still to implement

- Approved-photo-only introduction manifest.
- Enforcement of each member's photo privacy preference.
- Controlled temporary access scoped to an eligible active introduction.
- Blurred and post-mutual-interest presentation rules.
- Photo review/operator workflow and audit trail.
- Mobile selection, permission, crop/compression, upload progress, replacement,
  reorder, primary selection, and deletion UI.

No public bucket, public gallery, public member URL, or directory is permitted.
