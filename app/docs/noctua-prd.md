# PRD - Noctua: Assistente de Operações CFTV (AIOX Core)

## 1. Visão Geral do Produto
O **Noctua** é um assistente operacional interno projetado exclusivamente para o Rafael (operador/instalador). Sustentado por um Squad no AIOX Core, o bot atua como o motor de inteligência por trás do fluxo de orçamentos de CFTV e da ingestão de cotações de fornecedores. O sistema prioriza a lógica de negócio sobre a inferência pura da LLM, garantindo precisão financeira e persistência de estado.

## 2. Problema
O processo atual de orçamentação e gestão de custos sofre com:
- **Perda de Contexto:** A dependência de memórias implícitas de LLM gera repetição de perguntas e inconsistência nos dados.
- **Atraso Operacional:** A extração manual de dados de PDFs, imagens e áudios de fornecedores é lenta e sujeita a erros de digitação.
- **Opacidade Financeira:** Falta de clareza imediata entre o custo real (operacional) e o preço final (cliente).
- **Risco de Ingestão:** Persistência de dados de fornecedores sem camada de revisão humana, poluindo a base de preços.

## 3. Proposta de Valor
- **Extração Assistida:** Transforma documentos irregulares em dados estruturados com supervisão obrigatória.
- **Persistência de Estado:** Fluxo stateful que mantém o contexto do orçamento ativo através de IDs únicos.
- **Previsibilidade de Margem:** Aplicação automática de regras de negócio (Modelos A/B e Ticket Mínimo).
- **Separação de Saídas:** Relatório operacional estratégico para o Rafael e proposta persuasiva para o cliente.

## 4. Escopo Atual do Produto
- Fluxo de orçamento de cliente estabilizado (Modelos A e B).
- Fluxo de ingestão de fornecedores Fase 2A (Extração e Rascunho).
- Geração de saídas formatadas para Telegram e WhatsApp.
- Persistência em banco de dados SQLite.

## 5. Objetivos e Métricas de Sucesso
- **Objetivo 1:** Garantir 100% de conformidade com as regras de ticket mínimo e margem.
- **Objetivo 2:** Reduzir o tempo de criação de um orçamento completo para menos de 3 minutos.
- **Métricas:** 
  - Taxa de conversão de draft para cotacao salva.
  - Volume de orçamentos gerados por semana.

## 6. Persona Principal
- **Operador:** Rafael (The Shadow).
- **Perfil:** Técnico de campo e gestor de segurança eletrônica. Busca agilidade, não tolera redundância e exige controle total sobre o que "dói no bolso".

## 7. Fluxos Principais do Produto
1. **Orçamento de Cliente:** Qualificação -> Escolha de Modelo (A/B) -> Relatório Operacional -> Proposta Cliente.
2. **Cotação de Fornecedor (2A):** Recebimento (PDF/Img/Voz) -> Extração OCR/LLM (Squad de Visão) -> Revisão de Rascunho -> Salvamento.

## 8. Requisitos Funcionais

### 8.1 Inteligência e Diálogo (AIOX Core)
- **RF01 - Roteamento de Intenção:** O bot deve identificar se o usuário quer iniciar um orçamento ou processar uma cotação antes de iniciar o slot filling.
- **RF02 - Fluxo Stateful:** Manutenção de estado explícito. Se o bot perguntar algo, a resposta deve ser processada no contexto daquela pergunta pendente (Prioridade de Pendência).
- **RF03 - Respostas Equivalentes:** Suporte a inputs textuais e numéricos (ex: "duas câmeras" ou "2").
- **RF04 - Menu de Comando:** Opção de retornar ao menu principal ou cancelar fluxos ativos, limpando o estado temporário.

### 8.2 Orçamento e Regras de Negócio
- **RF05 - Modelo A (Mão de Obra):** Cálculo baseado apenas no serviço, com material fornecido pelo cliente.
- **RF06 - Modelo B (Full):** Cálculo de Mão de Obra + Materiais com fator de markup **x 1,3** (30% de margem real).
- **RF07 - Ticket Mínimo:** Aplicação obrigatória do piso de **R$ 350,00** para mão de obra. Se o cálculo for menor, o bot deve ajustar automaticamente e notificar o Rafael.
- **RF08 - Dualidade de Geração:** Capacidade de gerar o Modelo A e, no mesmo orçamento, solicitar a alteração para o Modelo B.

### 8.3 Ingestão Multimodal (Fase 2A)
- **RF09 - Extração Multimodal:** Processamento de imagens/PDF (Squad de Visão) e áudio (Whisper/Groq) para extração de itens e preços.
- **RF10 - Draft de Cotação:** Criação de um rascunho temporário (`supplier_quote_draft`) exibindo Fornecedor, Itens e Total para revisão do Rafael.
- **RF11 - Confirmação Humana:** A cotação só é persistida na tabela `cotacoes` após aprovação explícita via botões inline.

