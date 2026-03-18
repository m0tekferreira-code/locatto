#!/bin/bash

# Script de Debug para Tela Branca na Vercel

echo "🔍 Locatto - Debug de Deploy"
echo "=============================="
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}1. Verificando variáveis de ambiente...${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ Arquivo .env encontrado${NC}"
    
    if grep -q "VITE_SUPABASE_URL" .env; then
        echo -e "${GREEN}✅ VITE_SUPABASE_URL está configurado${NC}"
    else
        echo -e "${RED}❌ VITE_SUPABASE_URL faltando no .env${NC}"
    fi
    
    if grep -q "VITE_SUPABASE_PUBLISHABLE_KEY" .env; then
        echo -e "${GREEN}✅ VITE_SUPABASE_PUBLISHABLE_KEY está configurado${NC}"
    else
        echo -e "${RED}❌ VITE_SUPABASE_PUBLISHABLE_KEY faltando no .env${NC}"
    fi
else
    echo -e "${RED}❌ Arquivo .env não encontrado${NC}"
fi
echo ""

echo -e "${YELLOW}2. Testando build local...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build local funcionou!${NC}"
else
    echo -e "${RED}❌ Build local falhou! Veja os erros acima.${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}3. Verificando arquivos gerados...${NC}"
if [ -d "dist" ]; then
    echo -e "${GREEN}✅ Pasta dist criada${NC}"
    
    if [ -f "dist/index.html" ]; then
        echo -e "${GREEN}✅ dist/index.html existe${NC}"
    else
        echo -e "${RED}❌ dist/index.html NÃO encontrado${NC}"
    fi
    
    if [ -d "dist/assets" ]; then
        JS_COUNT=$(find dist/assets -name "*.js" | wc -l)
        echo -e "${GREEN}✅ $JS_COUNT arquivos JavaScript gerados${NC}"
    else
        echo -e "${RED}❌ Pasta dist/assets NÃO encontrada${NC}"
    fi
else
    echo -e "${RED}❌ Pasta dist NÃO criada${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}4. Testando preview local...${NC}"
echo -e "${GREEN}Iniciando servidor de preview...${NC}"
echo -e "${GREEN}Acesse: http://localhost:4173${NC}"
echo -e "${YELLOW}Pressione Ctrl+C para parar${NC}"
echo ""
npm run preview
