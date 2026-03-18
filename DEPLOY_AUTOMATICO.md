# 🚀 Deploy Automático - Locatto

Sistema completo de deploy automático para Vercel (frontend) + Supabase (backend).

---

## 📦 Arquitetura de Deploy

```
┌─────────────────┐         ┌──────────────────┐
│  GitHub Repo    │         │  Vercel          │
│  (push main)    │────────▶│  Frontend React  │
│                 │         │  locatto.app     │
└─────────────────┘         └──────────────────┘
        │
        │ (push migrations/)
        ▼
┌─────────────────┐         ┌──────────────────┐
│ GitHub Actions  │────────▶│  Supabase        │
│ (auto migrations)│        │  PostgreSQL + RLS │
└─────────────────┘         └──────────────────┘
```

---

## ⚙️ Configuração Inicial (uma vez)

### 1. Deploy Vercel (já configurado ✅)

Seu frontend já está no ar em: **https://locatto.vercel.app/**

### 2. Configurar GitHub Actions para Supabase

Siga o guia: **[SETUP_GITHUB_ACTIONS.md](./SETUP_GITHUB_ACTIONS.md)**

**Resumo rápido:**
1. Obter Access Token do Supabase
2. Adicionar secrets no GitHub (`SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD`)
3. Executar workflow "Apply Emergency RLS Fix" manualmente
4. Pronto! 🎉

---

## 🔄 Fluxo de Trabalho

### Deploy de Frontend (automático)

```bash
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
```

→ Vercel detecta o push e faz deploy automaticamente em ~1 minuto

### Deploy de Migrations (automático)

```bash
# 1. Criar nova migration
# Arquivo: supabase/migrations/20260318_minha_feature.sql

# 2. Commitar e fazer push
git add supabase/migrations/
git commit -m "feat: adicionar tabela X"
git push origin main
```

→ GitHub Actions detecta mudança em `supabase/migrations/` e aplica automaticamente!

---

## 🛠️ Comandos Úteis

### Criar Nova Migration Local

```bash
# Via Supabase CLI (se configurado)
supabase migration new nome_da_migration

# Ou criar manualmente
# Arquivo: supabase/migrations/YYYYMMDDHHMMSS_descricao.sql
```

### Testar Migrations Localmente (opcional)

```bash
# Instalar Supabase CLI: https://supabase.com/docs/guides/cli
npm install -g supabase

# Rodar migrations localmente
supabase db reset
```

### Aplicar Fix Imediato

Se houver um problema urgente em produção:

1. Acesse: https://github.com/[SEU_USER]/acordus/actions
2. Clique em **"Apply Emergency RLS Fix"**
3. Clique em **"Run workflow"**

---

## 📊 Monitoramento

### Vercel Deployments
- URL: https://vercel.com/[SEU_USER]/locatto/deployments
- Logs em tempo real
- Rollback com 1 clique

### GitHub Actions
- URL: https://github.com/[SEU_USER]/acordus/actions
- Ver logs de migrations
- Reexecutar workflows com falha

### Supabase Dashboard
- URL: https://supabase.com/dashboard/project/esinwvukarglzeoxioni
- Monitorar queries
- Ver logs de Edge Functions

---

## 🐛 Troubleshooting

### "Loader travado em 93%"
→ Aplique o fix via GitHub Actions ou Supabase Dashboard

### "Erro 403 ao cadastrar imóvel"
→ Execute o workflow "Apply Emergency RLS Fix"

### "Migration falhou no GitHub Actions"
→ Veja os logs em: https://github.com/[SEU_USER]/acordus/actions
→ Corrija o SQL e faça push novamente

### "Vercel deploy falhou"
→ Verifique os logs na dashboard da Vercel
→ Geralmente é erro de build ou variáveis de ambiente

---

## 🔐 Segurança

### Secrets Necessários

**GitHub Secrets** (para Actions):
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

**Vercel Environment Variables**:
- `VITE_SUPABASE_URL` (público, OK commitar)
- `VITE_SUPABASE_ANON_KEY` (público, OK commitar)

### ⚠️ NUNCA commitar:
- Senhas ou tokens no código
- Arquivos `.env` (já está no .gitignore)
- Service role keys do Supabase

---

## 📚 Documentos Relacionados

- [SETUP_GITHUB_ACTIONS.md](./SETUP_GITHUB_ACTIONS.md) - Configurar deploy automático de migrations
- [APPLY_THIS_FIX_NOW.sql](./APPLY_THIS_FIX_NOW.sql) - Fix emergencial de RLS
- [.github/workflows/README.md](./.github/workflows/README.md) - Detalhes dos workflows

---

## 🎯 Checklist de Deploy

- [x] Frontend publicado na Vercel
- [ ] GitHub Actions configurado (veja SETUP_GITHUB_ACTIONS.md)
- [ ] Fix de RLS aplicado (execute workflow manualmente)
- [ ] Teste: cadastrar imóvel sem erro 403
- [ ] Teste: loader chega em 100%
- [ ] Teste: setup de conta nova funciona

---

## 💡 Dicas

1. **Sempre teste localmente** antes de fazer push em produção
2. **Migrations são irreversíveis** - revise bem antes de aplicar
3. **Use branches** para features grandes (`git checkout -b feature/nome`)
4. **Monitore os logs** após deploy para detectar problemas cedo

---

## 📞 Suporte

- GitHub Actions: https://docs.github.com/actions
- Vercel: https://vercel.com/docs
- Supabase: https://supabase.com/docs

Se tiver problemas, verifique os logs nas respectivas plataformas!
