# Escopo do LanternQueue

## Versão 1: demonstração local

- Monorepo com frontend Next.js, API FastAPI, PostgreSQL, Docker Compose, migrations Alembic e CI.
- Cadastro, login, logout, sessões revogáveis, três papéis e autorização aplicada na API.
- Chamados com categorias, prioridade, atribuição, transições, resolução e encerramento.
- Comentários públicos, notas internas, histórico de alterações e anexos com acesso controlado.
- Prazos de primeira resposta e resolução por prioridade, calculados em horas corridas.
- Fila com busca, filtros, ordenação e paginação; painel de contagens para solicitantes e equipe.
- Administração de categorias e papéis; dados fictícios opcionais para demonstração.
- Testes do fluxo e permissões, lint, formatação, checagem de tipos, build e smoke test com Compose.
- Logs JSON por requisição, com identificador de correlação e duração, sem registrar senha ou token.

O fluxo completo foi exercitado localmente no navegador. A CI verifica a integração entre frontend, API e banco a cada PR.

## Fora do escopo desta versão

Um serviço público exigiria domínio, HTTPS, gestão de segredos, backup e operação contínua. A versão 1 foi preparada para execução local e revisão do código no GitHub; não deve ser exposta na internet com a configuração de demonstração.

Recuperação de senha depende de um canal de e-mail real. Redis, IA, analytics e integrações com outros projetos só serão adicionados se houver uma necessidade concreta. Esses itens não fazem parte dos critérios de conclusão da versão 1.
