#!/usr/bin/env python3
"""
Script para verificar e corrigir automaticamente pré-requisitos faltando
baseado em padrões e referências cruzadas
"""

import json
import re

def load_database():
    with open('quests-database.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def build_index(data):
    quest_by_id = {}
    quest_by_name = {}
    
    for npc_id, npc_data in data.get('npcs', {}).items():
        for quest in npc_data.get('quests', []):
            quest_id = quest.get('id')
            quest_name = quest.get('name', '').lower()
            if quest_id:
                quest_by_id[quest_id] = (npc_id, quest)
                quest_by_name[quest_name] = (npc_id, quest)
    
    return quest_by_id, quest_by_name

def find_part_quests_missing_prereqs(data, quest_by_id):
    """Encontra quests Part 2, Part 3, etc que não têm Part 1 como pré-requisito"""
    fixes = []
    
    for npc_id, npc_data in data.get('npcs', {}).items():
        for quest in npc_data.get('quests', []):
            quest_id = quest.get('id')
            quest_name = quest.get('name', '')
            prerequisites = quest.get('prerequisites', [])
            prerequisites_external = quest.get('prerequisitesExternal', [])
            all_prereqs = prerequisites + prerequisites_external
            
            # Verificar se é uma quest "Part 2" ou superior
            part_match = re.search(r'part\s+(\d+)', quest_name, re.IGNORECASE)
            if part_match:
                part_num = int(part_match.group(1))
                if part_num > 1:
                    # Procurar Part anterior
                    base_name = re.sub(r'\s*-\s*part\s+\d+.*', '', quest_name, flags=re.IGNORECASE)
                    base_name = re.sub(r'\s*part\s+\d+.*', '', base_name, flags=re.IGNORECASE)
                    
                    # Procurar Part anterior (Part 1, Part 2, etc)
                    for prev_part in range(part_num - 1, 0, -1):
                        prev_part_name = f"{base_name} part {prev_part}"
                        prev_part_name_alt = f"{base_name} - part {prev_part}"
                        
                        # Procurar no mesmo NPC primeiro
                        found = False
                        for other_quest in npc_data.get('quests', []):
                            other_name = other_quest.get('name', '').lower()
                            other_id = other_quest.get('id')
                            
                            if (prev_part_name in other_name or prev_part_name_alt in other_name) and other_id not in all_prereqs:
                                # Adicionar como pré-requisito
                                if other_id not in prerequisites:
                                    fixes.append({
                                        'npc': npc_data.get('name'),
                                        'quest_id': quest_id,
                                        'quest_name': quest.get('name'),
                                        'add_prerequisite': other_id,
                                        'prerequisite_name': other_quest.get('name'),
                                        'location': 'prerequisites',
                                        'reason': f'Part {part_num} deve ter Part {prev_part} como pre-requisito'
                                    })
                                    found = True
                                    break
                        
                        if found:
                            break
                        
                        # Se não encontrou no mesmo NPC, procurar em outros
                        for other_npc_id, other_npc_data in data.get('npcs', {}).items():
                            if other_npc_id == npc_id:
                                continue
                            for other_quest in other_npc_data.get('quests', []):
                                other_name = other_quest.get('name', '').lower()
                                other_id = other_quest.get('id')
                                
                                if (prev_part_name in other_name or prev_part_name_alt in other_name) and other_id not in all_prereqs:
                                    if other_id not in prerequisites_external:
                                        fixes.append({
                                            'npc': npc_data.get('name'),
                                            'quest_id': quest_id,
                                            'quest_name': quest.get('name'),
                                            'add_prerequisite': other_id,
                                            'prerequisite_name': other_quest.get('name'),
                                            'location': 'prerequisitesExternal',
                                            'reason': f'Part {part_num} deve ter Part {prev_part} como pre-requisito externo'
                                        })
                                        found = True
                                        break
                            if found:
                                break
                        if found:
                            break
    
    return fixes

def apply_fixes(data, fixes):
    """Aplica as correções no banco de dados"""
    applied = 0
    
    for fix in fixes:
        npc_id = None
        for nid, npc_data in data.get('npcs', {}).items():
            if npc_data.get('name') == fix['npc']:
                npc_id = nid
                break
        
        if not npc_id:
            continue
        
        for quest in data['npcs'][npc_id]['quests']:
            if quest.get('id') == fix['quest_id']:
                if fix['location'] == 'prerequisites':
                    if fix['add_prerequisite'] not in quest.get('prerequisites', []):
                        if 'prerequisites' not in quest:
                            quest['prerequisites'] = []
                        quest['prerequisites'].append(fix['add_prerequisite'])
                        applied += 1
                        print(f"  [FIX] {fix['quest_name']}: Adicionado {fix['prerequisite_name']} em prerequisites")
                elif fix['location'] == 'prerequisitesExternal':
                    if fix['add_prerequisite'] not in quest.get('prerequisitesExternal', []):
                        if 'prerequisitesExternal' not in quest:
                            quest['prerequisitesExternal'] = []
                        quest['prerequisitesExternal'].append(fix['add_prerequisite'])
                        applied += 1
                        print(f"  [FIX] {fix['quest_name']}: Adicionado {fix['prerequisite_name']} em prerequisitesExternal")
                break
    
    return applied

def main():
    print("Carregando banco de dados...")
    data = load_database()
    
    print("Construindo indices...")
    quest_by_id, quest_by_name = build_index(data)
    
    print("\nProcurando quests Part que faltam pre-requisitos...")
    fixes = find_part_quests_missing_prereqs(data, quest_by_id)
    
    if fixes:
        print(f"\n[INFO] Encontradas {len(fixes)} correcoes necessarias:\n")
        for fix in fixes:
            print(f"  - {fix['quest_name']} ({fix['npc']})")
            print(f"    Adicionar: {fix['prerequisite_name']} em {fix['location']}")
            print(f"    Razao: {fix['reason']}\n")
        
        print(f"\nAplicando correcoes...")
        applied = apply_fixes(data, fixes)
        
        if applied > 0:
            print(f"\n[OK] {applied} correcao(oes) aplicada(s)!")
            print("Salvando banco de dados...")
            with open('quests-database.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print("[OK] Banco de dados salvo!")
        else:
            print("\n[AVISO] Nenhuma correcao foi aplicada")
    else:
        print("\n[OK] Nenhuma correcao necessaria encontrada!")

if __name__ == '__main__':
    main()


