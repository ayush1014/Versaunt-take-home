// Soft monochrome gradient backdrop. Uses CSS radial-gradients instead of an
// SVG feGaussianBlur — the gradient fade IS the blur, so there's no expensive
// per-frame Gaussian-blur rasterization (a major mobile-GPU win). Blob motion
// (translate) lives in src/app/glass.css and is disabled on touch devices.
export function GradientBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={className ?? "pointer-events-none absolute inset-0 overflow-hidden"}
    >
      <div
        className="blob-group-1 absolute -inset-[25%]"
        style={{
          background: [
            "radial-gradient(35% 32% at 24% 78%, oklch(from var(--primary) l c h / 0.40), transparent 70%)",
            "radial-gradient(40% 34% at 80% 24%, oklch(from var(--muted-foreground) l c h / 0.34), transparent 72%)",
          ].join(","),
        }}
      />
      <div
        className="blob-group-2 absolute -inset-[25%]"
        style={{
          background: [
            "radial-gradient(38% 32% at 82% 76%, oklch(from var(--muted-foreground) l c h / 0.30), transparent 72%)",
            "radial-gradient(34% 30% at 14% 22%, oklch(from var(--secondary) l c h / 0.55), transparent 72%)",
          ].join(","),
        }}
      />
    </div>
  );
}
