/** Format an auto-increment integer ID as a zero-padded UID string.
 *  e.g. formatUid(1) → "SR-0000001", formatUid(42) → "SR-0000042"
 */
export function formatUid(id: number): string {
    return `SR-${String(id).padStart(7, "0")}`;
}
