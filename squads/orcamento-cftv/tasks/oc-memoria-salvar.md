---
task: ocMemoriaSalvar()
responsável: oc-memoria (Library)
responsavel_type: Agente
atomic_layer: Organism
---

# Salvar Orçamento no Histórico

## Purpose

Persistir os dados finais de um orçamento gerado para consultas futuras, análise de vendas e gestão de clientes.

---

## Entrada

| Campo | Tipo | Obrigatório | Origem |
|-------|------|-------------|--------|
| final_data | object | Sim | oc-orcamento |

## Saída

| Campo | Tipo | Destino | Persistido |
|-------|------|---------|-----------|
| history.json | file | squads/orcamento-cftv/data/ | Sim |

---

## Pre-Conditions

- [ ] Dados do orçamento em formato JSON válido.
- [ ] Permissão de escrita no diretório de dados.

---

## Steps

### Step 1: Estruturação dos Dados

Adiciona metadados como `status`, `data_criacao` e `versao` ao JSON recebido.

### Step 2: Persistência em history.json

Anexa os novos dados ao arquivo `history.json` sem sobrescrever registros anteriores.

### Step 3: Atualização da Base de Clientes

Verifica se o cliente já existe em `clients.json` e atualiza seu vínculo com o novo orçamento.

---

## Post-Conditions

- [ ] Dados anexados com sucesso em `history.json`.
- [ ] Integridade do arquivo JSON mantida.

---

## Error Handling

| Error | Action |
|-------|--------|
| Arquivo corrompido | Criar backup e reiniciar arquivo history.json |
| Falha de permissão | Notificar operador e solicitar acesso |
