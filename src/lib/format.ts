/** Prices are stored in paisa (1 rupee = 100 paisa) and shown as Pakistani Rupees, e.g. "Rs 6,499". */
export function formatPrice(paisa: number): string {
  const rupees = paisa / 100;
  const whole = Number.isInteger(rupees);
  return `Rs ${rupees.toLocaleString("en-PK", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
