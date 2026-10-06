# LanternQueue

Plataforma de gestão de suporte de TI em desenvolvimento. O objetivo é manter solicitações, decisões e soluções no mesmo histórico, para que o atendimento não dependa de conversas dispersas.

**Estado atual:** fundação M0/M1. Existe uma API com verificações de saúde, uma página inicial que consulta a API e um PostgreSQL configurado no Docker Compose. Ainda não existem contas, autenticação, chamados, migrations ou dados de demonstração. Nenhum recurso de suporte de TI está pronto para uso.

O código é verificado por testes da API, lint, formatação, checagem de tipos, build do frontend e um teste de integração dos três serviços no GitHub Actions. Isso valida a fundação; não valida ainda um fluxo de chamados.

## Problema e direção

O projeto vai organizar solicitações de suporte de TI, atribuição de responsáveis e histórico de atendimento em uma aplicação web. A primeira versão será um monólito modular: um backend FastAPI, um frontend Next.js e um banco PostgreSQL. Cada domínio será acrescentado quando houver um fluxo completo a implementar.

## Pré-requisitos

- Git para versionamento.
- Docker Desktop com o comando `docker compose` para executar os três serviços localmente. No Windows, Docker Desktop requer o backend de virtualização adequado configurado.
- Para rodar fora do Docker: Python 3.12, Node.js 22 e pnpm 11.19.0. Essa rota é opcional. O CSS é próprio do projeto; Tailwind será avaliado quando houver componentes de produto a construir.

## Quick start no Windows / PowerShell

Na raiz deste repositório:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
```

Abra `http://localhost:3000` no navegador (ou use `Start-Process 'http://localhost:3000'` no PowerShell). A página deve mostrar **API e banco disponíveis**. O backend expõe `http://localhost:8000/api/v1/health`; a resposta esperada é `{"status":"up","database":"up"}`. A documentação OpenAPI gerada pelo FastAPI fica em `http://localhost:8000/docs`.

```powershell
Invoke-RestMethod http://localhost:8000/api/v1/health
docker compose exec db pg_isready -U lanternqueue -d lanternqueue
docker compose logs --tail=50 backend frontend db
```

`pg_isready` deve informar que o banco aceita conexões. O health check da API executa `SELECT 1` no PostgreSQL; a mensagem da página confirma o caminho **frontend → backend → banco**. Se alterar usuário ou nome do banco no `.env`, ajuste os argumentos do comando `pg_isready`.

Para desligar sem apagar os dados: `docker compose down`. Para apagar também o volume local do banco, use `docker compose down -v` apenas se quiser descartar esses dados.

## Desenvolvimento sem Docker

É necessário ter PostgreSQL iniciado separadamente. No PowerShell, na raiz do repositório:

```powershell
py -3.12 -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -e "./backend[dev]"
$env:DATABASE_URL = "postgresql+psycopg://lanternqueue:lanternqueue_local_only@localhost:5432/lanternqueue"
backend/.venv/Scripts/python.exe -m uvicorn app.main:app --app-dir backend --reload
```

Em outro terminal:

```powershell
Set-Location frontend
pnpm install --frozen-lockfile
pnpm dev
```

O frontend usa `http://localhost:8000` quando `BACKEND_INTERNAL_URL` não está definido. Essa rota exige que o banco e o usuário existam com as credenciais indicadas. O Compose é a forma mais simples de preparar o banco nesta etapa.

## Verificações disponíveis

```powershell
backend/.venv/Scripts/python.exe -m pytest backend/tests
backend/.venv/Scripts/python.exe -m ruff check backend
backend/.venv/Scripts/python.exe -m ruff format --check backend
Set-Location frontend
pnpm lint
pnpm format:check
pnpm typecheck
pnpm build
```

Os testes atuais validam o contrato de liveness e readiness da API com um banco substituto. A conexão real é verificada pelo health check quando o Compose está ativo. O workflow em [.github/workflows/ci.yml](.github/workflows/ci.yml) também sobe o Compose e faz requisições ao frontend e à API. Ainda não há teste E2E de uma tarefa de usuário.

## Configuração

Copie `.env.example` para `.env` antes do Compose. O arquivo `.env` é ignorado pelo Git. Os valores de exemplo servem apenas para desenvolvimento local. Não exponha essas credenciais em um ambiente acessível externamente. O frontend recebe `BACKEND_INTERNAL_URL` para consultar a API na rede do Compose e `BACKEND_PUBLIC_URL` para montar o link da documentação no navegador. Este último acompanha `BACKEND_PORT`.

## Estrutura

```text
backend/        API FastAPI, configuração de banco e testes mínimos
frontend/       página inicial Next.js e estilos
docs/           arquitetura e milestones
.github/        verificações automáticas
compose.yaml    PostgreSQL, backend e frontend locais
.env.example    parâmetros locais de exemplo
```

## Roadmap

Os próximos passos estão em [docs/MILESTONES.md](docs/MILESTONES.md). Usuários, papéis, chamados, comentários, auditoria, SLA, anexos, dashboards e deploy ainda são planejados. Redis, IA e integrações externas não participam da fundação.

## Licença

Esta versão inicial não declara uma licença de código aberto. A escolha será feita antes de permitir reutilização ou distribuição do código como projeto open source.
