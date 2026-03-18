# GitHub Actions Workflows

Este diretório contém workflows automatizados para o projeto Locatto.

## 📁 Workflows Disponíveis

### 1. `supabase-migrations.yml`
**Execução**: Automática quando há push em `supabase/migrations/`

Aplica automaticamente todas as migrations pendentes no banco Supabase quando você faz commit de novos arquivos de migration.

### 2. `apply-emergency-fix.yml`
**Execução**: Manual (via interface do GitHub)

Executa o script `APPLY_THIS_FIX_NOW.sql` para corrigir o problema de RLS que causa erros 403/401.

Para executar:
1. Acesse: https://github.com/[SEU_USUARIO]/acordus/actions
2. Clique em "Apply Emergency RLS Fix"
3. Clique em "Run workflow"

---

## ⚙️ Configuração Necessária

Antes de usar, configure os secrets no GitHub:

1. **SUPABASE_ACCESS_TOKEN** - Token de acesso do Supabase
2. **SUPABASE_DB_PASSWORD** - Senha do banco de dados

Veja instruções completas em: [SETUP_GITHUB_ACTIONS.md](../../SETUP_GITHUB_ACTIONS.md)

---

## 🔒 Segurança

- As credenciais são armazenadas como **secrets** criptografados no GitHub
- Nunca faça commit de tokens ou senhas no código
- Os secrets são acessíveis apenas pelos workflows autorizados

---

## 📊 Monitoramento

Acompanhe execuções em:
https://github.com/[SEU_USUARIO]/acordus/actions

Cada execução mostra:
- ✅ Status (sucesso/falha)
- 📋 Logs detalhados
- ⏱️ Tempo de execução
- 📝 Migrations aplicadas
