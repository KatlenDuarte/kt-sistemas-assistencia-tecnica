// src/screens/public/AuthPages.tsx — login, cadastro e recuperação de senha

import { useState, type ReactNode } from "react";
import { ArrowLeft, Check, Loader2, PlayCircle, Sun, Moon, Mail, AlertTriangle } from "lucide-react";
import { useSession } from "../../contexts/SessionContext";
import { useTheme } from "../../contexts/ThemeContext";
import { isSupabaseConfigured } from "../../lib/supabase";
import { navigate } from "../../lib/router";
import { formatBRL } from "../../lib/format";
import { COMPANY, PLANS, planById, type PlanId } from "../../config/brand";
import { Field } from "../../components/ui";
import LogoUploader from "../../components/LogoUploader";
import { KtLogo } from "./LandingPage";

function AuthLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
    const { theme, toggleTheme } = useTheme();
    return (
        <div className="grid min-h-screen bg-bg font-sans lg:grid-cols-[1fr_1.05fr]">
            <aside className="relative hidden overflow-hidden bg-nav p-12 text-white lg:flex lg:flex-col lg:justify-between">
                <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgb(255_255_255/0.06)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
                <div className="pointer-events-none absolute -right-32 -top-32 h-[460px] w-[460px] rounded-full bg-[#4b6bdc]/20 blur-[120px]" />
                <a href="#/" className="relative"><KtLogo light /></a>
                <div className="relative max-w-md">{aside ?? (
                    <>
                        <h1 className="text-4xl font-bold leading-tight tracking-tight">Gestão completa para a sua loja.</h1>
                        <p className="mt-4 text-white/60">Vendas, estoque, fiado, ordens de serviço e caixa — no computador e no celular.</p>
                        <ul className="mt-8 space-y-3 text-sm text-white/80">
                            {["Sua logo e sua cor no sistema", "Dados isolados e seguros para cada loja", "Suporte direto pelo WhatsApp"].map(t => (
                                <li key={t} className="flex items-center gap-3"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white/80"><Check size={12} strokeWidth={3} /></span>{t}</li>
                            ))}
                        </ul>
                    </>
                )}</div>
                <p className="relative text-xs text-white/40">© {new Date().getFullYear()} {COMPANY.name}</p>
            </aside>
            <main className="relative flex items-center justify-center px-5 py-10">
                <button onClick={toggleTheme} aria-label="Alternar tema" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-fg-subtle hover:bg-hover">{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
                <a href="#/" className="absolute left-4 top-4 inline-flex h-9 items-center gap-1.5 rounded-xl px-2 text-sm text-fg-subtle hover:bg-hover hover:text-fg"><ArrowLeft size={16} /> Início</a>
                <div className="w-full max-w-md">{children}</div>
            </main>
        </div>
    );
}

