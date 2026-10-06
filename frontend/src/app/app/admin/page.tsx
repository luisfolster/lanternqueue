"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { api, Category, User } from "@/lib/types";

const roleLabel: Record<string, string> = {
  end_user: "Solicitante",
  technician: "Técnico",
  admin: "Administrador",
};

export default function Administration() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [people, kinds] = await Promise.all([
        api<User[]>("/users"),
        api<Category[]>("/categories"),
      ]);
      setUsers(people);
      setCategories(kinds);
      setError("");
    } catch (cause) {
      if (cause instanceof Error && cause.message.includes("Authentication"))
        router.replace("/login");
      else setError(cause instanceof Error ? cause.message : "Acesso não autorizado.");
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name"));
    try {
      await api("/categories", { method: "POST", body: JSON.stringify({ name }) });
      form.reset();
      setNotice(`Categoria ${name} criada.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível criar a categoria.");
    }
  }

  async function changeRole(userId: number, role: string) {
    try {
      await api(`/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
      setNotice("Papel atualizado.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar o papel.");
    }
  }

  return (
    <main className="app-shell">
      <header className="product-header">
        <Link className="wordmark" href="/">
          <span className="wordmark-symbol" aria-hidden="true" /> LanternQueue
        </Link>
        <Link href="/app">← Voltar para chamados</Link>
      </header>
      <section className="workspace-heading">
        <div>
          <p className="overline">Configuração</p>
          <h1>Administração</h1>
          <p>Organize categorias e acesso da equipe.</p>
        </div>
      </section>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="form-notice" role="status">
          {notice}
        </p>
      )}
      <div className="detail-grid">
        <section className="work-panel">
          <h2>Pessoas</h2>
          <ul className="admin-list">
            {users.map((person) => (
              <li key={person.id}>
                <div>
                  <strong>{person.name}</strong>
                  <small>{person.email}</small>
                </div>
                <label>
                  <span className="visually-hidden">Papel de {person.name}</span>
                  <select
                    value={person.role}
                    onChange={(event) => void changeRole(person.id, event.target.value)}
                  >
                    {Object.entries(roleLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
        </section>
        <aside>
          <section className="work-panel">
            <h2>Categorias</h2>
            <ul className="category-list">
              {categories.map((category) => (
                <li key={category.id}>{category.name}</li>
              ))}
            </ul>
            <form onSubmit={createCategory} className="field-stack">
              <label>
                Nova categoria
                <input name="name" minLength={2} maxLength={80} required />
              </label>
              <button type="submit">Adicionar categoria</button>
            </form>
          </section>
        </aside>
      </div>
    </main>
  );
}
