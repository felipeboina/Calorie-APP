"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [confirmacaoPendente, setConfirmacaoPendente] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setCarregando(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });

    setCarregando(false);

    if (error) {
      setErro(
        error.message.includes("already registered")
          ? "Esse email já está cadastrado."
          : "Não foi possível criar sua conta. Tente novamente."
      );
      return;
    }

    if (!data.session) {
      setConfirmacaoPendente(true);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  if (confirmacaoPendente) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-emerald-400">Quase lá!</h1>
        <p className="mt-3 max-w-sm text-sm text-neutral-400">
          Enviamos um link de confirmação para <strong>{email}</strong>. Abra
          seu email e confirme para poder entrar.
        </p>
        <Link href="/login" className="mt-6 font-medium text-emerald-400">
          Ir para o login
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-emerald-400">CalorieGO</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Crie sua conta e comece a jogar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Nome</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-neutral-100 outline-none focus:border-emerald-500"
              placeholder="Seu nome"
            />
          </div>
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
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {erro && <p className="text-sm text-red-400">{erro}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="mt-2 rounded-xl bg-emerald-500 py-3 font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {carregando ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-400">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-emerald-400">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
