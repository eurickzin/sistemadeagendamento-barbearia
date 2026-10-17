# Na Régua+

Aplicação de agendamento e gestão para barbearias, feita com Next.js App Router e React. O backend usa Neon para Postgres e autenticação; imagens de perfil usam Neon Object Storage.

## Estrutura

```text
app/                         Rotas, layouts e composição das páginas
├── _components/landing/      Navegação e animações exclusivas da página inicial
├── api/                     Route Handlers para integrações do servidor
├── auth/                    Callback de autenticação
├── barbearia/ e barbearias/  Páginas públicas e catálogo
├── minha-conta/              Área do cliente
└── painel/                   Área do proprietário

features/                    Interfaces e fluxos próprios de cada domínio
├── auth/                     Login, cadastro e autenticação do proprietário
├── booking/                  Reserva, seleção de barbearia e calendário
├── customer-account/         Conta, agendamentos e preferências do cliente
└── dashboard/                Visão geral, agenda, clientes e configurações

components/                  Apresentação compartilhada entre domínios
└── ui/                       Ícones e tema reutilizados

lib/                          Infraestrutura e utilitários sem interface
├── neon/                      Auth, Data API, SQL server-side e Storage
├── security/                  Validação de arquivos e requisições
└── auth/                      Regras de redirecionamento de autenticação

neon/                         Preflight e migrações SQL versionadas
tests/                        Testes unitários e integração
archive/supabase-legacy/       SQL e teste históricos do backend anterior
```

## Limites entre camadas

- `app/` define URLs, layouts e conecta recursos; componentes de uma única rota ficam em pastas privadas como `_components/`.
- `features/` concentra a interface e o fluxo de um domínio. Uma feature pode usar outra por uma interface pública, mas não importa páginas de `app/`.
- `components/` guarda peças visuais realmente compartilhadas e sem regras de negócio.
- `lib/` contém integrações e funções puras. O código de infraestrutura não depende de componentes ou páginas.
- `neon/` contém mudanças de banco e instruções operacionais; SQL de migração não é executado pelo frontend.

## Desenvolvimento

Configure as variáveis locais com base em `neon/env.example`, instale as dependências e inicie o servidor:

```bash
npm install
npm run dev
```

Verificações disponíveis:

```bash
npm run lint
npx tsc --noEmit
npm run test:unit
npm run build
```

Os arquivos antigos do Supabase estão arquivados em `archive/supabase-legacy/`;
eles não fazem parte do runtime nem validam o backend Neon atual.

Antes de aplicar alterações de banco, leia `neon/README.md` e execute `neon/preflight.sql` no projeto de teste correto.
