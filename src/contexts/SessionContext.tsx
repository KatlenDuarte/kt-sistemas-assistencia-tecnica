// src/contexts/SessionContext.tsx
// Sessão do usuário: login/cadastro no Supabase, loja atual, modo demonstração
// e aplicação da identidade visual da loja (white label).

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, friendlyError } from "../lib/supabase";
import { createSupabaseApi } from "../data/supabaseApi";
import { demoApi, demoStore, resetDemo } from "../data/demoApi";
import type { DataApi, Profile, Store } from "../data/types";
import type { PlanId } from "../config/brand";

export type SessionStatus = "loading" | "signed-out" | "signed-in" | "demo";

export interface SignUpInput {
    fullName: string;
    storeName: string;
    phone: string;
    email: string;
    password: string;
    plan: PlanId;
    logo?: File | null;
}

interface SessionValue {
    status: SessionStatus;
    user: User | null;
    profile: Profile | null;
    store: Store | null;
    api: DataApi | null;
    isDemo: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (input: SignUpInput) => Promise<{ needsConfirmation: boolean }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    enterDemo: () => void;
    refreshStore: () => Promise<void>;
    setStore: (s: Store) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

const DEMO_KEY = "kt-demo";
const PENDING_LOGO_KEY = "kt-pending-logo";

const readDemoFlag = () => { try { return sessionStorage.getItem(DEMO_KEY) === "1"; } catch { return false; } };

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
});

const dataUrlToFile = async (dataUrl: string) => {
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], `logo.${blob.type.split("/")[1] || "png"}`, { type: blob.type });
};

/** Aplica a cor e o nome da loja na interface. */
function applyBranding(store: Store | null) {
    const root = document.documentElement;
    if (store?.brand_color && /^#[0-9a-f]{6}$/i.test(store.brand_color)) root.style.setProperty("--ui-primary", store.brand_color);
    else root.style.removeProperty("--ui-primary");
    document.title = store ? `${store.name} · KT Sistemas` : "KT Sistemas · Gestão para lojas de celular";
}

export function SessionProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<SessionStatus>(() => (readDemoFlag() ? "demo" : supabase ? "loading" : "signed-out"));
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [store, setStore] = useState<Store | null>(() => (readDemoFlag() ? demoStore() : null));

    const loadAccount = useCallback(async (u: User) => {
        if (!supabase) return;
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", u.id).maybeSingle();
        setProfile(prof as Profile | null);
        let st: Store | null = null;
        if (prof?.store_id) {
            const { data } = await supabase.from("stores").select("*").eq("id", prof.store_id).maybeSingle();
            st = data as Store | null;
            // Logo escolhida no cadastro quando a confirmação de e-mail estava ativa
            const pendingLogo = localStorage.getItem(PENDING_LOGO_KEY);
            if (st && pendingLogo && !st.logo_url) {
                try {
                    const api = createSupabaseApi(supabase, st.id);
                    const url = await api.uploadLogo(await dataUrlToFile(pendingLogo));
                    st = await api.updateStore({ logo_url: url });
                } catch (e) { console.warn("Falha ao enviar logo pendente:", e); }
            }
            localStorage.removeItem(PENDING_LOGO_KEY);
        }
        setStore(st);
        setUser(u);
        setStatus("signed-in");
    }, []);

    useEffect(() => {
        if (!supabase) return;
        let active = true;
        supabase.auth.getSession().then(({ data }) => {
            if (!active || readDemoFlag()) return;
            if (data.session?.user) loadAccount(data.session.user);
            else setStatus("signed-out");
        });
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
            if (readDemoFlag()) return;
            if (event === "SIGNED_OUT" || !session?.user) {
                setUser(null); setProfile(null); setStore(null); setStatus("signed-out");
            } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
                // Evita chamar o Supabase dentro do callback (recomendação da biblioteca)
                setTimeout(() => loadAccount(session.user), 0);
            }
        });
        return () => { active = false; sub.subscription.unsubscribe(); };
    }, [loadAccount]);

    useEffect(() => { applyBranding(store); }, [store]);

    const signIn = useCallback(async (email: string, password: string) => {
        if (!supabase) throw new Error("Sistema ainda não conectado ao banco de dados. Use a demonstração.");
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new Error(friendlyError(error));
    }, []);

    const signUp = useCallback(async (input: SignUpInput) => {
        if (!supabase) throw new Error("Cadastro indisponível: o sistema ainda não está conectado ao banco de dados.");
        const { data, error } = await supabase.auth.signUp({
            email: input.email.trim(),
            password: input.password,
            options: {
                data: { full_name: input.fullName, store_name: input.storeName, phone: input.phone, plan: input.plan },
                emailRedirectTo: window.location.href.split("#")[0],
            },
        });
        if (error) throw new Error(friendlyError(error));
        if (input.logo) {
            // Guarda a logo; é enviada assim que houver sessão (logo abaixo ou no 1º login)
            try { localStorage.setItem(PENDING_LOGO_KEY, await fileToDataUrl(input.logo)); } catch { /* imagem grande demais */ }
        }
        if (data.session?.user) await loadAccount(data.session.user);
        return { needsConfirmation: !data.session };
    }, [loadAccount]);

    const signOut = useCallback(async () => {
        if (readDemoFlag()) {
            try { sessionStorage.removeItem(DEMO_KEY); } catch { /* ignore */ }
            setStore(null);
            setStatus("signed-out");
            return;
        }
        await supabase?.auth.signOut();
    }, []);

    const resetPassword = useCallback(async (email: string) => {
        if (!supabase) throw new Error("Indisponível no momento.");
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.href.split("#")[0] });
        if (error) throw new Error(friendlyError(error));
    }, []);

    const enterDemo = useCallback(() => {
        try { sessionStorage.setItem(DEMO_KEY, "1"); } catch { /* ignore */ }
        resetDemo();
        setStore(demoStore());
        setStatus("demo");
    }, []);

    const refreshStore = useCallback(async () => {
        if (status === "demo") { setStore(demoStore()); return; }
        if (user) await loadAccount(user);
    }, [status, user, loadAccount]);

    const api = useMemo<DataApi | null>(() => {
        if (status === "demo") return demoApi;
        if (status === "signed-in" && supabase && store) return createSupabaseApi(supabase, store.id);
        return null;
    }, [status, store]);

    const value: SessionValue = {
        status, user, profile, store, api, isDemo: status === "demo",
        signIn, signUp, signOut, resetPassword, enterDemo, refreshStore, setStore,
    };

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error("useSession fora do SessionProvider");
    return ctx;
}

/** API de dados garantida (usar apenas dentro das telas do sistema). */
// eslint-disable-next-line react-refresh/only-export-components
export function useApi(): DataApi {
    const { api } = useSession();
    if (!api) throw new Error("Sessão sem acesso a dados");
    return api;
}
