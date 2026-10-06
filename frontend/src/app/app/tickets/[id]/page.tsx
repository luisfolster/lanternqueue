"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { api, ApiError, priorityLabel, statusLabel, TicketDetail, User } from "@/lib/types";

const nextStatuses: Record<string, string[]> = {
  open: [],
  assigned: ["in_progress", "open"],
  in_progress: ["waiting_user", "resolved", "assigned"],
  waiting_user: ["in_progress", "resolved"],
  resolved: ["closed", "in_progress"],
  closed: [],
};

function eventDescription(action: string, detail: string | null) {
  switch (action) {
    case "created":
      return "abriu o chamado";
    case "assigned":
      return `atribuiu o chamado a ${detail ?? "um técnico"}`;
    case "unassigned":
      return "removeu a atribuição";
    case "status_changed":
      return `alterou a situação para ${statusLabel[detail ?? ""] ?? detail}`;
    case "priority_changed": {
      const [before, after] = (detail ?? "").split(" → ");
      return `alterou a prioridade de ${priorityLabel[before] ?? before} para ${priorityLabel[after] ?? after}`;
    }
    case "internal_note":
      return "registrou uma nota interna";
    case "commented":
      return "adicionou uma mensagem";
    case "attachment_added":
      return `anexou ${detail ?? "um arquivo"}`;
    default:
      return action;
  }
}

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [staff, setStaff] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [internal, setInternal] = useState(false);
  const [nextStatus, setNextStatus] = useState("");
  const [resolution, setResolution] = useState("");

  const load = useCallback(async () => {
    try {
      const person = await api<User>("/users/me");
      setUser(person);
      setTicket(await api<TicketDetail>(`/tickets/${id}`));
      if (person.role === "admin")
        setStaff((await api<User[]>("/users")).filter((item) => item.role !== "end_user"));
      setError("");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) router.replace("/login");
      else
        setError(cause instanceof Error ? cause.message : "Não foi possível carregar o chamado.");
    }
  }, [id, router]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function assign(value: string) {
    setBusy(true);
    try {
      await api(`/tickets/${id}/assignment`, {
        method: "PATCH",
        body: JSON.stringify({ assignee_id: value ? Number(value) : null }),
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atribuir.");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await api(`/tickets/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: nextStatus,
          resolution: nextStatus === "resolved" ? resolution : null,
        }),
      });
      setNextStatus("");
      setResolution("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar a situação.");
    } finally {
      setBusy(false);
    }
  }

  async function changePriority(value: string) {
    setBusy(true);
    try {
      await api(`/tickets/${id}/priority`, {
        method: "PATCH",
        body: JSON.stringify({ priority: value }),
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar a prioridade.");
    } finally {
      setBusy(false);
    }
  }

  async function comment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api(`/tickets/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: data.get("body"), internal }),
      });
      form.reset();
      setInternal(false);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar a mensagem.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    try {
      await api(`/tickets/${id}/attachments`, { method: "POST", body: data });
      form.reset();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível anexar o arquivo.");
    } finally {
      setBusy(false);
    }
  }

  const isStaff = user?.role === "technician" || user?.role === "admin";

  return (
    <main className="app-shell">
      <header className="product-header">
        <Link className="wordmark" href="/">
          <span className="wordmark-symbol" aria-hidden="true" /> LanternQueue
        </Link>
        <Link href="/app">← Voltar para chamados</Link>
      </header>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!ticket && !error ? (
        <p className="loading-state">Carregando chamado…</p>
      ) : ticket ? (
        <>
          <section className="ticket-heading">
            <p className="overline">Chamado #{ticket.id.toString().padStart(4, "0")}</p>
            <h1>{ticket.title}</h1>
            <p>
              Aberto por {ticket.requester_name} ·{" "}
              {new Date(ticket.created_at).toLocaleString("pt-BR")}
            </p>
          </section>
          <div className="detail-grid">
            <div>
              <section className="work-panel">
                <h2>Solicitação</h2>
                <p className="ticket-description">{ticket.description}</p>
              </section>
              <section className="work-panel">
                <h2>Conversa</h2>
                {ticket.comments.length === 0 && (
                  <p className="empty-state">Nenhuma mensagem ainda.</p>
                )}
                <ol className="timeline">
                  {ticket.comments.map((item) => (
                    <li key={item.id}>
                      <div className="timeline-meta">
                        <strong>{item.author}</strong>
                        {item.internal && <span className="internal-label">Nota interna</span>}
                        <time>{new Date(item.created_at).toLocaleString("pt-BR")}</time>
                      </div>
                      <p>{item.body}</p>
                    </li>
                  ))}
                </ol>
                {ticket.status !== "closed" && (
                  <form onSubmit={comment} className="field-stack">
                    <label>
                      {internal ? "Nota interna" : "Responder"}
                      <textarea name="body" rows={4} required />
                    </label>
                    {isStaff && (
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={internal}
                          onChange={(event) => setInternal(event.target.checked)}
                        />{" "}
                        Visível apenas para a equipe
                      </label>
                    )}
                    <button disabled={busy}>{busy ? "Salvando…" : "Adicionar mensagem"}</button>
                  </form>
                )}
              </section>
              <section className="work-panel">
                <h2>Anexos</h2>
                {ticket.attachments.length === 0 && (
                  <p className="empty-state">Nenhum arquivo anexado.</p>
                )}
                <ul className="attachment-list">
                  {ticket.attachments.map((item) => (
                    <li key={item.id}>
                      <a href={`/api/v1/tickets/${id}/attachments/${item.id}`}>{item.name}</a>
                      <span>
                        {Math.ceil(item.size / 1024)} KB · {item.uploader}
                      </span>
                    </li>
                  ))}
                </ul>
                {ticket.status !== "closed" && (
                  <form onSubmit={upload} className="field-stack">
                    <label>
                      Adicionar arquivo
                      <input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg,.txt" required />
                    </label>
                    <p className="field-hint">PDF, PNG, JPG ou TXT; até 5 MB.</p>
                    <button disabled={busy}>{busy ? "Enviando…" : "Anexar arquivo"}</button>
                  </form>
                )}
              </section>
              {isStaff && (
                <section className="work-panel">
                  <h2>Histórico de alterações</h2>
                  <ol className="event-list">
                    {ticket.events.map((item) => (
                      <li key={item.id}>
                        <strong>{item.actor}</strong> · {eventDescription(item.action, item.detail)}
                        <time>{new Date(item.created_at).toLocaleString("pt-BR")}</time>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>
            <aside className="detail-aside">
              <section className="work-panel">
                <p className="overline">Situação</p>
                <h2>{statusLabel[ticket.status]}</h2>
                <dl className="detail-facts">
                  <div>
                    <dt>Prioridade</dt>
                    <dd>{priorityLabel[ticket.priority]}</dd>
                  </div>
                  <div>
                    <dt>Categoria</dt>
                    <dd>{ticket.category_name}</dd>
                  </div>
                  <div>
                    <dt>Responsável</dt>
                    <dd>{ticket.assignee_name ?? "Não atribuído"}</dd>
                  </div>
                  <div>
                    <dt>Prazo da resposta</dt>
                    <dd
                      className={
                        ticket.sla.first_response_state === "breached" ? "status-problem" : ""
                      }
                    >
                      {new Date(ticket.sla.first_response_due_at).toLocaleString("pt-BR")}
                      {ticket.sla.first_response_state === "breached"
                        ? " · fora do prazo"
                        : ticket.sla.first_response_state === "met"
                          ? " · atendido"
                          : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Prazo de resolução</dt>
                    <dd
                      className={ticket.sla.resolution_state === "breached" ? "status-problem" : ""}
                    >
                      {new Date(ticket.sla.resolution_due_at).toLocaleString("pt-BR")}
                      {ticket.sla.resolution_state === "breached"
                        ? " · fora do prazo"
                        : ticket.sla.resolution_state === "met"
                          ? " · atendido"
                          : ""}
                    </dd>
                  </div>
                </dl>
                {ticket.resolution && (
                  <div className="resolution">
                    <strong>Resolução</strong>
                    <p>{ticket.resolution}</p>
                  </div>
                )}
              </section>
              {isStaff && ticket.status !== "closed" && (
                <section className="work-panel">
                  <h2>Atendimento</h2>
                  <label>
                    Prioridade
                    <select
                      value={ticket.priority}
                      onChange={(event) => void changePriority(event.target.value)}
                      disabled={busy}
                    >
                      {Object.entries(priorityLabel).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {user?.role === "admin" && (
                    <label>
                      Responsável
                      <select
                        value={ticket.assignee_id ?? ""}
                        onChange={(event) => void assign(event.target.value)}
                        disabled={busy}
                      >
                        <option value="">Não atribuído</option>
                        {staff.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {user?.role === "technician" && !ticket.assignee_id && (
                    <button onClick={() => void assign(String(user.id))} disabled={busy}>
                      Assumir chamado
                    </button>
                  )}
                  {nextStatuses[ticket.status].length > 0 && (
                    <form onSubmit={changeStatus} className="field-stack">
                      <label>
                        Alterar situação
                        <select
                          value={nextStatus}
                          onChange={(event) => setNextStatus(event.target.value)}
                          required
                        >
                          <option value="">Selecione</option>
                          {nextStatuses[ticket.status].map((value) => (
                            <option key={value} value={value}>
                              {statusLabel[value]}
                            </option>
                          ))}
                        </select>
                      </label>
                      {nextStatus === "resolved" && (
                        <label>
                          Resolução
                          <textarea
                            value={resolution}
                            onChange={(event) => setResolution(event.target.value)}
                            required
                            rows={4}
                          />
                        </label>
                      )}
                      <button disabled={busy || !nextStatus}>Salvar situação</button>
                    </form>
                  )}
                </section>
              )}
            </aside>
          </div>
        </>
      ) : null}
    </main>
  );
}
