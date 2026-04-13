# Squad Orcamento-CFTV — Coding Standards

## General Principles
- **Clarity First:** Code and documentation must be in Portuguese (PT-BR) unless technical necessity requires English.
- **Strict Typing:** All data structures for CCTV components (cameras, DVRs, cables) must follow strict schemas.
- **Traceability:** Every quote must trace back to the original intake request ID.

## File Organization
- Standard AIOS structure within `squads/orcamento-cftv/`.
- Data artifacts stored in `squads/orcamento-cftv/data/`.

## Naming Conventions
- Agents: `oc-{role}`
- Tasks: `oc-{role}-{verb}-{noun}`
- Variables: camelCase for code, kebab-case for config files.
