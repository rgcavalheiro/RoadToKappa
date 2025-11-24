#!/usr/bin/env python3
"""
Script para verificar TODOS os pré-requisitos e identificar problemas específicos
"""

import json

def load_database():
    with open('quests-database.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def build_index(data):
    """Cria índice completo de quests"""
    quest_by_id = {}
    quest_by_npc = {}
    
    for npc_id, npc_data in data.get('npcs', {}).items():
        quest_by_npc[npc_id] = {}
        for quest in npc_data.get('quests', []):
            quest_id = quest.get('id')
            if quest_id:
                quest_by_id[quest_id] = (npc_id, quest)
                quest_by_npc[npc_id][quest_id] = quest
    
    return quest_by_id, quest_by_npc

def check_all_quests(data, quest_by_id, quest_by_npc):
    """Verifica todas as quests e seus pré-requisitos"""
    problems = []
    
    for npc_id, npc_data in data.get('npcs', {}).items():
        npc_name = npc_data.get('name', npc_id)
        
        for quest in npc_data.get('quests', []):
            quest_id = quest.get('id')
            quest_name = quest.get('name', 'Unknown')
            prerequisites = quest.get('prerequisites', [])
            prerequisites_external = quest.get('prerequisitesExternal', [])
            
            # Verificar cada pré-requisito interno
            for prereq_id in prerequisites:
                if prereq_id not in quest_by_id:
                    problems.append({
                        'type': 'missing_id',
                        'npc': npc_name,
                        'quest_id': quest_id,
                        'quest_name': quest_name,
                        'prerequisite_id': prereq_id,
                        'location': 'prerequisites',
                        'issue': f'ID nao existe no banco de dados'
                    })
                else:
                    prereq_npc, _ = quest_by_id[prereq_id]
                    if prereq_npc != npc_id:
                        problems.append({
                            'type': 'wrong_location',
                            'npc': npc_name,
                            'quest_id': quest_id,
                            'quest_name': quest_name,
                            'prerequisite_id': prereq_id,
                            'prerequisite_npc': prereq_npc,
                            'location': 'prerequisites',
                            'issue': f'Pre-requisito esta em {prereq_npc}, mas esta em prerequisites (deveria estar em prerequisitesExternal)'
                        })
            
            # Verificar cada pré-requisito externo
            for prereq_id in prerequisites_external:
                if prereq_id not in quest_by_id:
                    problems.append({
                        'type': 'missing_id',
                        'npc': npc_name,
                        'quest_id': quest_id,
                        'quest_name': quest_name,
                        'prerequisite_id': prereq_id,
                        'location': 'prerequisitesExternal',
                        'issue': f'ID nao existe no banco de dados'
                    })
                else:
                    prereq_npc, _ = quest_by_id[prereq_id]
                    if prereq_npc == npc_id:
                        problems.append({
                            'type': 'wrong_location',
                            'npc': npc_name,
                            'quest_id': quest_id,
                            'quest_name': quest_name,
                            'prerequisite_id': prereq_id,
                            'prerequisite_npc': prereq_npc,
                            'location': 'prerequisitesExternal',
                            'issue': f'Pre-requisito esta no mesmo NPC ({prereq_npc}), mas esta em prerequisitesExternal (deveria estar em prerequisites)'
                        })
    
    return problems

def main():
    print("Carregando banco de dados...")
    data = load_database()
    
    print("Construindo indices...")
    quest_by_id, quest_by_npc = build_index(data)
    
    print(f"Total de quests: {len(quest_by_id)}")
    print(f"Total de NPCs: {len(quest_by_npc)}")
    
    print("\nVerificando todos os pre-requisitos...")
    problems = check_all_quests(data, quest_by_id, quest_by_npc)
    
    if problems:
        print(f"\n[ERRO] Encontrados {len(problems)} problemas:\n")
        
        # Agrupar por tipo
        missing_ids = [p for p in problems if p['type'] == 'missing_id']
        wrong_location = [p for p in problems if p['type'] == 'wrong_location']
        
        if missing_ids:
            print(f"=== IDs NAO EXISTENTES ({len(missing_ids)}) ===")
            for p in missing_ids:
                print(f"\nNPC: {p['npc']}")
                print(f"Quest: {p['quest_name']} (ID: {p['quest_id']})")
                print(f"Pre-requisito invalido: {p['prerequisite_id']} (em {p['location']})")
                print(f"Problema: {p['issue']}")
        
        if wrong_location:
            print(f"\n=== PRE-REQUISITOS NO CAMPO ERRADO ({len(wrong_location)}) ===")
            for p in wrong_location:
                print(f"\nNPC: {p['npc']}")
                print(f"Quest: {p['quest_name']} (ID: {p['quest_id']})")
                print(f"Pre-requisito: {p['prerequisite_id']} (esta em {p['prerequisite_npc']})")
                print(f"Problema: {p['issue']}")
        
        # Salvar relatório
        with open('prerequisites_problems.json', 'w', encoding='utf-8') as f:
            json.dump(problems, f, indent=2, ensure_ascii=False)
        
        print(f"\n\nRelatorio salvo em: prerequisites_problems.json")
        return 1
    else:
        print("\n[OK] Nenhum problema encontrado! Todos os pre-requisitos estao corretos.")
        return 0

if __name__ == '__main__':
    exit(main())


