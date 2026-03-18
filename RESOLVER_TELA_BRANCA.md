# 🔍 Resolver Tela Branca na Vercel

## Problema Detectado
Seu app foi feito deploy na Vercel mas aparece tela branca.

---

## ✅ Solução Rápida (3 passos)

### 1. Verificar Variáveis de Ambiente na Vercel

Acesse: https://vercel.com/[SEU_USER]/locatto/settings/environment-variables

**Adicione estas variáveis:**

| Nome | Valor | Ambiente |
|------|-------|----------|
| `VITE_SUPABASE_URL` | `https://esinwvukarglzeoxioni.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Sua chave anon do Supabase | Production, Preview, Development |
| `VITE_SUPABASE_PROJECT_ID` | `esinwvukarglzeoxioni` | Production, Preview, Development |

**Como obter a chave anon:**
1. Acesse: https://supabase.com/dashboard/project/esinwvukarglzeoxioni/settings/api
2. Copie o valor de **"anon public"**

### 2. Adicionar arquivo vercel.json

✅ **JÁ CRIADO!** O arquivo `vercel.json` foi criado automaticamente.

### 3. Fazer novo deploy

```bash
git add vercel.json
git commit -m "fix: adicionar configuração da Vercel para SPA"
git push origin main
```

→ Aguarde ~1 minuto para o deploy completar

---

## 🔍 Verificar Logs de Build

1. Acesse: https://vercel.com/dashboard
2. Clique no seu projeto **locatto**
3. Clique no último deployment
4. Clique na aba **"Build Logs"**

**Procure por:**
- ❌ Erros de compilação (vermelho)
- ⚠️ Warnings sobre imports faltando
- ✅ "Build completed" (verde)

---

## 💻 Testar Localmente Antes

Simule o ambiente de produção:

```bash
npm run build
npm run preview
```

Se funcionar localmente mas não na Vercel:
→ O problema são as **variáveis de ambiente** faltando

---

## 🐛 Debug Avançado

### Ver Console do Browser

1. Abra https://locatto.vercel.app/
2. Pressione **F12** (DevTools)
3. Vá na aba **Console**

**Erros comuns:**

| Erro | Causa | Solução |
|------|-------|---------|
| `Uncaught SyntaxError: Unexpected token '<'` | Roteamento quebrado | Já resolvido no vercel.json |
| `Cannot read properties of undefined` | Variáveis de ambiente faltando | Adicione as VITE_* na Vercel |
| `Failed to fetch` | CORS ou Supabase URL errada | Verifique VITE_SUPABASE_URL |
| Tela branca, sem erros | JavaScript não carregou | Verifique Build Logs |

### Ver Network Tab

1. DevTools → **Network**
2. Recarregue a página (F5)
3. Procure por arquivos `.js` com status **404**

Se houver 404:
→ Problema no `outputDirectory` do vercel.json (já corrigido)

---

## 📋 Checklist Completo

- [ ] Variáveis de ambiente adicionadas na Vercel
- [ ] Arquivo `vercel.json` commitado
- [ ] Build local funciona (`npm run build && npm run preview`)
- [ ] Novo deploy feito após adicionar vercel.json
- [ ] Console do browser não mostra erros
- [ ] Network tab não mostra 404

---

## 🚀 Após Resolver

Quando a tela aparecer:

1. Faça login
2. Se aparecer erro 403, vá para: https://locatto.vercel.app/admin/rls-fix
3. Clique em **"Aplicar Correção de RLS"**
4. Recarregue a página
5. Pronto! ✅

---

## 💡 Por Que Aconteceu?

**React Router precisa de configuração especial:**

Em aplicações SPA (Single Page Application), todas as rotas devem apontar para `index.html`. O arquivo `vercel.json` que acabei de criar faz isso:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Sem isso, quando você acessa `https://locatto.vercel.app/imoveis`, a Vercel procura o arquivo `/imoveis.html` (que não existe), resultando em 404 ou tela branca.

---

## 📞 Ainda com Problema?

Execute localmente e me mostre:

```bash
# Limpar cache
rm -rf node_modules dist .vite
npm install
npm run build
npm run preview
```

Se funcionar localmente, **o problema é 100% variáveis de ambiente** na Vercel.
