export type User = { id: number; name: string; email: string; role: string };
export type Category = { id: number; name: string };
export type Ticket = {
  id: number;
  title: string;
  description: string;
  requester_name: string;
  assignee_id: number | null;
  assignee_name: string | null;
  category_id: number;
  category_name: string;
  priority: string;
  status: string;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  sla: {
    first_response_due_at: string;
    resolution_due_at: string;
    first_response_state: string;
    resolution_state: string;
  };
};
export type TicketDetail = Ticket & {
  attachments: { id: number; name: string; size: number; uploader: string; created_at: string }[];
  comments: { id: number; author: string; body: string; internal: boolean; created_at: string }[];
  events: {
    id: number;
    actor: string;
    action: string;
    detail: string | null;
    created_at: string;
  }[];
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new ApiError(
      typeof payload.detail === "string" ? payload.detail : `Erro ${response.status}`,
      response.status,
    );
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export const statusLabel: Record<string, string> = {
  open: "Aberto",
  assigned: "Atribuído",
  in_progress: "Em andamento",
  waiting_user: "Aguardando usuário",
  resolved: "Resolvido",
  closed: "Encerrado",
};

export const priorityLabel: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};
