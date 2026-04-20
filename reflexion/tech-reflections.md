# Reflexões Técnicas — Tech Stack V5

## O que funcionou bem
- A separação de lógica de seleção de NVR e Cabos em módulos puros facilita os testes e a manutenção.
- O uso de bitrates fixos (H.265) simplifica a estimativa de storage, mantendo-a precisa o suficiente para o cliente sem a complexidade de múltiplos cenários.
- A regra de "Não redundância" (NVR PoE vs Switch PoE) economiza custos para o cliente e simplifica a instalação.

## Desafios e Soluções
- **Distâncias ultra-longas**: A solução de gerar um alerta técnico (`BLOCK_DISTÂNCIA_EXCEDIDA`) em vez de simplesmente falhar permite que o operador humano decida a melhor abordagem (fibra, rádio ou switch intermediário).
- **Modelo Híbrido**: A lógica do TSR V5 agora trata DVRs Híbridos como cidadãos de primeira classe, permitindo a transição suave de sistemas analógicos para IP.

## Próximos Passos (Melhorias Futuras)
- Implementar suporte a Fibra Óptica no `cable-selector.js` quando distâncias > 500m.
- Adicionar cálculo de consumo de energia (Watts) para dimensionamento de UPS/Nobreak.
