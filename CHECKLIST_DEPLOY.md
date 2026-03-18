# 🚨 Checklist de Deploy - Vercel

Use este checklist para garantir que tudo está configurado corretamente antes de fazer deploy.

---

## ✅ Localmente (antes do push)

- [ ] `npm install` executado sem erros
- [ ] `npm run build` funciona sem erros
- [ ] `npm run preview` mostra o app funcionando
- [ ] Arquivo `.env` existe com as variáveis necessárias
- [ ] Console do browser não mostra erros (F12 → Console)

---

## ✅ No Repositório GitHub

- [ ] Arquivo `vercel.json` está commitado
- [ ] Arquivo `.env.example` está commitado (⚠️ NUNCA commite .env)
- [ ] Pasta `dist` NÃO está no repositório (está no .gitignore)
- [ ] Código foi feito push para a branch `main`

---

## ✅ Na Vercel Dashboard

### 1. Variáveis de Ambiente Configuradas

Acesse: https://vercel.com/[SEU_USER]/locatto/settings/environment-variables

Adicione:

| Nome | Valor | Todos os Ambientes |
|------|-------|-------------------|
| `VITE_SUPABASE_URL` | `https://esinwvukarglzeoxioni.supabase.co` | ✅ |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | [Cole sua chave anon aqui] | ✅ |
| `VITE_SUPABASE_PROJECT_ID` | `esinwvukarglzeoxioni` | ✅ |

**Como obter a chave anon:**
https://supabase.com/dashboard/project/esinwvukarglzeoxioni/settings/api
→ Copie o valor de "anon public"

### 2. Build Settings

- [ ] **Framework Preset**: Vite
- [ ] **Build Command**: `npm run build` (ou deixe automático)
- [ ] **Output Directory**: `dist` (ou deixe automático)
- [ ] **Install Command**: `npm install` (ou deixe automático)

### 3. Deploy Funcionou

Acesse: https://vercel.com/[SEU_USER]/locatto/deployments

Verifique:
- [ ] Status: ✅ **Ready**
- [ ] Build Logs: Sem erros vermelhos
- [ ] Preview funciona quando clica no link

---

## ✅ No Browser

Acesse: https://locatto.vercel.app/

### O que deve aparecer:

✅ **Login ou Dashboard** - Está funcionando!

### O que NÃO deve aparecer:

❌ Tela branca
❌ Erro 404
❌ "Configuration Required" em roxo
❌ Erros no Console (F12)

---

## 🔍 Ainda com Problema?

Execute os scripts de debug:

### Windows:
```powershell
.\debug-vercel.ps1
```

### Linux/Mac:
```bash
chmod +x debug-vercel.sh
./debug-vercel.sh
```

---

## 📞 Troubleshooting Rápido

### Problema: Tela Branca
**Causa**: Variáveis de ambiente faltando
**Solução**: Adicione VITE_* na Vercel e faça novo deploy

### Problema: Mensagem roxa "Configuration Required"
**Causa**: Variáveis de ambiente detectadas como faltando
**Solução**: Configure na Vercel e redeploy

### Problema: Erro 404 em subrotas
**Causa**: vercel.json faltando ou incorreto
**Solução**: Já está correto no projeto, basta commitar

### Problema: Console mostra erros do Supabase
**Causa**: Chave ANON incorreta
**Solução**: Verifique se copiou a chave certa

---

## 🎉 Tudo Funcionando?

Próximo passo:
1. Faça login no app
2. Se aparecer erro 403, acesse: https://locatto.vercel.app/admin/rls-fix
3. Clique em "Aplicar Correção de RLS"
4. Pronto! Seu sistema está no ar! 🚀
