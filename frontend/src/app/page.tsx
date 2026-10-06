import Link from "next/link";

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
    return health.status === "up" && health.database === "up" ? "ready" : "api-unavailable";
  } catch {
    return "api-unavailable";
  }
}

const plannedFlow = [
  {
    number: "01",
    title: "Registrar",
    description: "Identificar quem pediu ajuda, o problema relatado e seu impacto.",
  },
  {
    number: "02",
    title: "Tratar",
    description: "Registrar responsável, prioridade e mudanças durante o atendimento.",
  },
  {
    number: "03",
    title: "Resolver",
    description: "Guardar a solução aplicada e as decisões que levaram a ela.",
  },
];

export default async function Home() {
  const environment = await getEnvironment();
  const ready = environment === "ready";
  const apiAvailable = environment !== "api-unavailable";
  const apiDocsUrl = new URL("/docs", process.env.BACKEND_PUBLIC_URL ?? "http://localhost:8000");

  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="LanternQueue, início">
          <span className="wordmark-symbol" aria-hidden="true" />
          <span>LanternQueue</span>
        </Link>
        <a
          className="header-link"
          href="https://github.com/luisfolster/lanternqueue"
          target="_blank"
          rel="noreferrer"
        >
          Ver código no GitHub <span aria-hidden="true">↗</span>
        </a>
      </header>

      <div className="hero-grid">
        <section className="hero" aria-labelledby="page-title">
          <p className="overline">Gestão de suporte de TI</p>
          <h1 id="page-title">Atendimento de TI sem perder o contexto.</h1>
          <p className="hero-description">
            O LanternQueue está sendo construído para reunir solicitações, responsáveis e histórico
            de atendimento em um só lugar, da abertura à resolução.
          </p>
          <div className="release-note">
            <span className="release-symbol" aria-hidden="true" />
            <span>
              Em desenvolvimento. As funcionalidades de chamados serão implementadas em etapas.
            </span>
          </div>
        </section>

        <section className="workflow" aria-labelledby="workflow-title">
          <div className="workflow-heading">
            <p className="overline">Fluxo planejado</p>
            <h2 id="workflow-title">O histórico deve acompanhar cada chamado.</h2>
          </div>
          <ol className="workflow-list">
            {plannedFlow.map((step) => (
              <li className="workflow-step" key={step.number}>
                <span className="step-number" aria-hidden="true">
                  {step.number}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="workflow-footnote">
            As etapas acima ainda não estão disponíveis na aplicação.
          </p>
        </section>
      </div>

      <section className="foundation" aria-labelledby="foundation-title">
        <div className="foundation-copy">
          <p className="overline">Versão atual</p>
          <h2 id="foundation-title">
            {ready ? "Base técnica em operação." : "Estado da infraestrutura."}
          </h2>
          <p>A interface consulta a API, que verifica uma conexão real com o PostgreSQL.</p>
        </div>
        <div className="foundation-status">
          <p className={`status-heading ${ready ? "status-good" : "status-problem"}`} role="status">
            <span className="status-dot" aria-hidden="true" />
            {ready
              ? "API e banco disponíveis"
              : environment === "database-unavailable"
                ? "Banco indisponível"
                : "API indisponível"}
          </p>
          <dl className="service-list">
            <div className="service-row">
              <dt>
                API <span>FastAPI</span>
              </dt>
              <dd className={apiAvailable ? "status-good" : "status-problem"}>
                {apiAvailable ? "Respondendo" : "Sem resposta"}
              </dd>
            </div>
            <div className="service-row">
              <dt>
                Banco de dados <span>PostgreSQL</span>
              </dt>
              <dd
                className={
                  ready
                    ? "status-good"
                    : environment === "database-unavailable"
                      ? "status-problem"
                      : ""
                }
              >
                {ready
                  ? "Conectado"
                  : environment === "database-unavailable"
                    ? "Indisponível"
                    : "Não verificado"}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <footer className="site-footer">
        <span>LanternQueue · Em desenvolvimento</span>
        <a href={apiDocsUrl.toString()}>
          Documentação da API <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </main>
  );
}
