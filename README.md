# 🏡 Acordus (Locatto) - Sistema de Gestão Imobiliária

Um sistema web completo e moderno de gestão imobiliária, desenvolvido com as melhores ferramentas e práticas de mercado (React, Vite e Supabase). Ele foi projetado para gerenciar imóveis, contratos, clientes, setor financeiro e rotinas diárias de uma imobiliária, como vistorias e visitas, tudo em um único lugar.

---

## ✨ Funcionalidades Principais

### 🏢 Gestão de Imóveis e Integração de Portais
* Cadastro detalhado de propriedades, com fotos, descrições e atributos.
* Configurações de exportação para portais imobiliários.
* Listagens e filtros rápidos para agilizar a pesquisa de imóveis.

### 📝 Contratos, Documentos e Vistorias
* Assistente progressivo intuitivo para a criação de contratos (Wizard).
* Geração e controle de vistorias com fotos e assinaturas.
* Gestão e listagem de documentos atrelados às locações ou vendas.
* Controle eficiente de status, renovações e vigência dos contratos.

### 💰 Financeiro Completo, Conciliação e Faturamentos
* Gestão centralizada de faturas e pagamentos (contas a pagar / contas a receber).
* Baixa ágil de pagamentos diários.
* Importação inteligente de extratos bancários para facilitar a conciliação financeira.
* Dashboard financeiro dedicado com indicadores de lucro, receita e inadimplência em tempo real.

### 📅 Agenda, Visitas e Relatórios
* Agendamento dinâmico de visitas aos imóveis pelos corretores.
* Painel abrangente de relatórios gerenciais e operacionais.
* Sistema customizável de notificações para não perder datas importantes (reajustes, vencimentos, etc).

### 🔐 Gestão de Controle de Acesso e Assinaturas
* Plataforma multi-entidade: Gerenciamento completo da conta da imobiliária e de seus contatos.
* Níveis de acesso bem definidos protegendo as rotas (SuperAdmin, Admin, Users).
* Painel do Super Admin para gerenciar contas de clientes, planos, assinaturas, controle de licenças e histórico de pagamentos da própria plataforma.

---

## 🚀 Tecnologias e Bibliotecas Utilizadas

O frontend se comunica em tempo real com o backend do Supabase, utilizando uma arquitetura escalável e focada na experiência do usuário.

* **Core Frontend:** React 18, Vite, TypeScript.
* **Estilização e Componentes (UI):** Tailwind CSS, Shadcn UI (Radix UI).
* **Navegação (Roteamento):** React Router DOM.
* **Mutação de Dados e Cache:** React Query (`@tanstack/react-query`).
* **Formulários e Autenticação:** React Hook Form resolvido por Zod schemas.
* **Backend-as-a-Service:** Supabase (Banco de dados Postgres, Autenticação, Storage, Edge Functions).
* **Métricas e Dashboards:** Recharts.
* **Recursos Avançados e Utilidades:**
  * **Lucide React** (Pacote de de ícones leve)
  * **Embla Carousel** (Carrosséis de imagens em detalhes de imóveis e áreas úteis)
  * **Date-fns** e **React Day Picker** (Manipulação de fuso horário, calendários e pickers de data)
  * **JSPDF** e **PDF.js** (Manipulação, visualização e exportação de arquivos em PDF)
  * **XLSX** (Exportação e leitura de arquivos do Excel/Planilhas)
  * **Input OTP** (Verificação segura de códigos de validação de autenticação)

---

## 🛠️ Requisitos de Ambiente

Para rodar este projeto na sua máquina, você precisa ter:

* **Node.js** (Versão 18 LTS ou superior).
* **npm** ou **yarn** instalados globalmente.
* Uma conta ativa no **Supabase** caso deseje apontar para um banco próprio ou acesso as chaves do projeto atual de staging/produção.

---

## ⚙️ Instalação e Execução

Caso seja seu primeiro contato configurando a aplicação localmente:

