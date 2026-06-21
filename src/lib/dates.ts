// A booking's check_out is a date (no time). Sessions should stay valid
// through the whole checkout day, so we expire them at the end of it.
export function endOfDayUTC(dateString: string): string {
  return `${dateString}T23:59:59.999Z`;
}
