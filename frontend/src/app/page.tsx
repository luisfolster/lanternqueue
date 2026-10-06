import Link from "next/link";

const workflow = [
  {
    number: "01",
    title: "Registrar",
    description: "Abra uma solicitação com categoria, prioridade e detalhes do problema.",
  },
  {
    number: "02",
    title: "Acompanhar",
    description: "Veja quem assumiu o atendimento e converse no próprio chamado.",
  },
  {
    number: "03",
    title: "Resolver",
    description: "Consulte a solução aplicada e as mudanças registradas no percurso.",
  },
];

export default function Home() {
  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="LanternQueue, início">
          <span className="wordmark-symbol" aria-hidden="true" />
          <span>LanternQueue</span>
        </Link>
        <Link className="header-link" href="/login">
          Entrar <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <div className="hero-grid">
        <section className="hero" aria-labelledby="page-title">
          <p className="overline">Suporte de TI</p>
          <h1 id="page-title">Atendimento sem perder o contexto.</h1>
          <p className="hero-description">
            Solicitações, responsáveis e histórico no mesmo lugar. Do primeiro relato até a
            resolução, cada etapa fica ligada ao chamado.
          </p>
          <Link className="hero-action" href="/app">
            Abrir área de trabalho <span aria-hidden="true">↗</span>
          </Link>
        </section>

        <section className="workflow" aria-labelledby="workflow-title">
          <div className="workflow-heading">
            <p className="overline">Como funciona</p>
            <h2 id="workflow-title">Um registro para cada decisão.</h2>
          </div>
          <ol className="workflow-list">
            {workflow.map((step) => (
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
        </section>
      </div>

      <footer className="site-footer">
        <span>LanternQueue</span>
        <a href="https://github.com/luisfolster/lanternqueue" target="_blank" rel="noreferrer">
          Código no GitHub <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </main>
  );
}
