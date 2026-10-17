# Aplicação das correções de segurança

## Estado atual

Os arquivos em `migrations/` são **propostas versionadas**. A presença deles no repositório não prova que o Supabase conectado usa essas políticas. O projeto atual não inclui banco local, Supabase CLI, Docker nem credenciais de um projeto de teste isolado. Não aplicar em produção antes da validação abaixo.

## Antes de aplicar

1. Crie um projeto Supabase exclusivo para testes com o mesmo esquema e uma cópia **anonimizada** dos dados necessários. Preserve um backup do esquema e dos dados do projeto de origem. Uma branch do Supabase não é obrigatória.
2. Execute `202610140001_security_preflight.sql` no projeto de teste e salve a saída de políticas, grants e funções. Confira manualmente views, RPCs e `SECURITY DEFINER` não listados pelo código. A consulta aborta quando encontra relações inconsistentes, duração inválida ou intervalos sobrepostos; resolva cada caso com decisão explícita, sem apagar registros automaticamente.
3. Revise políticas antigas que a segunda migração substituirá, inclusive permissões concedidas por coluna. Confira se os campos e tipos reais correspondem aos usados pela migração (`data date`, `horario time`, `servico_duracao integer` e horários da barbearia).
4. Configure `SUPABASE_SERVICE_ROLE_KEY` **somente no servidor** do aplicativo de teste. Nunca use prefixo `NEXT_PUBLIC_` nessa chave. A rota de upload valida autenticação, propriedade, conteúdo real, tamanho, cota de 10 envios por usuário/hora e reencoda a imagem antes de gravar. A migração bloqueia upload direto no bucket público.

### Sem branch: projeto de teste separado

Este repositório ainda não contém a migração do esquema inicial. Por isso, um projeto Supabase vazio precisa receber uma cópia **somente do esquema `public`** antes das migrações de segurança. Com `pg_dump` e `psql` instalados, obtenha no painel **Connect** as conexões em modo **Session pooler** do projeto de origem e do projeto de teste. Use a senha interativa (`-W`), sem colocar credenciais em arquivos do repositório ou na linha de comando:

```bash
pg_dump -h HOST_ORIGEM -p 5432 -U USUARIO_ORIGEM -d postgres -W \
  --schema-only --schema=public --no-owner --no-acl \
  -f /tmp/naregua-public-schema.sql
psql -h HOST_TESTE -p 5432 -U USUARIO_TESTE -d postgres -W \
  -v ON_ERROR_STOP=1 -1 -f /tmp/naregua-public-schema.sql
```

Confirme as identidades dos dois projetos no painel antes de importar. O dump não inclui dados de clientes/agendamentos nem alterações personalizadas nos esquemas gerenciados `auth` e `storage`; revise esses objetos separadamente no inventário. Os testes de integração criam perfis e reservas conhecidos no projeto de teste. Uma importação apenas do esquema também **não detecta conflitos nos dados atuais da produção**: faça o preflight somente de leitura sobre esses dados antes de planejar a aplicação futura.

## Aplicação em teste

Execute `202610140002_security_hardening.sql` em transação única. Ela falha diante de duplicação de proprietário, sobreposição e dados incompatíveis. Os índices de exclusão aplicam intervalos `[início, fim)`; a trava por barbearia/data protege também a reserva sem barbeiro contra reservas de profissionais nomeados. O horário de referência é `America/Fortaleza`, conforme a regra atual do produto; confirme esta premissa com o negócio antes da produção.

Publique o frontend que consulta `naregua_ocupacao` somente depois da migração. A função devolve apenas intervalos ocupados, sem IDs de reservas ou clientes; consultas diretas à tabela continuam restritas ao cliente da reserva e ao proprietário da barbearia. O upload depende da chave de serviço no servidor e da função de cota criadas nessa mesma migração.

Configure `TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`, `TEST_SUPABASE_SERVICE_ROLE_KEY` e `SECURITY_TEST_ENV=isolated`. A URL de teste deve diferir da URL em `.env.local`. Rode `npm run test:security:integration`; a chave privilegiada serve apenas para criar e limpar fixtures. As afirmações de isolamento usam clientes anon e authenticated independentes. Rode também `npm run test:unit`, lint, TypeScript e build. Guarde as evidências de execução.

## Reversão

Não há reversão automática segura: a migração substitui políticas e grants anteriores. Se a validação falhar, interrompa a promoção e restaure o **backup de esquema/políticas/grants** capturado antes da aplicação no projeto de teste. Em produção, aplique apenas em janela planejada, com backup verificável e procedimento de restauração ensaiado. Não restaure apenas os índices: isso deixaria autorização e uploads em estado misto.

## Pendências que exigem ambiente

- Comparar o inventário SQL com as políticas, grants, triggers, views, RPCs e buckets **efetivamente aplicados**.
- Executar os testes de papéis anon/authenticated, concorrência, Storage e sessão em projeto isolado. Testes bloqueados não equivalem a aprovados.
- Validar limites de requisições sensíveis no gateway Supabase/infraestrutura e o fluxo de upload no aplicativo apontado para o projeto de teste.
- Revisar dados existentes antes de qualquer mudança em produção; a migração não modifica registros conflitantes.
