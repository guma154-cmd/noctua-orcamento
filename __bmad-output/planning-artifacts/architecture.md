---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: ['__bmad-output/planning-artifacts/prd-noctua.md', '__bmad-output/planning-artifacts/prd-noctua-validation-report.md', 'docs/governance-escalation.md']
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-04-30'
project_name: 'noctua-orcamento'
user_name: 'Rafael'
date: '2026-04-30'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Análise de Contexto do Projeto

### Visão Geral dos Requisitos

**Requisitos Funcionais:**
O sistema deve processar entradas multimodais (texto, áudio, foto, PDF) via Telegram, realizar a qualificação técnica através de slot-filling e executar o Technical Scope Resolver (TSR) para cálculos de cabos, armazenamento e PoE. Além disso, gerencia um pipeline de vendas com 5 etapas e automação de follow-up.

**Requisitos Não Funcionais:**
- **Performance:** Latência do dashboard < 300ms para 1.000 registros.
- **Integridade:** Uso de SQLite WAL para concorrência de escrita.
- **Resiliência:** Fallback manual para extrações de baixa confiança (< 0.85).
- **Disponibilidade:** Alvo de 99.5% de uptime.

**Escala & Complexidade:**
- Domínio Principal: Automação de Backend e Interface de Bot.
- Nível de Complexidade: Médio-Alto (pela criticidade da precisão dos cálculos e multimodalidade).
- Componentes Arquiteturais Estimados: ~8 (Intake, Ingestion, Qualification, TSR, Pricing, CRM, Dashboard, DB).

### Restrições Técnicas e Dependências
- **Runtime:** Node.js v20+.
- **Database:** SQLite3 (Local-first).
- **Interface:** Telegram (Telegraf.js).
- **IA:** Google Gemini / Whisper (Transcrição).

### Preocupações Transversais Identificadas
- Sincronização de estados entre a conversa do bot e o pipeline do CRM.
- Segurança na exposição de custos internos e dados de precificação.
- Separação clara entre extração via LLM e cálculo via código puro.

## Avaliação de Starter Template

### Domínio de Tecnologia Primário
**API / Backend / Bot de Mensageria** (Node.js + Telegraf).

### Starter Selecionado: Custom Clean Architecture (TS/Node)

**Racional da Seleção:**
A necessidade de 100% de acurácia matemática e integração multimodal exige uma arquitetura onde a lógica de negócio (TSR) seja isolada de efeitos colaterais (IA/IO). Um scaffold personalizado garante que o SQLite seja configurado corretamente com WAL Mode desde o dia 1.

**Comando de Inicialização (Primeira Story):**
```bash
# O agente de implementação deve scaffoldar o projeto usando pnpm:
pnpm init
pnpm add telegraf better-sqlite3 dotenv pino zod sharp tesseract.js
pnpm add -D typescript ts-node @types/node @types/better-sqlite3 jest
```

**Decisões Arquiteturais Providas pelo Starter:**

**Linguagem & Runtime:**
- TypeScript 5.x / Node.js 20+.
- Strict Mode ativado para evitar `null/undefined` bugs em cálculos.

**Persistência:**
- `better-sqlite3` para performance de thread única síncrona (evita complexidade de `async` em transações simples de DB).
- Configuração de `Journal Mode = WAL` via código na inicialização.

**Organização de Código (Patterns):**
- **Repository Pattern:** Para a tabela de `timeline_eventos`.
- **Strategy Pattern:** Para os motores de cálculo (Modelo A/B/C).
- **Middleware Pattern:** Para validação de `ADMIN_TELEGRAM_ID`.

**Experiência de Desenvolvimento:**
- Testes unitários com **Jest** para validar o motor TSR.
- Variáveis de ambiente validadas com **Zod v4** no `startup`.

## Decisões Arquiteturais Centrais

### Análise de Prioridade de Decisão

**Decisões Críticas (Bloqueiam Implementação):**
- Uso de **TypeScript 5.x** com **Zod v4** para validação de runtime.
- Estrutura de bot baseada em **Telegraf v4.16** usando **Wizard Scenes** para fluxos de estado.

**Decisões Importantes (Moldam a Arquitetura):**
- Processamento assíncrono para OCR e Áudio usando uma **Fila In-memory** simples com eventos Node.js.
- Persistência com **better-sqlite3 v12** (WAL Mode) para evitar travas em concorrência.

