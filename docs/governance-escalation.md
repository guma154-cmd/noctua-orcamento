# GOVERNANÇA E ESCALONAMENTO HUMANO - NOCTUA

O sistema NOCTUA opera em modo híbrido. Embora a automação seja priorizada, existem gatilhos específicos que interrompem o fluxo automático e solicitam a intervenção de um consultor humano.

## Gatilhos de Escalonamento

### 1. Ingestão de Dados de Baixa Confiança (Nível Técnico)
Sempre que uma planilha ou lista de materiais for processada e o `confidence_score` de um item for **abaixo de 0.8 (80%)**.
- **Causa:** Descrição ambígua, SKU não encontrado ou preço fora da margem histórica.
- **Ação:** O orçamento é marcado com `waiting_human = 1`.

### 2. Bloqueio de Segurança/Audit (Gatilho 'BLOCK')
Se o `technical_auditor` identificar uma falha crítica de topologia que o sistema determinístico não consegue resolver sozinho.
- **Exemplo:** Tentar ligar 16 câmeras IP de 4MP em um NVR que não suporta o throughput total.

### 3. Falha de Extração Multimodal
Se após as tentativas de rotação de provedores de IA (SORIA V2), o sistema não conseguir extrair dados estruturados de um documento PDF ou imagem.

### 4. Solicitação Explícita
Comandos do usuário que indicam desejo de falar com um atendente ou dúvidas comerciais complexas que fogem do escopo do `qualificador`.

## Processo de Revisão
1. O orçamento entra no estado `waiting_human = 1`.
2. Um alerta é gerado (acessível via comando `/alertas` no Telegram Admin).
3. O consultor revisa o JSON de escopo no banco de dados.
4. O consultor pode ajustar os itens e marcar como `resolvido`, devolvendo o controle ao bot ou finalizando manualmente.
