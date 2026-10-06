# Etapas do LanternQueue

O roadmap acompanha as entregas deste produto. Cada etapa deve terminar com uma demonstração verificável e documentação correspondente.

## Concluído na branch de desenvolvimento

- Fundação com frontend, API, PostgreSQL, Docker Compose, CI e health checks.
- Modelagem de usuários, categorias, chamados, comentários, eventos e sessões.
- Migration inicial com Alembic e seed fictício local.
- Cadastro, login, logout, papéis e autorização no backend.
- Criação, consulta, filtros, paginação, atribuição e transições de chamados.
- Conversa pública, notas internas e histórico de alterações.
- Interface para solicitante e equipe, com painel de contagens e administração básica.
- Prazos simples de primeira resposta e resolução em horas corridas, com estado calculado por chamado.
- Anexos locais com limite de 5 MB, tipos permitidos e download autorizado.
- Testes de API para fluxo e permissões, lint, tipos e build.

Essa lista descreve código existente na branch, ainda sujeito à revisão final, testes de ponta a ponta e publicação.

## Para considerar o produto concluído

| Etapa | Entrega verificável |
| --- | --- |
| Revisão do fluxo | Testar cadastro, abertura, atribuição, atendimento, resolução e encerramento no navegador; corrigir erros e estados de interface. |
| Regras operacionais | Verificar os prazos de SLA e o envio de anexos no fluxo real; ampliar filtros úteis para a fila. |
| Segurança e operação | Revisar sessões, validação, logs estruturados, limites de upload quando aplicável, migrações e erros. |
| Qualidade | Ampliar testes para casos de autorização, transições, seed e migrações; incluir E2E de fluxo crítico se justificar manutenção. |
| Apresentação | Revisar README, registrar decisões reais, capturar screenshots, preparar release e definir licença. |
| Publicação | Publicar a branch por PR após CI e revisão. Um deploy público requer configuração segura e será decidido separadamente. |

Integrações com IA, analytics e outros projetos continuam opcionais e fora do produto principal. A recuperação de senha também fica para uma etapa posterior se houver um meio real de enviar o link com segurança.
