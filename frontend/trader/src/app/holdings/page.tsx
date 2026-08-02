import { redirect } from 'next/navigation';

/** Legacy route — Holdings now lives under Portfolio. */
export default function HoldingsRedirect() {
  redirect('/portfolio?tab=holdings');
}
