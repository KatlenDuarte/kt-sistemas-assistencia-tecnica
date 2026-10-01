// src/lib/domain.ts — regras e rótulos de negócio compartilhados pelas telas

import type { Tone } from "../components/ui";
import type { PaymentMethod, Payments, Sale, SaleStatus, ServiceStatus, Store } from "../data/types";
import { formatBRL, formatDateTime, formatPhone } from "./format";

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
    pix: "PIX", cartao: "Cartão", dinheiro: "Dinheiro", multiplo: "Múltiplos", fiado: "Fiado", nenhum: "—",
};

export const SALE_STATUS: Record<SaleStatus, { label: string; tone: Tone }> = {
    concluida: { label: "Concluída", tone: "success" },
    fiado_pendente: { label: "Fiado pendente", tone: "warning" },
    fiado_quitado: { label: "Fiado quitado", tone: "info" },
    estornada: { label: "Estornada", tone: "danger" },
    cancelada: { label: "Cancelada", tone: "neutral" },
    perda: { label: "Perda", tone: "danger" },
};

export const SERVICE_STATUS: Record<ServiceStatus, { label: string; tone: Tone }> = {
    aguardando: { label: "Aguardando", tone: "warning" },
    peca_pedida: { label: "Peça pedida", tone: "info" },
    em_reparo: { label: "Em reparo", tone: "primary" },
    pronto: { label: "Pronto p/ retirada", tone: "success" },
    entregue: { label: "Entregue", tone: "neutral" },
    cancelado: { label: "Cancelado", tone: "neutral" },
};

export const SERVICE_FLOW: ServiceStatus[] = ["aguardando", "peca_pedida", "em_reparo", "pronto", "entregue"];

export const CATEGORIES = [
    { id: "peliculas", label: "Películas" },
    { id: "capas", label: "Capas" },
    { id: "cabos", label: "Cabos" },
    { id: "acessorios", label: "Acessórios" },
    { id: "pecas", label: "Peças" },
    { id: "aparelhos", label: "Aparelhos" },
] as const;

export const categoryLabel = (id: string) => CATEGORIES.find(c => c.id === id)?.label || id;

/** Venda que conta como faturamento (exclui estornos, cancelamentos e perdas). */
export const isRevenue = (s: Sale) =>
    s.kind !== "perda" && s.status !== "estornada" && s.status !== "cancelada" && s.status !== "perda";

/** Quanto entrou por forma de pagamento (fiado pendente não entra). */
export function paymentBreakdown(s: Sale): Required<Payments> & { fiado: number } {
    const out = { pix: 0, cartao: 0, dinheiro: 0, fiado: 0 };
    if (!isRevenue(s)) return out;
    if (s.status === "fiado_pendente") { out.fiado = s.total; return out; }
    if (s.status === "fiado_quitado") {
        const m = (s.paid_method || "dinheiro") as keyof Payments;
        if (m in out) out[m] += s.total;
        return out;
    }
    if (s.payment_method === "multiplo") {
        out.pix = Number(s.payments.pix) || 0;
        out.cartao = Number(s.payments.cartao) || 0;
        out.dinheiro = Number(s.payments.dinheiro) || 0;
        return out;
    }
    if (s.payment_method === "pix" || s.payment_method === "cartao" || s.payment_method === "dinheiro") out[s.payment_method] = s.total;
    return out;
}

export const describeItems = (s: Sale) =>
    s.items.map(i => `${i.qty}× ${i.name}`).join(", ") || (s.kind === "servico" ? "Serviço" : "Venda");

export const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export type Period = "today" | "7d" | "month" | "all";
export function periodStart(p: Period): Date | null {
    const now = new Date();
    if (p === "today") return startOfDay(now);
    if (p === "7d") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    if (p === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
    return null;
}

export const PERIOD_LABEL: Record<Period, string> = {
    today: "hoje", "7d": "nos últimos 7 dias", month: "neste mês", all: "nos últimos 120 dias",
};

/* ------------------------------------------------------------------ Cupom */

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/** Imprime cupom (80mm) usando a impressão do navegador — funciona em qualquer impressora. */
export function printReceipt(store: Store, opts: {
    title: string;
    lines: { name: string; qty?: number; value: number }[];
    total: number;
    discount?: number;
    payment?: string;
    customer?: string | null;
    phone?: string | null;
    footer?: string;
    date?: string;
}) {
    const w = window.open("", "_blank", "width=380,height=640");
    if (!w) { alert("Permita pop-ups para imprimir o cupom."); return; }
    const rows = opts.lines.map(l => `
        <tr><td>${l.qty ? `${l.qty}× ` : ""}${esc(l.name)}</td><td class="r">${formatBRL(l.value)}</td></tr>`).join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(opts.title)}</title>
<style>
  *{box-sizing:border-box} body{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;width:80mm;margin:0;padding:10px;color:#000}
  h1{font-size:15px;margin:0;text-align:center} .c{text-align:center} .r{text-align:right;white-space:nowrap}
  hr{border:0;border-top:1px dashed #000;margin:8px 0} table{width:100%;border-collapse:collapse} td{padding:2px 0;vertical-align:top}
  img{display:block;margin:0 auto 6px;max-height:52px;max-width:60%} .big{font-size:15px;font-weight:700}
</style></head><body>
  ${store.logo_url ? `<img src="${esc(store.logo_url)}" alt="">` : ""}
  <h1>${esc(store.name)}</h1>
  ${store.address ? `<div class="c">${esc(store.address)}</div>` : ""}
  ${store.contact_phone ? `<div class="c">${esc(formatPhone(store.contact_phone))}</div>` : ""}
  <hr><div class="c"><b>${esc(opts.title)}</b><br>${esc(opts.date || formatDateTime(new Date()))}</div>
  ${opts.customer ? `<div>Cliente: ${esc(opts.customer)}${opts.phone ? ` · ${esc(formatPhone(opts.phone))}` : ""}</div>` : ""}
  <hr><table>${rows}</table><hr>
  ${opts.discount ? `<table><tr><td>Desconto</td><td class="r">- ${formatBRL(opts.discount)}</td></tr></table>` : ""}
  <table><tr><td class="big">TOTAL</td><td class="r big">${formatBRL(opts.total)}</td></tr></table>
  ${opts.payment ? `<div>Pagamento: ${esc(opts.payment)}</div>` : ""}
  <hr><div class="c">${esc(opts.footer || "Obrigado pela preferência!")}</div>
  <div class="c" style="margin-top:6px;font-size:10px">KT Sistemas</div>
  <script>window.onload=function(){setTimeout(function(){window.print();},250)}<\u002fscript>
</body></html>`);
    w.document.close();
}

export function printSaleReceipt(store: Store, s: Sale) {
    printReceipt(store, {
        title: s.kind === "servico" ? "Comprovante de serviço" : "Cupom não fiscal",
        lines: s.items.map(i => ({ name: i.name, qty: i.qty, value: i.price * i.qty })),
        total: s.total,
        discount: s.discount,
        payment: s.payment_method === "multiplo"
            ? Object.entries(s.payments).filter(([, v]) => Number(v) > 0).map(([k, v]) => `${PAYMENT_LABEL[k as PaymentMethod]} ${formatBRL(Number(v))}`).join(" + ")
            : PAYMENT_LABEL[s.payment_method],
        customer: s.customer_name,
        phone: s.customer_phone,
        date: formatDateTime(new Date(s.created_at)),
    });
}
