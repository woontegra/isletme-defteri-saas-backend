export function auditLog(
  action: string,
  actorId: string,
  targetId: string,
  meta?: Record<string, unknown>
): void {
  console.log(
    `[AUDIT] ${new Date().toISOString()} action=${action} actor=${actorId} target=${targetId}`,
    meta ? JSON.stringify(meta) : ""
  );
}