## 9. Requisitos Não Funcionais
- **RNF01 - Persistência:** Todos os estados e orçamentos devem ser salvos em SQLite.
- **RNF02 - Latência:** Uso obrigatório de indicadores de "digitando" ou "uploading" para manter o feedback durante o processamento de IA.
- **RNF03 - Fallback Robusto:** Matriz de elegibilidade (Gemini -> Groq -> OpenAI -> OpenRouter) para garantir 99% de disponibilidade sob falhas de quota.

## 10. Arquitetura Técnica (Squad Noctua)
A implementação segue a lógica de agentes especializados coordenados pelo núcleo:
- **Transport Layer:** Interface agnóstica para o Telegram.
- **@noctua-intake:** Processamento de arquivos brutos e pré-processamento de imagem (Sharp).
- **@noctua-qualifier:** Especialista em Slot Filling e validação de requisitos técnicos de CFTV.
- **@noctua-orc:** Motor de regras financeiras (Cálculos de Ticket Mínimo, Margens, Modelos A/B).
- **@noctua-buyer:** Especialista em parsing de documentos de fornecedores e consolidação de Squad.
- **@noctua-memory:** Agente de persistência e gestão de estado em SQLite.
- **Template Renderer:** Formatação de Propostas (WhatsApp) e Relatórios (Telegram).

## 11. Modelos de Dados e Estado
- **orçamentos:** ID, Cliente, Dados Técnicos (Câmeras, DVR, HD), Modelo (A/B), Valor MO, Valor Mat, Status.
- **cotacoes:** ID, Fornecedor, Data, Payload de Itens, Valor Total.
- **sessions:** UserID, FlowAtivo, PerguntaPendente, DraftTemporário.

## 12. Regra Central de Operação
> **IA Interpreta -> Regra Decide -> Humano Aprova.**
O sistema nunca deve tomar decisões financeiras finais sem o "OK" explícito de Rafael.

## 13. Roadmap e Backlog

### Ciclo Atual (Estabilização e Ingestão)
- [x] Fluxo de Orçamento Cliente (Modelos A/B).
- [x] Implementação do Ticket Mínimo e Fator 1.3.
- [x] Orquestração de Squad para PDF e Imagem (Reforço OpenAI).
- [x] Correção de Prioridade de Diálogo (Menu > Intent).
- [ ] Refatoração nominal para os Agentes do Squad (@noctua-*).
- [ ] Ingestão de Fornecedor Fase 2A (Rascunho e Revisão completa).

---

## 14. Checkpoint - 14 de Abril de 2026 (Início da Manhã)
**Ponto de Parada:** Estabilização da lógica de negócio e reforço na observabilidade do Intake.

### Concluído no Ciclo:
1.  **[x] Refinamento do Ticket Mínimo:** Implementado piso absoluto de **R$ 350,00** para o valor final de venda (Modelo A).
2.  **[x] Sistema de Feedback (Acknowledge):** Adicionadas mensagens de status no Intake ("Recebi seu PDF...", "Analisando imagem...") para evitar reprocessamento de mensagens pelo Telegram.
3.  **[x] Logging de Ingestão:** Implementado logs detalhados de Mime-Type e flags de encaminhamento (forwarded) para diagnóstico.

### Bloqueadores Restantes:
1.  **Auth OpenAI (401):** A `OPENAI_API_KEY` ainda apresenta erro de autenticação. Os fallbacks estão operando via Groq, SambaNova e OpenRouter.
2.  **Cotas Gemini:** Ainda sob pressão (429), mas o Squad de PDF agora tenta fallbacks mais agressivos.

### Próximos Passos:
1.  **Substituir Chave OpenAI:** Necessário nova chave `sk-proj-...` funcional.
2.  **Fase 2A Final:** Ingestão de material completa com salvamento definitivo.

---
**Status do Documento:** V2.1 - Checkpoint Noturno (Aguardando Correção de Infra).
**Data:** 13 de Abril de 2026, 04:12.


### Próximas Fases (Backlog)
- **Fase 2B:** Atualização assistida da base de preços de referência (Sincronização Master).
- **Fase 3:** Comparativo inteligente entre múltiplos fornecedores para o mesmo orçamento.
- **Fase 4:** Geração de PDF oficial da proposta para envio direto.
- **Fase 5:** Dashboards de margem e lucratividade (Web Interface).

---
**Status do Documento:** V2.0 - Consolidado e Alinhado com Squad AIOX.
**Data:** 13 de Abril de 2026.
