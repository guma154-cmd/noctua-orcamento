---
task: ocIntakeReceberPedido()
responsável: oc-intake (Guardian)
responsavel_type: Agente
atomic_layer: Organism
---

# Receber Pedido de Orçamento

## Purpose

Capturar a solicitação inicial de um cliente (via Telegram ou entrada manual), extrair o texto bruto e o ID do usuário, e preparar o terreno para a qualificação técnica.

---

## Entrada

| Campo | Tipo | Obrigatório | Origem |
|-------|------|-------------|--------|
| mensagem | string | Sim | User/Telegram |
| user_id | string | Sim | Telegram Context |

## Saída

| Campo | Tipo | Destino | Persistido |
|-------|------|---------|-----------|
| raw_data | object | oc-qualificacao | Sim |
| intake-raw.json | file | squads/orcamento-cftv/data/ | Sim |

---

## Pre-Conditions

- [ ] Mensagem não está vazia.
- [ ] O agente oc-intake está ativo.

---

## Steps

### Step 1: Captura e Limpeza Inicial

Recebe o texto bruto e remove caracteres especiais desnecessários ou formatação de chat que possa atrapalhar a extração de entidades.

### Step 2: Identificação do Cliente

Associa a mensagem ao `user_id` e verifica na `oc-memoria` se é um cliente recorrente para contexto adicional.

### Step 3: Geração do Artefato Bruto

Cria o arquivo `intake-raw.json` com o timestamp, a mensagem limpa e os metadados do cliente.

### Step 4: Handoff para Qualificação

Notifica o agente `oc-qualificacao` que um novo pedido bruto está pronto para análise técnica.

---

## Post-Conditions

- [ ] Arquivo `intake-raw.json` criado com sucesso.
- [ ] Payload enviado para `oc-qualificacao`.

---

## Error Handling

| Error | Action |
|-------|--------|
| Mensagem vazia | Solicitar texto ao usuário |
| Falha na escrita do arquivo | Logar erro e tentar novamente |
