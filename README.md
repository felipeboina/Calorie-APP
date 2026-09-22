# CalorieGO

App web (PWA) para controlar calorias consumidas e gastas no dia. Registre
alimentos (com busca em base própria ou foto + IA), acompanhe seu peso,
e veja se bateu a meta do dia — no estilo de um jogo (streak, anéis de
progresso, barras de macro).

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- Supabase (Auth, Postgres, Storage) — projeto `calorias-app`
- Anthropic Claude (análise de fotos de alimentos) — opcional
- Recharts (gráficos de peso e calorias)

## Rodando localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000 (ou a porta configurada).

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — já
  configurados no `.env.local` deste projeto (projeto Supabase
  `calorias-app`).
- `ANTHROPIC_API_KEY` — necessária apenas para o botão "Analisar com IA"
  na tela de registro de alimento. Sem ela, o app funciona normalmente
  (busca manual + cadastro manual continuam disponíveis); a rota
  `/api/analyze-food` retorna erro 503 informando que a IA está
  indisponível. Gere uma chave em https://console.anthropic.com/settings/keys.

## Estrutura

- `src/app` — páginas (login, signup, onboarding, dashboard, diário,
  progresso, perfil) e a rota de API de análise de foto.
- `src/lib` — clientes Supabase, cálculo de TMB/meta calórica (Mifflin-St
  Jeor) e queries reutilizáveis.
- `src/components` — UI (anel de progresso, barras de macro, gráficos,
  navegação inferior).

## Banco de dados

Tabelas: `profiles`, `weight_logs`, `foods` (base de alimentos, ~67 itens
pré-cadastrados), `food_logs`, `exercise_logs`. Todas com RLS: cada
usuário só acessa seus próprios dados; `foods` é de leitura pública.
Fotos ficam em um bucket privado (`food-photos`), com URLs assinadas
geradas sob demanda.
