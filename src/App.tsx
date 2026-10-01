// src/App.tsx — decide qual área mostrar conforme a sessão e a assinatura

import { useEffect } from "react";
import { Loader2, LogOut } from "lucide-react";
import { useSession } from "./contexts/SessionContext";
import { useRoute, navigate } from "./lib/router";
import LandingPage, { KtLogo } from "./screens/public/LandingPage";
import { LoginPage, SignupPage, ForgotPasswordPage } from "./screens/public/AuthPages";
import { PendingPaymentScreen, BlockedScreen, NoStoreScreen } from "./screens/account/AccountStatusScreens";
import AppShell from "./screens/app/AppShell";
import AdminPage from "./screens/admin/AdminPage";

function Splash() {
    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-5 bg-bg">
            <KtLogo />
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
    );
}

function AdminOnlyShell() {
    const { signOut } = useSession();
    return (
        <div className="min-h-screen bg-bg font-sans">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-nav px-5 text-white">
                <KtLogo light />
                <button onClick={signOut} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/10"><LogOut size={15} /> Sair</button>
            </header>
            <AdminPage />
        </div>
    );
}

export default function App() {
    const { status, store, profile, signOut } = useSession();
    const route = useRoute();

    // Usuário logado que abre uma rota pública volta para o sistema
    useEffect(() => {
        if ((status === "signed-in" || status === "demo") && ["/entrar", "/cadastro", "/recuperar"].includes(route.path)) navigate("/");
    }, [status, route.path]);

    const showPlans = async () => {
        await signOut();
        navigate("/");
        setTimeout(() => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" }), 120);
    };

    if (status === "loading") return <Splash />;

    if (status === "signed-out") {
        if (route.path === "/entrar") return <LoginPage />;
        if (route.path === "/cadastro") return <SignupPage initialPlan={route.params.get("plano")} />;
        if (route.path === "/recuperar") return <ForgotPasswordPage />;
        return <LandingPage />;
    }

    if (status === "demo") return <AppShell onShowPlans={showPlans} />;

    // Conta real
    if (!store) return profile?.is_super_admin ? <AdminOnlyShell /> : <NoStoreScreen />;
    if (profile?.is_super_admin) return <AppShell onShowPlans={showPlans} />;
    if (store.status === "pending") return <PendingPaymentScreen />;
    const expired = !!store.expires_at && new Date(store.expires_at) <= new Date();
    if (store.status === "blocked" || expired) return <BlockedScreen />;
    return <AppShell onShowPlans={showPlans} />;
}
