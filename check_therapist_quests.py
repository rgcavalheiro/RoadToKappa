#!/usr/bin/env python3
"""
Script para verificar quais quests do Therapist deveriam estar disponíveis
baseado nas quests que o usuário tem ativas no jogo
"""

import json

def load_database():
    with open('quests-database.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def build_index(data):
    quest_by_id = {}
    for npc_id, npc_data in data.get('npcs', {}).items():
        for quest in npc_data.get('quests', []):
            quest_id = quest.get('id')
            if quest_id:
                quest_by_id[quest_id] = (npc_id, quest)
    return quest_by_id

def check_availability(quest, completed_quests, quest_by_id):
    """Verifica se uma quest está disponível baseado nas quests completadas"""
    prerequisites = quest.get('prerequisites', [])
    prerequisites_external = quest.get('prerequisitesExternal', [])
    all_prereqs = prerequisites + prerequisites_external
    
    if not all_prereqs:
        return True, []
    
    missing = []
    for prereq_id in all_prereqs:
        if prereq_id not in quest_by_id:
            missing.append(f"{prereq_id} (NAO EXISTE)")
        elif prereq_id not in completed_quests:
            prereq_npc, prereq_quest = quest_by_id[prereq_id]
            missing.append(f"{prereq_quest.get('name', prereq_id)} ({prereq_npc})")
    
    return len(missing) == 0, missing

def main():
    data = load_database()
    quest_by_id = build_index(data)
    
    # Quests que o usuário tem ATIVAS no jogo (baseado na imagem)
    active_quests = [
        "pharmacist",
        "postman_pat_part_2", 
        "out_of_curiosity",
        "operation_aquarius_part_1"
    ]
    
    # Quests que aparecem como COMPLETADAS no site (mas não deveriam)
    site_completed = [
        "operation_aquarius_part_1",
        "out_of_curiosity",
        "all_is_revealed",
        "a_healthy_alternative",
        "colleagues_part_3",
        "general_wares",
        "car_repair",
        "supply_plans",
        "disease_history"
    ]
    
    print("=" * 80)
    print("ANALISE DE QUESTS DO THERAPIST")
    print("=" * 80)
    
    print("\nQuests ATIVAS no jogo:")
    for qid in active_quests:
        if qid in quest_by_id:
            npc, quest = quest_by_id[qid]
            print(f"  - {quest.get('name')} (ID: {qid})")
    
    print("\n" + "-" * 80)
    print("Quests que aparecem como COMPLETADAS no site:")
    print("-" * 80)
    
    therapist_quests = data['npcs']['therapist']['quests']
    
    for quest in therapist_quests:
        quest_id = quest.get('id')
        quest_name = quest.get('name')
        
        if quest_id in site_completed:
            # Verificar se deveria estar disponível
            is_available, missing = check_availability(quest, active_quests, quest_by_id)
            
            prerequisites = quest.get('prerequisites', [])
            prerequisites_external = quest.get('prerequisitesExternal', [])
            
            print(f"\n{quest_name} (ID: {quest_id})")
            print(f"  Pre-requisitos: {prerequisites + prerequisites_external}")
            
            if is_available:
                print(f"  [OK] Deveria estar disponivel (todos pre-requisitos completos)")
            else:
                print(f"  [ERRO] NAO deveria estar disponivel!")
                print(f"  Pre-requisitos faltando: {', '.join(missing)}")
    
    print("\n" + "=" * 80)
    print("QUESTS QUE DEVERIAM ESTAR DISPONIVEIS:")
    print("=" * 80)
    
    for quest in therapist_quests:
        if not quest.get('kappaRequired', False):
            continue
            
        quest_id = quest.get('id')
        quest_name = quest.get('name')
        
        is_available, missing = check_availability(quest, active_quests, quest_by_id)
        
        if is_available and quest_id not in active_quests:
            print(f"  - {quest_name} (ID: {quest_id})")

if __name__ == '__main__':
    main()


