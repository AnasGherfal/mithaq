import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const contract = JSON.parse(
  readFileSync(resolve(process.cwd(), "ops/release-contract.json"), "utf8"),
) as {
  maintenanceWorkers: Record<string, { function: string }>;
};

const workers = [
  {
    contractName: "introduction_expiry",
    functionName: "introduction-expiry-worker",
    rpcName: "expire_controlled_introductions",
  },
  {
    contractName: "conversation_message_retention",
    functionName: "conversation-retention-worker",
    rpcName: "purge_closed_conversation_messages",
    retentionVariable: "MITHAQ_CONVERSATION_RETENTION_DAYS",
  },
  {
    contractName: "notification_retention",
    functionName: "notification-retention-worker",
    rpcName: "purge_read_member_notifications",
    retentionVariable: "MITHAQ_NOTIFICATION_RETENTION_DAYS",
  },
] as const;

function readWorker(functionName: string) {
  return readFileSync(
    resolve(process.cwd(), `supabase/functions/${functionName}/index.ts`),
    "utf8",
  );
}

describe("maintenance worker entrypoints", () => {
  for (const worker of workers) {
    it(`${worker.functionName} is contract-bound and service-only`, () => {
      const source = readWorker(worker.functionName);

      expect(contract.maintenanceWorkers[worker.contractName]?.function).toBe(
        worker.functionName,
      );
      expect(source).toContain('request.method !== "POST"');
      expect(source).toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(source).toContain(
        'request.headers.get("authorization") !== `Bearer ${serviceRoleKey}`',
      );
      expect(source).toMatch(
        new RegExp(`admin\\.rpc\\(\\s*"${worker.rpcName}"`),
      );
      expect(source).not.toMatch(/NEXT_PUBLIC_|EXPO_PUBLIC_/);
      expect(source).not.toMatch(/phone|email|message_body|access_token/i);
    });
  }

  it("retention workers require deployment-supplied policy cutoffs", () => {
    for (const worker of workers.filter(
      (item) => "retentionVariable" in item,
    )) {
      const source = readWorker(worker.functionName);
      expect(source).toContain(worker.retentionVariable);
      expect(source).toContain("Number.isSafeInteger(days)");
      expect(source).toContain("days < 1");
      expect(source).not.toMatch(/RETENTION_DAYS"\)\s*\?\?/);
    }
  });
});
