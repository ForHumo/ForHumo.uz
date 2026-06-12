import { setRequestLocale } from "next-intl/server";
import { getSsoClient, isAllowedRedirect, sanitizeScopes } from "@/lib/sso-clients";
import { SsoConsent } from "@/components/sso/sso-consent";
import { SsoError } from "@/components/sso/sso-error";

export const metadata = { title: "Humo ID bilan kirish" };

export default async function Page({
    params, searchParams,
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    const sp = await searchParams;

    const clientId = typeof sp.client_id === "string" ? sp.client_id : "";
    const redirectUri = typeof sp.redirect_uri === "string" ? sp.redirect_uri : "";
    const scope = typeof sp.scope === "string" ? sp.scope : "profile";
    const state = typeof sp.state === "string" ? sp.state : "";

    const client = getSsoClient(clientId);
    if (!client) return <SsoError title="Noma'lum ilova" detail="Bu ilova Humo ID SSO uchun ro'yxatdan o'tmagan." />;
    if (!isAllowedRedirect(client, redirectUri)) return <SsoError title="Redirect ruxsat etilmagan" detail="So'ralgan manzil bu ilova uchun tasdiqlanmagan." />;

    const scopes = sanitizeScopes(scope);
    return (
        <SsoConsent
            clientId={client.id}
            clientName={client.name}
            redirectUri={redirectUri}
            scope={scopes.join(" ")}
            scopes={scopes}
            state={state}
        />
    );
}
