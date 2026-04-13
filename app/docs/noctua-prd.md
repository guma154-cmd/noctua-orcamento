# PRD - Noctua Orçamento CFTV

## 1. Visão Geral do Produto
O **Noctua** é um assistente inteligente via Telegram projetado especificamente para instaladores e operadores de sistemas de segurança eletrônica (operador foco: Rafael). O produto automatiza a coleta de dados técnicos para a geração de orçamentos de CFTV e simplifica a gestão de custos através da ingestão automática de tabelas de preços de fornecedores.

### 1.1 Problema
Atualmente, o processo de coleta de dados para orçamentos de CFTV é manual, propenso a esquecimentos de itens críticos (como infravermelho ou armazenamento) e a atualização de preços de fornecedores é um processo lento e burocrático, dependendo da leitura manual de PDFs e planilhas.

### 1.2 Proposta de Valor
- **Agilidade:** Redução do tempo de qualificação de um orçamento de minutos para segundos.
- **Precisão:** Garantia de que todos os parâmetros técnicos necessários foram coletados.
- **Atualização em Tempo Real:** Ingestão imediata de preços de fornecedores via visão computacional.
- **Naturalidade:** Interface conversacional que entende o contexto e evita repetições robóticas.

---

## 2. Objetivos e Métricas de Sucesso
- **Objetivo 1:** Automatizar 100% da coleta de dados básicos (tipo de local, câmeras, ambiente, etc).
- **Objetivo 2:** Reduzir a fricção na atualização de preços de fornecedores.
- **Métricas:**
  - Tempo médio de conversa para gerar um orçamento.
  - Taxa de sucesso na extração de dados de PDFs/Imagens de fornecedores.

---

## 3. Personas
- **Operador Principal:** Rafael (Instalador/Dono do Negócio).
- **Perfil:** Técnico, direto, busca agilidade e precisão nos cálculos de margem.

---

## 4. Requisitos Funcionais

### 4.1 Inteligência Conversacional (Dialogue Engine)
- **RF01 - Question Families:** Agrupamento semântico de perguntas para evitar redundância (ex: se o usuário diz "sem infravermelho", o bot deve inferir `night_use = false`).
- **RF02 - Context Shift Management:** Detecção de mudança de assunto com pedido de confirmação ao usuário para preservar o estado do orçamento anterior.
- **RF03 - Identidade Fixa:** O bot deve reconhecer o operador (Rafael) de forma nativa, personalizando o tom de voz e eliminando etapas de identificação.
- **RF04 - Consolidação Semântica:** Interpretação de respostas implícitas e negativas para preenchimento automático de slots.

### 4.2 Ingestão Multimodal
- **RF05 - Suporte a Voz:** Transcrição automática de áudios via Whisper/Groq para preenchimento de dados de orçamento.
- **RF06 - Ingestão de Fornecedores (OCR/Visão):** Processamento de PDFs e Imagens de orçamentos/tabelas de fornecedores (Intelbras, Hikvision) para extração de itens e preços.
- **RF07 - Atualização de Banco de Dados:** Sugestão de atualização da tabela `fornecedores` no SQLite após leitura de documentos externos.

### 4.3 Orçamento e Regras de Negócio
- **RF08 - Cálculo Automatizado:** Cálculo de custo total (material + instalação) e aplicação de margem de lucro (padrão 30%).
- **RF09 - Relatório Operacional:** Exibição de custos internos e margens para o operador Rafael.
- **RF10 - Proposta Persuasiva:** Geração de mensagem final formatada para envio ao cliente final.

---

## 5. Arquitetura Técnica (Padrão AIOX)

### 5.1 Camadas
- **Transport Layer (`bot.js`):** Driver agnóstico para o Telegram (Telegraf).
- **Orchestration Layer (`DialogueEngine.js`):** Core da lógica que coordena intenção, contexto e execução de workflows.
- **Agent Layer:**
  - `qualificacao.js`: Especialista em Slot Filling e Dialética.
  - `intake.js`: Especialista em processamento multimodal.
  - `orcamento.js`: Especialista em lógica financeira e busca em banco.
  - `memoria.js`: Gestão de estado e persistência (SQLite).

### 5.2 Stack Tecnológica
- **Linguagem:** Node.js
- **Banco de Dados:** SQLite3
- **IA (LLM):** Gemini 2.0 Flash (Primário) e Llama 3.3 via Groq (Fallback).
- **Multimodal:** Gemini Vision API e Groq Whisper.

---

## 6. Roadmap e Futuro (Backlog)
- [ ] Integração com WhatsApp Business.
- [ ] Dashboard Web para visualização de margens e orçamentos salvos.
- [ ] Módulo de estoque (baixa automática após fechamento de orçamento).
- [ ] Comparativo inteligente entre múltiplos fornecedores.

---
**Status do Documento:** V1.0 - Aprovado para Implementação AIOX.
**Data:** 11 de Abril de 2026.