**Decisões Diferidas (Pós-MVP):**
- Migração para PostgreSQL (apenas se o volume de dados exceder os limites do SQLite).
- Interface Web para o Dashboard (mantido exclusivamente no Telegram para o MVP).

### Arquitetura de Dados

- **Validação:** **Zod v4** será o guardião de todos os contratos de dados. Cada entrada da IA será parseada e validada contra um Schema Zod antes de chegar ao motor de cálculo.
- **Racional:** Garante que "alucinações" da IA sejam barradas na entrada, mantendo o motor técnico (TSR) determinístico.
- **Versão:** ^4.0.0

### Gerenciamento de Conversa e Estado

- **Pattern:** **Telegraf Wizard Scenes**.
- **Racional:** Ideal para o processo de "Slot-filling" (coleta de dados do orçamento) de forma linear e fácil de debugar.
- **Persistência de Sessão:** Armazenada no SQLite para que o progresso do orçamento não seja perdido se o bot reiniciar.

### Integração Multimodal e Resiliência

- **Estratégia:** **Fila In-memory + Event Emitter**.
- **Racional:** O bot responde imediatamente ("Processando áudio...") e emite um evento. O worker processa e usa `ctx.telegram.sendMessage` para enviar o resultado. Isso evita o timeout do Telegram em arquivos grandes.
- **Fallback:** Se o Confidence Score do OCR for < 0.85, o sistema obrigatoriamente desvia o fluxo para revisão manual do Rafael.

### Segurança e Infraestrutura

- **Auth:** Middleware de verificação de `ctx.from.id` contra a variável `ADMIN_TELEGRAM_ID`.
- **Logging:** **Pino v10** para logs estruturados em JSON, facilitando o rastreamento de erros de cálculo ou falhas de integração com a API do Gemini.

## Estrutura de Pastas e Fronteiras

### Estrutura Completa do Diretório do Projeto

```text
noctua-orcamento/
├── .env                # Variáveis sensíveis (TOKEN, DB_PATH, ADMIN_ID)
├── .env.example        # Template de variáveis para novos ambientes
├── .gitignore          # Ignora node_modules, .env e banco sqlite
├── package.json        # Dependências e scripts (pnpm)
├── tsconfig.json       # Configurações do TypeScript (Strict Mode)
├── README.md           # Instruções de setup e arquitetura
├── data/               # Diretório para o banco de dados SQLite local
├── docs/               # Documentação técnica e manuais de processo
├── src/
│   ├── main.ts         # Ponto de entrada (Inicialização do bot e DB)
│   ├── config/         # Validação de envs com Zod e constantes globais
│   │   └── index.ts
│   ├── bot/            # Core da interface Telegram (Telegraf)
│   │   ├── index.ts    # Setup do bot e registro de middlewares
│   │   ├── commands/   # Comandos globais (/start, /ajuda, /cancelar)
│   │   ├── scenes/     # Lógica de conversação (Wizard Scenes)
│   │   │   ├── intake/        # Recebimento multimodal (áudio/foto/pdf)
│   │   │   ├── qualification/ # Slot-filling do orçamento
│   │   │   └── dashboard/     # Visualização de métricas via bot
│   │   └── middlewares/       # Auth (ADMIN_ID), Logging de mensagens
│   ├── modules/        # Domínio e Lógica de Negócio (Desacoplados)
│   │   ├── tsr/        # Technical Scope Resolver (Cálculos puros)
│   │   │   ├── domain/        # Regras de negócio e interfaces
│   │   │   ├── calculators/   # Motores de cálculo (Cabo, PoE, HD)
│   │   │   └── index.ts
│   │   ├── ingestion/  # Processamento de arquivos/IA
│   │   │   ├── providers/     # Gemini, Whisper, Tesseract
│   │   │   ├── queue.ts       # Fila in-memory para resiliência
│   │   │   └── worker.ts      # Worker assíncrono para processamento
│   │   └── crm/        # Gestão de leads e pipeline de vendas
│   │       ├── pipeline.ts    # Máquina de estados das 5 etapas
│   │       └── follow-up.ts   # Automação de lembretes
│   ├── infrastructure/ # Implementações de I/O e Terceiros
│   │   ├── database/   # Setup better-sqlite3 e Migrations
│   │   │   ├── schema.sql
│   │   │   └── connection.ts
│   │   └── repositories/ # Persistência de dados (Timeline, Leads)
│   ├── shared/         # Utilitários, Erros Customizados e Types
│   │   ├── types/
│   │   ├── utils/
│   │   └── errors.ts
│   └── tests/          # Suite de testes (Jest)
│       ├── unit/       # Testes do motor TSR (Matemática)
│       ├── integration/# Fluxos de persistência SQLite
│       └── mocks/      # Mocks de APIs de IA (Gemini/Telegram)
```

