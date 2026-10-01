// src/screens/app/NewSaleModal.tsx — registrar venda, serviço ou perda

import { useMemo, useRef, useState } from "react";
import {
    Search, Plus, Minus, Trash2, ShoppingCart, Wrench, PackageX, QrCode, CreditCard, Banknote,
    Layers, BookOpenText, CheckCircle2, Printer, ScanBarcode,
} from "lucide-react";
import { Button, Field, Modal, MoneyInput, Segmented } from "../../components/ui";
import { useSession, useApi } from "../../contexts/SessionContext";
import { useStoreData } from "../../contexts/StoreDataContext";
import { useToast } from "../../contexts/ToastContext";
import { formatBRL, parseMoney } from "../../lib/format";
import { printSaleReceipt } from "../../lib/domain";
import type { NewSale, PaymentMethod, Product, Sale, SaleItem, SaleKind } from "../../data/types";

const METHODS: { id: PaymentMethod; label: string; icon: typeof QrCode }[] = [
    { id: "pix", label: "PIX", icon: QrCode },
    { id: "cartao", label: "Cartão", icon: CreditCard },
    { id: "dinheiro", label: "Dinheiro", icon: Banknote },
    { id: "multiplo", label: "Múltiplos", icon: Layers },
    { id: "fiado", label: "Fiado", icon: BookOpenText },
];

