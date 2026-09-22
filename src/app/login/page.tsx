"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setCarregando(false);

    if (error) {
      setErro("Email ou senha incorretos.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-emerald-400">CalorieGO</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Entre para continuar sua jornada
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-neutral-100 outline-none focus:border-emerald-500"
              placeholder="voce@email.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Senha</label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-neutral-100 outline-none focus:border-emerald-500"
              placeholder="••••••••"
            />
          </div>

          {erro && <p className="text-sm text-red-400">{erro}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="mt-2 rounded-xl bg-emerald-500 py-3 font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-400">
          Não tem conta?{" "}
          <Link href="/signup" className="font-medium text-emerald-400">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}
