// Backward-compat shim — delegates to the full grading engine.
// Used by the /headers route to keep a simple securityAudit field.
import { gradeSecurityHeaders } from "./securityGrade";

export function auditSecurityHeaders(headers: Record<string, string>) {
  const result = gradeSecurityHeaders(headers);
  return {
    score: result.score,
    grade: result.grade,
    checks: result.checks.map((c) => ({ name: c.name, present: c.present, value: c.value, passed: c.passed })),
    issues: result.issues,
  };
}

