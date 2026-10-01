// src/screens/account/AccountStatusScreens.tsx — loja aguardando pagamento ou bloqueada

import { useState, type ReactNode } from "react";
import { Clock, Lock, MessageCircle, Mail, LogOut, RefreshCw, CheckCircle2 } from "lucide-react";
import { useSession } from "../../contexts/SessionContext";
import { COMPANY, planById, whatsappLink, mailtoLink } from "../../config/brand";
import { formatBRL, formatDate } from "../../lib/format";
import { KtLogo } from "../public/LandingPage";
import { StoreMark } from "../app/AppShell";

function StatusLayout({ icon: Icon, tone, title, children }: { icon: typeof Clock; tone: string; title: string; children: ReactNode }) {
    const { signOut, refreshStore } = useSession();
    const [refreshing, setRefreshing] = useState(false);
    return (
        <div className="flex min-h-screen flex-col bg-bg font-sans">
            <header className="flex h-16 items-center justify-between px-5"><KtLogo /><button onClick={signOut} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-fg-subtle hover:bg-hover"><LogOut size={15} /> Sair</button></header>
            <main className="flex flex-1 items-center justify-center px-5 pb-16">
                <div className="w-full max-w-lg rounded-3xl border border-line bg-surface p-6 shadow-[var(--ui-shadow)] sm:p-8">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tone}`}><Icon className="h-7 w-7" /></div>
                    <h1 className="mt-5 text-2xl font-bold tracking-tight text-fg">{title}</h1>
                    {children}
                    <button onClick={async () => { setRefreshing(true); await refreshStore(); setRefreshing(false); }}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 text-sm font-medium text-fg-subtle hover:text-fg">
                        <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Já paguei — verificar liberação
                    </button>
                </div>
            </main>
        </div>
    );
}

function ContactButtons({ message }: { message: string }) {
    return (
        <div className="mt-6 grid gap-2">
            <a href={whatsappLink(message)} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25d366] font-semibold text-white hover:opacity-90">
                <MessageCircle size={18} /> Falar no WhatsApp {COMPANY.whatsappDisplay}
            </a>
            <a href={mailtoLink("Pagamento KT Sistemas", message)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold text-fg hover:bg-hover">
                <Mail size={16} /> {COMPANY.email}
            </a>
        </div>
    );
}

export function PendingPaymentScreen() {
    const { store, user } = useSession();
    if (!store) return null;
    const plan = planById(store.plan);
    const message = `Olá! Acabei de cadastrar a loja "${store.name}" no KT Sistemas (e-mail ${user?.email}) e quero pagar o plano ${plan?.name} de ${plan ? formatBRL(plan.price) : ""}.`;
    return (
        <StatusLayout icon={Clock} tone="bg-warning-soft text-warning" title="Cadastro recebido!">
            <p className="mt-2 text-sm text-fg-subtle">Falta só o pagamento. Assim que confirmarmos, seu acesso é liberado — normalmente no mesmo dia.</p>
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-subtle p-4">
                <StoreMark />
                <div className="min-w-0 flex-1"><p className="truncate font-semibold text-fg">{store.name}</p><p className="text-xs text-fg-subtle">Plano {plan?.name}</p></div>
                <p className="text-right font-bold text-fg tabular">{plan && formatBRL(plan.price)}<span className="block text-xs font-normal text-fg-subtle">{plan?.period}</span></p>
            </div>
            <ol className="mt-6 space-y-3 text-sm">
                {["Clique no botão abaixo e fale com a gente.", "Enviamos a chave PIX e você realiza o pagamento.", "Liberamos o acesso e o sistema abre com a sua logo."].map((t, i) => (
                    <li key={t} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{i + 1}</span><span className="pt-0.5 text-fg-muted">{t}</span></li>
                ))}
            </ol>
            <ContactButtons message={message} />
        </StatusLayout>
    );
}

export function BlockedScreen() {
    const { store } = useSession();
    if (!store) return null;
    const plan = planById(store.plan);
    const expired = store.status === "active" && store.expires_at && new Date(store.expires_at) <= new Date();
    const message = `Olá! Quero renovar a assinatura da loja "${store.name}" no KT Sistemas (plano ${plan?.name}).`;
    return (
        <StatusLayout icon={Lock} tone="bg-danger-soft text-danger" title={expired ? "Sua assinatura venceu" : "Acesso suspenso"}>
            <p className="mt-2 text-sm text-fg-subtle">
                {expired ? `O plano ${plan?.name} venceu em ${formatDate(new Date(store.expires_at!))}. ` : "O acesso desta loja está suspenso. "}
                Seus dados continuam guardados com segurança — renove para voltar a usar.
            </p>
            <div className="mt-6 flex items-center gap-2 rounded-2xl bg-success-soft p-4 text-sm text-success"><CheckCircle2 size={18} /> Nenhuma venda, produto ou cliente foi apagado.</div>
            <ContactButtons message={message} />
        </StatusLayout>
    );
}

export function NoStoreScreen() {
    return (
        <StatusLayout icon={Lock} tone="bg-info-soft text-info" title="Conta sem loja vinculada">
            <p className="mt-2 text-sm text-fg-subtle">Seu usuário ainda não está ligado a nenhuma loja. Fale com o suporte para resolver.</p>
            <ContactButtons message="Olá! Minha conta no KT Sistemas está sem loja vinculada." />
        </StatusLayout>
    );
}
