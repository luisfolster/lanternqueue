export const dynamic = "force-dynamic";

type Health = { status: string; database: string };

async function getHealth(): Promise<Health | null> {
  const baseUrl = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";
  try {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    return (await response.json()) as Health;
  } catch {
    return null;
  }
}

export default async function Home() {
  const health = await getHealth();
  const online = health?.status === "up" && health.database === "up";

  return (
    <main className="page-shell">
      <header className="site-header">
        <div className="brand" aria-label="LanternQueue">
          <span className="brand-mark" aria-hidden="true">LQ</span>
          <span>LanternQueue</span>
        </div>
        <span className="stage-label">Fundação · M0/M1</span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">IT Service Management Platform</p>
        <h1 id="page-title">Suporte de TI com contexto e continuidade.</h1>
        <p className="intro-copy">
          A fundação da plataforma está em desenvolvimento. O fluxo de chamados, usuários e
          permissões será construído nos próximos milestones.
        </p>
      </section>

      <section className="status-panel" aria-labelledby="status-title">
        <div>
          <p className="eyebrow">Estado do ambiente</p>
          <h2 id="status-title">Conexão entre serviços</h2>
          <p>Esta página consulta a API; a API verifica uma consulta real ao PostgreSQL.</p>
        </div>
        <div className={`status-badge ${online ? "is-online" : "is-offline"}`} role="status">
          <span className="status-dot" aria-hidden="true" />
          {online ? "API e banco disponíveis" : "API ou banco indisponível"}
        </div>
      </section>

      <footer className="site-footer">
        <span>Primeira etapa: infraestrutura local e verificação de saúde.</span>
        <a href="http://localhost:8000/docs">Documentação da API</a>
      </footer>
    </main>
  );
}