const PrimaryButton = ({ loading, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => (
    <button {...props} disabled={props.disabled || loading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white shadow-[var(--ui-shadow-md)] transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
        {loading && <Loader2 size={16} className="animate-spin" />}{children}
    </button>
);

const ErrorBox = ({ children }: { children: ReactNode }) => (
    <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{children}</p>
);

const NotConfigured = () => (
    <p className="my-4 rounded-xl bg-warning-soft px-3 py-2.5 text-sm text-warning">
        O banco de dados ainda não foi conectado. Você pode usar a demonstração enquanto isso.
    </p>
);

/* ------------------------------------------------------------------ Login */

export function LoginPage() {
    const { signIn, enterDemo } = useSession();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); setLoading(true);
        try { await signIn(email, password); navigate("/"); }
        catch (err) { setError((err as Error).message); setLoading(false); }
    };

    return (
        <AuthLayout>
            <div className="mb-8 lg:hidden"><KtLogo /></div>
            <h2 className="text-2xl font-bold tracking-tight text-fg">Entrar</h2>
            <p className="mt-1.5 text-sm text-fg-subtle">Acesse o sistema da sua loja.</p>
            {!isSupabaseConfigured && <NotConfigured />}
            <form onSubmit={submit} className="mt-8 space-y-4">
                <Field label="E-mail"><input className="ui-input h-11" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@sualoja.com" /></Field>
                <Field label={<span className="flex justify-between"><span>Senha</span><a href="#/recuperar" className="font-medium text-primary-text hover:underline">Esqueci a senha</a></span>}>
                    <input className="ui-input h-11" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                </Field>
                {error && <ErrorBox>{error}</ErrorBox>}
                <PrimaryButton type="submit" loading={loading} disabled={!email || !password}>Entrar</PrimaryButton>
            </form>
            <div className="my-6 flex items-center gap-3 text-xs text-fg-faint"><span className="h-px flex-1 bg-line" />ou<span className="h-px flex-1 bg-line" /></div>
            <button onClick={() => { enterDemo(); navigate("/"); }} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface text-sm font-semibold text-fg hover:bg-hover">
                <PlayCircle size={18} className="text-primary" /> Ver demonstração
            </button>
            <p className="mt-8 text-center text-sm text-fg-subtle">Ainda não é cliente? <a href="#/cadastro" className="font-semibold text-primary-text hover:underline">Assine agora</a></p>
        </AuthLayout>
    );
}

/* ------------------------------------------------------------------ Recuperar senha */

export function ForgotPasswordPage() {
    const { resetPassword } = useSession();
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); setLoading(true);
        try { await resetPassword(email); setSent(true); }
        catch (err) { setError((err as Error).message); }
        finally { setLoading(false); }
    };

    return (
        <AuthLayout>
            <h2 className="text-2xl font-bold tracking-tight text-fg">Recuperar senha</h2>
            {sent ? (
                <div className="mt-6 rounded-2xl border border-line bg-surface p-5 text-sm">
                    <Mail className="mb-3 text-primary" />
                    Enviamos um link para <b className="text-fg">{email}</b>. Abra o e-mail e siga as instruções para criar uma nova senha.
                </div>
            ) : (
                <form onSubmit={submit} className="mt-6 space-y-4">
                    <p className="text-sm text-fg-subtle">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
                    <Field label="E-mail"><input className="ui-input h-11" type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
                    {error && <ErrorBox>{error}</ErrorBox>}
                    <PrimaryButton type="submit" loading={loading} disabled={!email}>Enviar link</PrimaryButton>
                </form>
            )}
            <p className="mt-8 text-center text-sm"><a href="#/entrar" className="font-semibold text-primary-text hover:underline">Voltar para o login</a></p>
        </AuthLayout>
    );
}

/* ------------------------------------------------------------------ Cadastro */

