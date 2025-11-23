import json

# Ler o arquivo questdata2025.json
with open('questdata2025.json', 'r', encoding='utf-8') as f:
    quests = json.load(f)

print("=" * 80)
print("VERIFICANDO ORDEM DAS QUESTS DENTRO DE CADA NPC")
print("=" * 80)

# Agrupar quests por NPC
npc_quests = {}
for quest in quests:
    npc = quest['npc']
    if npc not in npc_quests:
        npc_quests[npc] = []
    npc_quests[npc].append(quest)

# Verificar ordem dentro de cada NPC
print("\nORDEM DAS QUESTS POR NPC:\n")
problems = []

for npc in sorted(npc_quests.keys()):
    quest_list = npc_quests[npc]
    # Ordenar por tier
    quest_list_sorted = sorted(quest_list, key=lambda x: x['tier'])
    
    # Verificar se já está ordenado
    is_ordered = quest_list == quest_list_sorted
    
    tiers = [q['tier'] for q in quest_list]
    tiers_sorted = [q['tier'] for q in quest_list_sorted]
    
    print(f"{npc} ({len(quest_list)} quests):")
    if not is_ordered:
        print(f"  [PROBLEMA] Quests NAO estao em ordem por tier!")
        print(f"  Tiers atuais: {tiers}")
        print(f"  Tiers ordenados: {tiers_sorted}")
        problems.append({
            'npc': npc,
            'current': tiers,
            'should_be': tiers_sorted,
            'quests': quest_list
        })
    else:
        print(f"  [OK] Quests estao em ordem por tier")
        print(f"  Tiers: {tiers}")
    print()

if problems:
    print(f"\n[ERRO] Encontrados {len(problems)} NPCs com problemas de ordem:")
    for p in problems:
        print(f"  - {p['npc']}: Precisa ser reordenado")
else:
    print("\n[OK] Todos os NPCs tem suas quests em ordem correta por tier!")

print("\n" + "=" * 80)




