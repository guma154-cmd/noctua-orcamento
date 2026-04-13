---
task: ocMemoriaBuscar()
responsável: oc-memoria (Library)
responsavel_type: Agente
atomic_layer: Organism
---

# Buscar Histórico de Cliente

## Purpose

Recuperar orçamentos anteriores e informações de um cliente específico para fornecer contexto ao processo atual ou renegociar orçamentos.

---

## Entrada

| Campo | Tipo | Obrigatório | Origem |
|-------|------|-------------|--------|
| client_id | string | Sim | Agent Command |

## Saída

| Campo | Tipo | Destino | Persistido |
|-------|------|---------|-----------|
| client_history | array | oc-intake | Não |

---

## Pre-Conditions

- [ ] `history.json` ou `clients.json` disponível para leitura.

---

## Steps

### Step 1: Busca por ID

Varre a base de dados em busca do `client_id` (Telegram ID ou Nome).

### Step 2: Filtro de Resultados

Coleta os últimos 3 orçamentos para não sobrecarregar o contexto da conversa.

### Step 3: Formatação do Resumo

Gera um resumo legível com data, valor e itens principais de cada orçamento encontrado.

---

## Post-Conditions

- [ ] Resultados (ou mensagem de "não encontrado") enviados ao solicitante.

---

## Error Handling

| Error | Action |
|-------|--------|
| Cliente não encontrado | Retornar array vazio e status 'novo_cliente' |
