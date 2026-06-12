import { Link } from "@/i18n/routing";
import { ShieldAlert } from "lucide-react";

export function SsoError({ title, detail }: { title: string; detail: string }) {
    return (
        <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#050818" }}>
            <div className="w-full max-w-sm rounded-3xl p-6 text-center" style={{ background: "rgba(11,18,40,0.7)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
                    <ShieldAlert className="w-7 h-7" style={{ color: "#ff8a96" }} />
                </div>
                <h1 className="text-lg font-black text-white">{title}</h1>
                <p className="text-sm mt-1.5" style={{ color: "rgba(180,200,240,0.75)" }}>{detail}</p>
                <Link href="/" className="mt-5 inline-block px-5 py-2.5 rounded-xl text-xs font-black text-white" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                    Bosh sahifa
                </Link>
            </div>
        </div>
    );
}
