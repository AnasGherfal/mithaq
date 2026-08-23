import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  enforceMemberAction,
  moderateCaseAction,
  moderationSignOutAction,
} from "./actions";

type ModerationKind = "profile" | "photo" | "report";
type Access = {
  moderationRole: string;
  canReview: boolean;
  canEnforce: boolean;
};
type QueueItem = {
  itemKind: ModerationKind;
  itemId: string;
  targetUserId: string;
  reporterUserId: string | null;
  state: string;
  category: string | null;
  displayLabel: string;
  queuedAt: string;
  priority: number;
};
type CaseRecord = Record<string, unknown> & {
  kind: ModerationKind;
  itemId: string;
  targetUserId: string;
  state: string;
};
type AuditItem = {
  actionId: string;
  actorRole: string;
  actionType: string;
  itemKind: string;
  reasonCode: string | null;
  metadata: Record<string, unknown>;
  recordedAt: string;
};

type PageProps = {
  searchParams: Promise<{
    kind?: string | string[];
    id?: string | string[];
    filter?: string | string[];
    notice?: string | string[];
  }>;
};

const kindValues: ModerationKind[] = ["report", "photo", "profile"];
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ModerationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/moderation/login");

  const { data: accessData, error: accessError } = await supabase.rpc(
    "get_my_moderation_access",
  );
  const access = normalizeAccess(accessData);
  if (accessError || !access) notFound();

  const requestedFilter = firstParam(params.filter);
  const filter = isKind(requestedFilter) ? requestedFilter : null;
  const { data: queueData, error: queueError } = await supabase.rpc(
    "list_moderation_queue",
    { p_kind: filter, p_limit: 100 },
  );
  const queue = normalizeQueue(queueData);

  const selectedKindRaw = firstParam(params.kind);
  const selectedIdRaw = firstParam(params.id);
  const selectedKind = isKind(selectedKindRaw) ? selectedKindRaw : null;
  const selectedId = isUuid(selectedIdRaw) ? selectedIdRaw : null;

  let selectedCase: CaseRecord | null = null;
  let audit: AuditItem[] = [];
  let photoUrl: string | null = null;

  if (selectedKind && selectedId) {
    const { data: caseData } = await supabase.rpc("get_moderation_case", {
      p_kind: selectedKind,
      p_item_id: selectedId,
    });
    selectedCase = normalizeCase(caseData);

    if (selectedCase) {
      const { data: auditData } = await supabase.rpc("list_moderation_audit", {
        p_target_user_id: selectedCase.targetUserId,
        p_limit: 30,
      });
      audit = normalizeAudit(auditData);

      if (selectedKind === "photo") {
        const { data: photoData } = await supabase.functions.invoke(
          "moderation-photo-url",
          { body: { photoId: selectedId } },
        );
        if (isRecord(photoData) && typeof photoData.signedUrl === "string") {
          photoUrl = photoData.signedUrl;
        }
      }
    }
  }

  const notice = noticeText(firstParam(params.notice));

  return (
    <main className="min-h-svh px-4 py-5 md:px-6 md:py-7">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-col gap-4 rounded-3xl border border-black/10 bg-white px-5 py-5 shadow-sm md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#12241F] px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-white">
                MITHAQ INTERNAL
              </span>
              <span className="rounded-full bg-[#EEF5F2] px-3 py-1 text-xs font-semibold text-[#0F4D3F]">
                {access.moderationRole}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#12241F] md:text-3xl">
              Moderation operations
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-black/55">
              Review only what is required for safety and profile integrity.
              Every action is attributed and audited.
            </p>
          </div>
          <form action={moderationSignOutAction}>
            <button className="rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-black/60 hover:bg-black/[0.03]">
              Sign out
            </button>
          </form>
        </header>

        {notice ? (
          <div
            className={`mt-4 rounded-2xl px-4 py-3 text-sm font-medium ${notice.tone === "ok" ? "bg-[#EAF5EF] text-[#17603E]" : "bg-[#FFF0F0] text-[#8D2424]"}`}
          >
            {notice.text}
          </div>
        ) : null}

        {queueError ? (
          <div className="mt-5 rounded-3xl border border-[#E8B4B4] bg-[#FFF5F5] p-5 text-sm text-[#8D2424]">
            The moderation queue could not be loaded. No action was taken.
          </div>
        ) : (
          <div className="mt-5 grid gap-5 lg:grid-cols-[390px_minmax(0,1fr)]">
            <aside className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/10 p-4">
                <p className="text-xs font-bold tracking-[0.14em] text-black/40">
                  QUEUE
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <FilterLink label="All" active={!filter} />
                  <FilterLink
                    label="Reports"
                    kind="report"
                    active={filter === "report"}
                  />
                  <FilterLink
                    label="Photos"
                    kind="photo"
                    active={filter === "photo"}
                  />
                  <FilterLink
                    label="Profiles"
                    kind="profile"
                    active={filter === "profile"}
                  />
                </div>
              </div>
              <div className="max-h-[calc(100svh-245px)] overflow-y-auto p-2">
                {queue.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="font-semibold text-[#12241F]">
                      Queue is clear
                    </p>
                    <p className="mt-1 text-sm leading-6 text-black/50">
                      There are no open items in this view.
                    </p>
                  </div>
                ) : (
                  queue.map((item) => (
                    <QueueCard
                      key={`${item.itemKind}:${item.itemId}`}
                      item={item}
                      active={
                        selectedKind === item.itemKind &&
                        selectedId === item.itemId
                      }
                      filter={filter}
                    />
                  ))
                )}
              </div>
            </aside>

            <section className="min-w-0 rounded-3xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
              {selectedKind && selectedId && !selectedCase ? (
                <EmptyCase
                  title="Case unavailable"
                  body="It may have been resolved, removed, or is no longer available to your role."
                />
              ) : selectedCase ? (
                <CasePanel
                  record={selectedCase}
                  access={access}
                  audit={audit}
                  photoUrl={photoUrl}
                />
              ) : (
                <EmptyCase
                  title="Select a case"
                  body="Choose a report, photo, or profile from the queue. Member-facing data remains inaccessible outside this staff workflow."
                />
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function FilterLink({
  label,
  kind,
  active,
}: {
  label: string;
  kind?: ModerationKind;
  active: boolean;
}) {
  const href = kind ? `/moderation?filter=${kind}` : "/moderation";
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${active ? "bg-[#0F4D3F] text-white" : "bg-black/[0.04] text-black/55 hover:bg-black/[0.07]"}`}
    >
      {label}
    </Link>
  );
}

function QueueCard({
  item,
  active,
  filter,
}: {
  item: QueueItem;
  active: boolean;
  filter: ModerationKind | null;
}) {
  const params = new URLSearchParams({ kind: item.itemKind, id: item.itemId });
  if (filter) params.set("filter", filter);
  return (
    <Link
      href={`/moderation?${params.toString()}`}
      className={`block rounded-2xl border p-4 transition ${active ? "border-[#0F4D3F] bg-[#EEF5F2]" : "border-transparent hover:border-black/10 hover:bg-black/[0.025]"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] uppercase ${kindTone(item.itemKind)}`}
            >
              {item.itemKind}
            </span>
            <span className="text-xs font-medium text-black/40">
              {humanState(item.state)}
            </span>
          </div>
          <p className="mt-2 truncate font-semibold text-[#12241F]">
            {item.displayLabel}
          </p>
          {item.category ? (
            <p className="mt-1 text-xs text-[#9A6A24]">
              {humanState(item.category)}
            </p>
          ) : null}
        </div>
        <time
          className="shrink-0 text-[10px] text-black/35"
          dateTime={item.queuedAt}
        >
          {formatShortDate(item.queuedAt)}
        </time>
      </div>
    </Link>
  );
}

function CasePanel({
  record,
  access,
  audit,
  photoUrl,
}: {
  record: CaseRecord;
  access: Access;
  audit: AuditItem[];
  photoUrl: string | null;
}) {
  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-black/10 pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] uppercase ${kindTone(record.kind)}`}
            >
              {record.kind}
            </span>
            <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-xs font-semibold text-black/55">
              {humanState(record.state)}
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#12241F]">
            {caseTitle(record)}
          </h2>
          <p className="mt-1 text-xs break-all text-black/35">
            Case {record.itemId}
          </p>
        </div>
        <p className="rounded-2xl bg-[#F7F7F5] px-3 py-2 text-xs text-black/45">
          Target {shortId(record.targetUserId)}
        </p>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          {record.kind === "photo" ? (
            <PhotoCase record={record} photoUrl={photoUrl} />
          ) : null}
          {record.kind === "profile" ? <ProfileCase record={record} /> : null}
          {record.kind === "report" ? <ReportCase record={record} /> : null}
          <CaseActions record={record} access={access} />
          {access.canEnforce ? <EnforcementPanel record={record} /> : null}
        </div>
        <AuditPanel items={audit} />
      </div>
    </div>
  );
}

function ProfileCase({ record }: { record: CaseRecord }) {
  const fields: Array<[string, unknown]> = [
    ["Display name", record.displayName],
    ["About", record.aboutMe],
    ["Occupation", record.occupation],
    ["Education", record.education],
    ["City", record.city],
    ["Marital status", humanState(stringValue(record.maritalStatus))],
    [
      "Children",
      typeof record.hasChildren === "boolean"
        ? record.hasChildren
          ? "Yes"
          : "No"
        : null,
    ],
  ];
  return (
    <DetailCard title="Member-submitted profile">
      {fields.map(([label, entry]) => (
        <DetailRow
          key={label}
          label={label}
          value={stringValue(entry) || "—"}
        />
      ))}
    </DetailCard>
  );
}

function PhotoCase({
  record,
  photoUrl,
}: {
  record: CaseRecord;
  photoUrl: string | null;
}) {
  return (
    <DetailCard title="Private photo review">
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#F1F1EE]">
        {photoUrl ? (
          <div
            role="img"
            aria-label="Member photo under moderation review"
            className="aspect-[4/5] w-full bg-cover bg-center"
            style={{
              backgroundImage: `url(${JSON.stringify(photoUrl).slice(1, -1)})`,
            }}
          />
        ) : (
          <div className="flex aspect-[4/5] items-center justify-center px-6 text-center text-sm leading-6 text-black/45">
            Photo preview is temporarily unavailable. Do not approve based on a
            missing preview.
          </div>
        )}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <DetailRow
          label="Position"
          value={stringValue(record.position) || "—"}
        />
        <DetailRow
          label="Primary"
          value={record.isPrimary === true ? "Yes" : "No"}
        />
      </div>
      <p className="mt-3 text-xs leading-5 text-black/45">
        The preview link expires quickly and the raw storage path is never sent
        to this page.
      </p>
    </DetailCard>
  );
}

function ReportCase({ record }: { record: CaseRecord }) {
  return (
    <DetailCard title="Safety report">
      <DetailRow
        label="Category"
        value={humanState(stringValue(record.category)) || "—"}
      />
      <DetailRow
        label="Target"
        value={stringValue(record.targetDisplayName) || "Member"}
      />
      <DetailRow
        label="Reporter"
        value={stringValue(record.reporterDisplayName) || "Member"}
      />
      <div className="mt-4 rounded-2xl bg-[#FAFAF8] p-4">
        <p className="text-xs font-bold tracking-[0.12em] text-black/35 uppercase">
          Member-provided report detail
        </p>
        <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-[#12241F]">
          {stringValue(record.details) || "No additional detail was provided."}
        </p>
      </div>
    </DetailCard>
  );
}

function CaseActions({
  record,
  access,
}: {
  record: CaseRecord;
  access: Access;
}) {
  const reportActions = allowedReportActions(record.state);
  return (
    <DetailCard title="Case decision">
      <form action={moderateCaseAction} className="space-y-4">
        <input type="hidden" name="kind" value={record.kind} />
        <input type="hidden" name="itemId" value={record.itemId} />
        <input type="hidden" name="targetUserId" value={record.targetUserId} />
        <label className="block text-sm font-semibold text-[#12241F]">
          Reason code
          <input
            name="reasonCode"
            maxLength={80}
            placeholder="e.g. profile_clear, unsafe_content"
            className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAF8] px-4 py-3 text-sm ring-[#0F4D3F] outline-none focus:ring-2"
          />
        </label>
        {record.kind !== "report" ? (
          <label className="block text-sm font-semibold text-[#12241F]">
            Review again after (optional)
            <input
              type="datetime-local"
              name="reviewAfter"
              className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAF8] px-4 py-3 text-sm ring-[#0F4D3F] outline-none focus:ring-2"
            />
          </label>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {record.kind === "profile" ? (
            <>
              <DecisionButton
                intent="approve"
                label="Approve profile"
                tone="approve"
              />
              <DecisionButton intent="changes" label="Needs changes" />
              <DecisionButton
                intent="reject"
                label="Reject profile"
                tone="danger"
              />
            </>
          ) : null}
          {record.kind === "photo" ? (
            <>
              <DecisionButton
                intent="approve"
                label="Approve photo"
                tone="approve"
              />
              <DecisionButton intent="changes" label="Needs changes" />
              <DecisionButton
                intent="reject"
                label="Reject photo"
                tone="danger"
              />
            </>
          ) : null}
          {record.kind === "report" && access.canEnforce
            ? reportActions.map((action) => (
                <DecisionButton
                  key={action}
                  intent={action}
                  label={humanState(action)}
                  tone={
                    action === "dismissed" || action === "closed"
                      ? "danger"
                      : undefined
                  }
                />
              ))
            : null}
          {record.kind === "report" && !access.canEnforce ? (
            <p className="text-sm text-black/50">
              Reviewer role can inspect reports but cannot transition or enforce
              them.
            </p>
          ) : null}
        </div>
      </form>
    </DetailCard>
  );
}

function EnforcementPanel({ record }: { record: CaseRecord }) {
  return (
    <DetailCard title="Member enforcement">
      <p className="text-sm leading-6 text-black/55">
        Restrict, suspend, or ban only when the case evidence supports it. Any
        active introduction and conversation involving this member closes
        immediately.
      </p>
      <form action={enforceMemberAction} className="mt-4 space-y-4">
        <input type="hidden" name="kind" value={record.kind} />
        <input type="hidden" name="itemId" value={record.itemId} />
        <input type="hidden" name="targetUserId" value={record.targetUserId} />
        <label className="block text-sm font-semibold text-[#12241F]">
          Enforcement reason code
          <input
            required
            name="reasonCode"
            maxLength={80}
            placeholder="e.g. harassment_confirmed"
            className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAF8] px-4 py-3 text-sm ring-[#0F4D3F] outline-none focus:ring-2"
          />
        </label>
        <label className="block text-sm font-semibold text-[#12241F]">
          Review after (optional)
          <input
            type="datetime-local"
            name="reviewAfter"
            className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAF8] px-4 py-3 text-sm ring-[#0F4D3F] outline-none focus:ring-2"
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <EnforcementButton intent="restrict" label="Restrict" />
          <EnforcementButton intent="suspend" label="Suspend" />
          <EnforcementButton intent="ban" label="Ban" danger />
          <EnforcementButton intent="restore" label="Restore" restore />
        </div>
      </form>
    </DetailCard>
  );
}

function AuditPanel({ items }: { items: AuditItem[] }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-[#FAFAF8] p-4">
      <p className="text-xs font-bold tracking-[0.14em] text-black/35">
        MITHAQ ACTION HISTORY
      </p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-black/45">
          No Mithaq moderator action has been recorded for this member yet.
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {items.map((item) => (
            <li
              key={item.actionId}
              className="rounded-2xl border border-black/[0.07] bg-white p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-[#12241F]">
                  {humanState(item.actionType)}
                </p>
                <time
                  className="text-[10px] text-black/35"
                  dateTime={item.recordedAt}
                >
                  {formatShortDate(item.recordedAt)}
                </time>
              </div>
              <p className="mt-1 text-xs text-black/45">
                {item.actorRole} · {item.itemKind}
              </p>
              {item.reasonCode ? (
                <p className="mt-2 rounded-lg bg-black/[0.035] px-2 py-1.5 font-mono text-[10px] break-words text-black/55">
                  {item.reasonCode}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/10 p-4 md:p-5">
      <h3 className="text-base font-semibold text-[#12241F]">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-black/[0.06] py-2.5 last:border-b-0 sm:grid-cols-[145px_1fr] sm:gap-4">
      <span className="text-xs font-semibold text-black/40">{label}</span>
      <span className="text-sm leading-6 break-words whitespace-pre-wrap text-[#12241F]">
        {value}
      </span>
    </div>
  );
}

function DecisionButton({
  intent,
  label,
  tone,
}: {
  intent: string;
  label: string;
  tone?: "approve" | "danger";
}) {
  const className =
    tone === "approve"
      ? "bg-[#0F4D3F] text-white"
      : tone === "danger"
        ? "border border-[#D8A7A7] bg-[#FFF6F6] text-[#8D2424]"
        : "border border-black/10 bg-white text-[#12241F]";
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      className={`rounded-xl px-3.5 py-2.5 text-sm font-semibold ${className}`}
    >
      {label}
    </button>
  );
}

function EnforcementButton({
  intent,
  label,
  danger,
  restore,
}: {
  intent: string;
  label: string;
  danger?: boolean;
  restore?: boolean;
}) {
  const className = danger
    ? "bg-[#8D2424] text-white"
    : restore
      ? "border border-[#89B49F] bg-[#EEF5F2] text-[#0F4D3F]"
      : "border border-black/10 bg-white text-[#12241F]";
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      formNoValidate={intent === "restore"}
      className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${className}`}
    >
      {label}
    </button>
  );
}

function EmptyCase({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[420px] items-center justify-center text-center">
      <div className="max-w-md">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-[#EEF5F2]" />
        <h2 className="mt-4 text-xl font-semibold text-[#12241F]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-black/50">{body}</p>
      </div>
    </div>
  );
}

function normalizeAccess(value: unknown): Access | null {
  if (!Array.isArray(value) || !isRecord(value[0])) return null;
  const row = value[0];
  if (
    typeof row.moderation_role !== "string" ||
    typeof row.can_review !== "boolean" ||
    typeof row.can_enforce !== "boolean"
  )
    return null;
  return {
    moderationRole: row.moderation_role,
    canReview: row.can_review,
    canEnforce: row.can_enforce,
  };
}

function normalizeQueue(value: unknown): QueueItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): QueueItem[] => {
    if (
      !isRecord(entry) ||
      !isKind(entry.item_kind) ||
      !isUuid(entry.item_id) ||
      !isUuid(entry.target_user_id)
    )
      return [];
    return [
      {
        itemKind: entry.item_kind,
        itemId: entry.item_id,
        targetUserId: entry.target_user_id,
        reporterUserId: isUuid(entry.reporter_user_id)
          ? entry.reporter_user_id
          : null,
        state: stringValue(entry.state),
        category: stringValue(entry.category) || null,
        displayLabel: stringValue(entry.display_label) || "Member",
        queuedAt: stringValue(entry.queued_at),
        priority: numberValue(entry.priority),
      },
    ];
  });
}

function normalizeCase(value: unknown): CaseRecord | null {
  if (
    !isRecord(value) ||
    !isKind(value.kind) ||
    !isUuid(value.itemId) ||
    !isUuid(value.targetUserId)
  )
    return null;
  return {
    ...value,
    kind: value.kind,
    itemId: value.itemId,
    targetUserId: value.targetUserId,
    state: stringValue(value.state),
  };
}

function normalizeAudit(value: unknown): AuditItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): AuditItem[] => {
    if (!isRecord(entry) || !isUuid(entry.action_id)) return [];
    return [
      {
        actionId: entry.action_id,
        actorRole: stringValue(entry.actor_role),
        actionType: stringValue(entry.action_type),
        itemKind: stringValue(entry.item_kind),
        reasonCode: stringValue(entry.reason_code) || null,
        metadata: isRecord(entry.metadata) ? entry.metadata : {},
        recordedAt: stringValue(entry.recorded_at),
      },
    ];
  });
}

function allowedReportActions(state: string) {
  if (state === "submitted") return ["triaged", "dismissed", "closed"];
  if (state === "triaged")
    return ["investigating", "actioned", "dismissed", "closed"];
  if (state === "investigating") return ["actioned", "dismissed", "closed"];
  if (state === "actioned" || state === "dismissed") return ["closed"];
  return [];
}

function caseTitle(record: CaseRecord) {
  if (record.kind === "profile")
    return stringValue(record.displayName) || "Profile review";
  if (record.kind === "photo")
    return `${stringValue(record.displayName) || "Member"} · photo review`;
  return `${stringValue(record.targetDisplayName) || "Member"} · safety report`;
}

function noticeText(value: string) {
  if (value === "saved")
    return {
      tone: "ok" as const,
      text: "Action saved and added to the moderation audit trail.",
    };
  if (value === "forbidden")
    return {
      tone: "error" as const,
      text: "Your current staff role does not allow that action.",
    };
  if (value === "invalid_input" || value === "invalid_action")
    return {
      tone: "error" as const,
      text: "That moderation action was not valid. Nothing was changed.",
    };
  if (value === "action_failed")
    return {
      tone: "error" as const,
      text: "The action could not be completed. Nothing should be assumed from the UI; review the case state again.",
    };
  return null;
}

function humanState(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
function kindTone(kind: ModerationKind) {
  if (kind === "report") return "bg-[#FFF0E2] text-[#8B4A12]";
  if (kind === "photo") return "bg-[#F1EEFF] text-[#5D4390]";
  return "bg-[#EEF5F2] text-[#0F4D3F]";
}
function formatShortDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
function shortId(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}
function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
function isKind(value: unknown): value is ModerationKind {
  return (
    typeof value === "string" && kindValues.includes(value as ModerationKind)
  );
}
function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function stringValue(value: unknown) {
  return typeof value === "string"
    ? value
    : typeof value === "number"
      ? String(value)
      : "";
}
function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
