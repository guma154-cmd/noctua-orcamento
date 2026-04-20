# Noctua Orçamento 🦉

> **Agente Inteligente de Orçamentação para Sistemas de Segurança (CFTV)**

Noctua Orçamento é um agente de elite baseado no framework **Synkra AIOX**, projetado para automatizar o ciclo de vida de orçamentos de segurança eletrônica. O sistema utiliza orquestração de squads (Intake, Memória e Qualificação) para processar solicitações multimodais via Telegram, extrair dados técnicos e gerar propostas precisas.

---

## 🚀 Destaques Técnicos

Excellence in AI orchestration meets practical tool integration.

- **Orquestração de Squads**: Divisão de tarefas entre agentes especializados (`Intake`, `Memória`, `Qualificação`).
- **PoE Budgeting & Segurança**: Cálculo automático de consumo (Watts) para dimensionamento de switches PoE e alertas de sobrecarga.
- **DORI Standard Compliance**: Preparado para especificações baseadas em Detecção, Observação, Reconhecimento e Identificação.
- **Input Multimodal & Heurística**: Processamento de texto, fotos, PDF/XLSX e voz com **Parser Robusto para Locale BR** (suporte a decimais com vírgula).
- **AI-Powered Extraction (SORIA V2)**: Orquestração resiliente com **Gemini 1.5/2.0 Pro** (prioritário para PDFs), Groq e OpenAI.
- **Arquitetura Resiliente**: Fila de processamento sequencial anti-stress e persistência de estado em SQLite.

---

## 🛠️ Pilha Tecnológica

- **Runtime**: [Node.js](https://nodejs.org/) (Principal)
- **Bot Engine**: [Telegraf.js](https://telegraf.js.org/)
- **Processamento de Imagem**: [Sharp](https://sharp.pixelplumbing.com/) & [Tesseract.js](https://tesseract.projectnaptha.com/)
- **Banco de Dados**: [SQLite3](https://sqlite.org/) (Local-first architecture)
- **IA/LLMs**: Gemini (Google), Groq (Llama 3), OpenAI (GPT-4o)
- **Documentos**: [XLSX](https://github.com/SheetJS/sheetjs) & [CSV-Parse](https://csv.js.org/parse/)

---

## 📂 Estrutura do Projeto

Baseado na estrutura **AIOX (Codex CLI)**:

```text
.
├── .aiox-core/         # Framework e diretrizes do agente
├── app/                # Aplicação principal (Bot de Telegram)
│   ├── src/
│   │   ├── agents/     # Squads (Intake, Memória, Qualificação, TSR)
│   │   ├── core/       # DialogueEngine e Orquestração de IA
│   │   ├── db/         # Camada de persistência (SQLite)
│   │   └── ui/         # Menus e templates de interação
│   └── test-*.js       # Suíte de testes unitários e de lógica
├── squads/             # Definições de persona e responsabilidades
├── autoresearch/       # Logs de evolução, lições aprendidas e memória
├── docs/               # Documentação técnica e governança
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
   Crie um arquivo `.env` na pasta `app/` baseado no `.env.example`:
   ```env
   TELEGRAM_BOT_TOKEN=seu_token_aqui
   GEMINI_API_KEY=sua_chave_aqui
   GROQ_API_KEY=sua_chave_aqui
   ```

3. **Inicie o Banco de Dados**:
   O sistema inicializa o `sqlite` automaticamente na primeira execução através do `initDb()`.

---

## 🎮 Comandos de Operação

### No Terminal (Diretório `app/`)
- `node src/bot.js`: Inicia o bot (contornando restrições de script npm).
- `node test-cable-logic.js`: Valida lógica de metragem de cabos.
- `node test-poe-budget.js`: Valida lógica de segurança elétrica.

### No Telegram
- `/start`: Inicia o fluxo de qualificação e orçamento.
- `/alertas`: (Admin) Lista orçamentos que aguardam intervenção humana.
- `/followup`: (Teste) Simula rotina de inatividade para follow-up.

---

## 🛡️ Boundary Rules & Governança

- **Isolamento Estrito**: Proibido referenciar contextos externos ao domínio `noctua-orcamento`.
- **Governança Híbrida**: IA atua como auditora/revisora; a lógica de cálculo é **100% determinística**.
- **Escalonamento Humano**: Gatilhos automáticos para revisão manual baseados em confiança de IA (<80%) ou inconsistências técnicas. [Veja os critérios](docs/governance-escalation.md).

---
**Desenvolvido por AIOX Squads - Synkra Codex.**