### Fronteiras Arquiteturais

**Fronteira da Interface (Bot):**
O `src/bot/` é o único que "fala" Telegram. Ele traduz mensagens do usuário em chamadas para os `modules/`. Nenhuma regra de cálculo de cabos ou PoE deve existir dentro das Scenes do Telegraf.

**Fronteira de Cálculo (TSR):**
O módulo `src/modules/tsr/` é agnóstico. Ele recebe dados validados (Zod) e retorna números. Pode ser testado 100% via unit tests sem precisar de bot ou banco de dados.

**Fronteira de Persistência:**
O banco de dados SQLite é acessado exclusivamente via `infrastructure/repositories/`. O restante da aplicação não sabe que o banco é SQLite (facilitando uma futura migração para Postgres).

### Mapeamento de Requisitos para a Estrutura

**Feature: Orçamento Multimodal (IA)**
- Components: `src/modules/ingestion/`
- Queue/Worker: `src/modules/ingestion/queue.ts`, `worker.ts`
- Tests: `src/tests/unit/ingestion/`

**Feature: TSR (Cálculos Técnicos)**
- Calculators: `src/modules/tsr/calculators/`
- Domain: `src/modules/tsr/domain/`
- Tests: `src/tests/unit/tsr/`

**Feature: CRM & Pipeline**
- Pipeline Logic: `src/modules/crm/pipeline.ts`
- Repository: `src/infrastructure/repositories/LeadsRepository.ts`

## Resultados da Validação da Arquitetura

### Validação de Coerência ✅
Todas as escolhas tecnológicas (TS 5.x, Node 20, SQLite3) são compatíveis. O uso de Zod como guardião de contratos entre a IA (não-determinística) e o TSR (determinístico) resolve o maior risco de integridade do sistema.

### Cobertura de Requisitos ✅
- **Multimodalidade:** Suportada via worker assíncrono e fila in-memory.
- **Cálculos Técnicos (TSR):** Isolados em módulos puros para 100% de cobertura de testes.
- **Pipeline CRM:** Mapeado para um repositório de Timeline no SQLite.

### Prontidão para Implementação ✅
A arquitetura fornece definições claras de pastas, versões de bibliotecas e padrões de comunicação. Agentes de IA podem seguir o `README.md` e a estrutura de `src/` para iniciar o scaffold sem ambiguidades.

### Gap Analysis & Plano de Hardening ⚠️
Durante a revisão em "Party Mode", identificou-se um **Architectural Drift**: o código atual está em JavaScript puro, enquanto o plano exige TypeScript. O usuário confirmou a decisão de **Migrar para TypeScript**.

**Ações Corretivas Obrigatórias:**
1. **Migração para TS:** Converter `app/src/*.js` para `src/*.ts` usando `pnpm add -D typescript`.
2. **Ativação do modo WAL:** Garantir que `infrastructure/database/connection.ts` execute `PRAGMA journal_mode = WAL;`.
3. **Upgrade de Driver:** Substituir `sqlite3` por `better-sqlite3` para performance síncrona no TSR.

### Avaliação de Prontidão
**Status Geral:** PRONTO PARA IMPLEMENTAÇÃO (Com Plano de Migração)
**Nível de Confiança:** Alto

**Principais Pontos Fortes:**
- Isolamento total da lógica matemática (TSR).
- Resiliência na ingestão de áudio/foto via fila de eventos.
- Persistência leve e performática com SQLite WAL.

### Handoff para Implementação

**Diretrizes para Agentes:**
1. Execute o scaffold inicial usando `pnpm`.
2. Implemente primeiro o `src/modules/tsr/` e seus testes unitários em TypeScript.
3. Configure o banco de dados com `Journal Mode = WAL`.
4. Desenvolva as Scenes do bot consumindo as interfaces dos módulos.

**Primeira Story de Implementação:**
`pnpm init && pnpm add telegraf better-sqlite3 dotenv pino zod sharp tesseract.js && pnpm add -D typescript ts-node @types/node @types/better-sqlite3 jest`