1. **Clone do Repositório:**
```sh
git clone [SUA_URL_DO_GITHUB_OU_LAB]
cd acordus
```

2. **Instalação das Dependências:**
```sh
npm install
```

3. **Configuração de Variáveis de Ambiente:**
Crie ou renomeie um arquivo para `.env` na raiz do projeto contendo as credenciais de acesso ao seu banco de dados no Supabase:

```env
# Banco de dados e Autenticação - Supabase
VITE_SUPABASE_URL=https://[ID-DO-SEU-PROJETO].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_anon_aqui
VITE_SUPABASE_PROJECT_ID=ID-DO-SEU-PROJETO

# Funções e Integrações com Inteligência Artificial
AI_GATEWAY_API_KEY=sua_chave_de_gateway_aqui
AI_GATEWAY_URL=sua_url_da_api_de_ia
```

4. **Iniciando o Servidor de Desenvolvimento:**
```sh
npm run dev
```

A aplicação subirá em seu ambiente local. Por padrão do Vite, acesse em seu navegador:
👉 `http://localhost:5173` ou `http://localhost:8080`. (A porta correta aparecerá no seu terminal).

---

## 📦 Compilação para Produção (Build)

Para testar o modo de produção na sua máquina e garantir que o tamanho final dos bundles está otimizado:

```sh
# Gera uma versão minificada e otimizada dentro da pasta /dist
npm run build

# Inicia um servidor HTTP temporário com os arquivos compilados da pasta /dist
npm run preview
```

---

## 📂 Estrutura de Diretórios Principal

```text
acordus/
├── public/                 # Favicon, imagens e assets estáticos.
├── src/                    # Todo o código fonte da aplicação web (React).
│   ├── components/         # Componentes compartilhados pela aplicação (ex: ui/, forms/, loaders/).
│   ├── contexts/           # Provedores de estado global do React.
│   ├── hooks/              # Regras de negócios e hooks visuais globais (ex: useAuth).
│   ├── pages/              # Telas inteiras da plataforma centralizadas em pastas baseadas nos módulos:
│   │   ├── Admin/          # Gestão do Super Admin e licenças do software.
│   │   ├── Contracts/      # Mestre e detalhes dos contratos de locação.
│   │   ├── Financial/      # Contas e dashboards financeiros.
│   │   ├── Properties/     # Imóveis (Cadastro, listagem, visualização).
│   │   ├── Settings/       # Ajustes gerais de operação de um cliente do sistema.
│   │   └── ... etc
│   └── App.tsx             # Arquivo mestre carregando as rotas da aplicação (React Router).
├── supabase/               # Código e configurações do backend do projeto.
│   ├── functions/          # Edge Functions (microsserviços Deno via Supabase).
│   └── migrations/         # Arquivos de backup e versionamentos contínuos do Banco de Dados SQL.
├── README.md               # Este arquivo.
├── package.json            # Scripts de automação e lista de bibliotecas do projeto.
├── tailwind.config.ts      # Customizações de cores dinâmicas e tokens do TailwindCSS.
└── vite.config.ts          # Definições avançadas do bundler.
```

---

## 🤝 Scripts Úteis / Referência Rápida

| Script | Como rodar | O que ele faz? |
| --- | --- | --- |
| **`dev`** | `npm run dev` | Inicia a aplicação no modo de depuração para codificar de imediato. |
| **`build`** | `npm run build` | Compila arquivos e ativos minimizados para `dist/`. Útil para o CI/CD. |
| **`lint`** | `npm run lint` | Escaneia o código usando os padrões definidos pelo ESLint para manter qualidade. |
| **`preview`**| `npm run preview` | Exibe localmente exatamente o que será executado na nuvem, baseando-se no build recém gerado. |

---

*Para o uso em produção, lembre-se de configurar as Edge Functions de migrações em sua plataforma de hospedagem ou provedores compatíveis (como Vercel, Netlify ou própria cloud).*
