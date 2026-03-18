# Script de Debug para Tela Branca na Vercel

Write-Host "🔍 Locatto - Debug de Deploy" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar variáveis de ambiente
Write-Host "1. Verificando variáveis de ambiente..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✅ Arquivo .env encontrado" -ForegroundColor Green
    
    $envContent = Get-Content ".env" -Raw
    
    if ($envContent -match "VITE_SUPABASE_URL") {
        Write-Host "✅ VITE_SUPABASE_URL está configurado" -ForegroundColor Green
    } else {
        Write-Host "❌ VITE_SUPABASE_URL faltando no .env" -ForegroundColor Red
    }
    
    if ($envContent -match "VITE_SUPABASE_PUBLISHABLE_KEY") {
        Write-Host "✅ VITE_SUPABASE_PUBLISHABLE_KEY está configurado" -ForegroundColor Green
    } else {
        Write-Host "❌ VITE_SUPABASE_PUBLISHABLE_KEY faltando no .env" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Arquivo .env não encontrado" -ForegroundColor Red
}
Write-Host ""

# 2. Testar build local
Write-Host "2. Testando build local..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build local funcionou!" -ForegroundColor Green
} else {
    Write-Host "❌ Build local falhou! Veja os erros acima." -ForegroundColor Red
    exit 1
}
Write-Host ""

# 3. Verificar arquivos gerados
Write-Host "3. Verificando arquivos gerados..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Write-Host "✅ Pasta dist criada" -ForegroundColor Green
    
    if (Test-Path "dist/index.html") {
        Write-Host "✅ dist/index.html existe" -ForegroundColor Green
    } else {
        Write-Host "❌ dist/index.html NÃO encontrado" -ForegroundColor Red
    }
    
    if (Test-Path "dist/assets") {
        $jsCount = (Get-ChildItem -Path "dist/assets" -Filter "*.js" -Recurse).Count
        Write-Host "✅ $jsCount arquivos JavaScript gerados" -ForegroundColor Green
    } else {
        Write-Host "❌ Pasta dist/assets NÃO encontrada" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Pasta dist NÃO criada" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 4. Testar preview local
Write-Host "4. Testando preview local..." -ForegroundColor Yellow
Write-Host "Iniciando servidor de preview..." -ForegroundColor Green
Write-Host "Acesse: http://localhost:4173" -ForegroundColor Green
Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Yellow
Write-Host ""
npm run preview
