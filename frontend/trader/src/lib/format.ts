/** Indian grouping (e.g. 10,28,720.00) without toLocaleString — Node vs browser
 *  ICU can disagree and trigger React hydration text mismatches. */
function groupEnIN(intPart: string): string {
  if (intPart.length <= 3) return intPart;
  const last3 = intPart.slice(-3);
  let rest = intPart.slice(0, -3);
  const chunks: string[] = [];
  while (rest.length > 2) {
    chunks.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) chunks.unshift(rest);
  return `${chunks.join(',')},${last3}`;
}

function formatFixed(n: number, decimals: number): string {
  const neg = n < 0;
  const abs = Math.abs(n);
  const fixed = abs.toFixed(decimals);
  const [intRaw, frac] = fixed.split('.');
  const grouped = groupEnIN(intRaw);
  const body = decimals > 0 ? `${grouped}.${frac}` : grouped;
  return neg ? `-${body}` : body;
}

export function paise(p: number, opts: { sign?: boolean; decimals?: boolean } = {}): string {
  const rupees = p / 100;
  const decimals = opts.decimals === false ? 0 : 2;
  const grouped = formatFixed(Math.abs(rupees), decimals);
  const s = p < 0 ? '-' : opts.sign ? '+' : '';
  return `${s}₹${grouped}`;
}
export function price(rupees: number): string {
  return formatFixed(rupees, 2);
}
export function pct(n: number, sign = true): string {
  const s = sign && n > 0 ? '+' : '';
  return `${s}${n.toFixed(2)}%`;
}
export function signClass(n: number): string {
  return n > 0 ? 'gain' : n < 0 ? 'loss' : 'dim';
}
