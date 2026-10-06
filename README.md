# LanternQueue

LanternQueue é uma aplicação local para registrar e acompanhar solicitações de suporte de TI. Solicitantes abrem chamados e acompanham respostas; técnicos assumem o atendimento, registram notas internas e documentam a resolução; administradores organizam categorias e papéis.

## Estado atual

A aplicação permite cadastro, login, logout, criação e consulta de chamados, filtros, paginação, atribuição, transições de situação, mensagens, notas internas, anexos, histórico de alterações e administração básica. O backend aplica as regras de acesso. O banco usa migrations Alembic e dados fictícios locais.

Ainda faltam recursos do escopo ampliado: recuperação de senha, observabilidade mais completa e deploy público. Veja [docs/MILESTONES.md](docs/MILESTONES.md). A stack local é uma demonstração funcional; não foi configurada para uso público com dados reais.

## Executar no Windows

Pré-requisito: Docker Desktop funcionando com `docker compose`. Na raiz do repositório, no PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up --build -d --wait
docker compose ps
```

Abra [http://localhost:3000](http://localhost:3000). A API fica em [http://localhost:8000/docs](http://localhost:8000/docs). O Compose aplica as migrations antes de iniciar a API e, com `SEED_DEMO=true`, cria categorias, três contas fictícias e um chamado de exemplo. Reexecutar o seed não duplica esses dados.

Contas locais de demonstração (senha definida por `DEMO_PASSWORD` no `.env.example`):

| Papel | E-mail |
| --- | --- |
| Solicitante | `marina@example.test` |
| Técnico | `rafael@example.test` |
| Administrador | `aline@example.test` |

O valor de exemplo da senha é `lanternqueue-demo-2026`. Ele serve apenas para o ambiente local. Antes de expor o serviço em outra máquina, configure senhas próprias, desative `SEED_DEMO` e revise autenticação, HTTPS e operação do banco. As portas do Compose são vinculadas a `127.0.0.1`.

Para verificar os serviços:

```powershell
Invoke-RestMethod http://localhost:8000/api/v1/health
docker compose ps
docker compose logs --tail=50 backend frontend db
```

O health check deve retornar `{"status":"up","database":"up"}`. Entrar e consultar a fila confirma o caminho frontend → API → PostgreSQL. `docker compose down` encerra os serviços sem apagar o volume do banco. `docker compose down -v` também remove os dados locais; use somente quando quiser reiniciar a demonstração do zero.

## Fluxo para experimentar

1. Entre como Marina e abra um chamado em **Novo chamado**.
2. Entre como Aline para atribuir um técnico.
3. Entre como Rafael para iniciar o atendimento, adicionar uma nota interna e registrar a resolução.
4. Entre novamente como Marina: ela vê a conversa pública e a resolução, sem acesso à nota interna.

Contas criadas pela tela de cadastro recebem o papel de solicitante. Apenas administradores podem alterar papéis e criar categorias. Técnicos podem assumir chamados e administrar o atendimento, mas não promover usuários.

## Desenvolvimento e testes

Os prazos de primeira resposta e resolução usam horas corridas por prioridade. A primeira resposta exige uma mensagem pública da equipe; notas internas não param esse relógio. Anexos PDF, PNG, JPG e TXT têm limite de 5 MB, ficam em um volume local e só podem ser baixados por quem tem acesso ao chamado. As regras estão documentadas em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Backend: Python 3.12, FastAPI, SQLAlchemy, Alembic e PostgreSQL. Frontend: Next.js 16, React, TypeScript e CSS próprio. O backend guarda um hash `scrypt` da senha e apenas o hash SHA-256 dos tokens de sessão; o frontend mantém o token em cookie HttpOnly. O Redis foi adiado porque ainda não há trabalho assíncrono nem cache que o justifique.

Se quiser executar as verificações fora do Docker, instale Python 3.12, Node.js 22 e pnpm 11.19.0. Com o ambiente virtual em `backend/.venv`:

```powershell
backend/.venv/Scripts/python.exe -m pip install -e "./backend[dev]"
backend/.venv/Scripts/python.exe -m ruff check backend
backend/.venv/Scripts/python.exe -m ruff format --check backend
backend/.venv/Scripts/python.exe -m pytest backend/tests
Set-Location frontend
pnpm install --frozen-lockfile
pnpm lint
pnpm format:check
pnpm typecheck
pnpm build
```

O workflow [CI](.github/workflows/ci.yml) executa essas verificações e sobe os três serviços para um smoke test. Os testes de API cobrem permissões e o fluxo de um chamado, mas ainda não substituem um teste de ponta a ponta da interface.

## Organização

```text
backend/app/          API, regras de acesso e modelos de dados
backend/migrations/   histórico do esquema PostgreSQL
backend/tests/        testes da API
frontend/src/app/     páginas e proxy de sessão da aplicação
docs/                 arquitetura e etapas do produto
compose.yaml          ambiente local com PostgreSQL, API e frontend
```

As decisões e os limites atuais estão em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Nenhum arquivo `.env` ou dado real deve ser versionado.

## Licença

O repositório ainda não declara uma licença de código aberto. A licença será escolhida antes de autorizar reutilização ou distribuição como software open source.
