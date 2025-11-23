import json

# Mapeamento de correções: (npc_id_origem, quest_id) -> npc_id_destino
corrections = {
    # Skier -> Prapor
    ('skier', 'chemical_4'): 'prapor',
    ('skier', 'polikhim_hobo'): 'prapor',
    ('skier', 'regulated_materials'): 'prapor',
    
    # Skier -> Jaeger
    ('skier', 'shady_business'): 'jaeger',
    ('skier', 'ambulance'): 'jaeger',
    
    # Mechanic -> Therapist
    ('mechanic', 'all_is_revealed'): 'therapist',
    
    # Mechanic -> Jaeger
    ('mechanic', 'acquaintance'): 'jaeger',
    ('mechanic', 'tarkov_shooter_1'): 'jaeger',
    ('mechanic', 'tarkov_shooter_2'): 'jaeger',
    ('mechanic', 'tarkov_shooter_3'): 'jaeger',
    ('mechanic', 'tarkov_shooter_4'): 'jaeger',
    ('mechanic', 'tarkov_shooter_5'): 'jaeger',
    ('mechanic', 'tarkov_shooter_6'): 'jaeger',
    ('mechanic', 'tarkov_shooter_7'): 'jaeger',
    ('mechanic', 'tarkov_shooter_8'): 'jaeger',
    ('mechanic', 'huntsman_secured_perimeter'): 'jaeger',
    ('mechanic', 'huntsman_trophy'): 'jaeger',
    ('mechanic', 'huntsman_justice'): 'jaeger',
    ('mechanic', 'huntsman_forest_cleaning'): 'jaeger',
    ('mechanic', 'claustrophobia'): 'jaeger',
    ('mechanic', 'huntsman_outcasts'): 'jaeger',
    ('mechanic', 'huntsman_controller'): 'jaeger',
    ('mechanic', 'huntsman_evil_watchman'): 'jaeger',
    ('mechanic', 'huntsman_eraser_2'): 'jaeger',
    ('mechanic', 'huntsman_factory_chief'): 'jaeger',
    
    # Mechanic -> Skier
    ('mechanic', 'exit_here'): 'skier',
    ('mechanic', 'walls_have_eyes'): 'skier',
    
    # Ragman -> Peacekeeper
    ('ragman', 'terragroup_employee'): 'peacekeeper',
    
    # Ragman -> Jaeger
    ('ragman', 'huntsman_sellout'): 'jaeger',
    ('ragman', 'stray_dogs'): 'jaeger',
    ('ragman', 'huntsman_woods_keeper'): 'jaeger',
    ('ragman', 'hunting_trip'): 'jaeger',
    
    # Lightkeeper -> Skier
    ('lightkeeper', 'lend_lease_1'): 'skier',
    ('lightkeeper', 'long_road'): 'skier',
    ('lightkeeper', 'missing_cargo'): 'skier',
    
    # Lightkeeper -> Peacekeeper
    ('lightkeeper', 'lend_lease_2'): 'peacekeeper',
    ('lightkeeper', 'classified_technologies'): 'peacekeeper',
}

def fix_npc_assignments():
    """Corrige as atribuições de NPC das quests"""
    # Carregar dados
    with open('quests-data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    moved_quests = []
    
    # Aplicar correções
    for (npc_id_origem, quest_id), npc_id_destino in corrections.items():
        # Encontrar a quest no NPC de origem
        npc_origem = data['npcs'].get(npc_id_origem)
        if not npc_origem:
            print(f"ERRO: NPC {npc_id_origem} nao encontrado!")
            continue
        
        quest = None
        quest_index = -1
        for i, q in enumerate(npc_origem['quests']):
            if q['id'] == quest_id:
                quest = q
                quest_index = i
                break
        
        if not quest:
            print(f"ERRO: Quest {quest_id} nao encontrada em {npc_id_origem}!")
            continue
        
        # Remover da origem
        npc_origem['quests'].pop(quest_index)
        
        # Adicionar ao destino
        npc_destino = data['npcs'].get(npc_id_destino)
        if not npc_destino:
            print(f"ERRO: NPC destino {npc_id_destino} nao encontrado!")
            continue
        
        npc_destino['quests'].append(quest)
        moved_quests.append({
            'quest_id': quest_id,
            'quest_name': quest['name'],
            'from': npc_id_origem,
            'to': npc_id_destino
        })
        
        print(f"Movido: {quest['name']} de {npc_id_origem} para {npc_id_destino}")
    
    # Salvar dados corrigidos
    with open('quests-data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\nTotal de quests movidas: {len(moved_quests)}")
    return moved_quests

if __name__ == '__main__':
    fix_npc_assignments()




