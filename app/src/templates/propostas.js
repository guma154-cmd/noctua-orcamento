/**
 * TEMPLATES CANÔNICOS DE PROPOSTAS - NOCTUA (V2 - PREMIUM BRANDING)
 */

const NOCTUA_HEADER = `🦉 *NOCTUA — Inteligência em Segurança*
_Soluções Profissionais em CFTV e Controle de Acesso_
----------------------------------------------`;

const NOCTUA_FOOTER = `----------------------------------------------
📞 *Contato Direto:* (21) 97421-3199
📍 Atendimento Técnico Especializado`;

const TEMPLATE_CANONICO_MODELO_A = `${NOCTUA_HEADER}

🔍 *SOLUÇÃO COMPLETA (Equipamentos + Instalação)*
ID: \`{{orcamento_id}}\` | Data: {{data_orcamento}}

*CLIENTE:* {{cliente_nome}}
*LOCAL:* {{local_instalacao}}

✅ *PROJETO INTEGRADO:*
• Fornecimento e Instalação de {{quantidade_cameras}} {{descricao_cameras}}
• 01 Gravador Digital {{descricao_gravador}}
• 01 Armazenamento {{descricao_hd}} (Alta disponibilidade)
• 🕒 Período estimado de gravação: {{periodo_gravacao}}
• Toda a infraestrutura lógica e elétrica básica incluída
• Acesso remoto configurado em múltiplos dispositivos
{{linha_extra_itens_servicos}}

💎 *VANTAGENS DO MODELO A:*
• Garantia Integrada (Hardware + Mão de Obra)
• Equipamentos homologados pela engenharia NOCTUA
• Suporte prioritário na configuração de aplicativos
{{linha_extra_inclui}}

💰 *INVESTIMENTO:*
*VALOR TOTAL:* {{valor_modelo_a}}
*FORMA:* {{forma_pagamento}}

🔖 *CERTIFICAÇÃO:*
Esta proposta contempla a solução "chave na mão", garantindo que todos os componentes são 100% compatíveis e otimizados para o seu ambiente.
{{linha_extra_observacoes}}

${NOCTUA_FOOTER}`;

const TEMPLATE_CANONICO_MODELO_B = `${NOCTUA_HEADER}

🔍 *PROPOSTA TÉCNICA (Só Mão de Obra)*
ID: \`{{orcamento_id}}\` | Data: {{data_orcamento}}

*CLIENTE:* {{cliente_nome}}
*LOCAL:* {{local_instalacao}}

✅ *ESCOPO DOS SERVIÇOS:*
• Instalação técnica de {{quantidade_cameras}} {{descricao_cameras}}
• Configuração de {{quantidade_gravador}} {{descricao_gravador}}
• Montagem de {{quantidade_hd}} {{descricao_hd}}
• 🕒 Período estimado de gravação: {{periodo_gravacao}}
• Ajuste de ângulo e detecção de movimento
• Configuração de acesso remoto via smartphone
{{linha_extra_itens_servicos}}

🛠️ *O QUE ESTÁ INCLUÍDO:*
• Fixação e alinhamento dos equipamentos descritos
• Terminação de conectores e testes de sinal
• Treinamento básico de uso do aplicativo
{{linha_extra_inclui}}

💰 *INVESTIMENTO:*
*VALOR TOTAL:* {{valor_modelo_b}}
*FORMA:* {{forma_pagamento}}

⚠️ *NOTAS IMPORTANTES (Modelo B):*
1. O cliente é responsável por fornecer **todo o material** (cabos, conectores, fontes e equipamentos).
2. A garantia NOCTUA cobre exclusivamente o **serviço de instalação**.
3. Defeitos no hardware fornecido pelo cliente podem gerar custos adicionais de visita técnica.
{{linha_extra_observacoes}}

${NOCTUA_FOOTER}`;

const TEMPLATE_CANONICO_MODELO_C = `${NOCTUA_HEADER}

🔍 *SOLUÇÃO MISTA (Fornecimento Compartilhado)*
ID: \`{{orcamento_id}}\` | Data: {{data_orcamento}}

*CLIENTE:* {{cliente_nome}}
*LOCAL:* {{local_instalacao}}

✅ *PROJETO HÍBRIDO:*
• Instalação de {{quantidade_cameras}} {{descricao_cameras}}
• Configuração de Gravador e Acesso Remoto
• 🕒 Período estimado de gravação: {{periodo_gravacao}}
• Gerenciamento técnico de itens fornecidos pelo cliente
{{linha_extra_itens_servicos}}

🛠️ *RESUMO DE RESPONSABILIDADES:*
• Itens NOCTUA: (Ver relatório detalhado)
• Itens CLIENTE: (Ver relatório detalhado)
{{linha_extra_inclui}}

💰 *INVESTIMENTO:*
*VALOR TOTAL:* {{valor_modelo_c}}
*FORMA:* {{forma_pagamento}}

⚠️ *OBSERVAÇÕES:*
1. A garantia NOCTUA aplica-se aos itens fornecidos pela empresa e ao serviço de instalação.
2. Itens fornecidos pelo cliente devem estar em perfeito estado para a instalação.
{{linha_extra_observacoes}}

${NOCTUA_FOOTER}`;

const TEMPLATE_RELATORIO_OPERACIONAL = `📊 *RELATÓRIO OPERACIONAL - NOCTUA INTERNAL*
ID: \`{{orcamento_id}}\` | Cliente: {{cliente_nome}}

⚠️ *ALERTAS E MENSAGENS:*
{{alertas_sistema}}

*MÉTRICAS FINANCEIRAS:*
• Modelo: {{modelo_gerado}}
• Ticket Mínimo: {{ticket_minimo_aplicado}}

*MATERIAIS:*
{{lista_materiais}}
*Total Mat:* {{subtotal_materiais}}

*MÃO DE OBRA:*
• Instalação Base: {{mao_obra_instalacao}}
• Margem: {{margem_percentual}}

💰 *VALOR FINAL:* {{valor_final}}`;

module.exports = {
  TEMPLATE_CANONICO_MODELO_A,
  TEMPLATE_CANONICO_MODELO_B,
  TEMPLATE_CANONICO_MODELO_C,
  TEMPLATE_RELATORIO_OPERACIONAL
};
