"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { api } from "@/lib/types";

export default function Register() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await api("/users", {
        method: "POST",
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      await api("/sessions", {
        method: "POST",
        body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
      });
      router.push("/app");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível criar a conta.");
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
        <p className="overline">Primeiro acesso</p>
        <h1>Criar conta</h1>
        <p>Contas novas podem abrir e acompanhar seus chamados.</p>
        <form onSubmit={submit} className="field-stack">
          <label>
            Nome
            <input name="name" minLength={2} maxLength={120} required />
          </label>
          <label>
            E-mail
            <input name="email" type="email" required />
          </label>
          <label>
            Senha
            <input name="password" type="password" minLength={12} required />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy}>
            {busy ? "Criando…" : "Criar conta"}
          </button>
        </form>
        <p>
          Já tem conta? <Link href="/login">Entrar</Link>
        </p>
      </section>
    </main>
  );
}
