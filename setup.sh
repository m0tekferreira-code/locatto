#!/bin/bash

# 🔧 Setup Rápido do Projeto Locatto
# Este script configura tudo automaticamente para você começar a trabalhar.

echo "🏡 Locatto - Setup Automático"
echo "================================"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Verificar Node.js
echo -e "${YELLOW}📦 Verificando Node.js...${NC}"
if ! command_exists node; then
    echo -e "${RED}❌ Node.js não encontrado!${NC}"
    echo -e "${RED}   Instale em: https://nodejs.org/${NC}"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js instalado: $NODE_VERSION${NC}"
echo ""

# 2. Instalar dependências
echo -e "${YELLOW}📚 Instalando dependências...${NC}"
if [ -d "node_modules" ]; then
    echo -e "${YELLOW}⏭️  node_modules já existe, pulando...${NC}"
else
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Falha ao instalar dependências!${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Dependências instaladas!${NC}"
fi
echo ""

# 3. Verificar arquivo .env
echo -e "${YELLOW}🔐 Verificando variáveis de ambiente...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado!${NC}"
    echo -e "${YELLOW}   Criando .env.example para você...${NC}"
    
    cat > .env.example << 'EOF'
# Banco de dados e Autenticação - Supabase
VITE_SUPABASE_URL=https://esinwvukarglzeoxioni.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_anon_aqui
VITE_SUPABASE_PROJECT_ID=esinwvukarglzeoxioni

# Funções e Integrações com Inteligência Artificial
AI_GATEWAY_API_KEY=sua_chave_de_gateway_aqui
AI_GATEWAY_URL=sua_url_da_api_de_ia
EOF
    
    echo -e "${CYAN}   📝 Copie .env.example para .env e preencha as chaves!${NC}"
else
    echo -e "${GREEN}✅ Arquivo .env encontrado!${NC}"
fi
echo ""

# 4. Verificar Supabase CLI
echo -e "${YELLOW}🗄️  Verificando Supabase CLI...${NC}"
if ! command_exists supabase; then
    echo -e "${YELLOW}⚠️  Supabase CLI não instalado${NC}"
    echo -e "${YELLOW}   Para migrations automáticas, instale:${NC}"
    echo -e "${CYAN}   npm install -g supabase${NC}"
else
    SUPABASE_VERSION=$(supabase --version)
    echo -e "${GREEN}✅ Supabase CLI instalado: $SUPABASE_VERSION${NC}"
fi
echo ""

# 5. Status do Deploy
echo -e "${YELLOW}🚀 Status do Deploy${NC}"
echo -e "${YELLOW}-------------------${NC}"
echo -e "${GREEN}Frontend: https://locatto.vercel.app/ ✅${NC}"
echo -e "${CYAN}Supabase: https://supabase.com/dashboard/project/esinwvukarglzeoxioni${NC}"
echo ""

# 6. Próximos passos
echo -e "${CYAN}📋 Próximos Passos:${NC}"
echo -e "${CYAN}-------------------${NC}"
echo "1. Configure o .env com suas chaves do Supabase"
echo "2. Execute: npm run dev"
echo "3. Configure GitHub Actions: leia SETUP_GITHUB_ACTIONS.md"
echo "4. Aplique o fix de RLS: veja APPLY_THIS_FIX_NOW.sql"
echo ""

echo -e "${GREEN}✨ Setup concluído! Bom desenvolvimento! 🏡${NC}"
echo ""

# Perguntar se quer iniciar o dev server
read -p "Deseja iniciar o servidor de desenvolvimento agora? (s/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo ""
    echo -e "${CYAN}🚀 Iniciando servidor de desenvolvimento...${NC}"
    npm run dev
fi
