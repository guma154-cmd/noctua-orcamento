/**
 * TEMPLATES CANÔNICOS DE PROPOSTAS - NOCTUA
 */

const TEMPLATE_CANONICO_MODELO_A = `🦉 *NOCTUA*
Soluções em Segurança Eletrônica

CFTV • Porteiro Eletrônico • Alarmes • Controle de Acesso

📌 *ORÇAMENTO*

Cliente: {{cliente_nome}}
Local: {{local_instalacao}}
Data: {{data_orcamento}}
Validade: 7 dias
ID do orçamento: {{orcamento_id}}

✅ *Itens/Serviços:*

• Instalação de {{quantidade_cameras}} câmeras {{descricao_cameras}}
• Instalação de {{quantidade_gravador}} {{descricao_gravador}}
• Instalação de {{quantidade_hd}} {{descricao_hd}}
• Configuração básica de gravação e acesso
{{linha_extra_itens_servicos}}

🛠️ *Inclui:*

• Mão de obra de instalação dos equipamentos descritos
• Fixação e posicionamento dos equipamentos
• Configuração básica do gravador
• Instalação do HD
• Testes básicos de funcionamento
• Configuração inicial de visualização local
{{linha_extra_inclui}}

💳 *Condições:*

• Valor total: {{valor_modelo_a}}
• Forma de pagamento: {{forma_pagamento}}
• Garantia: serviço de instalação

📌 *Observações:*

• O orçamento refere-se exclusivamente à mão de obra dos itens descritos acima.
• Todo o material será fornecido pelo cliente.
• Materiais incompatíveis, defeituosos ou insuficientes não estão cobertos pela garantia do serviço.
• A NOCTUA pode fornecer o material necessário mediante ajuste no valor do orçamento.
• Este valor não inclui cabeamento, conectores, eletroduto/conduíte, caixas de passagem, switch adicional, infraestrutura elétrica ou adequações estruturais, salvo menção expressa.
• O valor considera instalação com acabamento básico. Serviços adicionais não previstos poderão ser orçados à parte.
• A garantia refere-se à instalação e ao funcionamento no ato da entrega. Danos causados por fatores externos, surtos, oscilação elétrica, umidade, mau uso ou defeito do equipamento não estão cobertos.
{{linha_extra_observacoes}}

📞 *Contato: (21) 97421-3199*`;

const TEMPLATE_CANONICO_MODELO_B = `🦉 *NOCTUA*
Soluções em Segurança Eletrônica

CFTV • Porteiro Eletrônico • Alarmes • Controle de Acesso

📌 *ORÇAMENTO*

Cliente: {{cliente_nome}}
Local: {{local_instalacao}}
Data: {{data_orcamento}}
Validade: 7 dias
ID do orçamento: {{orcamento_id}}

✅ *Itens/Serviços:*

• Fornecimento e instalação de {{quantidade_cameras}} câmeras {{descricao_cameras}}
• Fornecimento e instalação de {{quantidade_gravador}} {{descricao_gravador}}
• Fornecimento e instalação de {{quantidade_hd}} {{descricao_hd}}
• Configuração básica de gravação e acesso
{{linha_extra_itens_servicos}}

🛠️ *Inclui:*

• Fornecimento dos equipamentos descritos
• Instalação e fixação dos equipamentos
• Configuração básica do gravador
• Instalação do HD
• Testes básicos de funcionamento
• Configuração inicial de visualização local
{{linha_extra_inclui}}

💳 *Condições:*

• Valor total: {{valor_modelo_b}}
• Forma de pagamento: {{forma_pagamento}}
• Garantia: serviço de instalação

📌 *Observações:*

• O orçamento contempla material e mão de obra descritos acima.
• O fornecimento do material pela NOCTUA assegura compatibilidade, qualidade e melhor confiabilidade do sistema instalado.
• Este valor não inclui cabeamento, conectores, eletroduto/conduíte, caixas de passagem, switch adicional, infraestrutura elétrica ou adequações estruturais, salvo menção expressa.
• O valor considera instalação com acabamento básico. Serviços adicionais não previstos poderão ser orçados à parte.
• A garantia refere-se à instalação e ao funcionamento no ato da entrega. Danos causados por fatores externos, surtos, oscilação elétrica, umidade, mau uso ou defeito do equipamento não estão cobertos.
{{linha_extra_observacoes}}

📞 *Contato: (21) 97421-3199*`;

const TEMPLATE_RELATORIO_OPERACIONAL = `📊 RELATÓRIO OPERACIONAL — {{orcamento_id}}
Cliente: {{cliente_nome}}
Modelo: {{modelo_gerado}}
Nível: {{nivel_preco}}

📦 Materiais
{{lista_materiais}}
• Subtotal materiais: {{subtotal_materiais}}

🛠️ Mão de obra
• Instalação: {{mao_obra_instalacao}}

💰 Fechamento
• Margem aplicada: {{margem_percentual}}
• Valor final: {{valor_final}}

⚠️ Resumo
• Ticket mínimo aplicado: {{ticket_minimo_aplicado}}`;

module.exports = {
  TEMPLATE_CANONICO_MODELO_A,
  TEMPLATE_CANONICO_MODELO_B,
  TEMPLATE_RELATORIO_OPERACIONAL
};
