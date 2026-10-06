"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { api, Category, priorityLabel, statusLabel, Ticket, User } from "@/lib/types";

type TicketPage = { items: Ticket[]; page: number; page_size: number; total: number };
type Dashboard = { counts: Record<string, number>; total: number; role: string };

export default function Workspace() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tickets, setTickets] = useState<TicketPage | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const loadTickets = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), page_size: "10" });
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (categoryId) params.set("category_id", categoryId);
    if (query) params.set("q", query);
    try {
      setTickets(await api<TicketPage>(`/tickets?${params}`));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar chamados.");
    }
  }, [page, query, status, priority, categoryId]);

  useEffect(() => {
    async function load() {
      try {
        const [person, kinds, summary] = await Promise.all([
          api<User>("/users/me"),
          api<Category[]>("/categories"),
          api<Dashboard>("/dashboard"),
        ]);
        setUser(person);
        setCategories(kinds);
        setDashboard(summary);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [router]);

  useEffect(() => {
    if (user) void Promise.resolve().then(loadTickets);
  }, [user, loadTickets]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const ticket = await api<Ticket>("/tickets", {
        method: "POST",
        body: JSON.stringify({
          title: data.get("title"),
          description: data.get("description"),
          category_id: Number(data.get("category_id")),
          priority: data.get("priority"),
        }),
      });
      router.push(`/app/tickets/${ticket.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível criar o chamado.");
      setCreating(false);
    }
  }

  async function logout() {
    await api("/sessions", { method: "DELETE" }).catch(() => undefined);
    router.push("/login");
  }

  if (loading || !user)
    return (
      <main className="app-shell">
        <p className="loading-state">Carregando área de trabalho…</p>
      </main>
    );

  return (
    <main className="app-shell">
      <header className="product-header">
        <Link className="wordmark" href="/">
          <span className="wordmark-symbol" aria-hidden="true" /> LanternQueue
        </Link>
        <div className="header-actions">
          <span>{user.name}</span>
          {user.role === "admin" && <Link href="/app/admin">Administração</Link>}
          <button className="text-button" onClick={logout}>
            Sair
          </button>
        </div>
      </header>
      <section className="workspace-heading">
        <div>
          <p className="overline">Área de trabalho</p>
          <h1>{user.role === "end_user" ? "Meus chamados" : "Fila de atendimento"}</h1>
          <p>
            {user.role === "end_user"
              ? "Acompanhe solicitações e respostas da equipe."
              : "Acompanhe a fila e registre cada decisão do atendimento."}
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Fechar formulário" : "Novo chamado"}
        </button>
      </section>
      {dashboard && (
        <dl className="summary-strip">
          <div>
            <dt>Total</dt>
            <dd>{dashboard.total}</dd>
          </div>
          <div>
            <dt>Em aberto</dt>
            <dd>
              {(dashboard.counts.open ?? 0) +
                (dashboard.counts.assigned ?? 0) +
                (dashboard.counts.in_progress ?? 0) +
                (dashboard.counts.waiting_user ?? 0)}
            </dd>
          </div>
          <div>
            <dt>Resolvidos</dt>
            <dd>{(dashboard.counts.resolved ?? 0) + (dashboard.counts.closed ?? 0)}</dd>
          </div>
        </dl>
      )}
      {showForm && (
        <section className="work-panel" aria-labelledby="new-title">
          <h2 id="new-title">Abrir chamado</h2>
          <form className="field-stack" onSubmit={create}>
            <label>
              Título
              <input name="title" minLength={5} maxLength={160} required />
            </label>
            <label>
              Descrição
              <textarea name="description" minLength={10} rows={5} required />
            </label>
            <div className="form-grid">
              <label>
                Categoria
                <select name="category_id" required defaultValue="">
                  <option value="" disabled>
                    Selecione
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Prioridade
                <select name="priority" defaultValue="medium">
                  {Object.entries(priorityLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button disabled={creating}>{creating ? "Registrando…" : "Registrar chamado"}</button>
          </form>
        </section>
      )}
      <section className="work-panel" aria-labelledby="list-title">
        <div className="panel-heading">
          <div>
            <p className="overline">Chamados</p>
            <h2 id="list-title">
              {tickets?.total ?? 0} {(tickets?.total ?? 0) === 1 ? "registro" : "registros"}
            </h2>
          </div>
        </div>
        <div className="filter-row">
          <label>
            Buscar
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Título ou descrição"
            />
          </label>
          <label>
            Situação
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              {Object.entries(statusLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prioridade
            <select
              value={priority}
              onChange={(event) => {
                setPriority(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              {Object.entries(priorityLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Categoria
            <select
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {tickets?.items.length === 0 && (
          <p className="empty-state">
            Nenhum chamado encontrado.{" "}
            {query || status || priority || categoryId
              ? "Altere os filtros para procurar novamente."
              : "Abra um chamado para começar."}
          </p>
        )}
        <ul className="ticket-list">
          {tickets?.items.map((ticket) => (
            <li key={ticket.id}>
              <Link href={`/app/tickets/${ticket.id}`}>
                <span className="ticket-number">#{ticket.id.toString().padStart(4, "0")}</span>
                <span className="ticket-main">
                  <strong>{ticket.title}</strong>
                  <small>
                    {ticket.category_name} · {ticket.requester_name}
                  </small>
                </span>
                <span className={`ticket-state state-${ticket.status}`}>
                  {statusLabel[ticket.status]}
                </span>
                <span className="ticket-priority">{priorityLabel[ticket.priority]}</span>
              </Link>
            </li>
          ))}
        </ul>
        {tickets && tickets.total > tickets.page_size && (
          <nav className="pagination" aria-label="Páginas de chamados">
            <button className="text-button" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Anterior
            </button>
            <span>
              Página {page} de {Math.ceil(tickets.total / tickets.page_size)}
            </span>
            <button
              className="text-button"
              disabled={page * tickets.page_size >= tickets.total}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </button>
          </nav>
        )}
      </section>
    </main>
  );
}