export default function NewSaleModal({ open, onClose, initialKind = "venda" }: {
    open: boolean;
    onClose: () => void;
    initialKind?: SaleKind;
}) {
    const api = useApi();
    const { store } = useSession();
    const { products, reloadProducts, reloadSales } = useStoreData();
    const { toast } = useToast();

    const [kind, setKind] = useState<SaleKind>(initialKind);
    const [cart, setCart] = useState<SaleItem[]>([]);
    const [search, setSearch] = useState("");
    const [looseName, setLooseName] = useState("");
    const [loosePrice, setLoosePrice] = useState("");
    const [discount, setDiscount] = useState("");
    const [method, setMethod] = useState<PaymentMethod>("pix");
    const [multi, setMulti] = useState({ pix: "", cartao: "", dinheiro: "" });
    const [received, setReceived] = useState("");
    const [customer, setCustomer] = useState("");
    const [phone, setPhone] = useState("");
    const [note, setNote] = useState("");
    // serviço
    const [serviceDesc, setServiceDesc] = useState("");
    const [serviceValue, setServiceValue] = useState("");
    const [partCost, setPartCost] = useState("");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState<Sale | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const reset = () => {
        setCart([]); setSearch(""); setLooseName(""); setLoosePrice(""); setDiscount(""); setMethod("pix");
        setMulti({ pix: "", cartao: "", dinheiro: "" }); setReceived(""); setCustomer(""); setPhone(""); setNote("");
        setServiceDesc(""); setServiceValue(""); setPartCost(""); setError(""); setDone(null);
    };

    const close = () => { reset(); onClose(); };

    const results = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return [];
        return products
            .filter(p => p.name.toLowerCase().includes(q) || (p.barcode || "").includes(q) || (p.model || "").toLowerCase().includes(q))
            .slice(0, 8);
    }, [search, products]);

    const stockOf = (id: string | null) => products.find(p => p.id === id)?.stock ?? Infinity;

    const addProduct = (p: Product) => {
        setError("");
        setCart(prev => {
            const existing = prev.find(i => i.product_id === p.id);
            const inCart = existing?.qty ?? 0;
            if (kind !== "servico" && inCart + 1 > p.stock) {
                setError(`Estoque insuficiente de "${p.name}" (disponível: ${p.stock}).`);
                return prev;
            }
            if (existing) return prev.map(i => i.product_id === p.id ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { product_id: p.id, name: p.name, price: p.price, qty: 1 }];
        });
        setSearch("");
        searchRef.current?.focus();
    };

    const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const code = search.trim();
        const exact = products.find(p => p.barcode && p.barcode === code);
        if (exact) addProduct(exact);
        else if (results.length === 1) addProduct(results[0]);
        else if (code && results.length === 0) setError(`Nenhum produto com "${code}".`);
    };

    const changeQty = (idx: number, delta: number) => {
        setCart(prev => prev.flatMap((i, k) => {
            if (k !== idx) return [i];
            const qty = i.qty + delta;
            if (qty <= 0) return [];
            if (delta > 0 && qty > stockOf(i.product_id)) { setError(`Estoque insuficiente de "${i.name}".`); return [i]; }
            return [{ ...i, qty }];
        }));
    };

    const addLoose = () => {
        const price = parseMoney(loosePrice);
        if (!looseName.trim() || price <= 0) { setError("Informe descrição e valor do item avulso."); return; }
        setCart(prev => [...prev, { product_id: null, name: looseName.trim(), price, qty: 1 }]);
        setLooseName(""); setLoosePrice(""); setError("");
    };

    const subtotal = kind === "servico" ? parseMoney(serviceValue) : cart.reduce((a, i) => a + i.price * i.qty, 0);
    const disc = kind === "perda" ? 0 : Math.min(parseMoney(discount), subtotal);
    const total = Math.max(0, Math.round((subtotal - disc) * 100) / 100);
    const multiSum = parseMoney(multi.pix) + parseMoney(multi.cartao) + parseMoney(multi.dinheiro);
    const change = method === "dinheiro" ? parseMoney(received) - total : 0;

    const validate = (): string | null => {
        if (kind === "servico") {
            if (!serviceDesc.trim()) return "Descreva o serviço realizado.";
            if (total <= 0) return "Informe o valor do serviço.";
        } else if (cart.length === 0) return "Adicione pelo menos um item.";
        if (kind !== "perda") {
            if (method === "multiplo" && Math.abs(multiSum - total) > 0.009) return `A soma dos pagamentos (${formatBRL(multiSum)}) deve ser igual ao total (${formatBRL(total)}).`;
            if (method === "fiado" && !customer.trim()) return "Informe o nome do cliente para vender no fiado.";
        }
        return null;
    };

    const finish = async () => {
        const v = validate();
        if (v) { setError(v); return; }
        setSaving(true);
        setError("");
        const items: SaleItem[] = kind === "servico" ? [{ product_id: null, name: serviceDesc.trim(), price: total, qty: 1 }] : cart;
        const payments = kind === "perda" ? {}
            : method === "multiplo" ? { pix: parseMoney(multi.pix), cartao: parseMoney(multi.cartao), dinheiro: parseMoney(multi.dinheiro) }
                : method === "fiado" ? {} : { [method]: total };
        const sale: NewSale = {
            kind,
            items,
            subtotal: kind === "perda" ? cart.reduce((a, i) => a + i.price * i.qty, 0) : subtotal,
            discount: disc,
            total: kind === "perda" ? cart.reduce((a, i) => a + i.price * i.qty, 0) : total,
            payment_method: kind === "perda" ? "nenhum" : method,
            payments,
            status: kind === "perda" ? "perda" : method === "fiado" ? "fiado_pendente" : "concluida",
            customer_name: customer.trim() || null,
            customer_phone: phone.trim() || null,
            note: note.trim() || null,
            part_cost: kind === "servico" ? parseMoney(partCost) : 0,
        };
        try {
            const saved = await api.registerSale(sale);
            await Promise.all([reloadProducts(), reloadSales()]);
            toast(kind === "perda" ? "Perda registrada e estoque atualizado." : kind === "servico" ? "Serviço registrado." : "Venda registrada!");
            setDone(saved);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    if (done && store) {
        return (
            <Modal open={open} onClose={close} size="sm" title="Operação concluída">
                <div className="flex flex-col items-center py-4 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft text-success"><CheckCircle2 className="h-7 w-7" /></div>
                    <p className="mt-4 text-2xl font-bold text-fg tabular">{formatBRL(done.total)}</p>
                    <p className="mt-1 text-sm text-fg-subtle">{done.kind === "perda" ? "Perda registrada" : done.status === "fiado_pendente" ? `Fiado para ${done.customer_name}` : "Pagamento registrado"}</p>
                    <div className="mt-6 grid w-full gap-2">
                        {done.kind !== "perda" && <Button variant="secondary" icon={Printer} onClick={() => printSaleReceipt(store, done)}>Imprimir cupom</Button>}
                        <Button variant="primary" icon={Plus} onClick={() => { reset(); searchRef.current?.focus(); }}>Nova operação</Button>
                        <Button variant="ghost" onClick={close}>Fechar</Button>
                    </div>
                </div>
            </Modal>
        );
    }

    return (
        <Modal
            open={open}
            onClose={close}
            size="xl"
            title="Nova operação"
            description={<Segmented
                className="mt-2"
                value={kind}
                onChange={k => { setKind(k); setError(""); }}
                options={[
                    { value: "venda", label: <span className="inline-flex items-center gap-1.5"><ShoppingCart size={14} /> Venda</span> },
                    { value: "servico", label: <span className="inline-flex items-center gap-1.5"><Wrench size={14} /> Serviço</span> },
                    { value: "perda", label: <span className="inline-flex items-center gap-1.5"><PackageX size={14} /> Perda</span> },
                ]}
            />}
            footer={<>
                <Button onClick={close}>Cancelar</Button>
                <Button variant="primary" loading={saving} onClick={finish} icon={CheckCircle2}>
                    {kind === "perda" ? "Registrar perda" : `Concluir · ${formatBRL(total)}`}
                </Button>
            </>}
        >
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                {/* ITENS */}
                <div className="space-y-4 min-w-0">
                    {kind === "servico" ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Serviço realizado" className="sm:col-span-2">
                                <input className="ui-input" value={serviceDesc} onChange={e => setServiceDesc(e.target.value)} placeholder="Ex.: Troca de tela iPhone 11" autoFocus />
                            </Field>
                            <Field label="Valor cobrado"><MoneyInput value={serviceValue} onChange={setServiceValue} /></Field>
                            <Field label="Custo da peça" hint="Usado para calcular o lucro."><MoneyInput value={partCost} onChange={setPartCost} /></Field>
                            {parseMoney(serviceValue) > 0 && (
                                <p className="sm:col-span-2 text-sm text-fg-subtle">Lucro estimado: <span className="font-semibold text-success">{formatBRL(parseMoney(serviceValue) - parseMoney(partCost))}</span></p>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-faint" />
                                <input
                                    ref={searchRef}
                                    autoFocus
                                    className="ui-input h-11 pl-9 pr-10"
                                    placeholder="Buscar produto ou bipar código de barras"
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setError(""); }}
                                    onKeyDown={onSearchKey}
                                />
                                <ScanBarcode className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-faint" />
                                {results.length > 0 && (
                                    <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-2xl">
                                        {results.map(p => (
                                            <li key={p.id}>
                                                <button
                                                    onClick={() => addProduct(p)}
                                                    disabled={p.stock <= 0}
                                                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-hover disabled:opacity-50"
                                                >
                                                    <span className="min-w-0">
                                                        <span className="block truncate text-sm font-medium text-fg">{p.name}</span>
                                                        <span className={`text-xs ${p.stock <= 0 ? "text-danger" : "text-fg-subtle"}`}>{p.stock <= 0 ? "Sem estoque" : `${p.stock} em estoque`}{p.barcode ? ` · ${p.barcode}` : ""}</span>
                                                    </span>
                                                    <span className="shrink-0 text-sm font-semibold text-fg tabular">{formatBRL(p.price)}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {cart.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-fg-subtle">
                                    Busque um produto acima ou bipe o código de barras.
                                </div>
                            ) : (
                                <ul className="divide-y divide-line rounded-2xl border border-line">
                                    {cart.map((item, idx) => (
                                        <li key={idx} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                                            <div className="min-w-0 flex-1 basis-full sm:basis-0">
                                                <p className="truncate text-sm font-medium text-fg">{item.name}</p>
                                                <p className="text-xs text-fg-subtle tabular">{formatBRL(item.price)} cada{!item.product_id && " · avulso"}</p>
                                            </div>
                                            <div className="flex items-center rounded-xl border border-line">
                                                <button onClick={() => changeQty(idx, -1)} className="flex h-8 w-8 items-center justify-center text-fg-subtle hover:text-fg" aria-label="Diminuir"><Minus size={14} /></button>
                                                <span className="w-7 text-center text-sm font-semibold text-fg tabular">{item.qty}</span>
                                                <button onClick={() => changeQty(idx, 1)} className="flex h-8 w-8 items-center justify-center text-fg-subtle hover:text-fg" aria-label="Aumentar"><Plus size={14} /></button>
                                            </div>
                                            <span className="w-24 text-right text-sm font-semibold text-fg tabular">{formatBRL(item.price * item.qty)}</span>
                                            <button onClick={() => changeQty(idx, -item.qty)} className="text-fg-faint hover:text-danger" aria-label="Remover"><Trash2 size={16} /></button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {kind === "venda" && (
                                <div className="rounded-2xl bg-subtle p-4">
                                    <p className="mb-2 text-xs font-medium text-fg-muted">Item avulso (fora do estoque)</p>
                                    <div className="flex gap-2">
                                        <input className="ui-input flex-1" placeholder="Descrição" value={looseName} onChange={e => setLooseName(e.target.value)} />
                                        <MoneyInput className="w-32" value={loosePrice} onChange={setLoosePrice} />
                                        <Button icon={Plus} onClick={addLoose} aria-label="Adicionar item avulso" />
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {kind === "perda" && (
                        <Field label="Motivo da perda"><input className="ui-input" value={note} onChange={e => setNote(e.target.value)} placeholder="Ex.: película quebrou na aplicação" /></Field>
                    )}
                </div>

                {/* RESUMO E PAGAMENTO */}
                <div className="space-y-4">
                    <div className="rounded-2xl border border-line p-4 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-fg-subtle">Subtotal</span><span className="tabular text-fg">{formatBRL(kind === "perda" ? cart.reduce((a, i) => a + i.price * i.qty, 0) : subtotal)}</span></div>
                        {kind !== "perda" && (
                            <div className="flex items-center justify-between gap-3"><span className="text-fg-subtle">Desconto</span><MoneyInput className="w-32" value={discount} onChange={setDiscount} /></div>
                        )}
                        <div className="flex items-baseline justify-between border-t border-line pt-3">
                            <span className="font-semibold text-fg">{kind === "perda" ? "Prejuízo" : "Total"}</span>
                            <span className={`text-2xl font-bold tabular ${kind === "perda" ? "text-danger" : "text-fg"}`}>{formatBRL(kind === "perda" ? cart.reduce((a, i) => a + i.price * i.qty, 0) : total)}</span>
                        </div>
                    </div>

                    {kind !== "perda" && (
                        <>
                            <div>
                                <p className="ui-label">Forma de pagamento</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {METHODS.map(m => {
                                        const Icon = m.icon;
                                        const active = method === m.id;
                                        return (
                                            <button key={m.id} onClick={() => { setMethod(m.id); setError(""); }}
                                                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors ${active ? "border-primary bg-primary-soft text-primary-text" : "border-line text-fg-muted hover:bg-hover"}`}>
                                                <Icon size={18} /> {m.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {method === "dinheiro" && (
                                <div className="grid grid-cols-2 items-end gap-3">
                                    <Field label="Valor recebido"><MoneyInput value={received} onChange={setReceived} /></Field>
                                    <div className="pb-2.5 text-sm">
                                        <span className="text-fg-subtle">Troco: </span>
                                        <span className={`font-semibold tabular ${change < 0 ? "text-danger" : "text-success"}`}>{received ? formatBRL(Math.max(0, change)) : "—"}</span>
                                    </div>
                                </div>
                            )}

                            {method === "multiplo" && (
                                <div className="space-y-2">
                                    {(["pix", "cartao", "dinheiro"] as const).map(k => (
                                        <div key={k} className="flex items-center gap-3">
                                            <span className="w-20 text-sm text-fg-muted">{k === "pix" ? "PIX" : k === "cartao" ? "Cartão" : "Dinheiro"}</span>
                                            <MoneyInput className="flex-1" value={multi[k]} onChange={v => setMulti(m => ({ ...m, [k]: v }))} />
                                        </div>
                                    ))}
                                    <p className={`text-xs ${Math.abs(multiSum - total) < 0.01 ? "text-success" : "text-fg-subtle"}`}>
                                        Informado {formatBRL(multiSum)} de {formatBRL(total)}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <Field label={method === "fiado" ? "Cliente *" : "Cliente (opcional)"}>
                                    <input className="ui-input" value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Nome" />
                                </Field>
                                <Field label="WhatsApp">
                                    <input className="ui-input" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(31) 9..." />
                                </Field>
                            </div>
                            {method === "fiado" && (
                                <Field label="Observação"><input className="ui-input" value={note} onChange={e => setNote(e.target.value)} placeholder="Ex.: paga dia 10" /></Field>
                            )}
                        </>
                    )}

                    {error && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</p>}
                </div>
            </div>
        </Modal>
    );
}
