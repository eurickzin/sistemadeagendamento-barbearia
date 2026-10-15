# Preparação do Neon Free

Estas migrações são para **um projeto Neon vazio**. O projeto atual não possui
usuários nem agendamentos reais, mas os scripts não apagam dados. Não execute
em produção sem validar primeiro em um projeto de teste.

1. Crie o projeto Free em AWS US East (Ohio ou N. Virginia), região com Object
   Storage disponível. Ative Managed Better Auth e Data API no console;
   configure a Data API para usar Better Auth. Em **Object storage → New bucket**,
   crie `profile-images` com acesso `public_read`. As credenciais S3 são
   geradas separadamente via Neon CLI/API e ficam apenas no `.env.local`.
2. Execute `preflight.sql` no SQL Editor. Confirme que `anonymous`,
   `authenticated`, `auth.user_id()` e `neon_auth.user` existem e que as seis
   tabelas da aplicação **não** existem.
3. Execute `migrations/202610140001_schema.sql`, depois
   `migrations/202610140002_authorization.sql`. Cada arquivo tem transação;
   uma falha reverte o arquivo inteiro. Não ignore erros.
4. Recarregue o schema da Data API e rode os testes de integração com contas
   criadas nesse projeto de teste. Use duas barbearias e quatro contas.

## Conflitos e reversão

Se o preflight encontrar tabelas, políticas ou dados existentes, interrompa.
Não execute as migrações de criação sobre o banco ocupado. Para reservas já
existentes, procure intervalos sobrepostos com a consulta abaixo, usando a
duração histórica e tratando horário sem barbeiro como capacidade da loja:

```sql
select a.id, b.id as conflito_id
from public.agendamentos a
join public.agendamentos b on a.id < b.id
  and a.barbearia_id = b.barbearia_id
  and a.data = b.data
  and a.status <> 'cancelado' and b.status <> 'cancelado'
  and (a.barbeiro_id is null or b.barbeiro_id is null
       or a.barbeiro_id = b.barbeiro_id)
  and tsrange(a.data + a.horario,
              a.data + a.horario + a.servico_duracao * interval '1 minute', '[)')
      && tsrange(b.data + b.horario,
                 b.data + b.horario + b.servico_duracao * interval '1 minute', '[)');
```

Resolva cada conflito com decisão de negócio documentada. A estratégia para
um projeto de teste descartável é criar **outro projeto vazio** e aplicar os
scripts nele. Para um banco ocupado, restaure o snapshot/backup anterior; não
use um `DROP` genérico como reversão. Antes do corte, mantenha o Supabase
operacional. A troca das variáveis e endpoints só deve ocorrer após testes
conectados de Auth, Data API, RLS, reserva concorrente e upload.

As funções e políticas dos arquivos em `supabase/` são específicas do
Supabase e **não** devem ser executadas no Neon.
