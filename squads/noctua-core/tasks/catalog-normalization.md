# *catalog-normalization (Task)

Reconciliação de descrições brutas com o catálogo de produtos padrão.

## Objetivo
Normalizar marcas e modelos para evitar duplicidade na base de preços.

## Funcionamento
- Compara `rawItemDescription` com a base de modelos existentes.
- Padroniza marcas (ex: "intlb", "intel" -> "Intelbras").
- Atribui categorias (ex: "Camera", "DVR", "HD").
- Define `mappingStatus` (Mapped/Unmapped).
