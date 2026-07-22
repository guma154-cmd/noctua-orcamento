# Proposta de Mudança de Sprint - 03/05/2026

## 1. Resumo dos Problemas

Esta proposta aborda dois bugs críticos identificados durante a execução do sprint, que afetam a funcionalidade principal de ingestão de dados.

**BUG 1: Modelo de Visão Groq Descontinuado**
- **Problema:** A API de visão da Groq parou de funcionar porque o modelo `llama-3.2-11b-vision-preview` foi descontinuado, causando uma falha no fluxo de processamento de imagens sempre que o Groq é selecionado como provedor.
- **Impacto:** Reduz a robustez do "Squad de Visão", eliminando um dos provedores de fallback e quebrando a arquitetura de resiliência.

**BUG 2: Roteamento Incorreto do Fluxo de Fornecedor**
- **Problema:** Dados extraídos de cotações de fornecedores (imagens) estão sendo incorretamente enviados para o agente de qualificação de clientes (`IA-Qualificacao`), em vez de serem tratados por uma lógica de ingestão de fornecedores dedicada.
- **Impacto:** Violação do princípio de separação de responsabilidades da arquitetura, resultando em corrupção de dados (respostas de qualificação de cliente para dados de fornecedor) e falha total em persistir os produtos na base de dados `base_fornecedores_noctua`.

---

## 2. Análise de Impacto

### Impacto nos Épicos
- **Epic 2: Intake Multimodal:** Este épico é diretamente impactado.
  - Para o BUG 1, um detalhe de implementação (o modelo Groq) precisa ser atualizado.
  - Para o BUG 2, um novo critério de aceitação é necessário para formalizar a separação obrigatória entre os fluxos de cliente e fornecedor, garantindo a integridade do fluxo.

### Conflito e Ajuste de Artefatos
Os seguintes artefatos serão modificados:

- **`prd-noctua.md`:** Adição de um novo critério de aceitação em `FR-01` para garantir a separação dos fluxos de ingestão.
- **`architecture.md`:** Atualização da seção de "Tecnologias" para refletir o novo modelo Groq e adição de diagramas para o novo fluxo `handleSupplierIngestion`.
- **`app/src/services/ai/matrix.js`:** Substituição do modelo Groq descontinuado.
- **`app/src/core/DialogueEngine.js`:** Implementação da lógica de roteamento baseada em `session.active_flow` e da trava de segurança para impedir a chamada do `IA-Qualificacao` no fluxo de fornecedor.
- **`app/src/agents/fornecedor.js`:** Criação da nova função `handleSupplierIngestion` para orquestrar a normalização e persistência de dados de fornecedores.
- **`app/src/services/FornecedorRepository.js`:** Novo arquivo para abstrair o acesso à tabela `base_fornecedores_noctua`.
- **`app/src/bot.js`:** Adição de novos handlers para os botões de confirmação do fluxo de fornecedor.
- **`app/src/ui/telegram-menu.js`:** Adição de um novo menu de confirmação (`menuConfirmacaoFornecedor`).
- **Testes:** Criação de novos arquivos de teste para validar as correções de ambos os bugs, incluindo testes de fallback e de isolamento de fluxo.

---

## 3. Caminho Recomendado

- **Abordagem Escolhida:** **Ajuste Direto**
- **Justificativa:** Os bugs são bem localizados e podem ser corrigidos com alterações direcionadas no código existente e adição de novos componentes (repositório, testes). Esta abordagem é a mais eficiente, de menor risco e não interrompe o andamento do sprint, mantendo o escopo do MVP intacto. As alternativas (Rollback, Revisão do MVP) são desnecessárias e contraproducentes.

---

## 4. Propostas de Mudança Detalhadas

### Proposta de Mudança - BUG 1 (Modelo Groq)

- **Arquivo:** `app/src/services/ai/matrix.js`
  - **Mudança:** Substituir `llama-3.2-11b-vision-preview` por `meta-llama/llama-4-scout-17b-16e-instruct`.
  - **Lógica Adicional:** Em `app/src/services/ai/orchestrator.js`, implementar um `try-catch` para detectar erros de "model decommissioned" e acionar o fallback para o próximo provedor (Gemini) automaticamente.
- **Testes:**
  - Adicionar teste unitário que simula o erro "model_decommissioned" e valida que o fallback para Gemini ocorre com sucesso.

### Proposta de Mudança - BUG 2 (Roteamento de Fornecedor)

- **Trava de Segurança:** Em `app/src/core/DialogueEngine.js`, adicionar uma validação no início da lógica de qualificação de cliente para lançar um erro se `session.active_flow === 'supplier_quote'`.
- **Roteamento:** No mesmo arquivo, após a extração dos dados pelo `intake`, verificar `session.active_flow` e direcionar para `handleSupplierIngestion` se for `'supplier_quote'`.
- **Nova Função:** Em `app/src/agents/fornecedor.js`, criar `handleSupplierIngestion` que:
  1.  Normaliza os itens para o `noctua_schema_base_fornecedores_v1`.
  2.  Verifica se o nome do fornecedor foi extraído; se não, pergunta ao usuário.
  3.  Apresenta um resumo e o menu de confirmação `[Cadastrar Tudo] [Revisar] [Cancelar]`.
- **Novo Repositório:** Criar `app/src/services/FornecedorRepository.js` com um método `bulkInsert` para persistir os itens na base de dados.
- **Testes:**
  1.  Validar que a `IA-Qualificacao` **nunca** é chamada quando `session.active_flow` for `'supplier_quote'`.
  2.  Validar que o `FornecedorRepository.bulkInsert` é chamado com os dados corretos após a confirmação do usuário.

---

## 5. Plano de Handoff

- **Responsável pela Implementação:** Agente Desenvolvedor (Developer Agent).
- **Critérios de Sucesso:**
  1.  O fluxo de ingestão de imagem volta a funcionar, utilizando o novo modelo Groq ou fazendo fallback para o Gemini sem erros.
  2.  O fluxo de cotação de fornecedor segue o caminho correto, salva os produtos na base de dados e não interfere com o fluxo de qualificação de clientes.
  3.  Todos os testes existentes e os novos testes unitários passam com sucesso.
