# 🔧 Sistema de Correção Automática de RLS

## O que foi criado:

### ✅ Sistema Completo Dentro do Código

Em vez de usar GitHub Actions, criei um **sistema integrado no próprio aplicativo**:

---

## 📦 Componentes Criados

### 1. **Edge Function** (`supabase/functions/apply-rls-fix/`)
Uma função serverless que roda no backend do Supabase e executa o SQL de correção com segurança.

**O que faz:**
- Valida que apenas admins podem executar
- Cria a política RLS de INSERT em profiles
- Atualiza a função `get_user_account_id` com fallback
- Sincroniza profiles órfãos com suas contas

### 2. **Página de Correção** (`/admin/rls-fix`)
Interface visual completa para diagnóstico e correção.

**Recursos:**
- ✅ Verificação automática de saúde do sistema
- ✅ Mostra quais políticas estão faltando
- ✅ Botão "Aplicar Correção" que executa o fix
- ✅ Instruções alternativas caso algo falhe

### 3. **Detecção Automática**
Hook que detecta problemas de RLS automaticamente quando o app carrega.

**Comportamento:**
- Detecta erro 403 nas primeiras requisições
- Se é admin: Mostra toast com botão "Corrigir Agora"
- Se é usuário comum: Apenas log no console

---

## 🚀 Como Usar

### Para Administradores:

1. **Faça login no sistema**: https://locatto.vercel.app/

2. **O sistema vai detectar automaticamente** e mostrar um toast:
   ```
   ⚠️ Problema de configuração detectado
   Políticas RLS precisam ser corrigidas
   [Botão: Corrigir Agora]
   ```

3. **Clique em "Corrigir Agora"** ou acesse manualmente:
   https://locatto.vercel.app/admin/rls-fix

4. **Na página, clique em "🔧 Aplicar Correção de RLS Agora"**

5. **Aguarde ~5 segundos** - A página será recarregada automaticamente

6. **Pronto!** ✅ Os erros 403 vão parar

---

## 🔐 Segurança

- ✅ **Não expõe credenciais**: Service role key fica apenas no servidor
- ✅ **Requer autenticação**: Apenas usuários logados
- ✅ **Requer permissão**: Apenas admins e superadmins
- ✅ **Auditoria**: Logs de quem executou e quando

---

## 📋 Checklist de Deploy

### Passo 1: Deploy da Edge Function

```bash
# Na raiz do projeto
cd supabase/functions/apply-rls-fix

# Deploy para Supabase
supabase functions deploy apply-rls-fix
```

**Alternativa sem CLI:**
1. Acesse: https://supabase.com/dashboard/project/esinwvukarglzeoxioni/functions
2. Clique em "Create a new function"
3. Nome: `apply-rls-fix`
4. Cole o código de `supabase/functions/apply-rls-fix/index.ts`
5. Clique em "Deploy"

### Passo 2: Deploy do Frontend

```bash
# Commitar tudo
git add .
git commit -m "feat: adicionar sistema de correção automática de RLS"
git push origin main
```

→ Vercel vai fazer deploy automaticamente em ~1 minuto

### Passo 3: Testar

1. Acesse: https://locatto.vercel.app/
2. Faça login como admin
3. Navegue para: https://locatto.vercel.app/admin/rls-fix
4. Clique no botão de correção
5. ✅ Pronto!

---

## 🐛 Troubleshooting

### "Erro ao aplicar fix"

**Solução:** Execute o SQL manualmente no Supabase Dashboard:
1. Acesse: https://supabase.com/dashboard/project/esinwvukarglzeoxioni/sql/new
2. Cole o conteúdo de `APPLY_THIS_FIX_NOW.sql`
3. Clique em "RUN"

### "Forbidden: Admin access required"

Sua conta precisa ter role `admin` ou `superadmin` na tabela `profiles`.

### Edge Function não encontrada

Verifique se fez o deploy da função:
```bash
supabase functions list
```

Se não aparecer, faça deploy novamente.

---

## 📚 Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/apply-rls-fix/index.ts` | Edge Function que executa o SQL |
| `src/pages/Admin/RlsFixPage.tsx` | Página de diagnóstico e correção |
| `src/components/Admin/ApplyRlsFixButton.tsx` | Botão de aplicar fix |
| `src/hooks/useRlsAutoDetect.tsx` | Detecção automática de problemas |
| `src/App.tsx` | Rota `/admin/rls-fix` adicionada |
| `src/pages/Index.tsx` | Detecção automática no dashboard |

---

## 💡 Próximos Passos

1. ✅ Fazer commit e push do código
2. ✅ Deploy da Edge Function no Supabase
3. ✅ Acessar `/admin/rls-fix` e clicar no botão
4. ✅ Recarregar a página
5. ✅ Testar cadastro de imóveis

---

**Tempo para implementar**: ~5 minutos  
**Dificuldade**: Muito fácil ⭐  
**Requer GitHub Actions**: ❌ Não!
