"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { api } from "@/lib/types";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/sessions", { method: "POST", body: JSON.stringify({ email, password }) });
      router.push("/app");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell auth-shell">
      <header className="product-header">
        <Link className="wordmark" href="/">
          <span className="wordmark-symbol" aria-hidden="true" /> LanternQueue
        </Link>
      </header>
      <section className="auth-panel">
        <p className="overline">Acesso ao atendimento</p>
        <h1>Entrar</h1>
        <p>Use sua conta para acompanhar ou atender chamados.</p>
        <form onSubmit={submit} className="field-stack">
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="auth-help">
          As contas de demonstração estão documentadas no README do repositório.
        </p>
        <p>
          Sem conta? <Link href="/register">Criar conta</Link>
        </p>
      </section>
    </main>
  );
}
