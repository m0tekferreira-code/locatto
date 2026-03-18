# 🔧 Setup Rápido do Projeto Locatto

Este script configura tudo automaticamente para você começar a trabalhar.

Write-Host "🏡 Locatto - Setup Automático" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Função para verificar se comando existe
function Test-Command {
    param($Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# 1. Verificar Node.js
Write-Host "📦 Verificando Node.js..." -ForegroundColor Yellow
if (-not (Test-Command "node")) {
    Write-Host "❌ Node.js não encontrado!" -ForegroundColor Red
    Write-Host "   Instale em: https://nodejs.org/" -ForegroundColor Red
    exit 1
}
$nodeVersion = node --version
Write-Host "✅ Node.js instalado: $nodeVersion" -ForegroundColor Green
Write-Host ""

# 2. Instalar dependências
Write-Host "📚 Instalando dependências..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "⏭️  node_modules já existe, pulando..." -ForegroundColor Gray
} else {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Falha ao instalar dependências!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dependências instaladas!" -ForegroundColor Green
}
Write-Host ""

# 3. Verificar arquivo .env
Write-Host "🔐 Verificando variáveis de ambiente..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Arquivo .env não encontrado!" -ForegroundColor Yellow
    Write-Host "   Criando .env.example para você..." -ForegroundColor Yellow
    
    @"
# Banco de dados e Autenticação - Supabase
VITE_SUPABASE_URL=https://esinwvukarglzeoxioni.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_anon_aqui
VITE_SUPABASE_PROJECT_ID=esinwvukarglzeoxioni

# Funções e Integrações com Inteligência Artificial
AI_GATEWAY_API_KEY=sua_chave_de_gateway_aqui
AI_GATEWAY_URL=sua_url_da_api_de_ia
"@ | Out-File -FilePath ".env.example" -Encoding UTF8
    
    Write-Host "   📝 Copie .env.example para .env e preencha as chaves!" -ForegroundColor Cyan
} else {
    Write-Host "✅ Arquivo .env encontrado!" -ForegroundColor Green
}
Write-Host ""

# 4. Verificar Supabase CLI
Write-Host "🗄️  Verificando Supabase CLI..." -ForegroundColor Yellow
if (-not (Test-Command "supabase")) {
    Write-Host "⚠️  Supabase CLI não instalado" -ForegroundColor Yellow
    Write-Host "   Para migrations automáticas, instale:" -ForegroundColor Yellow
    Write-Host "   npm install -g supabase" -ForegroundColor Cyan
} else {
    $supabaseVersion = supabase --version
    Write-Host "✅ Supabase CLI instalado: $supabaseVersion" -ForegroundColor Green
}
Write-Host ""

# 5. Status do Deploy
Write-Host "🚀 Status do Deploy" -ForegroundColor Yellow
Write-Host "-------------------" -ForegroundColor Yellow
Write-Host "Frontend: https://locatto.vercel.app/ ✅" -ForegroundColor Green
Write-Host "Supabase: https://supabase.com/dashboard/project/esinwvukarglzeoxioni" -ForegroundColor Cyan
Write-Host ""

# 6. Próximos passos
Write-Host "📋 Próximos Passos:" -ForegroundColor Cyan
Write-Host "-------------------" -ForegroundColor Cyan
Write-Host "1. Configure o .env com suas chaves do Supabase" -ForegroundColor White
Write-Host "2. Execute: npm run dev" -ForegroundColor White
Write-Host "3. Configure GitHub Actions: leia SETUP_GITHUB_ACTIONS.md" -ForegroundColor White
Write-Host "4. Aplique o fix de RLS: veja APPLY_THIS_FIX_NOW.sql" -ForegroundColor White
Write-Host ""

Write-Host "✨ Setup concluído! Bom desenvolvimento! 🏡" -ForegroundColor Green
Write-Host ""

# Perguntar se quer iniciar o dev server
$response = Read-Host "Deseja iniciar o servidor de desenvolvimento agora? (s/N)"
if ($response -eq "s" -or $response -eq "S") {
    Write-Host ""
    Write-Host "🚀 Iniciando servidor de desenvolvimento..." -ForegroundColor Cyan
    npm run dev
}
