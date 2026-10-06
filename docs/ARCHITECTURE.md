# Arquitetura do LanternQueue

## Caminho de uma solicitação

```text
Navegador
  │ mesma origem, /api/v1/*
  ▼
Next.js (páginas e proxy HTTP)
  │ Authorization: Bearer <token> na rede interna
  ▼
FastAPI (regras de acesso e fluxo de chamados)
  │ SQLAlchemy / Alembic
  ▼
PostgreSQL
```

O navegador não recebe o token da API no corpo da resposta de login. O proxy Next.js o coloca em cookie HttpOnly, `SameSite=Lax`, e envia o cabeçalho Bearer ao backend. O cookie é `Secure` em modo de produção; o Compose local define `COOKIE_SECURE=false` porque usa HTTP no loopback. O backend armazena somente o hash SHA-256 do token e rejeita sessões expiradas ou revogadas no logout. A senha é derivada com `scrypt` e salt individual. O backend continua responsável pela autorização: esconder um botão não concede nem retira acesso.

Em desenvolvimento local, as portas 3000 e 8000 ficam vinculadas ao loopback. PostgreSQL permanece apenas na rede do Compose. Ao iniciar, o backend executa `alembic upgrade head`; o seed de demonstração é opcional via `SEED_DEMO`. O seed cria dados fictícios, não importa dados de usuários.

## Regras de domínio

- Solicitantes veem apenas seus chamados. Técnicos e administradores podem ver a fila toda.
- Apenas equipe pode atribuir e alterar a situação. Um técnico pode assumir o próprio trabalho; o administrador pode atribuir a qualquer membro da equipe.
- Uma resolução exige texto. Chamados encerrados não aceitam novas mensagens.
- Notas internas são invisíveis ao solicitante, inclusive o evento correspondente no histórico apresentado.
- Categorias vêm do banco e somente administradores criam novas. O seed fornece exemplos locais.
- A ordem de listagem é `created_at DESC, id DESC`; paginação usa página e tamanho (máximo 100). Para o volume esperado nesta demonstração, offset é simples e suficiente. Alterações simultâneas podem deslocar itens entre páginas.
- SLA usa horas corridas a partir da abertura: crítica 1h/8h, alta 4h/24h, média 8h/72h, baixa 24h/120h para primeira resposta/resolução. O relógio da resposta para na primeira mensagem pública da equipe, não em nota interna. Reabrir um chamado limpa a resolução registrada e seu estado de SLA. Ainda não há calendário de dias úteis nem pausa do prazo enquanto se aguarda o usuário.
- Anexos aceitam PDF, PNG, JPG e TXT de até 5 MB. O servidor verifica a extensão e uma assinatura básica do conteúdo, grava com nome aleatório em volume separado e mantém o nome original apenas como metadado. O download exige acesso ao chamado. Não há varredura antivírus; o volume precisa entrar na estratégia de backup junto com o banco antes de qualquer deploy.

As transições atualmente aceitas são:

```text
open → assigned
assigned → in_progress | open
in_progress → waiting_user | resolved | assigned
waiting_user → in_progress | resolved
resolved → closed | in_progress
closed → sem novas transições
```

A atribuição altera a situação para `assigned`; remover o responsável retorna para `open`. Cada mudança relevante cria um `TicketEvent` na mesma transação do chamado. O histórico é uma trilha de ações de produto, não um log de todas as leituras ou de cada campo SQL.

## Escolhas proporcionais ao projeto

O backend é um monólito modular. Endpoints, autenticação e modelos estão separados; não há camadas de repository ou service que apenas repassem métodos. A primeira migração cria as tabelas de domínio e pode ser reproduzida em um banco vazio. O CSS é próprio do projeto, sem dependência de Tailwind porque a interface atual não precisa dela. Redis fica fora até aparecer cache ou trabalho em segundo plano real.

A documentação OpenAPI é gerada pelo FastAPI em `/docs`. Os testes exercitam as regras principais com um banco SQLite temporário; o CI também sobe PostgreSQL pelo Compose e verifica a aplicação inteira por HTTP. O teste SQLite acelera o ciclo local, mas diferenças específicas de SQL ou migração exigem verificação no PostgreSQL real.

## Limites conhecidos

Esta é uma aplicação de demonstração local. Falta fluxo de recuperação de senha, rate limit e operação de produção. O seed usa credenciais públicas e deve permanecer desligado fora do ambiente de demonstração. O proxy define `Secure` no cookie em modo de produção, mas um deploy real ainda exige HTTPS, configuração de segredos, armazenamento e política operacional. Não há promessa de deploy público nesta branch.
