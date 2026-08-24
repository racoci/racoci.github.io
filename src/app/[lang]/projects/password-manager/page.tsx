import PasswordManagerWidget from "../../../../components/PasswordManagerWidget";
import PasswordManagerEn from "../../../../content/password-manager/en.mdx";
import PasswordManagerPt from "../../../../content/password-manager/pt.mdx";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function PasswordManagerPage({ params }: PageProps) {
  const { lang } = await params;
  const isPt = lang === "pt";

  return (
    <div className="space-y-8 w-full">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3 font-sans">
          {isPt ? "Password Manager: Geração Determinística & Cripto-Cofre" : "Password Manager: Deterministic Generation & Crypto-Vault"}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 font-serif text-lg leading-relaxed mb-6">
          {isPt 
            ? "Cofre de segurança digital de conhecimento zero executado 100% no cliente, integrando criptografia simétrica autenticada AES-GCM e derivação de semente de alta entropia sem persistência na nuvem."
            : "A client-side zero-knowledge digital security vault integrating AES-GCM authenticated symmetric encryption and high-entropy deterministic seed derivation with zero cloud footprint."}
        </p>
      </div>

      {/* Embedded Password Manager Sandbox Viewport */}
      <div className="max-w-5xl mx-auto w-full">
        <PasswordManagerWidget />
      </div>

      {/* Localized Technical Documentation Section */}
      <article className="prose dark:prose-invert prose-emerald max-w-4xl mx-auto mt-16 border-t border-zinc-200 dark:border-zinc-800 pt-10">
        {isPt ? <PasswordManagerPt /> : <PasswordManagerEn />}
      </article>
    </div>
  );
}
