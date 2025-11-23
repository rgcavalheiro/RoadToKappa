import json

# Ler o arquivo questdata2025.json
with open('questdata2025.json', 'r', encoding='utf-8') as f:
    quests = json.load(f)

print("=" * 80)
print("VALIDAÇÃO DA ORDEM DAS QUESTS")
print("=" * 80)

# Verificar se os tiers estão em ordem crescente
print("\n1. VERIFICANDO ORDEM DOS TIERS...")
problems = []
expected_tier = 1

for i, quest in enumerate(quests):
    tier = quest['tier']
    npc = quest['npc']
    quest_name = quest['quest']
    
    if tier != expected_tier:
        problems.append({
            'type': 'tier_mismatch',
            'index': i,
            'expected': expected_tier,
            'actual': tier,
            'npc': npc,
            'quest': quest_name
        })
    
    expected_tier += 1

if problems:
    print(f"[ERRO] ENCONTRADOS {len(problems)} PROBLEMAS DE ORDEM:")
    for p in problems:
        print(f"  - Linha {p['index'] + 1}: Esperado tier {p['expected']}, mas encontrado tier {p['actual']}")
        print(f"    Quest: {p['npc']} - {p['quest']}")
else:
    print("[OK] Todos os tiers estao em ordem sequencial!")

# Verificar duplicatas de tier
print("\n2. VERIFICANDO TIERS DUPLICADOS...")
tier_counts = {}
for quest in quests:
    tier = quest['tier']
    if tier not in tier_counts:
        tier_counts[tier] = []
    tier_counts[tier].append(quest)

duplicates = {t: q for t, q in tier_counts.items() if len(q) > 1}
if duplicates:
    print(f"[ERRO] ENCONTRADOS {len(duplicates)} TIERS DUPLICADOS:")
    for tier, quest_list in sorted(duplicates.items()):
        print(f"  - Tier {tier} aparece {len(quest_list)} vezes:")
        for q in quest_list:
            print(f"    * {q['npc']} - {q['quest']}")
else:
    print("[OK] Nenhum tier duplicado encontrado!")

# Verificar gaps nos tiers
print("\n3. VERIFICANDO GAPS NOS TIERS...")
tiers = sorted(set(q['tier'] for q in quests))
if len(tiers) > 0:
    min_tier = min(tiers)
    max_tier = max(tiers)
    expected_tiers = set(range(min_tier, max_tier + 1))
    missing_tiers = expected_tiers - set(tiers)
    
    if missing_tiers:
        print(f"[ERRO] TIERS FALTANDO: {sorted(missing_tiers)}")
    else:
        print(f"[OK] Nenhum gap encontrado! Tiers de {min_tier} a {max_tier} estao completos.")

# Verificar ordem por NPC
print("\n4. VERIFICANDO AGRUPAMENTO POR NPC...")
current_npc = None
npc_changes = []
for i, quest in enumerate(quests):
    npc = quest['npc']
    if current_npc != npc:
        if current_npc is not None:
            npc_changes.append({
                'index': i,
                'from': current_npc,
                'to': npc,
                'tier': quest['tier']
            })
        current_npc = npc

print(f"Encontradas {len(npc_changes)} mudancas de NPC:")
for change in npc_changes:
    print(f"  - Tier {change['tier']}: {change['from']} -> {change['to']}")

# Verificar se há quests que aparecem fora de ordem dentro do mesmo NPC
print("\n5. VERIFICANDO ORDEM DENTRO DE CADA NPC...")
npc_quests = {}
for quest in quests:
    npc = quest['npc']
    if npc not in npc_quests:
        npc_quests[npc] = []
    npc_quests[npc].append(quest)

npc_order_problems = []
for npc, quest_list in npc_quests.items():
    tiers_for_npc = [q['tier'] for q in quest_list]
    if tiers_for_npc != sorted(tiers_for_npc):
        npc_order_problems.append({
            'npc': npc,
            'tiers': tiers_for_npc,
            'sorted': sorted(tiers_for_npc)
        })

if npc_order_problems:
    print(f"[ERRO] ENCONTRADOS PROBLEMAS DE ORDEM DENTRO DE NPCs:")
    for p in npc_order_problems:
        print(f"  - {p['npc']}: Tiers nao estao em ordem")
        print(f"    Atual: {p['tiers']}")
        print(f"    Esperado: {p['sorted']}")
else:
    print("[OK] Todos os NPCs tem suas quests em ordem crescente de tier!")

# Estatísticas gerais
print("\n6. ESTATÍSTICAS:")
print(f"Total de quests: {len(quests)}")
print(f"Tiers: {min(tiers)} a {max(tiers)}")
print(f"\nQuests por NPC:")
for npc in sorted(npc_quests.keys()):
    count = len(npc_quests[npc])
    print(f"  - {npc}: {count} quests")

print("\n" + "=" * 80)
print("VALIDAÇÃO CONCLUÍDA")
print("=" * 80)

