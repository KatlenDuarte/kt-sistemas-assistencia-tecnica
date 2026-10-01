// src/screens/app/CashPage.tsx — abertura e fechamento de caixa

import { useCallback, useEffect, useMemo, useState } from "react";
import { Wallet, Landmark, ArrowUpCircle, ArrowDownCircle, Package, FileText, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Page, PageHeader, Card, CardHeader, StatCard, Button, IconButton, Badge, EmptyState, LoadingState, Modal, Field, MoneyInput } from "../../components/ui";
import { useApi, useSession } from "../../contexts/SessionContext";
import { useStoreData } from "../../contexts/StoreDataContext";
import { useToast } from "../../contexts/ToastContext";
import { formatBRL, formatDateTime, formatTime, parseMoney } from "../../lib/format";
import { isRevenue, paymentBreakdown } from "../../lib/domain";
import type { CashMovement, CashSession } from "../../data/types";

export default function CashPage() {
    const api = useApi();
    const { store } = useSession();
    const { sales } = useStoreData();
    const { toast, confirm } = useToast();

    const [session, setSession] = useState<CashSession | null>(null);
    const [movements, setMovements] = useState<CashMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [opening, setOpening] = useState("");
    const [desc, setDesc] = useState("");
    const [amount, setAmount] = useState("");
    const [closingOpen, setClosingOpen] = useState(false);
    const [counted, setCounted] = useState("");
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        const s = await api.getOpenCashSession();
        setSession(s);
        setMovements(s ? await api.listCashMovements(s.id) : []);
        setLoading(false);
    }, [api]);

    useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

    const summary = useMemo(() => {
        const acc = { pix: 0, cartao: 0, dinheiro: 0, fiado: 0, count: 0, items: new Map<string, number>() };
        if (!session) return acc;
        const since = new Date(session.opened_at);
        sales.forEach(s => {
            const created = new Date(s.created_at);
            // Fiado quitado durante o turno entra pela data do pagamento
            if (s.status === "fiado_quitado") {
                if (s.paid_at && new Date(s.paid_at) >= since) {
                    const b = paymentBreakdown(s);
                    acc.pix += b.pix; acc.cartao += b.cartao; acc.dinheiro += b.dinheiro;
                }
                if (created < since) return;
            }
            if (created < since || !isRevenue(s)) return;
            acc.count++;
            if (s.status !== "fiado_quitado") {
                const b = paymentBreakdown(s);
                acc.pix += b.pix; acc.cartao += b.cartao; acc.dinheiro += b.dinheiro; acc.fiado += b.fiado;
            }
            s.items.forEach(i => acc.items.set(i.name, (acc.items.get(i.name) || 0) + i.qty));
        });
        return acc;
    }, [sales, session]);

    const totalIn = movements.filter(m => m.kind === "entrada").reduce((a, m) => a + m.amount, 0);
    const totalOut = movements.filter(m => m.kind === "saida").reduce((a, m) => a + m.amount, 0);
    const expected = (session?.opening_balance || 0) + summary.dinheiro + totalIn - totalOut;
    const diff = parseMoney(counted) - expected;
    const soldItems = [...summary.items.entries()].sort((a, b) => b[1] - a[1]);

    const openCash = async () => {
        setBusy(true);
        try { await api.openCashSession(parseMoney(opening)); setOpening(""); await load(); toast("Caixa aberto."); }
        catch (e) { toast((e as Error).message, "error"); }
        finally { setBusy(false); }
    };

    const addMovement = async (kind: "entrada" | "saida") => {
        const value = parseMoney(amount);
        if (!session || !desc.trim() || value <= 0) { toast("Informe descrição e valor.", "error"); return; }
        try {
            await api.addCashMovement({ session_id: session.id, kind, description: desc.trim(), amount: value });
            setDesc(""); setAmount("");
            setMovements(await api.listCashMovements(session.id));
        } catch (e) { toast((e as Error).message, "error"); }
    };

    const removeMovement = async (m: CashMovement) => {
        if (!(await confirm({ title: "Excluir movimentação?", message: m.description, confirmLabel: "Excluir", danger: true }))) return;
        await api.deleteCashMovement(m.id);
        if (session) setMovements(await api.listCashMovements(session.id));
    };

    const exportPdf = () => {
        if (!session || !store) return;
        const pdf = new jsPDF();
        pdf.setFontSize(16);
        pdf.text(`${store.name} · Fechamento de caixa`, 14, 18);
        pdf.setFontSize(10);
        pdf.setTextColor(90);
        pdf.text(`Abertura: ${formatDateTime(new Date(session.opened_at))}   ·   Fechamento: ${formatDateTime(new Date())}`, 14, 25);
        autoTable(pdf, {
            startY: 32,
            head: [["Gaveta (dinheiro)", "Valor"]],
            body: [
                ["Fundo inicial", formatBRL(session.opening_balance)],
                ["Vendas em dinheiro", formatBRL(summary.dinheiro)],
                ["Entradas", formatBRL(totalIn)],
                ["Saídas", formatBRL(totalOut)],
                ["Saldo esperado", formatBRL(expected)],
                ["Valor contado", formatBRL(parseMoney(counted))],
                ["Diferença", formatBRL(diff)],
            ],
            headStyles: { fillColor: [242, 100, 25] },
        });
        const y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
        autoTable(pdf, {
            startY: y + 8,
            head: [["Outros recebimentos", "Valor"]],
            body: [["PIX", formatBRL(summary.pix)], ["Cartão", formatBRL(summary.cartao)], ["Fiado (a receber)", formatBRL(summary.fiado)]],
            headStyles: { fillColor: [40, 44, 52] },
        });
        if (movements.length) {
            const y2 = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
            autoTable(pdf, {
                startY: y2 + 8,
                head: [["Movimentação", "Tipo", "Valor"]],
                body: movements.map(m => [m.description, m.kind === "entrada" ? "Entrada" : "Saída", formatBRL(m.amount)]),
                headStyles: { fillColor: [40, 44, 52] },
            });
        }
        pdf.save(`fechamento_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const closeCash = async () => {
        if (!session) return;
        setBusy(true);
        try {
            exportPdf();
            await api.closeCashSession(session.id, { expected, counted: parseMoney(counted), difference: diff });
            setClosingOpen(false); setCounted("");
            await load();
            toast("Caixa fechado. Relatório baixado.");
        } catch (e) { toast((e as Error).message, "error"); }
        finally { setBusy(false); }
    };

    if (loading) return <LoadingState label="Verificando o caixa..." />;

    if (!session) {
        return (
            <Page narrow>
                <PageHeader title="Caixa" description="Abra o turno informando o fundo de troco. As vendas são somadas automaticamente." meta={<Badge tone="danger" dot>Caixa fechado</Badge>} />
                <Card padded={false}>
                    <CardHeader title="Abrir caixa" description="Dinheiro separado para troco na gaveta" icon={Wallet} />
                    <div className="space-y-4 p-5 sm:p-6">
                        <Field label="Fundo de caixa" className="max-w-xs"><MoneyInput value={opening} onChange={setOpening} autoFocus /></Field>
                        <div className="flex items-start gap-2 rounded-xl bg-info-soft px-3 py-2.5 text-sm text-info">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            Com o caixa aberto você registra entradas e saídas e, no fim do dia, confere o dinheiro da gaveta.
                        </div>
                    </div>
                    <div className="flex justify-end border-t border-line px-5 py-4">
                        <Button variant="primary" icon={CheckCircle2} loading={busy} onClick={openCash}>Abrir caixa</Button>
                    </div>
                </Card>
            </Page>
        );
    }

    return (
        <Page>
            <PageHeader title="Caixa" description={`Turno aberto em ${formatDateTime(new Date(session.opened_at))}.`} meta={<Badge tone="success" dot>Caixa aberto</Badge>}
                actions={<Button variant="primary" icon={FileText} onClick={() => setClosingOpen(true)}>Fechar caixa</Button>} />

            <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-5 gap-3 sm:gap-4">
                <StatCard label="Fundo inicial" value={formatBRL(session.opening_balance)} icon={Wallet} />
                <StatCard label="Vendas em dinheiro" value={formatBRL(summary.dinheiro)} icon={Landmark} tone="success" />
                <StatCard label="Entradas" value={formatBRL(totalIn)} icon={ArrowUpCircle} tone="success" />
                <StatCard label="Saídas" value={formatBRL(totalOut)} icon={ArrowDownCircle} tone="danger" />
                <StatCard label="PIX + Cartão" value={formatBRL(summary.pix + summary.cartao)} icon={Package} tone="info" className="col-span-2 md:col-span-1" hint={`${summary.count} vendas no turno`} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Card>
                    <p className="text-sm font-medium text-fg-subtle">Saldo esperado na gaveta</p>
                    <p className="mt-2 text-4xl font-bold tracking-tight text-fg tabular">{formatBRL(expected)}</p>
                    <dl className="mt-6 space-y-2 text-sm">
                        {[["Fundo inicial", session.opening_balance], ["+ Vendas em dinheiro", summary.dinheiro], ["+ Entradas", totalIn], ["− Saídas", totalOut]].map(([l, v]) => (
                            <div key={l as string} className="flex justify-between"><dt className="text-fg-subtle">{l}</dt><dd className="tabular text-fg">{formatBRL(v as number)}</dd></div>
                        ))}
                        {summary.fiado > 0 && <div className="flex justify-between border-t border-line pt-2"><dt className="text-fg-subtle">Fiado no turno (a receber)</dt><dd className="tabular text-danger">{formatBRL(summary.fiado)}</dd></div>}
                    </dl>
                </Card>

                <Card padded={false} className="xl:col-span-2 overflow-hidden">
                    <CardHeader title="Entradas e saídas" description="Trocos, sangrias e pagamentos feitos com o dinheiro da gaveta" icon={ArrowUpCircle} />
                    <div className="flex flex-col gap-2 border-b border-line p-4 sm:flex-row">
                        <input className="ui-input flex-1" placeholder="Descrição" value={desc} onChange={e => setDesc(e.target.value)} />
                        <MoneyInput className="sm:w-36" value={amount} onChange={setAmount} />
                        <div className="flex gap-2">
                            <Button icon={ArrowUpCircle} className="flex-1 !text-success" onClick={() => addMovement("entrada")}>Entrada</Button>
                            <Button icon={ArrowDownCircle} className="flex-1 !text-danger" onClick={() => addMovement("saida")}>Saída</Button>
                        </div>
                    </div>
                    {movements.length === 0 ? <EmptyState icon={Landmark} title="Nenhuma movimentação" className="py-10" /> : (
                        <ul className="divide-y divide-line max-h-80 overflow-y-auto">
                            {movements.map(m => (
                                <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${m.kind === "entrada" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
                                        {m.kind === "entrada" ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm text-fg">{m.description}</p>
                                        <p className="text-xs text-fg-subtle">{m.kind === "entrada" ? "Entrada" : "Saída"} · {formatTime(new Date(m.created_at))}</p>
                                    </div>
                                    <span className={`text-sm font-semibold tabular ${m.kind === "entrada" ? "text-success" : "text-danger"}`}>{m.kind === "entrada" ? "+" : "−"} {formatBRL(m.amount)}</span>
                                    <IconButton icon={Trash2} label="Excluir" tone="danger" onClick={() => removeMovement(m)} />
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            <Card padded={false} className="overflow-hidden">
                <CardHeader title="Itens vendidos no turno" description={`${soldItems.length} produtos diferentes`} icon={Package} />
                {soldItems.length === 0 ? <EmptyState icon={Package} title="Nenhum item vendido ainda" className="py-10" /> : (
                    <ul className="divide-y divide-line max-h-80 overflow-y-auto">
                        {soldItems.map(([name, qty]) => (
                            <li key={name} className="flex justify-between px-5 py-3 text-sm"><span className="text-fg">{name}</span><span className="tabular text-fg-muted">{qty} un</span></li>
                        ))}
                    </ul>
                )}
            </Card>

            <Modal open={closingOpen} onClose={() => setClosingOpen(false)} size="sm" title="Fechar caixa" description="Conte o dinheiro da gaveta e informe o total."
                footer={<><Button onClick={() => setClosingOpen(false)}>Cancelar</Button><Button variant="primary" loading={busy} disabled={!counted} onClick={closeCash}>Fechar e baixar PDF</Button></>}>
                <div className="space-y-4">
                    <div className="flex justify-between rounded-xl border border-line bg-subtle px-4 py-3 text-sm"><span className="text-fg-subtle">Saldo esperado</span><span className="font-semibold text-fg tabular">{formatBRL(expected)}</span></div>
                    <Field label="Valor contado"><MoneyInput value={counted} onChange={setCounted} autoFocus /></Field>
                    {counted && (
                        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${Math.abs(diff) < 0.005 ? "bg-success-soft text-success" : diff > 0 ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger"}`}>
                            {Math.abs(diff) < 0.005 ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            {Math.abs(diff) < 0.005 ? "Os valores batem." : diff > 0 ? `Sobra de ${formatBRL(diff)}.` : `Falta de ${formatBRL(-diff)}.`}
                        </div>
                    )}
                </div>
            </Modal>
        </Page>
    );
}
