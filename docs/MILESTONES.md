# Milestones propostos

Cada milestone termina com uma demonstração verificável e um Git checkpoint. A ordem pode mudar depois da modelagem detalhada do domínio.

| Etapa | Objetivo | Critério de aceite principal |
| --- | --- | --- |
| M0/M1 — fundação | Repositório, Compose, PostgreSQL, backend, frontend, health check, CI e documentação inicial | Os três serviços sobem; a página informa a conexão real com API e banco; CI valida build e smoke test |
| M2 — domínio mínimo | Modelar usuários, categorias e chamados; criar Alembic, primeira migration e seed fictício | Um chamado pode ser criado e consultado pela API com testes de banco |
| M3 — identidade e acesso | Cadastro, login, logout, papéis e autorização no backend | Operações protegidas rejeitam acesso indevido; testes cobrem permissões |
| M4 — fluxo de chamados | Transições válidas, atribuição, resolução e interface de uso | Usuário e técnico concluem um fluxo de ponta a ponta |
| M5 — comentários e auditoria | Comentários públicos, notas internas e eventos de mudança | Histórico preserva quem alterou o quê; visibilidade respeita papéis |
| M6 — experiência operacional | Dashboards por papel, busca, filtros, paginação e estados de interface | Tarefas frequentes funcionam por teclado e mostram loading/erro/vazio |
| M7 — SLA e anexos | Regras simples de prazo e arquivos com limites e validação | Prazo e falha de upload são demonstráveis e testados |
| M8 — qualidade e observabilidade | Testes ampliados, logging, métricas úteis, segurança e revisão de desempenho | Fluxos críticos e falhas relevantes são verificados automaticamente |
| M9 — entrega contínua | Revisar gates, proteção de branch e processo de publicação | PR executa verificações adequadas ao produto; falhas impedem merge por política definida |
| M10 — deploy e release | Ambiente de demonstração, operação, screenshots e release | Outra pessoa consegue acessar e reproduzir a versão documentada |

**Próximo milestone:** M2. Antes de implementar tabelas, definir invariantes do ticket, transições de status, regras de visibilidade e dados obrigatórios com exemplos concretos. A escolha de autenticação vem no M3, mas os modelos devem permitir a associação de solicitante e responsável.
