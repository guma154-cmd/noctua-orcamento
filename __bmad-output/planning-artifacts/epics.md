---
stepsCompleted: [1]
inputDocuments: ['__bmad-output/planning-artifacts/prd-noctua.md', '__bmad-output/planning-artifacts/architecture.md']
---

# noctua-orcamento - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for noctua-orcamento, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Processamento multimodal de texto, áudio, foto, PDF, XLSX via Telegram. (FR-01)
FR2: Confidence Score de OCR/Extração com fallback para revisão manual se < 0.85. (AC-01.1)
FR3: Transcrição de áudio via Whisper/Gemini com sumário técnico em < 5s. (AC-01.2)
FR4: Qualificação técnica via slot-filling (Model, Property, System Type, Qty, DORI, Recording, Storage Days, PoE). (FR-02)
FR5: Validação de tipos estrita e detecção de contradições técnicas em tempo real. (AC-02.1, AC-02.2)
FR6: Motor Técnico (TSR) determinístico para cálculo de cabos, storage e PPM/DORI. (FR-03)
FR7: Motor de Precificação dinâmico para materiais e mão de obra (MDO). (FR-04)
FR8: Ticket mínimo de MDO e markups baseados em valor total. (AC-04.1, AC-04.2)
FR9: Review de orçamento baseado em confiança e valor (Auto-envio se Conf > 0.95 e valor < R$ 5k). (FR-05)
FR10: Gestão de Pipeline CRM com 5 estados (lead, orcamento, negociacao, fechado, perdido). (FR-08)
FR11: Timeline imutável para registro de transições de estado e snapshots. (AC-08.1)
FR12: Follow-up dinâmico em 24h/48h baseado em prioridade. (FR-09)
FR13: Sistema de notificação interativo para Rafael ([Enviar], [Adiar], [Pular]). (AC-09.1)
FR14: Próxima Ação Obrigatória bloqueante para fechamento de lead. (FR-10)

### NonFunctional Requirements

NFR1: Latência do Dashboard < 300ms para até 1.000 registros.
NFR2: Disponibilidade de 99.5% de uptime (health-check).
NFR3: Segurança baseada em ADMIN_TELEGRAM_ID para comandos sensíveis.
NFR4: Integridade de dados via SQLite em modo WAL (Journal Mode = WAL).
NFR5: Runtime Node.js v20+ com TypeScript 5.x (Strict Mode).
NFR6: Uso de Better-sqlite3 para performance síncrona no TSR.

### Additional Requirements

- **Starter Template:** Configuração de projeto Clean Architecture (TS/Node) via pnpm.
- **Migração de Hardening:** Converter arquivos JS existentes para TS e ativar modo WAL no startup.
- **Validação com Zod:** Guardião de contratos de dados para todas as entradas de IA e configurações.
- **Logging com Pino:** Logs estruturados em JSON para rastreamento de erros e performance.

### UX Design Requirements

N/A - (Não foi encontrado documento de UX específico, a interface é baseada em Telegram/Telegraf).

### FR Coverage Map

- FR1 (Intake): Epic 2
- FR2 (Confidence): Epic 2
- FR3 (Whisper): Epic 2
- FR4 (Qualification): Epic 3
- FR5 (Validation): Epic 3
- FR6 (TSR): Epic 3
- FR7 (Pricing): Epic 4
- FR8 (Markup/Ticket): Epic 4
- FR9 (Review/Auto-envio): Epic 4
- FR10-FR14 (CRM): Epic 5

## Epic List

1. [Done] Epic 1: Fundação e Hardening
2. [Done] Epic 2: Intake Multimodal
3. [Done] Epic 3: Qualificação Técnica e Motor TSR
4. [Done] Epic 4: Precificação e Geração de Orçamento
5. [Done] Epic 5: CRM, Pipeline e Follow-up

## Epic 1: Fundação e Hardening (APROVADO)
(Resumo conforme aprovado: TS 5.x, Clean Architecture, SQLite WAL, Validação Zod)

## Epic 2: Intake Multimodal (APROVADO)
(Resumo conforme aprovado: Fila In-memory, Whisper/Gemini Audio, OCR Confidence Fallback)

## Epic 3: Qualificação Técnica e Motor TSR (APROVADO)
(Resumo conforme aprovado: Wizard Scenes, Cálculo de Cabos/Storage com 10% overhead, Testes Unitários)

