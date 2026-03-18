import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Verificar variáveis de ambiente essenciais
const REQUIRED_ENV_VARS = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
};

const missingVars = Object.entries(REQUIRED_ENV_VARS)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error(
    '❌ ERRO: Variáveis de ambiente faltando:',
    missingVars.join(', ')
  );
  console.error(
    '\n📝 Solução:\n' +
    '1. Se está rodando localmente: Crie um arquivo .env na raiz do projeto\n' +
    '2. Se está na Vercel: Adicione as variáveis em Settings → Environment Variables\n' +
    '3. Use .env.example como referência'
  );
  
  // Mostrar mensagem visual na tela
  document.getElementById('root')!.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
      text-align: center;
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    ">
      <h1 style="font-size: 3rem; margin-bottom: 1rem;">⚠️</h1>
      <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">
        Configuração Incompleta
      </h2>
      <p style="max-width: 600px; margin-bottom: 2rem; opacity: 0.9;">
        Variáveis de ambiente faltando: <strong>${missingVars.join(', ')}</strong>
      </p>
      <div style="
        background: rgba(255,255,255,0.1);
        padding: 1.5rem;
        border-radius: 0.5rem;
        max-width: 600px;
        text-align: left;
      ">
        <h3 style="margin-top: 0;">Como resolver:</h3>
        <ol style="margin: 1rem 0; padding-left: 1.5rem;">
          <li style="margin-bottom: 0.5rem;">
            Acesse: <a href="https://vercel.com/dashboard" style="color: #ffd700;">Vercel Dashboard</a>
          </li>
          <li style="margin-bottom: 0.5rem;">
            Vá em <strong>Settings → Environment Variables</strong>
          </li>
          <li style="margin-bottom: 0.5rem;">
            Adicione as variáveis VITE_SUPABASE_* conforme .env.example
          </li>
          <li>
            Faça um novo deploy
          </li>
        </ol>
        <p style="margin-bottom: 0; font-size: 0.9rem; opacity: 0.8;">
          📖 Veja mais detalhes em: <strong>RESOLVER_TELA_BRANCA.md</strong>
        </p>
      </div>
    </div>
  `;
} else {
  // Tudo OK, renderizar normalmente
  createRoot(document.getElementById("root")!).render(<App />);
}

