---
task: ocOrcamentoGerar()
responsável: oc-orcamento (Builder)
responsavel_type: Agente
atomic_layer: Organism
---

# Gerar Orçamento Final

## Purpose

Calcular os custos de hardware (BOM) e mão de obra, aplicar margens de lucro e gerar o documento final de orçamento para o cliente.

---

## Entrada

| Campo | Tipo | Obrigatório | Origem |
|-------|------|-------------|--------|
| technical_specs | object | Sim | oc-qualificacao |
| prices.json | data | Sim | squads/orcamento-cftv/data/ |

## Saída

| Campo | Tipo | Destino | Persistido |
|-------|------|---------|-----------|
| orcamento-final.pdf | file | squads/orcamento-cftv/output/ | Sim |
| final_data | object | oc-memoria | Sim |

---

## Pre-Conditions

- [ ] Especificações técnicas validadas.
- [ ] Tabela de preços (`prices.json`) atualizada.

---

## Steps

### Step 1: Precificação de Hardware

Associa cada item da `specs-tecnicas.json` aos valores presentes em `prices.json`.

### Step 2: Cálculo de Insumos

Soma conectores, cabos, fontes e baterias ao custo total do hardware.

### Step 3: Aplicação de Margens

Calcula o preço de venda final baseando-se no custo total e nas margens de lucro configuradas.

### Step 4: Geração do Documento

Utiliza o template `quote-template.md` para gerar o PDF/texto final formatado para o cliente.

---

## Post-Conditions

- [ ] Orçamento gerado com todos os itens obrigatórios.
- [ ] PDF disponível para envio.

---

## Error Handling

| Error | Action |
|-------|--------|
| Preço de item faltando | Alerta para atualização manual da tabela de preços |
| Erro na geração do PDF | Tentar gerar versão em texto simples (Markdown) |