export function SignupPage({ initialPlan }: { initialPlan?: string | null }) {
    const { signUp } = useSession();
    const [step, setStep] = useState(1);
    const [plan, setPlan] = useState<PlanId>(planById(initialPlan)?.id || "anual");
    const [storeName, setStoreName] = useState("");
    const [phone, setPhone] = useState("");
    const [logo, setLogo] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [accept, setAccept] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [confirmEmail, setConfirmEmail] = useState(false);

    const selected = planById(plan)!;

    const next = () => {
        setError("");
        if (step === 2 && (!storeName.trim() || phone.replace(/\D/g, "").length < 10)) { setError("Informe o nome da loja e um WhatsApp válido com DDD."); return; }
        setStep(s => s + 1);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!fullName.trim() || !email.trim()) { setError("Preencha nome e e-mail."); return; }
        if (password.length < 6) { setError("A senha precisa ter pelo menos 6 caracteres."); return; }
        if (!accept) { setError("Confirme que leu e concorda com as condições."); return; }
        setLoading(true);
        try {
            const { needsConfirmation } = await signUp({ fullName: fullName.trim(), storeName: storeName.trim(), phone: phone.trim(), email, password, plan, logo });
            if (needsConfirmation) setConfirmEmail(true);
            else navigate("/");
        } catch (err) { setError((err as Error).message); }
        finally { setLoading(false); }
    };

    const summary = (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-white/60">Plano escolhido</p>
            <p className="mt-1 text-2xl font-bold">{selected.name}</p>
            <p className="mt-1 text-3xl font-extrabold tabular">{formatBRL(selected.price)} <span className="text-sm font-medium text-white/60">{selected.period}</span></p>
            {(storeName || logoPreview) && (
                <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/5 p-3">
                    {logoPreview ? <img src={logoPreview} alt="" className="h-11 w-11 rounded-xl bg-white object-contain p-1" /> : <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 font-bold">{storeName.charAt(0).toUpperCase()}</span>}
                    <div className="min-w-0"><p className="truncate font-semibold">{storeName || "Sua loja"}</p><p className="text-xs text-white/50">Prévia no sistema</p></div>
                </div>
            )}
            <p className="mt-6 text-xs leading-relaxed text-white/50">Após o cadastro, combinamos o pagamento por PIX pelo WhatsApp e liberamos o acesso.</p>
        </div>
    );

    if (confirmEmail) {
        return (
            <AuthLayout aside={summary}>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft text-success"><Mail /></div>
                <h2 className="mt-5 text-2xl font-bold tracking-tight text-fg">Confirme seu e-mail</h2>
                <p className="mt-2 text-sm text-fg-subtle">Enviamos um link para <b className="text-fg">{email}</b>. Depois de confirmar, entre com seu e-mail e senha para concluir a assinatura.</p>
                <a href="#/entrar" className="mt-8 flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white">Ir para o login</a>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout aside={summary}>
            <div className="mb-6 lg:hidden"><KtLogo /></div>
            <div className="mb-6 flex gap-2">
                {[1, 2, 3].map(n => <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-primary" : "bg-line"}`} />)}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Passo {step} de 3</p>
            {!isSupabaseConfigured && <NotConfigured />}

            {step === 1 && (
                <>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-fg">Escolha seu plano</h2>
                    <div className="mt-6 space-y-3">
                        {PLANS.map(p => (
                            <button key={p.id} onClick={() => setPlan(p.id)}
                                className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors ${plan === p.id ? "border-primary/50 bg-primary-soft ring-[3px] ring-primary/10" : "border-line bg-surface hover:bg-hover"}`}>
                                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${plan === p.id ? "border-primary bg-primary" : "border-line-strong"}`}>{plan === p.id && <Check size={12} className="text-white" strokeWidth={3} />}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2 font-semibold text-fg">{p.name}{p.highlight && <span className="rounded-full border border-primary/25 bg-surface px-2 py-0.5 text-[10px] font-semibold text-primary-text">{p.highlight}</span>}</span>
                                    <span className="block text-xs text-fg-subtle">{p.description}</span>
                                </span>
                                <span className="text-right"><span className="block font-bold text-fg tabular">{formatBRL(p.price)}</span><span className="text-xs text-fg-subtle">{p.period}</span></span>
                            </button>
                        ))}
                    </div>
                    <div className="mt-6"><PrimaryButton onClick={next}>Continuar</PrimaryButton></div>
                </>
            )}

            {step === 2 && (
                <>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-fg">Sua loja</h2>
                    <p className="mt-1.5 text-sm text-fg-subtle">Esses dados aparecem no sistema e nos cupons.</p>
                    <div className="mt-6 space-y-5">
                        <LogoUploader value={logoPreview} storeName={storeName} onChange={(f, p) => { setLogo(f); setLogoPreview(p); }} />
                        <Field label="Nome da loja"><input className="ui-input h-11" value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Ex.: Cell Center" autoFocus /></Field>
                        <Field label="WhatsApp da loja" hint="Usado para combinar o pagamento e no suporte."><input className="ui-input h-11" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(31) 99999-9999" /></Field>
                    </div>
                    {error && <ErrorBox>{error}</ErrorBox>}
                    <div className="mt-6 flex gap-2">
                        <button onClick={() => setStep(1)} className="h-11 rounded-xl border border-line px-5 text-sm font-semibold text-fg hover:bg-hover">Voltar</button>
                        <PrimaryButton onClick={next}>Continuar</PrimaryButton>
                    </div>
                </>
            )}

            {step === 3 && (
                <form onSubmit={submit}>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-fg">Crie seu acesso</h2>
                    <p className="mt-1.5 text-sm text-fg-subtle">Você vai usar este e-mail e senha para entrar no sistema.</p>
                    <div className="mt-6 space-y-4">
                        <Field label="Seu nome"><input className="ui-input h-11" value={fullName} onChange={e => setFullName(e.target.value)} autoFocus /></Field>
                        <Field label="E-mail"><input className="ui-input h-11" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></Field>
                        <Field label="Senha" hint="Mínimo de 6 caracteres."><input className="ui-input h-11" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></Field>
                        <label className="flex items-start gap-2.5 text-sm text-fg-subtle">
                            <input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--ui-primary)]" />
                            Concordo que o acesso será liberado após a confirmação do pagamento do plano {selected.name.toLowerCase()} ({formatBRL(selected.price)} {selected.period}).
                        </label>
                    </div>
                    {error && <ErrorBox>{error}</ErrorBox>}
                    <div className="mt-6 flex gap-2">
                        <button type="button" onClick={() => setStep(2)} className="h-11 rounded-xl border border-line px-5 text-sm font-semibold text-fg hover:bg-hover">Voltar</button>
                        <PrimaryButton type="submit" loading={loading}>Criar conta</PrimaryButton>
                    </div>
                </form>
            )}
            <p className="mt-8 text-center text-sm text-fg-subtle">Já tem conta? <a href="#/entrar" className="font-semibold text-primary-text hover:underline">Entrar</a></p>
        </AuthLayout>
    );
}
