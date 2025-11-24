#!/usr/bin/env python3
"""
Script para encontrar quests que podem ter pré-requisitos faltando
baseado em referências cruzadas e padrões comuns
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

def find_quests_with_no_prerequisites(data, quest_by_id):
    """Encontra quests sem pré-requisitos que podem ter pré-requisitos faltando"""
    suspicious = []
    
    for npc_id, npc_data in data.get('npcs', {}).items():
        for quest in npc_data.get('quests', []):
            quest_id = quest.get('id')
            quest_name = quest.get('name', '')
            prerequisites = quest.get('prerequisites', [])
            prerequisites_external = quest.get('prerequisitesExternal', [])
            
            # Quests sem pré-requisitos que podem ter pré-requisitos faltando
            if not prerequisites and not prerequisites_external:
                # Verificar se há outras quests que referenciam esta
                referenced_by = []
                for other_npc_id, other_npc_data in data.get('npcs', {}).items():
                    for other_quest in other_npc_data.get('quests', []):
                        other_prereqs = (other_quest.get('prerequisites', []) + 
                                        other_quest.get('prerequisitesExternal', []))
                        if quest_id in other_prereqs:
                            referenced_by.append((other_npc_data.get('name'), other_quest.get('name')))
                
                # Se é uma quest "Part 2", "Part 3", etc, provavelmente tem pré-requisito
                if re.search(r'part\s+\d+', quest_name, re.IGNORECASE):
                    suspicious.append({
                        'npc': npc_data.get('name'),
                        'quest_id': quest_id,
                        'quest_name': quest_name,
                        'reason': 'Quest com "Part" mas sem pre-requisitos',
                        'referenced_by': referenced_by
                    })
                # Se outras quests referenciam esta, pode ter pré-requisito faltando
                elif referenced_by:
                    suspicious.append({
                        'npc': npc_data.get('name'),
                        'quest_id': quest_id,
                        'quest_name': quest_name,
                        'reason': 'Referenciada por outras quests mas sem pre-requisitos',
                        'referenced_by': referenced_by
                    })
    
    return suspicious

def find_quests_referencing_others(data, quest_by_id):
    """Encontra quests que referenciam outras mas não têm pré-requisitos"""
    issues = []
    
    for npc_id, npc_data in data.get('npcs', {}).items():
        for quest in npc_data.get('quests', []):
            quest_id = quest.get('id')
            quest_name = quest.get('name', '')
            prerequisites = quest.get('prerequisites', [])
            prerequisites_external = quest.get('prerequisitesExternal', [])
            
            # Verificar se há referências a outras quests no nome ou contexto
            # que não estão nos pré-requisitos
            all_prereqs = prerequisites + prerequisites_external
            
            # Buscar por padrões comuns
            if 'part 2' in quest_name.lower() or 'part ii' in quest_name.lower():
                # Deveria ter Part 1 como pré-requisito
                base_name = re.sub(r'\s*-\s*part\s+2.*', '', quest_name, flags=re.IGNORECASE)
                base_name = re.sub(r'\s*-\s*part\s+ii.*', '', base_name, flags=re.IGNORECASE)
                
                # Procurar Part 1 correspondente
                for other_npc_id, other_npc_data in data.get('npcs', {}).items():
                    for other_quest in other_npc_data.get('quests', []):
                        other_name = other_quest.get('name', '')
                        if (base_name.lower() in other_name.lower() and 
                            ('part 1' in other_name.lower() or 'part i' in other_name.lower()) and
                            other_quest.get('id') not in all_prereqs):
                            issues.append({
                                'npc': npc_data.get('name'),
                                'quest_id': quest_id,
                                'quest_name': quest_name,
                                'issue': f'Pode precisar de "{other_quest.get("name")}" ({other_quest.get("id")}) como pre-requisito',
                                'suggested_prerequisite': other_quest.get('id'),
                                'suggested_npc': other_npc_data.get('name')
                            })
    
    return issues

def main():
    print("Carregando banco de dados...")
    data = load_database()
    
    print("Construindo indices...")
    quest_by_id, quest_by_name = build_index(data)
    
    print("\nProcurando quests suspeitas sem pre-requisitos...")
    suspicious = find_quests_with_no_prerequisites(data, quest_by_id)
    
    print("\nProcurando quests que podem ter pre-requisitos faltando...")
    issues = find_quests_referencing_others(data, quest_by_id)
    
    print("\n" + "=" * 80)
    print("QUESTS SUSPEITAS (sem pre-requisitos mas podem ter)")
    print("=" * 80)
    
    if suspicious:
        for item in suspicious:
            print(f"\nNPC: {item['npc']}")
            print(f"Quest: {item['quest_name']} (ID: {item['quest_id']})")
            print(f"Razao: {item['reason']}")
            if item['referenced_by']:
                print(f"Referenciada por: {', '.join([f'{n} - {q}' for n, q in item['referenced_by']])}")
    else:
        print("\nNenhuma quest suspeita encontrada")
    
    print("\n" + "=" * 80)
    print("QUESTS QUE PODEM TER PRE-REQUISITOS FALTANDO")
    print("=" * 80)
    
    if issues:
        for item in issues:
            print(f"\nNPC: {item['npc']}")
            print(f"Quest: {item['quest_name']} (ID: {item['quest_id']})")
            print(f"Problema: {item['issue']}")
            if item.get('suggested_prerequisite'):
                print(f"Sugestao: Adicionar '{item['suggested_prerequisite']}' ({item['suggested_npc']}) em prerequisitesExternal")
    else:
        print("\nNenhum problema encontrado")
    
    # Salvar relatório
    report = {
        'suspicious_quests': suspicious,
        'missing_prerequisites': issues
    }
    
    with open('missing_prerequisites_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\n\nRelatorio salvo em: missing_prerequisites_report.json")

if __name__ == '__main__':
    main()


