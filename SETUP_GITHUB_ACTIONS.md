# 🚀 Configurar Aplicação Automática de Migrations

Este guia configura GitHub Actions para aplicar migrations do Supabase automaticamente quando você fizer push no repositório.

## 📋 Pré-requisitos

1. Repositório GitHub com o código
2. Projeto Supabase em produção
3. 5 minutos para configurar

---

## ⚙️ Passo 1: Obter Credenciais do Supabase

### 1.1 Access Token

1. Acesse: https://supabase.com/dashboard/account/tokens
2. Clique em **"Generate new token"**
3. Dê um nome: `GitHub Actions - Locatto`
4. Copie o token gerado (você verá apenas uma vez!)

### 1.2 Database Password

1. Acesse: https://supabase.com/dashboard/project/esinwvukarglzeoxioni/settings/database
2. Na seção **"Database password"**, copie a senha
3. Se não lembrar, clique em **"Reset database password"** (⚠️ isso pode quebrar conexões existentes)

---

## 🔐 Passo 2: Adicionar Secrets no GitHub

1. Acesse seu repositório no GitHub
2. Vá em **Settings** → **Secrets and variables** → **Actions**
3. Clique em **"New repository secret"**

Adicione estes 2 secrets:

### Secret 1: SUPABASE_ACCESS_TOKEN
- **Name**: `SUPABASE_ACCESS_TOKEN`
- **Secret**: Cole o token que você gerou no passo 1.1
- Clique em **"Add secret"**

### Secret 2: SUPABASE_DB_PASSWORD
- **Name**: `SUPABASE_DB_PASSWORD`
- **Secret**: Cole a senha do banco de dados do passo 1.2
- Clique em **"Add secret"**

---

## ✅ Passo 3: Aplicar o Fix Imediato

Agora que está configurado, vamos aplicar o fix do RLS:

1. Acesse: https://github.com/[SEU_USUARIO]/acordus/actions
2. Clique no workflow **"Apply Emergency RLS Fix"**
3. Clique em **"Run workflow"** → **"Run workflow"**
4. Aguarde ~30 segundos
5. ✅ Se der sucesso, os erros 403 vão parar!

---

## 🔄 Funcionamento Automático

### Migrations Automáticas

A partir de agora, **toda vez** que você:
- Criar um novo arquivo em `supabase/migrations/`
- Fizer `git push` na branch `main`

→ O GitHub Actions vai **automaticamente** aplicar a migration no Supabase! 🎉

### Logs e Monitoramento

Acompanhe em: https://github.com/[SEU_USUARIO]/acordus/actions

Se algo falhar, você verá os logs detalhados lá.

---

## 🎯 Próximos Passos

Após aplicar o fix:

1. ✅ Acesse https://locatto.vercel.app/
2. ✅ O loader deve chegar em 100% (não mais 93%)
3. ✅ Você poderá cadastrar imóveis sem erro 403
4. ✅ O setup de conta nova vai funcionar

---

## 🐛 Troubleshooting

### "Invalid credentials"
- Verifique se os secrets no GitHub estão corretos
- Gere um novo Access Token se necessário

### "Project not found"
- Confirme que o PROJECT_ID está correto: `esinwvukarglzeoxioni`
- Verifique se o Access Token tem permissão no projeto

### "Migration já aplicada"
- Não tem problema! O Supabase pula migrations já executadas automaticamente

---

## 📞 Suporte

Se tiver problemas, verifique os logs em:
https://github.com/[SEU_USUARIO]/acordus/actions

Os erros vão aparecer com detalhes lá.
