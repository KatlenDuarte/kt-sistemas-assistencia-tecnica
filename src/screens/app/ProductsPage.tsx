// src/screens/app/ProductsPage.tsx — estoque

import { useMemo, useState } from "react";
import { Plus, Search, Package, Layers, DollarSign, FileText, AlertCircle, Edit, Trash2, ArrowUp, ArrowDown, TriangleAlert, Minus, RefreshCw, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Page, PageHeader, Card, StatCard, Button, IconButton, Badge, SearchInput, EmptyState, LoadingState, Modal, Field, MoneyInput } from "../../components/ui";
import { useApi, useSession } from "../../contexts/SessionContext";
import { useStoreData } from "../../contexts/StoreDataContext";
import { useToast } from "../../contexts/ToastContext";
import { formatBRL, parseMoney } from "../../lib/format";
import { CATEGORIES, categoryLabel } from "../../lib/domain";
import type { Product } from "../../data/types";

type SortField = "name" | "stock" | "price";
const EMPTY = { name: "", category: "acessorios", brand: "", model: "", barcode: "", supplier: "", stock: "0", min_stock: "5", cost_price: "", price: "" };

const stockTone = (p: Product) => (p.stock <= 0 ? "danger" : p.stock <= p.min_stock ? "warning" : "success") as "danger" | "warning" | "success";

