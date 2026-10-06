export const dynamic = "force-dynamic";

type Health = { status: string; database: string };
type Environment = "ready" | "database-unavailable" | "api-unavailable";

async function getEnvironment(): Promise<Environment> {
  const baseUrl = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";

  try {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (response.status === 503) return "database-unavailable";
    if (!response.ok) return "api-unavailable";

    const health = (await response.json()) as Health;
    return health.status === "up" && health.database === "up"
      ? "ready"
      : "api-unavailable";
  } catch {
    return "api-unavailable";
  }
}

export default async function Home() {
  const environment = await getEnvironment();
  const ready = environment === "ready";
  const apiAvailable = environment !== "api-unavailable";

  return (
    <main className="page-shell">
      <header className="site-header">
        <div className="wordmark">
          <span className="wordmark-symbol" aria-hidden="true" />
          <span>LanternQueue</span>
        </div>
        <div className="header-meta">
          <span>Projeto 01</span>
          <span className="header-divider" aria-hidden="true" />
          <span>Prévia local</span>
        </div>
      </header>

      <div className="content-grid">
        <section className="intro" aria-labelledby="page-title">
          <p className="section-index">01 / Fundação</p>
          <h1 id="page-title">Primeiro, fazer a base funcionar.</h1>
          <p className="intro-copy">
            Ainda não dá para abrir chamados. Hoje, esta tela confere se o site consegue
            consultar a API e se a API alcança o banco de dados.
          </p>
        </section>

        <section className="environment" aria-labelledby="environment-title">
          <div className="environment-topline">
            <p className="section-index">Verificação local</p>
            <span className="live-marker">Ao abrir esta página</span>
          </div>
          <h2 id="environment-title">O que está funcionando</h2>
          <p className={`environment-summary ${ready ? "summary-ready" : "summary-attention"}`} role="status">
            <span className="summary-indicator" aria-hidden="true" />
            {ready
              ? "API e banco disponíveis"
              : environment === "database-unavailable"
                ? "Banco indisponível"
                : "API indisponível"}
          </p>

          <dl className="service-list">
            <div className="service-row">
              <dt><span className="service-number">01</span> Interface</dt>
              <dd>Esta página</dd>
              <dd className="service-state">Aberta</dd>
            </div>
            <div className="service-row">
              <dt><span className="service-number">02</span> API</dt>
              <dd>FastAPI</dd>
              <dd className={`service-state ${apiAvailable ? "state-good" : "state-problem"}`}>
                {apiAvailable ? "Respondendo" : "Sem resposta"}
              </dd>
            </div>
            <div className="service-row">
              <dt><span className="service-number">03</span> Dados</dt>
              <dd>PostgreSQL</dd>
              <dd className={`service-state ${ready ? "state-good" : environment === "database-unavailable" ? "state-problem" : ""}`}>
                {ready ? "Conectado" : environment === "database-unavailable" ? "Indisponível" : "Não verificado"}
              </dd>
            </div>
          </dl>
          <p className="environment-footnote">A API faz uma consulta real ao banco antes de confirmar a conexão.</p>
        </section>
      </div>

      <section className="next-step" aria-labelledby="next-title">
        <p className="section-index">Em seguida / M2</p>
        <h2 id="next-title">Dar forma aos chamados.</h2>
        <p>Modelar usuários, categorias e chamados; depois, criar e consultar um chamado pela API.</p>
      </section>

      <footer className="site-footer">
        <span>LanternQueue · desenvolvimento local</span>
        <a href="http://localhost:8000/docs">Ver documentação da API <span aria-hidden="true">↗</span></a>
      </footer>
    </main>
  );
}
