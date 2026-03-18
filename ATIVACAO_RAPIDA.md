# ⚡ ATIVAÇÃO RÁPIDA - 5 Minutos

**Seu frontend já está no ar**: https://locatto.vercel.app/ ✅

**Para ativar as migrations automáticas**, siga estes 3 passos:

---

## 📝 Passo 1: Obter Credenciais (2 min)

### Token do Supabase
1. Acesse: https://supabase.com/dashboard/account/tokens
2. Clique em **"Generate new token"**
3. Nome: `GitHub Actions - Locatto`
4. Copie o token (você só verá uma vez!)

### Senha do Banco
1. Acesse: https://supabase.com/dashboard/project/esinwvukarglzeoxioni/settings/database
2. Copie a senha do banco (seção **"Database password"**)
3. Se não lembra, clique em **"Reset database password"**

---

## 🔐 Passo 2: Adicionar no GitHub (2 min)

1. Acesse: https://github.com/[SEU_USER]/acordus/settings/secrets/actions
2. Clique em **"New repository secret"**

Adicione estes 2 secrets:

| Name | Value |
|------|-------|
| `SUPABASE_ACCESS_TOKEN` | Cole o token do passo 1 |
| `SUPABASE_DB_PASSWORD` | Cole a senha do banco do passo 1 |

---

## 🚀 Passo 3: Aplicar Fix de RLS (1 min)

1. Acesse: https://github.com/[SEU_USER]/acordus/actions
2. Clique no workflow **"Apply Emergency RLS Fix"**
3. Clique em **"Run workflow"** → **"Run workflow"**
4. Aguarde ~30 segundos
5. ✅ Pronto! Recarregue o app: https://locatto.vercel.app/

---

## 🎉 Está Pronto!

A partir de agora:

✅ **Todo push em `main`** → Deploy automático na Vercel  
✅ **Todo push em `supabase/migrations/`** → Migration aplicada automaticamente  
✅ **Erros 403 resolvidos** → Você pode cadastrar imóveis normalmente  
✅ **Loader funciona** → Chega até 100%

---

## 📚 Quer Saber Mais?

- [DEPLOY_AUTOMATICO.md](./DEPLOY_AUTOMATICO.md) - Guia completo
- [SETUP_GITHUB_ACTIONS.md](./SETUP_GITHUB_ACTIONS.md) - Detalhes técnicos
- [README.md](./README.md) - Documentação do projeto

---

## 🐛 Problemas?

Verifique os logs:
- GitHub Actions: https://github.com/[SEU_USER]/acordus/actions
- Vercel: https://vercel.com/dashboard
- Supabase: https://supabase.com/dashboard/project/esinwvukarglzeoxioni

---

**Tempo Total**: ~5 minutos | **Dificuldade**: Fácil ⭐
