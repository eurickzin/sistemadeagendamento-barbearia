# Na Régua+

Sistema de agendamento e gestão para barbearias, feito com Next.js App Router, React e Supabase.

## Organização do projeto

```text
app/                         Rotas, layouts e estilos globais do Next.js
├── auth/callback/            Retorno da autenticação
├── barbearia/[slug]/         Página pública de uma barbearia
├── barbearias/               Catálogo de barbearias
├── minha-conta/              Área do cliente
└── painel/                   Autenticação e gestão da barbearia

components/                   Componentes reutilizados entre rotas
├── auth/                     Cadastro e login
├── booking/                  Agendamento e seleção de barbearia
├── calendar/                 Calendário
└── ui/                       Ícones, animações e tema

lib/                          Integrações e funções compartilhadas
└── supabase/                 Clientes Supabase para servidor e navegador

supabase/                     Scripts SQL para configuração do banco
archive/legacy/               Cópias antigas mantidas fora das rotas e do código ativo
public/                       Imagens e arquivos estáticos
```

As páginas e layouts ficam em `app/`, seguindo os nomes especiais do App Router. Componentes usados por uma única rota ficam junto dela em uma pasta privada `_components/`; componentes compartilhados ficam em `components/`. O grupo `(dashboard)` organiza as telas do painel sem alterar os endereços das rotas.

## Desenvolvimento

Instale as dependências e inicie o servidor:

```bash
npm install
npm run dev
```

Os comandos `npm run build` e `npm run lint` executam o build e o ESLint, respectivamente.
