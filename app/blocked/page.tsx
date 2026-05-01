import { getClientIp } from "@/lib/ip";
import LogoutLink from "@/components/LogoutLink";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

export default function BlockedPage() {
  const ip = getClientIp();

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center justify-center mb-8">
          <Logo height={42} />
        </div>

        <div className="rounded-xl bg-red-50 border border-red-200 p-5 mb-6">
          <h2 className="text-lg font-semibold text-red-700 mb-2">
            Red no autorizada
          </h2>
          <p className="text-sm text-red-800/90 leading-relaxed">
            No puedes fichar desde esta red. El fichaje sólo está permitido
            desde las oficinas autorizadas. Si crees que es un error, contacta
            con Recursos Humanos.
          </p>
        </div>

        <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700 mb-6 font-mono">
          IP detectada: <span className="font-semibold">{ip ?? "desconocida"}</span>
        </div>

        <LogoutLink />
      </div>
    </main>
  );
}
