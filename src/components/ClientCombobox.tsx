import { useMemo, useRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import type { Client } from "@/lib/data";
import { cn } from "@/lib/utils";

type Props = {
  clients: Client[];
  value: string;
  selectedId: string | null;
  onChange: (name: string, clientId: string | null) => void;
  placeholder?: string;
};

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function ClientCombobox({
  clients,
  value,
  selectedId,
  onChange,
  placeholder,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const matches = useMemo(() => {
    const q = norm(value.trim());
    if (!q) return clients.slice(0, 8);
    return clients
      .filter((c) => norm(c.name).includes(q))
      .slice(0, 8);
  }, [clients, value]);

  const exact = clients.find(
    (c) => norm(c.name) === norm(value.trim())
  );

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value, null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        maxLength={120}
      />
      {selectedId && exact && (
        <p className="text-xs text-muted-foreground mt-1">
          Cliente existente · histórico será atualizado
        </p>
      )}
      {!selectedId && value.trim() && !exact && (
        <p className="text-xs text-muted-foreground mt-1">
          Novo cliente — será criado automaticamente
        </p>
      )}
      {open && matches.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border border-border bg-popover shadow-md">
          {matches.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(c.name, c.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors",
                  selectedId === c.id && "bg-accent"
                )}
              >
                <div className="font-medium">{c.name}</div>
                {c.phone && (
                  <div className="text-xs text-muted-foreground">{c.phone}</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
