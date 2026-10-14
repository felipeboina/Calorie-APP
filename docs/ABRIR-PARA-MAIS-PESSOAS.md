# Abrir o CalorieGO para mais pessoas

Hoje o app é de uso pessoal (1 usuário, tudo no plano gratuito). Este checklist
lista o que mudar quando for liberar para outras pessoas.

## 1. Estado atual (out/2026)

- Site: https://calorie-app-7ppq.vercel.app (Vercel Hobby)
- Banco/Auth/Storage: Supabase free, projeto `calorias-app`
- IA de fotos: Google Gemini, plano gratuito
- Cadastro de novos usuários: **desligado** (Authentication → Sign In / Providers → User Signups)
- "Confirm email": **desligado** (era limitado por poucos e-mails/hora no envio embutido)

## 2. Para liberar o cadastro

1. Supabase → Authentication → Sign In / Providers → User Signups:
   ligar **Allow new users to sign up** e religar **Confirm email**.
2. Configurar **SMTP próprio** (Authentication → Emails → SMTP Settings). O envio
   embutido do Supabase aceita pouquíssimos e-mails por hora e bloqueia o cadastro
   (erro 429 `over_email_send_rate_limit`). Há provedores com plano gratuito
   (ex: Resend, Brevo); alguns exigem um domínio próprio verificado.
3. Ligar **CAPTCHA** (Authentication → Attack Protection) para evitar cadastros
   automáticos.
4. Se usar domínio próprio: atualizar **Site URL** e **Redirect URLs** no Supabase
   e adicionar o domínio na Vercel.

## 3. Funcionalidades que ainda não existem

- **"Esqueci minha senha"** (não há tela nem fluxo de redefinição).
- **Excluir conta e dados** (necessário para a LGPD).
- **Termos de uso e política de privacidade** (o app guarda peso, idade, fotos de refeições).
- **Limite de uso da IA por usuário**: hoje qualquer usuário logado pode chamar
  `/api/analyze-food` sem limite, e todos dividem a mesma cota do Gemini.
- **Fuso horário por usuário**: está fixo em `America/Sao_Paulo` (`src/lib/datas.ts`).
  Mover para o perfil se houver usuários fora do Brasil.
- Cadastro de alimentos próprios pelo usuário (a tabela `foods` já aceita, falta a tela)
  e uma base de alimentos maior que os ~68 atuais.

## 3.1. Alimentos da comunidade (já implementado)

Quando alguém cadastra um alimento que não existe na busca, ele vai para a tabela
`foods` e passa a aparecer para **todos** (com a etiqueta "comunidade"). Regras atuais:

- Cada pessoa só edita/exclui o que ela mesma cadastrou (RLS no banco).
- Não aceita nome repetido (ignora maiúsculas e espaços) nem valores impossíveis
  (mais de 900 kcal ou 100 g de macros a cada 100 g).
- Excluir um alimento não apaga o histórico de quem já registrou (o diário guarda os valores).
- Alimentos estimados pela IA **não** vão para a base por padrão (a caixa vem desmarcada).

O que falta antes de ter muita gente usando:

- **Moderação**: hoje um valor errado (ou de má-fé) fica visível para todos, e só quem
  criou consegue apagar. Falta um botão "reportar" e um papel de administrador para
  corrigir ou remover itens de qualquer pessoa (por enquanto, só pelo SQL do Supabase).
- **Limite de cadastros por pessoa** (hoje não há limite, dá para lotar a base).
- **Busca sem acento**: buscar "pao" não acha "Pão". Dá para resolver com a extensão `unaccent`.
- O identificador de quem criou cada alimento (`created_by`) fica legível para os outros
  usuários; avaliar se isso é aceitável na política de privacidade.

## 4. Limites e custos a reavaliar

- **Gemini grátis**: cota compartilhada entre todos os usuários, e o Google pode usar
  as fotos enviadas para melhorar seus produtos. Avisar os usuários ou migrar para
  um plano pago/outro provedor. Os nomes de modelos gratuitos mudam com frequência
  (`GEMINI_MODEL` aceita uma lista separada por vírgulas).
- **Supabase free**: 500 MB de banco, 1 GB de storage, 50 mil usuários ativos/mês, e o
  projeto **pausa após cerca de 1 semana sem uso**. Para mais gente, considerar o plano Pro.
  As fotos já são reduzidas no navegador (~400 KB) para economizar storage.
- **Vercel Hobby** é para uso pessoal e não comercial. Se o app for cobrado ou
  monetizado, é preciso migrar para um plano pago.

## 5. Antes de liberar, testar

- Criar 2 contas e confirmar que uma não enxerga os dados da outra (RLS).
- Rodar os avisos de segurança e performance do Supabase (Advisors).
- Rodar `npm audit --omit=dev` e atualizar o Next.js se houver correções.
