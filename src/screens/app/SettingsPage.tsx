// src/screens/app/SettingsPage.tsx — Minha loja: identidade visual, assinatura, conta e aparência

import { useState } from "react";
import { Store as StoreIcon, CreditCard, KeyRound, Palette, Sun, Moon, MessageCircle, Check } from "lucide-react";
import { Page, PageHeader, Card, CardHeader, Button, Field, Badge } from "../../components/ui";
import LogoUploader from "../../components/LogoUploader";
import { useSession, useApi } from "../../contexts/SessionContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { supabase, friendlyError } from "../../lib/supabase";
import { formatBRL, formatDate } from "../../lib/format";
import { COMPANY, planById, whatsappLink } from "../../config/brand";

const COLORS = ["#3e63dd", "#1e3a8a", "#0f766e", "#0e7490", "#6e56cf", "#be123c", "#c2410c", "#334155"];

export default function SettingsPage() {
    const api = useApi();
    const { store, setStore, isDemo, user } = useSession();
    const { theme, setTheme } = useTheme();
    const { toast } = useToast();

    const [name, setName] = useState(store?.name || "");
    const [phone, setPhone] = useState(store?.contact_phone || "");
    const [doc, setDoc] = useState(store?.document || "");
    const [address, setAddress] = useState(store?.address || "");
    const [color, setColor] = useState(store?.brand_color || "#3e63dd");
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(store?.logo_url || null);
    const [saving, setSaving] = useState(false);
    const [pass, setPass] = useState({ next: "", confirm: "" });
    const [now] = useState(() => Date.now());

    if (!store) return null;
    const plan = planById(store.plan);

    const previewColor = (c: string) => {
        setColor(c);
        document.documentElement.style.setProperty("--ui-primary", c);
    };

    const saveStore = async () => {
        if (!name.trim()) { toast("Informe o nome da loja.", "error"); return; }
        setSaving(true);
        try {
            let logo_url = logoPreview ? store.logo_url : null;
            if (logoFile) logo_url = await api.uploadLogo(logoFile);
            const updated = await api.updateStore({
                name: name.trim(), contact_phone: phone.trim() || null, document: doc.trim() || null,
                address: address.trim() || null, brand_color: color, logo_url,
            });
            setStore(updated);
            setLogoFile(null);
            toast("Dados da loja salvos.");
        } catch (e) { toast(friendlyError(e), "error"); }
        finally { setSaving(false); }
    };

    const changePassword = async () => {
        if (isDemo || !supabase) { toast("Indisponível na demonstração.", "info"); return; }
        if (pass.next.length < 6) { toast("A senha precisa ter pelo menos 6 caracteres.", "error"); return; }
        if (pass.next !== pass.confirm) { toast("As senhas não coincidem.", "error"); return; }
        const { error } = await supabase.auth.updateUser({ password: pass.next });
        if (error) toast(friendlyError(error), "error");
        else { toast("Senha alterada."); setPass({ next: "", confirm: "" }); }
    };

    const expires = store.expires_at ? new Date(store.expires_at) : null;
    const daysLeft = expires ? Math.ceil((expires.getTime() - now) / 86400000) : null;

    return (
        <Page narrow>
            <PageHeader title="Minha loja" description="Personalize o sistema com a identidade da sua loja e gerencie sua conta." />

            <Card padded={false}>
                <CardHeader title="Identidade da loja" description="Aparece no menu, nos cupons e nos relatórios em PDF" icon={StoreIcon} />
                <div className="space-y-5 p-5 sm:p-6">
                    <LogoUploader value={logoPreview} storeName={name} onChange={(f, p) => { setLogoFile(f); setLogoPreview(p); }} />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Nome da loja"><input className="ui-input" value={name} onChange={e => setName(e.target.value)} /></Field>
                        <Field label="Telefone / WhatsApp"><input className="ui-input" value={phone} onChange={e => setPhone(e.target.value)} /></Field>
                        <Field label="CNPJ / CPF" hint="Opcional, sai no cupom."><input className="ui-input" value={doc} onChange={e => setDoc(e.target.value)} /></Field>
                        <Field label="Endereço" hint="Opcional, sai no cupom."><input className="ui-input" value={address} onChange={e => setAddress(e.target.value)} /></Field>
                    </div>
                    <div>
                        <p className="ui-label">Cor da marca</p>
                        <div className="flex flex-wrap items-center gap-2">
                            {COLORS.map(c => (
                                <button key={c} onClick={() => previewColor(c)} aria-label={`Cor ${c}`}
                                    className={`flex h-9 w-9 items-center justify-center rounded-xl ring-offset-2 ring-offset-surface ${color === c ? "ring-2 ring-fg" : ""}`} style={{ background: c }}>
                                    {color === c && <Check className="h-4 w-4 text-white" />}
                                </button>
                            ))}
                            <label className="flex h-9 items-center gap-2 rounded-xl border border-line px-2 text-xs text-fg-subtle">
                                <input type="color" value={color} onChange={e => previewColor(e.target.value)} className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent" />
                                Personalizada
                            </label>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end border-t border-line px-5 py-4">
                    <Button variant="primary" loading={saving} onClick={saveStore}>Salvar alterações</Button>
                </div>
            </Card>

            <Card padded={false}>
                <CardHeader title="Assinatura" description="Plano contratado com a KT Sistemas" icon={CreditCard} />
                <div className="flex flex-col gap-4 p-5 sm:p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-lg font-bold text-fg">Plano {plan?.name}</p>
                            <Badge tone={store.status === "active" ? "success" : "warning"} dot>{store.status === "active" ? "Ativo" : store.status === "pending" ? "Aguardando pagamento" : "Bloqueado"}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-fg-subtle">
                            {plan && `${formatBRL(plan.price)} ${plan.period}`}
                            {expires ? ` · válido até ${formatDate(expires)}${daysLeft != null && daysLeft <= 7 ? ` (${daysLeft} dias)` : ""}` : store.status === "active" ? " · sem vencimento" : ""}
                        </p>
                    </div>
                    <a href={whatsappLink(`Olá! Sou da loja ${store.name} e quero falar sobre minha assinatura (plano ${plan?.name}).`)} target="_blank" rel="noreferrer"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-fg hover:bg-hover">
                        <MessageCircle size={16} className="text-success" /> Renovar ou mudar plano
                    </a>
                </div>
            </Card>

            <Card padded={false}>
                <CardHeader title="Acesso" description={isDemo ? "Indisponível na demonstração" : user?.email || ""} icon={KeyRound} />
                <div className="grid gap-4 p-5 sm:p-6 sm:grid-cols-2">
                    <Field label="Nova senha"><input type="password" autoComplete="new-password" className="ui-input" value={pass.next} onChange={e => setPass({ ...pass, next: e.target.value })} disabled={isDemo} /></Field>
                    <Field label="Confirmar nova senha"><input type="password" autoComplete="new-password" className="ui-input" value={pass.confirm} onChange={e => setPass({ ...pass, confirm: e.target.value })} disabled={isDemo} /></Field>
                </div>
                <div className="flex justify-end border-t border-line px-5 py-4">
                    <Button onClick={changePassword} disabled={isDemo || !pass.next}>Alterar senha</Button>
                </div>
            </Card>

            <Card padded={false}>
                <CardHeader title="Aparência" description="Preferência salva neste navegador" icon={Palette} />
                <div className="grid max-w-md grid-cols-2 gap-3 p-5 sm:p-6">
                    {([["light", "Claro", Sun], ["dark", "Escuro", Moon]] as const).map(([id, label, Icon]) => (
                        <button key={id} onClick={() => setTheme(id)}
                            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${theme === id ? "border-primary bg-primary-soft text-primary-text" : "border-line text-fg-muted hover:bg-hover"}`}>
                            <Icon size={16} /> {label}
                        </button>
                    ))}
                </div>
            </Card>

            <p className="text-center text-xs text-fg-faint">Suporte KT Sistemas · {COMPANY.whatsappDisplay} · {COMPANY.email}</p>
        </Page>
    );
}
