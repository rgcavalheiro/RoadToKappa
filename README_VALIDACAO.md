# Scripts de Validação de Pré-requisitos

Este diretório contém scripts para validar e verificar os pré-requisitos das missões no arquivo `quests-database.json`.

## Scripts Disponíveis

### 1. `validate_prerequisites.py`

Script principal de validação que verifica:
- ✅ IDs de pré-requisitos que não existem no banco de dados
- ✅ Pré-requisitos colocados no campo errado (prerequisites vs prerequisitesExternal)
- ✅ Dependências circulares
- ✅ Quests órfãs (sem pré-requisitos mas bloqueadas)
- ✅ Quests bloqueadas por pré-requisitos inválidos

**Uso:**
```bash
python validate_prerequisites.py
```

**Saída:**
- Relatório no console
- Arquivo `prerequisites_validation_report.json` com detalhes completos

### 2. `simulate_quest_availability.py`

Script que simula quais quests estão disponíveis baseado nos pré-requisitos. Útil para identificar quests que deveriam estar disponíveis mas não estão aparecendo.

**Uso:**
```bash
python simulate_quest_availability.py
```

**Saída:**
- Relatório no console mostrando quests disponíveis e bloqueadas por NPC
- Arquivo `quest_availability_simulation.json` com detalhes completos

## Problemas Encontrados e Corrigidos

### ✅ Problema Corrigido: Polikhim Hobo

**Problema:** A quest "Polikhim Hobo" do Prapor tinha `chemical_part_1` (quest do Skier) em `prerequisites` ao invés de `prerequisitesExternal`.

**Correção:** Movido `chemical_part_1` para `prerequisitesExternal`.

**Impacto:** Esta quest agora será corretamente desbloqueada quando `chemical_part_1` do Skier for completada.

## Como Usar

1. **Antes de fazer mudanças no banco de dados:**
   ```bash
   python validate_prerequisites.py
   ```
   Verifique se não há erros críticos.

2. **Após fazer mudanças:**
   ```bash
   python validate_prerequisites.py
   ```
   Certifique-se de que não introduziu novos erros.

3. **Para verificar disponibilidade de quests:**
   ```bash
   python simulate_quest_availability.py
   ```
   Use para entender quais quests estão disponíveis em diferentes estados de progresso.

## Estrutura dos Relatórios

### `prerequisites_validation_report.json`

```json
{
  "errors": [...],           // Erros críticos que impedem o funcionamento
  "warnings": [...],          // Avisos que podem causar problemas
  "circular_dependencies": [...],  // Dependências circulares
  "orphan_quests": [...],     // Quests órfãs
  "blocked_quests": [...],    // Quests bloqueadas
  "available_quests": [...],   // Quests disponíveis
  "blocked_by_missing": [...] // Quests bloqueadas por pré-requisitos faltando
}
```

### `quest_availability_simulation.json`

```json
{
  "available_quests": {
    "npc_id": [
      {
        "id": "quest_id",
        "name": "Quest Name",
        "reason": "Por que está disponível"
      }
    ]
  },
  "locked_quests": {
    "npc_id": [
      {
        "id": "quest_id",
        "name": "Quest Name",
        "missing_prerequisites": [...]
      }
    ]
  }
}
```

## Regras de Pré-requisitos

1. **`prerequisites`**: Lista de IDs de quests do **mesmo NPC** que são pré-requisitos
2. **`prerequisitesExternal`**: Lista de IDs de quests de **outros NPCs** que são pré-requisitos

**Exemplo correto:**
```json
{
  "id": "polikhim_hobo_1",
  "name": "Polikhim Hobo",
  "prerequisites": [],  // Quests do mesmo NPC (Prapor)
  "prerequisitesExternal": [
    "chemical_part_1"  // Quest de outro NPC (Skier)
  ]
}
```

## Troubleshooting

### Quest não aparece quando deveria

1. Execute `validate_prerequisites.py` para verificar se há erros
2. Execute `simulate_quest_availability.py` para ver se a quest está listada como disponível
3. Verifique se todos os pré-requisitos estão corretos e existem no banco de dados

### Pré-requisito não está funcionando

1. Verifique se o ID do pré-requisito está correto
2. Verifique se está no campo correto (prerequisites vs prerequisitesExternal)
3. Verifique se o pré-requisito existe no banco de dados

## Manutenção

Execute os scripts de validação regularmente, especialmente:
- Após importar novas quests
- Após fazer correções manuais no banco de dados
- Antes de fazer commit de mudanças

