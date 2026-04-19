# Noctua Orçamento 🦉

> **Agente Inteligente de Orçamentação para Sistemas de Segurança (CFTV)**

Noctua Orçamento é um agente de elite baseado no framework **Synkra AIOX**, projetado para automatizar o ciclo de vida de orçamentos de segurança eletrônica. O sistema utiliza orquestração de squads (Intake, Memória e Qualificação) para processar solicitações multimodais via Telegram, extrair dados técnicos e gerar propostas precisas.

---

## 🚀 Destaques Técnicos

Excellence in AI orchestration meets practical tool integration.

- **Orquestração de Squads**: Divisão de tarefas entre agentes especializados (`Intake`, `Memória`, `Qualificação`).
- **Input Multimodal**: Processamento de texto, fotos, documentos (PDF/XLSX), voz e desenhos técnicos.
- **AI-Powered Extraction**: Integração nativa com **Gemini 1.5/2.0**, **Groq** e **OpenAI** para visão computacional e OCR (Tesseract.js).
- **Arquitetura Resiliente**: Sistema de fila sequencial anti-stress para garantir a integridade dos dados sob alta carga.
- **Interface Operacional**: Controle via Telegram com menus dinâmicos, botões inline e comandos administrativos.

---

## 🛠️ Pilha Tecnológica

- **Runtime**: [Node.js](https://nodejs.org/) (Principal)
- **Bot Engine**: [Telegraf.js](https://telegraf.js.org/)
- **Processamento de Imagem**: [Sharp](https://sharp.pixelplumbing.com/) & [Tesseract.js](https://tesseract.projectnaptha.com/)
- **Banco de Dados**: [SQLite3](https://sqlite.org/) (Local-first architecture)
- **IA/LLMs**: Google Generative AI, Groq SDK, OpenAI
- **Documentos**: [XLSX](https://github.com/SheetJS/sheetjs) & [CSV-Parse](https://csv.js.org/parse/)

---

## 📂 Estrutura do Projeto

Baseado na estrutura **AIOX (Codex CLI)**:

```text
.
├── .aiox-core/         # Framework e diretrizes do agente
├── app/                # Aplicação principal (Bot de Telegram)
│   ├── src/
│   │   ├── agents/     # Squads (Intake, Memória, Qualificação)
│   │   ├── core/       # DialogueEngine e Orquestração
│   │   ├── db/         # Camada de persistência (SQLite)
│   │   ├── services/   # Provedores de IA e serviços auxiliares
│   │   └── ui/         # Menus e templates de interação
│   └── package.json    # Dependências e scripts do bot
├── squads/             # Configurações de comportamento dos agentes
├── docs/               # Documentação técnica e stories
└── AGENTS.md           # Definições de persona e regras do sistema
```

---

## ⚙️ Configuração e Instalação

### Requisitos
- Node.js 18+
- SQLite3 instalado
- Tokens de API (Telegram, Gemini/Groq)

### Passo a Passo

1. **Clone o repositório e instale as dependências**:
   ```bash
   cd app
   npm install
   ```

2. **Configure as Variáveis de Ambiente**:
   Crie um arquivo `.env` na pasta `app/` baseado nos modelos:
   ```env
   TELEGRAM_BOT_TOKEN=seu_token_aqui
   GEMINI_API_KEY=sua_chave_aqui
   GROQ_API_KEY=sua_chave_aqui
   # Opcionais: OPENAI_API_KEY, ANTHROPIC_API_KEY
   ```

3. **Inicie o Banco de Dados**:
   O sistema inicializa o `sqlite` automaticamente na primeira execução.

---

## 🎮 Comandos de Operação

### No Terminal (Diretório `app/`)
- `npm start`: Inicia o bot em modo produção.
- `npm run dev`: Inicia o bot com hot-reload (watch mode).
- `npm run lint`: Valida o padrão de código.
- `npm test`: Executa a suíte de testes unitários e de integração.

### No Telegram
- `/start`: Inicia o fluxo de qualificação e orçamento.
- `/alertas`: (Admin) Lista orçamentos que aguardam intervenção humana.
- `/followup`: (Teste) Simula rotina de inatividade para follow-up de clientes.

---

## 🛡️ Boundary Rules & Isolamento

> [!IMPORTANT]
> Este projeto opera sob regime de **isolamento estrito**. É terminantemente proibido referenciar ou carregar contextos do projeto `noctua-room`. O agente `noctua-orcamento` foca exclusivamente em intake e processamento de dados técnicos de segurança.

---

## 📄 Qualidade e Governança

- **Quality Gates**: Todos os PRs devem passar por linting e testes automatizados.
- **Traceability**: Interações registradas em logs rotativos (`bot.log`) e banco SQLite para auditoria.

---
**Desenvolvido por AIOX Squads - Synkra Codex.**
