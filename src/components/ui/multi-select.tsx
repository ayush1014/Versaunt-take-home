"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Lightweight multi-select dropdown (checkbox list). Options are derived from
// data, so new values (e.g. new ads) show up automatically.
export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  className,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const toggle = (v: string) =>
    onChange(
      selected.includes(v)
        ? selected.filter((x) => x !== v)
        : [...selected, v],
    );

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "glass-control inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium",
          selected.length > 0
            ? "glass-control-active text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        {selected.length > 0 ? (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
            {selected.length}
          </span>
        ) : null}
        <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="glass-pop absolute left-0 z-30 mt-1 max-h-64 w-56 overflow-y-auto rounded-lg p-1 text-foreground">
          {selected.length > 0 ? (
            <button
              type="button"
              onClick={() => onChange([])}
              className="glass-hover mb-1 w-full rounded-md px-2 py-1 text-left text-xs text-muted-foreground hover:text-foreground"
            >
              Clear selection
            </button>
          ) : null}
          {options.map((opt) => {
            const active = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className="glass-hover flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border",
                  )}
                >
                  {active ? <Check className="h-3 w-3" /> : null}
                </span>
                <span className="truncate">{opt}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
