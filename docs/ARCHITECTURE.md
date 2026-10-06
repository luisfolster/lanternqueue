# Arquitetura inicial

## Escopo implementado em M0/M1

```text
Navegador → Next.js (porta 3000)
                 │ consulta no servidor
                 ▼
             FastAPI (porta 8000)
                 │ SELECT 1
                 ▼
             PostgreSQL (rede interna do Compose)
```

O navegador acessa somente o frontend para esta página. O Next.js consulta `GET /api/v1/health` no backend a cada renderização. O backend retorna sucesso apenas quando consegue executar uma consulta no banco. `GET /api/v1/health/live` indica somente que o processo HTTP responde, sem depender do banco. O Compose também verifica a resposta HTTP do frontend antes de considerá-lo saudável.

## Decisões

- **Monólito modular:** um processo de API é suficiente para o domínio previsto. Separar serviços agora aumentaria deploy, observabilidade e consistência sem resolver um problema atual.
- **Consulta server-side no Next.js:** a página de fundação precisa apenas mostrar o estado do ambiente. Isso evita configurar CORS antes de haver interações do navegador com a API. Fluxos futuros poderão exigir outras escolhas.
- **PostgreSQL dentro do Compose:** dependência reproduzível para desenvolvimento. A porta do banco não é publicada no host; backend e banco conversam na rede interna.
- **Health check com consulta real:** prova conectividade entre API e banco. O endpoint retorna `503` quando a consulta falha; não expõe detalhes de conexão ao cliente.
- **Redis adiado:** não há cache ou trabalho assíncrono que o justifique nesta etapa.
- **CSS próprio neste estágio:** o frontend ainda não tem componentes de produto que justifiquem Tailwind. A dependência foi removida para manter o build proporcional ao código usado.
- **CI desde a fundação:** lint, formatação, testes, build e um smoke test com Compose detectam regressões de configuração antes da modelagem do domínio.
- **Migrations e seed adiados:** ainda não existem tabelas de domínio. A primeira migration e um seed fictício serão criados junto das primeiras entidades, para que ambos representem dados reais do projeto.

## Limites atuais

Não há autenticação, autorização, tabelas, dados persistidos pela aplicação, tratamento geral de erros ou logs estruturados da aplicação. O PostgreSQL está pronto para receber o domínio, mas o health check não cria tabelas. O link de documentação usa `BACKEND_PUBLIC_URL`, que o Compose deriva da porta pública configurada.

## Evolução

O backend será organizado por áreas de negócio conforme os fluxos aparecerem. Não serão criadas camadas de repositório ou serviço para métodos que apenas encaminham chamadas. Integrações futuras terão configuração explícita e desligada por padrão, sem leitura direta do banco de outro projeto.
