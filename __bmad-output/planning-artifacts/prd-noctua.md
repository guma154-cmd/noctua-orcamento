PRD — NOCTUA Orçamento + CRM Pipeline

Versão: 2.1 (Refatorada) | Data: 2026-04-28 | Status: Em Revisão (Pós-Validação)

---
1. Visão Geral do Produto

1.1 O que é o NOCTUA

NOCTUA Orçamento é um agente inteligente de automação de orçamentos para empresas instaladoras de sistemas de segurança eletrônica (CFTV). Ele recebe solicitações de clientes via Telegram, qualifica tecnicamente os requisitos, calcula orçamentos com precisão determinística e gerencia o relacionamento comercial até o fechamento.

**Estratégia Híbrida:** LLM para extração de intenção e roteamento; lógica determinística (JavaScript) para cálculos técnicos e financeiros; intervenção humana (Rafael) apenas em casos de baixa confiança ou alta complexidade.

1.2 Mandato

▎ "Transformar uma solicitação informal de orçamento de CFTV em uma proposta técnica precisa em menos de 5 minutos, garantindo 100% de acurácia matemática e automatizando o follow-up comercial."

1.3 Problemas Resolvidos e Metas SMART

- **Velocidade:** Reduzir tempo de geração de orçamento de 4h para < 5 min.
- **Precisão:** Eliminar 100% dos erros de compatibilidade técnica (ex: DVR vs Câmeras).
- **Conversão:** Aumentar conversão em 20% através de follow-ups automatizados em até 48h.
- **Visibilidade:** 100% dos leads ativos rastreados no pipeline com próxima ação definida.

---
2. Contexto e Estado Atual

2.1 Stack Técnica e Diretrizes de Engenharia

- **Runtime:** Node.js v20+ (Modo assíncrono para OCR/LLM).
- **Banco de Dados:** SQLite3 com **WAL Mode** ativado para suportar concorrência.
- **Lógica Técnica:** **TSR (Technical Scope Resolver)** deve ser implementado em funções puras, nunca via prompt de LLM.
- **Interface:** Telegraf.js v4.16.3 com tratamento de filas para mensagens pesadas.

2.2 Agentes Existentes (Reajustados)

- **oc-intake:** Triagem multimodal com fallback de OCR.
- **oc-qualificacao:** Slot-filling técnico com validação de tipos.
- **oc-orcamento:** Builder determinístico de proposta.
- **oc-crm:** Gestor de estados e follow-ups.

---
3. Personas e Jobs-to-be-Done (JTBD)

**Rafael (Instalador):** "Quando recebo uma solicitação no Telegram, quero um orçamento preciso agora, para que eu não perca o timing da venda enquanto estou em campo."

**Cliente Final:** "Quero saber quanto custa e o que será instalado de forma clara e profissional, para que eu possa tomar uma decisão de segurança."

---
4. Módulos e Funcionalidades (Refatorados)

Módulo CORE — Orçamento CFTV

FR-01: Recepção Multimodal e Fallback de OCR
- **Ação:** Processar texto, áudio, foto, PDF, XLSX.
- **AC-01.1:** Confidence Score de OCR/Extração < 0.85 → gatilho automático para Rafael: "Não consegui ler com clareza. Pode confirmar os itens ou enviar outra foto?"
- **AC-01.2:** Transcrição de áudio via Whisper/Gemini com sumário técnico em < 5s.

FR-02: Qualificação Técnica Determinística
- **Slots:** Model, Property, System Type, Qty, DORI, Recording, Storage Days, PoE.
- **AC-02.1:** Validação de tipos estrita. Se `camera_quantity` não for inteiro, re-perguntar de forma amigável.
- **AC-02.2:** Detecção de contradições (ex: System_Type=IP e DVR Analógico selecionado) gera alerta imediato de correção.

FR-03: Motor Técnico (TSR) — Lógica de Código
- **Cálculo de Cabos:** `distancia * factor + (qtd * 4m)`.
- **Cálculo de Storage:** Baseado em tabelas estáticas de bitrate (H.265/H.264). Overhead de 10% obrigatório.
- **PPM (Pixels Per Meter):** Validação DORI baseada na resolução da câmera selecionada em catálogo.

FR-04: Motor de Precificação (Materiais vs Serviços)
- **Configuração:** Centralizada em `config/pricing.js`.
- **Materiais:** `Custo * MARKUP_FACTOR`.
- **MDO (Mão de Obra):** `(Qtd_Cameras * Custo_Base) + Adicionais (Altura, Alvenaria, etc)`.
- **AC-04.1:** Se o valor total for > R$ 10k, o sistema sugere markup de 1.25 (dinâmico).
- **AC-04.2:** Ticket mínimo de R$ 350 aplicado apenas no Módulo B (MDO pura).

FR-05: Review Baseado em Confiança
- **AC-05.1:** Se Confidence > 0.95 e valor < R$ 5k, opção de "Auto-envio" habilitável pelo Rafael.
- **AC-05.2:** Relatório Interno obrigatório apenas para Confidence < 0.95 ou novos clientes.

Módulo CRM — Pipeline e Automação

FR-08: Pipeline com Transições de Estado
- **Estados:** `lead`, `orcamento`, `negociacao`, `fechado`, `perdido`.
- **AC-08.1:** Mudança de estado registrada com `timestamp` e `payload_snapshot` na timeline.

FR-09: Follow-up Dinâmico
- **Regra:** Trigger inicial em 48h. Se Prioridade=Alta (Residência assaltada/Condomínio), trigger em 24h.
- **AC-09.1:** Notificação para Rafael com botões: [Enviar Agora] [Adiar 12h] [Pular Tentativa].

FR-10: Próxima Ação Obrigatória (Bloqueante)
- **AC-10.1:** Não é permitido mover para `fechado` sem concluir a ação `visita_tecnica` ou `assinatura_contrato`.

---
5. Requisitos Não Funcionais (NFRs) Mensuráveis

- **Desempenho (Latency):** Dashboard `/dashboard` deve renderizar em < 300ms para até 1.000 registros ativos.
- **Disponibilidade:** 99.5% de uptime (monitorado por health-check no bot).
- **Segurança:** Apenas `ADMIN_TELEGRAM_ID` pode acessar comandos de dashboard e precificação.
- **Integridade:** SQLite em modo **WAL** para evitar `SQLITE_BUSY` durante processamento de OCR paralelo.

---
6. Contratos de Dados (Schemas JSON)

**Input Specs:**
```json
{
  "type": "object",
  "properties": {
    "camera_qty": {"type": "integer", "minimum": 1},
    "system_type": {"enum": ["IP", "Analog", "Hybrid"]},
    "storage_days": {"type": "integer", "default": 30}
  },
  "required": ["camera_qty", "system_type"]
}
```

---
7. Schema de Banco de Dados (Melhorado)

- **Status:** Usar strings restritas (Enum-like) no nível da aplicação.
- **Timeline:** Tabela imutável (Append-only).

---
10. Débitos Técnicos Prioritários

1. **DT-01:** Mover lógicas de cálculo de `technical_scope_resolver.js` para módulos unitários testáveis (`dori.js`, `storage.js`).
2. **DT-02:** Implementar `Rate Limiter` no Telegram para evitar banimento por spam em áudios/fotos.

---
Refatoração concluída com base nos inputs de Mary, John, Winston e Amelia.
Aprovado para Desenvolvimento.
