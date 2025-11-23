import json

# Ler ambos os arquivos
with open('questdata2025.json', 'r', encoding='utf-8') as f:
    quests_2025 = json.load(f)

with open('quests-data.json', 'r', encoding='utf-8') as f:
    quests_data = json.load(f)

print("=" * 80)
print("COMPARACAO DE TIERS ENTRE questdata2025.json E quests-data.json")
print("=" * 80)

# Criar um dicionário de quests do quests-data.json por nome
quests_by_name = {}
for npc_key, npc_data in quests_data['npcs'].items():
    npc_name = npc_data['name']
    for quest in npc_data['quests']:
        quest_name = quest['name']
        key = f"{npc_name}|{quest_name}"
        quests_by_name[key] = quest

# Comparar tiers
print("\n1. COMPARANDO TIERS...")
mismatches = []
not_found = []

for quest_2025 in quests_2025:
    npc = quest_2025['npc']
    quest_name = quest_2025['quest']
    tier_2025 = quest_2025['tier']
    
    key = f"{npc}|{quest_name}"
    
    if key in quests_by_name:
        quest_data = quests_by_name[key]
        tier_data = quest_data['tier']
        
        if tier_2025 != tier_data:
            mismatches.append({
                'npc': npc,
                'quest': quest_name,
                'tier_2025': tier_2025,
                'tier_data': tier_data,
                'diff': tier_2025 - tier_data
            })
    else:
        not_found.append({
            'npc': npc,
            'quest': quest_name,
            'tier': tier_2025
        })

if mismatches:
    print(f"\n[ATENCAO] Encontradas {len(mismatches)} quests com tiers diferentes:")
    for m in sorted(mismatches, key=lambda x: abs(x['diff']), reverse=True):
        print(f"  - {m['npc']} - {m['quest']}:")
        print(f"    Tier em questdata2025.json: {m['tier_2025']}")
        print(f"    Tier em quests-data.json: {m['tier_data']}")
        print(f"    Diferenca: {m['diff']:+d}")
else:
    print("\n[OK] Todos os tiers coincidem!")

if not_found:
    print(f"\n[INFO] {len(not_found)} quests em questdata2025.json nao encontradas em quests-data.json:")
    for nf in not_found:
        print(f"  - {nf['npc']} - {nf['quest']} (tier {nf['tier']})")

# Verificar quests que estão em quests-data.json mas não em questdata2025.json
print("\n2. QUESTS EM quests-data.json QUE NAO ESTAO EM questdata2025.json...")
quests_2025_set = {f"{q['npc']}|{q['quest']}" for q in quests_2025}
missing_in_2025 = []

for npc_key, npc_data in quests_data['npcs'].items():
    npc_name = npc_data['name']
    for quest in npc_data['quests']:
        quest_name = quest['name']
        key = f"{npc_name}|{quest_name}"
        if key not in quests_2025_set:
            missing_in_2025.append({
                'npc': npc_name,
                'quest': quest_name,
                'tier': quest['tier']
            })

if missing_in_2025:
    print(f"\n[INFO] {len(missing_in_2025)} quests em quests-data.json nao estao em questdata2025.json:")
    for m in sorted(missing_in_2025, key=lambda x: (x['npc'], x['tier'])):
        print(f"  - {m['npc']} - {m['quest']} (tier {m['tier']})")
else:
    print("\n[OK] Todas as quests de quests-data.json estao em questdata2025.json!")

print("\n" + "=" * 80)