## Epic 4: Precificação e Geração de Orçamento
(Resumo conforme detalhado anteriormente: Markups dinâmicos, Ticket mínimo MDO, Auto-envio por confiança)

## Epic 5: CRM, Pipeline e Follow-up

Goal: Gerenciar o relacionamento comercial e automatizar o pós-venda para maximizar a conversão.

### Story 5.1: Máquina de Estados do Pipeline e Timeline Imutável
As a User,
I want to track every stage of a lead from intake to closing,
So that I have a clear vision of my sales funnel and history.

**Acceptance Criteria:**

**Given** um lead no sistema
**When** ocorre uma mudança de estado (ex: de `orcamento` para `negociacao`)
**Then** o sistema deve validar se a transição é permitida conforme as regras de negócio
**And** deve registrar um evento na tabela `timeline` contendo o `timestamp`, o novo estado e um `payload_snapshot` (JSON) dos dados atuais do lead
**And** a persistência deve ser feita através do `LeadsRepository` garantindo integridade atômica.

### Story 5.2: Motor de Follow-up Dinâmico e Priorização
As a User,
I want the system to remind me to follow up with leads at the right time,
So that I can close more sales without manual tracking.

**Acceptance Criteria:**

**Given** um orçamento enviado que ainda não foi fechado ou perdido
**When** o tempo desde a última interação atingir o limite (24h para Prioridade Alta, 48h para Normal)
**Then** o sistema deve gerar um gatilho de notificação para o Rafael
**And** a prioridade deve ser extraída da intenção inicial (ex: "assalto", "urgente" -> Alta; "cotação para o mês que vem" -> Normal).

### Story 5.3: Interface de Gestão e Próxima Ação Obrigatória
As a User,
I want to manage my leads and follow-ups através de botões interativos no Telegram,
So that I can agir rapidamente enquanto estou em campo.

**Acceptance Criteria:**

**Given** uma notificação de follow-up ou status do pipeline
**When** o Rafael interage com os botões [Enviar Agora], [Adiar 12h] ou [Pular]
**Then** o sistema deve atualizar o estado do follow-up e registrar a ação na timeline
**And** o sistema deve BLOQUEAR a transição para o estado `fechado` se a ação obrigatória `visita_tecnica` ou `assinatura_contrato` não tiver sido concluída (FR-10).

Goal: Transformar o escopo técnico em valores financeiros precisos e gerar a proposta comercial.

### Story 4.1: Motor de Precificação de Hardware (Materiais)
As a User,
I want the materials to be priced automatically based on cost and markup,
So that I don't have to look up price lists manually for every quote.

**Acceptance Criteria:**

**Given** um escopo técnico validado (TSR)
**When** o sistema calcula o preço de materiais
**Then** deve aplicar `Custo * MARKUP_FACTOR` definido em `config/pricing.js`
**And** se o valor total de materiais for > R$ 10.000, deve sugerir ou aplicar o markup de 1.25 conforme AC-04.1
**And** todos os preços devem ser validados via Zod para garantir que não existam valores negativos ou NaN.

### Story 4.2: Motor de Precificação de Mão de Obra (Serviços)
As a User,
I want the labor cost to be calculated based on camera quantity and complexity,
So that my professional services are priced consistently.

**Acceptance Criteria:**

**Given** o número de câmeras e tipos de instalação
**When** o sistema calcula a Mão de Obra (MDO)
**Then** deve usar a fórmula `(Qtd_Cameras * Custo_Base) + Adicionais (Altura, Alvenaria, etc)`
**And** se o valor de MDO for inferior ao ticket mínimo (R$ 350), o valor final deve ser ajustado para R$ 350 (AC-04.2)
**And** o cálculo deve ser realizado por uma função pura em `src/modules/tsr/calculators/pricing.ts`.

### Story 4.3: Sistema de Review e Geração de Proposta Comercial
As a User,
I want the system to decide if an audit is needed before sending the quote,
So that I can automate simple sales while reviewing complex ones.

**Acceptance Criteria:**

**Given** um orçamento precificado e um Confidence Score da extração
**When** o sistema finaliza o processamento
**Then** se `Confidence > 0.95` e `Valor Total < R$ 5.000`, deve apresentar a opção de [Enviar Agora] (Auto-envio)
**And** caso contrário, deve gerar um Relatório Interno obrigatório para revisão manual do Rafael
**And** a mensagem final no Telegram deve ser formatada de forma profissional, listando Materiais, MDO e condições comerciais.
