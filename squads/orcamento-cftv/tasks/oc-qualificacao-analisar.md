---
task: ocQualificacaoAnalisar()
responsável: oc-qualificacao (Strategist)
responsavel_type: Agente
atomic_layer: Organism
---

# Analisar e Qualificar Pedido

## Purpose

Transformar a linguagem natural do cliente em especificações técnicas estruturadas de CFTV (câmeras, DVR/NVR, HD, cabos, fontes), garantindo a compatibilidade técnica dos itens.

---

## Entrada

| Campo | Tipo | Obrigatório | Origem |
|-------|------|-------------|--------|
| raw_data | object | Sim | oc-intake |

## Saída

| Campo | Tipo | Destino | Persistido |
|-------|------|---------|-----------|
| specs-tecnicas.json | file | squads/orcamento-cftv/data/ | Sim |
| technical_specs | object | oc-orcamento | Sim |

---

## Pre-Conditions

- [ ] `intake-raw.json` disponível e válido.
- [ ] Acesso às regras de compatibilidade técnica.

---

## Steps

### Step 1: Extração de Entidades Técnicas

Analisa o texto em busca de:
- Quantidade de câmeras.
- Tipo de tecnologia (Analógica/IP).
- Resolução desejada.
- Tempo de gravação necessário.

### Step 2: Validação de Compatibilidade

Verifica se o DVR/NVR sugerido suporta a quantidade e resolução das câmeras.
*Regra Crítica: Canais do DVR >= Número de Câmeras.*

### Step 3: Dimensionamento de Periféricos

Calcula automaticamente a quantidade de conectores, fontes e metragem estimada de cabo com base no número de câmeras.

### Step 4: Geração das Especificações

Consolida tudo no arquivo `specs-tecnicas.json` para precificação.

---

## Post-Conditions

- [ ] `specs-tecnicas.json` gerado com lista de materiais (BOM) preliminar.
- [ ] Validação de compatibilidade aprovada.

---

## Error Handling

| Error | Action |
|-------|--------|
| Falta de informação crítica | Perguntar ao usuário via oc-intake |
| Incompatibilidade técnica | Alertar e sugerir correção automática |
