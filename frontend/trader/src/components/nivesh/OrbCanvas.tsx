"use client";

import dynamic from "next/dynamic";

// react-three-fiber must never render on the server.
const GuruOrb = dynamic(() => import("./GuruOrb"), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        background:
          "radial-gradient(circle at 40% 35%, rgba(124,134,242,0.55), rgba(11,16,32,0) 60%)",
        filter: "blur(8px)",
      }}
    />
  ),
});

export function OrbCanvas() {
  return (
    <div
      role="img"
      aria-label="An interactive 3D orb orbited by gold coins, representing wealth growing under guidance"
      style={{ width: "100%", height: "100%", maxWidth: "100%", overflow: "hidden" }}
    >
      <GuruOrb />
    </div>
  );
}
