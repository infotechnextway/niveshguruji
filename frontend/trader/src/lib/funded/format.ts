import { site } from "./site";

/** Indian-grouped rupee formatting, e.g. 184320 -> "₹1,84,320". */
export function inr(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

/** Apply the standing discount code. */
export function discounted(price: number): number {
  return Math.round(price * (1 - site.discountPct / 100));
}
