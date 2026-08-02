import { redirect } from 'next/navigation';

/** Legacy route — Positions now lives under Portfolio. */
export default function PositionsRedirect() {
  redirect('/portfolio?tab=positions');
}
