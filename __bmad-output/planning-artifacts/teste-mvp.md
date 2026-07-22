# 🦉 Plano de Testes Manual - MVP NOCTUA

Este documento descreve os passos necessários para validar as 5 épicas implementadas no NOCTUA Orçamento + CRM.

---

## 🛠 1. Setup do Ambiente de Teste

Para rodar os testes localmente, siga estas etapas:

### 1.1 Variáveis de Ambiente (.env)
Certifique-se de que o arquivo `app/.env` contém as chaves necessárias:
```env
TELEGRAM_BOT_TOKEN=seu_token_aqui
GOOGLE_API_KEY=sua_chave_gemini
GROQ_API_KEY=sua_chave_groq
ADMIN_TELEGRAM_ID=seu_id_telegram
```

### 1.2 Inicialização do Banco
O banco é inicializado automaticamente ao rodar o bot, mas para garantir um estado limpo:
1. Delete o arquivo `app/data/database.sqlite` (se existir).
2. O bot criará as tabelas e migrações (Stories 4.3, 5.1, 5.3) no primeiro boot.

### 1.3 Iniciar o Bot
Abra o terminal na pasta `app/` e execute:
```bash
npm install
node src/bot.js
```
*Nota: O bot deve responder "Bot AIOX Architecture Active" no console.*

---

## 📋 2. Checklist de Validação (Cobertura de Épicas)

- [ ] **Épica 1 (Intake):** Extração de intenção via texto, áudio e imagem.
- [ ] **Épica 2 (Qualificação):** Fluxo dinâmico de perguntas e suporte multimodal.
- [ ] **Épica 3 (TSR):** Cálculo automático de HD, cabos e seleção de hardware DORI.
- [ ] **Épica 4 (Precificação):** Modelos A, B, C com markup de 30% e ticket mínimo.
- [ ] **Épica 5 (CRM):** Timeline imutável, priorização, dashboard e bloqueios de venda.

---

## 🚀 3. Cenários de Teste Passo a Passo

### Cenário 1: Cliente Residencial (Fluxo Padrão)
**Objetivo:** Validar motor TSR e precificação automática.
1. Envie no Telegram: `"Gostaria de um orçamento para 4 câmeras na minha casa."`
2. Responda às perguntas de qualificação:
   - Tecnologia: IP
   - Armazenamento: 15 dias
   - Ambiente: Parede normal
3. **Validar Visualmente:** 
   - O bot deve sugerir HD e câmeras adequadas.
   - O Rafael deve receber o **Relatório Operacional** com custo interno.
   - O cliente deve receber a proposta formatada após aprovação.

### Cenário 2: Cliente Comercial (Importação TSR)
**Objetivo:** Validar extração de PDF/Imagem e auditoria técnica.
1. Envie uma foto ou PDF de uma lista de materiais antiga.
2. O bot deve perguntar se deseja importar os itens.
3. Clique em `[Sim, importar]`.
4. **Validar Visualmente:**
   - O bot deve preencher automaticamente a quantidade de câmeras.
   - Deve alertar se houver incompatibilidade (ex: DVR analógico com câmera IP).

### Cenário 3: Automação de Follow-up
**Objetivo:** Validar algoritmo de prioridade.
1. Crie um orçamento (Cenário 1) mas não aprove o envio.
2. Execute o comando `/followup`.
3. **Validar Visualmente:**
   - O lead deve aparecer no dashboard com **Prioridade Média**.
   - O bot deve sugerir a mensagem de follow-up #1.

### Cenário 4: Bloqueio de Fechamento (Compliance)
**Objetivo:** Validar integridade da regra de negócio da Story 5.3.
1. Identifique o ID de um lead ativo via `/dashboard`.
2. Tente forçar o fechamento: `/status {id} fechado sim`.
3. **Validar Visualmente:**
   - O bot **DEVE BLOQUEAR** e informar que falta a "visita técnica" ou "contrato".
4. Execute `/proxima {id}`, escolha `Visita Técnica`, digite uma descrição.
5. Marque a ação como concluída (via banco ou comando futuro) e tente o `/status` novamente.

### Cenário 5: Dashboard e Gestão
**Objetivo:** Validar visibilidade do Rafael.
1. Execute `/dashboard`.
2. **Validar Visualmente:**
   - O pipeline deve listar valores totais por status.
   - Leads sem próxima ação devem aparecer na seção de **Atenção**.
   - O tempo de resposta deve ser quase instantâneo (< 2s).

---

## ⌨️ 4. Comandos de Referência

| Comando | Descrição |
| :--- | :--- |
| `/start` | Inicia ou reinicia o atendimento |
| `/dashboard` | Visão geral do pipeline (Admin) |
| `/status {id} {estado}` | Altera status (lead, orcamento, negociacao, fechado, perdido) |
| `/proxima {id}` | Define a próxima tarefa obrigatória |
| `/historico {id}` | Exibe a timeline imutável do cliente |
| `/nota {id} {texto}` | Adiciona observação interna |

---
**Guia de Testes gerado por NOCTUA AIOX - 2026**
