# Relatorio de Problemas - questdata2025.json

## Resumo
- Total de quests: 241
- Tiers: 1 a 241 (sem gaps)
- Problemas encontrados: **166 quests com tiers diferentes** entre os dois arquivos

## Principais Problemas

### 1. Quests com Maior Diferenca de Tier

As quests do Mechanic e Jaeger que aparecem muito tarde no arquivo:

- **Mechanic - Signal - Part 1**: Tier 229 (deveria ser ~3) - Diferenca: +226
- **Mechanic - Signal - Part 2**: Tier 230 (deveria ser ~4) - Diferenca: +226
- **Mechanic - Signal - Part 3**: Tier 231 (deveria ser ~5) - Diferenca: +226
- **Mechanic - Signal - Part 4**: Tier 232 (deveria ser ~6) - Diferenca: +226
- **Mechanic - Scout**: Tier 233 (deveria ser ~7) - Diferenca: +226
- **Jaeger - The Huntsman Path - Factory Chief**: Tier 234 (deveria ser ~8) - Diferenca: +226

### 2. Quests do Mechanic que Aparecem Muito Tarde

- **Mechanic - Introduction**: Tier 172 (deveria ser 1) - Diferenca: +171
- **Mechanic - Gunsmith - Part 1**: Tier 156 (deveria ser 1) - Diferenca: +155
- **Mechanic - Farming - Part 1**: Tier 157 (deveria ser 1) - Diferenca: +156

### 3. Quests do Jaeger que Aparecem Muito Tarde

- **Jaeger - The Tarkov Shooter - Part 1**: Tier 174 (deveria ser 3) - Diferenca: +171
- **Jaeger - The Tarkov Shooter - Part 2**: Tier 175 (deveria ser 4) - Diferenca: +171
- **Jaeger - Acquaintance**: Tier 173 (deveria ser 2) - Diferenca: +171

### 4. Quests do Therapist com Pequenas Diferencas

- **Therapist - Shortage**: Tier 2 (deveria ser 1) - Diferenca: +1
- **Therapist - Sanitary Standards - Part 1**: Tier 3 (deveria ser 2) - Diferenca: +1
- **Therapist - Sanitary Standards - Part 2**: Tier 4 (deveria ser 3) - Diferenca: +1

## Quests que Nao Estao em quests-data.json (75 quests)

Estas quests estao em questdata2025.json mas nao em quests-data.json:

- Therapist: First in Line, Crisis, Disease History, Seaside Vacation, General Wares, Colleagues (Part 1-3), Chemistry Closet
- Prapor: Shooting Cans, Luxurious Life, Background Check, Shaking Up Teller, Rigged Game, Perfect Mediator, Easy Job (Part 1-2), Postman Pat - Part 1, Possessor, The Bunker (Part 1-2), No Place for Renegades, Documents
- Peacekeeper: Samples, Test Drive (Part 1-5), Overpopulation, One Less Loose End, Dragnet, Revision - Reserve, Long Road, Missing Cargo
- Skier: Burning Rubber, Stirrup, Friend from the West (Part 1-2), Setup, Informed Means Armed, Chumming, Flint
- Mechanic: Psycho Sniper, Saving the Mole, All is Revealed, Gunsmith (Part 5-22)
- Jaeger: The Huntsman Path - Sadist, The Survivalist Path - Unprotected but Dangerous
- Lightkeeper: Exit Here, The Walls Have Eyes, Black Swan, Forklift Certified, Back Door, Surplus Goods
- Fence: Collector

## Quests que Estao em quests-data.json mas Nao em questdata2025.json (13 quests)

- Jaeger - The Survivalist Path - Unprotected but Dangerous (tier 2)
- Lightkeeper - Revision Reserve (tier 2)
- Mechanic - Black Swan (tier 9)
- Mechanic - Forklift Certified (tier 10)
- Mechanic - Back Door (tier 10)
- Mechanic - Surplus Goods (tier 11)
- Prapor - Shaking up the Teller (tier 4)
- Prapor - Chemical - Part 4 (tier 6)
- Skier - Long Road (tier 3)
- Skier - Missing Cargo (tier 4)
- Skier - Exit Here (tier 8)
- Skier - The Walls Have Eyes (tier 9)
- Therapist - All Is Revealed (tier 6)

## Recomendacoes

1. **Decidir qual sistema de tier usar**: 
   - Ordem global (1-241) para todas as quests
   - Ou tiers relativos por NPC (cada NPC comecando do 1)

2. **Revisar a ordem das quests do Mechanic e Jaeger**: Elas aparecem muito tarde no arquivo

3. **Sincronizar os dois arquivos**: Adicionar quests faltantes e remover duplicatas

4. **Verificar se "First in Line" deveria ser tier 1**: Atualmente "Shortage" esta no tier 2, mas "First in Line" esta no tier 1