export default function ProductsPage() {
    const api = useApi();
    const { store } = useSession();
    const { products, loading, reloadProducts } = useStoreData();
    const { toast, confirm } = useToast();

    const [category, setCategory] = useState("all");
    const [search, setSearch] = useState("");
    const [onlyLow, setOnlyLow] = useState(false);
    const [sort, setSort] = useState<{ field: SortField; dir: "asc" | "desc" }>({ field: "name", dir: "asc" });
    const [editing, setEditing] = useState<Product | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return products
            .filter(p => (category === "all" || p.category === category)
                && (!onlyLow || p.stock <= p.min_stock)
                && (!q || [p.name, p.brand, p.model, p.barcode].some(v => (v || "").toLowerCase().includes(q))))
            .sort((a, b) => {
                const dir = sort.dir === "asc" ? 1 : -1;
                if (sort.field === "name") return a.name.localeCompare(b.name) * dir;
                return (a[sort.field] - b[sort.field]) * dir;
            });
    }, [products, category, onlyLow, search, sort]);

    const stats = useMemo(() => ({
        items: products.reduce((a, p) => a + Math.max(0, p.stock), 0),
        value: products.reduce((a, p) => a + p.price * Math.max(0, p.stock), 0),
        cost: products.reduce((a, p) => a + (p.cost_price || 0) * Math.max(0, p.stock), 0),
        low: products.filter(p => p.stock <= p.min_stock).length,
        out: products.filter(p => p.stock <= 0).length,
    }), [products]);

    const toggleSort = (field: SortField) => setSort(s => ({ field, dir: s.field === field && s.dir === "asc" ? "desc" : "asc" }));
    const sortHeader = (field: SortField, label: string) => (
        <button onClick={() => toggleSort(field)} className={`inline-flex items-center gap-1 hover:text-fg ${sort.field === field ? "text-fg" : ""}`}>
            {label}{sort.field === field && (sort.dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
        </button>
    );

    const startNew = () => { setEditing(null); setForm(EMPTY); setFormOpen(true); };
    const startEdit = (p: Product) => {
        setEditing(p);
        setForm({
            name: p.name, category: p.category, brand: p.brand || "", model: p.model || "", barcode: p.barcode || "", supplier: p.supplier || "",
            stock: String(p.stock), min_stock: String(p.min_stock), cost_price: p.cost_price != null ? String(p.cost_price).replace(".", ",") : "", price: String(p.price).replace(".", ","),
        });
        setFormOpen(true);
    };

    const save = async () => {
        if (!form.name.trim()) { toast("Informe o nome do produto.", "error"); return; }
        setSaving(true);
        try {
            await api.saveProduct({
                id: editing?.id, name: form.name.trim(), category: form.category, brand: form.brand.trim() || null, model: form.model.trim() || null,
                barcode: form.barcode.trim() || null, supplier: form.supplier.trim() || null,
                stock: Math.trunc(Number(form.stock) || 0), min_stock: Math.trunc(Number(form.min_stock) || 0),
                cost_price: form.cost_price ? parseMoney(form.cost_price) : null, price: parseMoney(form.price),
            });
            await reloadProducts();
            setFormOpen(false);
            toast(editing ? "Produto atualizado." : "Produto cadastrado.");
        } catch (e) { toast((e as Error).message, "error"); }
        finally { setSaving(false); }
    };

    const adjust = async (p: Product, delta: number) => {
        if (p.stock + delta < 0) return;
        await api.saveProduct({ id: p.id, name: p.name, stock: p.stock + delta });
        await reloadProducts();
    };

    const remove = async (p: Product) => {
        if (!(await confirm({ title: "Excluir produto?", message: <>“{p.name}” será removido do estoque.</>, confirmLabel: "Excluir", danger: true }))) return;
        await api.deleteProduct(p.id);
        await reloadProducts();
        toast("Produto excluído.");
    };

    const exportPdf = () => {
        const pdf = new jsPDF();
        pdf.setFontSize(15);
        pdf.text(`${store?.name || "Loja"} · Estoque`, 14, 18);
        pdf.setFontSize(9); pdf.setTextColor(90);
        pdf.text(`${visible.length} produtos · ${new Date().toLocaleString("pt-BR")}`, 14, 24);
        autoTable(pdf, {
            startY: 30,
            head: [["Produto", "Categoria", "Código", "Estoque", "Mín.", "Custo", "Preço"]],
            body: visible.map(p => [p.name, categoryLabel(p.category), p.barcode || "", String(p.stock), String(p.min_stock), p.cost_price != null ? formatBRL(p.cost_price) : "", formatBRL(p.price)]),
            headStyles: { fillColor: [30, 41, 59] },
            styles: { fontSize: 8 },
        });
        pdf.save(`estoque_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const margin = parseMoney(form.price) > 0 && form.cost_price ? ((parseMoney(form.price) - parseMoney(form.cost_price)) / parseMoney(form.price)) * 100 : null;

    if (loading) return <LoadingState label="Carregando estoque..." />;

    return (
        <Page>
            <PageHeader title="Produtos" description="Estoque com alerta de reposição. Bipe o código de barras na busca para encontrar um produto."
                actions={<>
                    <Button icon={Download} onClick={exportPdf} disabled={visible.length === 0}>Exportar PDF</Button>
                    <Button variant="primary" icon={Plus} onClick={startNew}>Novo produto</Button>
                </>} />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                <StatCard label="Itens em estoque" value={`${stats.items} un`} icon={Layers} tone="info" hint={`${products.length} produtos`} />
                <StatCard label="Valor de venda" value={formatBRL(stats.value)} icon={DollarSign} tone="success" hint="Preço × quantidade" />
                <StatCard label="Custo do estoque" value={formatBRL(stats.cost)} icon={FileText} hint="Pelo preço de custo" />
                <StatCard label="Repor" value={stats.low} icon={AlertCircle} tone="danger" hint={`${stats.out} esgotados`} active={onlyLow} onClick={() => setOnlyLow(v => !v)} />
            </div>

            <Card padded={false} className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
                        {[{ id: "all", label: "Todos" }, ...CATEGORIES].map(c => {
                            const n = c.id === "all" ? products.length : products.filter(p => p.category === c.id).length;
                            return (
                                <button key={c.id} onClick={() => setCategory(c.id)}
                                    className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium ${category === c.id ? "border-line bg-surface text-fg shadow-[var(--ui-shadow)]" : "border-transparent text-fg-subtle hover:bg-hover hover:text-fg"}`}>
                                    {c.label}<span className="text-xs opacity-60 tabular">{n}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex gap-2">
                        <SearchInput icon={Search} value={search} onChange={setSearch} placeholder="Nome, marca, modelo ou código" className="flex-1 lg:w-72" />
                        <Button icon={TriangleAlert} onClick={() => setOnlyLow(v => !v)} className={onlyLow ? "!border-danger !text-danger" : ""}><span className="hidden sm:inline">Repor</span></Button>
                    </div>
                </div>

                {visible.length === 0 ? (
                    <EmptyState icon={Package} title={products.length ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
                        description={products.length ? "Ajuste a busca ou os filtros." : "Cadastre seus produtos para controlar o estoque e agilizar as vendas."}
                        action={!products.length && <Button variant="primary" icon={Plus} onClick={startNew}>Novo produto</Button>} />
                ) : (
                    <>
                        <ul className="md:hidden divide-y divide-line">
                            {visible.map(p => (
                                <li key={p.id} className="flex items-start gap-3 p-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-fg">{p.name}</p>
                                        <p className="text-xs text-fg-subtle">{[categoryLabel(p.category), p.brand, p.model].filter(Boolean).join(" · ")}</p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <Badge tone={stockTone(p)}>{p.stock <= 0 ? "Esgotado" : `${p.stock} un`}</Badge>
                                            <span className="text-sm font-bold text-fg tabular">{formatBRL(p.price)}</span>
                                        </div>
                                    </div>
                                    <div className="flex -mr-1.5">
                                        <IconButton icon={Edit} label="Editar" onClick={() => startEdit(p)} />
                                        <IconButton icon={Trash2} label="Excluir" tone="danger" onClick={() => remove(p)} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="ui-table">
                                <thead><tr>
                                    <th>{sortHeader("name", "Produto")}</th><th>Código</th><th>{sortHeader("stock", "Estoque")}</th>
                                    <th className="!text-right">Custo</th><th className="!text-right">{sortHeader("price", "Preço")}</th><th className="!text-right">Ações</th>
                                </tr></thead>
                                <tbody>
                                    {visible.map(p => (
                                        <tr key={p.id}>
                                            <td><p className="font-medium text-fg">{p.name}</p><p className="text-xs text-fg-subtle">{[categoryLabel(p.category), p.brand, p.model].filter(Boolean).join(" · ")}</p></td>
                                            <td className="font-mono text-xs text-fg-subtle">{p.barcode || "—"}</td>
                                            <td>
                                                <div className="flex items-center gap-1.5">
                                                    <button onClick={() => adjust(p, -1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-fg-subtle hover:text-fg" aria-label="Diminuir estoque"><Minus size={12} /></button>
                                                    <Badge tone={stockTone(p)} className="min-w-16 justify-center tabular">{p.stock <= 0 ? "Esgotado" : `${p.stock} un`}</Badge>
                                                    <button onClick={() => adjust(p, 1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-fg-subtle hover:text-fg" aria-label="Aumentar estoque"><Plus size={12} /></button>
                                                    <span className="text-xs text-fg-faint">mín. {p.min_stock}</span>
                                                </div>
                                            </td>
                                            <td className="text-right tabular text-fg-subtle">{p.cost_price != null ? formatBRL(p.cost_price) : "—"}</td>
                                            <td className="text-right font-semibold text-fg tabular">{formatBRL(p.price)}</td>
                                            <td><div className="flex justify-end gap-0.5">
                                                <IconButton icon={Edit} label="Editar" onClick={() => startEdit(p)} />
                                                <IconButton icon={Trash2} label="Excluir" tone="danger" onClick={() => remove(p)} />
                                            </div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="border-t border-line px-4 py-3 text-xs text-fg-subtle">Mostrando {visible.length} de {products.length} produtos</div>
                    </>
                )}
            </Card>

            <Modal open={formOpen} onClose={() => setFormOpen(false)} size="lg" title={editing ? "Editar produto" : "Novo produto"}
                footer={<><Button onClick={() => setFormOpen(false)}>Cancelar</Button><Button variant="primary" loading={saving} onClick={save}>Salvar</Button></>}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nome *" className="sm:col-span-2"><input className="ui-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus placeholder="Ex.: Película 3D iPhone 13" /></Field>
                    <Field label="Categoria">
                        <select className="ui-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Código de barras" hint="Bipe com o leitor, digite ou gere um código interno.">
                        <div className="flex gap-2">
                            <input className="ui-input font-mono" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} />
                            <Button icon={RefreshCw} onClick={() => setForm({ ...form, barcode: `2${Date.now().toString().slice(-11)}` })} aria-label="Gerar código" />
                        </div>
                    </Field>
                    <Field label="Marca"><input className="ui-input" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} /></Field>
                    <Field label="Modelo compatível"><input className="ui-input" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} /></Field>
                    <Field label="Estoque atual"><input className="ui-input tabular" inputMode="numeric" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value.replace(/[^\d-]/g, "") })} /></Field>
                    <Field label="Estoque mínimo" hint="Abaixo disso o produto entra em reposição."><input className="ui-input tabular" inputMode="numeric" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value.replace(/\D/g, "") })} /></Field>
                    <Field label="Preço de custo"><MoneyInput value={form.cost_price} onChange={v => setForm({ ...form, cost_price: v })} /></Field>
                    <Field label="Preço de venda" hint={margin != null ? `Margem: ${margin.toFixed(0)}% · lucro ${formatBRL(parseMoney(form.price) - parseMoney(form.cost_price))}` : undefined}>
                        <MoneyInput value={form.price} onChange={v => setForm({ ...form, price: v })} />
                    </Field>
                    <Field label="Fornecedor" className="sm:col-span-2"><input className="ui-input" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></Field>
                </div>
            </Modal>
        </Page>
    );
}
