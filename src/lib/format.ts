// src/lib/format.ts — formatadores compartilhados

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatBRL = (value: number | null | undefined) => brl.format(Number(value) || 0);

export const formatDate = (d?: Date | null) =>
    d ? d.toLocaleDateString("pt-BR") : "—";

export const formatTime = (d?: Date | null) =>
    d ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";

export const formatDateTime = (d?: Date | null) =>
    d ? `${formatDate(d)} · ${formatTime(d)}` : "—";

/** Iniciais para avatares ("Maria Souza" -> "MS") */
export const initials = (name?: string | null) =>
    (name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(p => p.charAt(0).toUpperCase())
        .join("") || "?";

/** Converte "1.234,56" / "1234.56" em número. */
export const parseMoney = (v: string | number | null | undefined) => {
    if (typeof v === "number") return v;
    const s = String(v ?? "").trim();
    if (!s) return 0;
    const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
};

export const onlyDigits = (v: string) => v.replace(/\D/g, "");

export const formatPhone = (v?: string | null) => {
    const d = onlyDigits(v || "").replace(/^55(?=\d{10,11}$)/, "");
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return v || "";
};

export const daysBetween = (a: Date, b: Date) => Math.floor((b.getTime() - a.getTime()) / 86400000);
