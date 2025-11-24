#!/usr/bin/env python3
"""
Script para identificar e corrigir automaticamente pré-requisitos faltando
baseado em referências cruzadas e padrões conhecidos
"""

import json
import re

def load_database():
    with open('quests-database.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def build_index(data):
    quest_by_id = {}
    quest_name_to_id = {}  # Mapeia nome normalizado para ID
    
    for npc_id, npc_data in data.get('npcs', {}).items():
        for quest in npc_data.get('quests', []):
            quest_id = quest.get('id')
            quest_name = quest.get('name', '')
            if quest_id:
                quest_by_id[quest_id] = (npc_id, quest)
                # Normalizar nome para busca
                normalized = quest_name.lower().strip()
                quest_name_to_id[normalized] = (npc_id, quest_id, quest)
    
    return quest_by_id, quest_name_to_id

def normalize_quest_name(name):
    """Normaliza nome da quest para comparação"""
    # Remover "Part X", "- Part X", etc para encontrar base
    name = re.sub(r'\s*-\s*part\s+\d+.*', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s*part\s+\d+.*', '', name, flags=re.IGNORECASE)
    return name.lower().strip()

def find_missing_part_prerequisites(data, quest_by_id, quest_name_to_id):
    """Encontra quests Part que faltam a parte anterior"""
    fixes = []
    
    for npc_id, npc_data in data.get('npcs', {}).items():
        for quest in npc_data.get('quests', []):
            quest_id = quest.get('id')
            quest_name = quest.get('name', '')
            prerequisites = quest.get('prerequisites', [])
            prerequisites_external = quest.get('prerequisitesExternal', [])
            all_prereqs = prerequisites + prerequisites_external
            
            # Verificar se é Part 2, 3, 4, etc
            part_match = re.search(r'part\s+(\d+)', quest_name, re.IGNORECASE)
            if part_match:
                part_num = int(part_match.group(1))
                if part_num > 1:
                    # Buscar parte anterior
                    base_name = normalize_quest_name(quest_name)
                    
                    # Tentar encontrar Part anterior
                    for prev_num in range(part_num - 1, 0, -1):
                        # Tentar diferentes formatos
                        patterns = [
                            f"{base_name} part {prev_num}",
                            f"{base_name} - part {prev_num}",
                            f"{base_name}part {prev_num}",
                        ]
                        
                        found = False
                        for pattern in patterns:
                            if pattern in quest_name_to_id:
                                prev_npc, prev_id, prev_quest = quest_name_to_id[pattern]
                                
                                if prev_id not in all_prereqs:
                                    # Determinar se é mesmo NPC ou externo
                                    if prev_npc == npc_id:
                                        location = 'prerequisites'
                                    else:
                                        location = 'prerequisitesExternal'
                                    
                                    fixes.append({
                                        'npc': npc_data.get('name'),
                                        'quest_id': quest_id,
                                        'quest_name': quest_name,
                                        'add_prerequisite': prev_id,
                                        'prerequisite_name': prev_quest.get('name'),
                                        'location': location,
                                        'reason': f'Part {part_num} deve ter Part {prev_num} como pre-requisito'
                                    })
                                    found = True
                                    break
                        
                        if found:
                            break
    
    return fixes

def find_quests_referenced_but_no_prereq(data, quest_by_id):
    """Encontra quests que são referenciadas por outras mas não têm pré-requisitos"""
    fixes = []
    
    # Mapear quais quests referenciam quais
    referenced_by = {}  # {quest_id: [lista de quests que a referenciam]}
    
    for npc_id, npc_data in data.get('npcs', {}).items():
        for quest in npc_data.get('quests', []):
            quest_id = quest.get('id')
            prerequisites = quest.get('prerequisites', [])
            prerequisites_external = quest.get('prerequisitesExternal', [])
            
            for prereq_id in prerequisites + prerequisites_external:
                if prereq_id not in referenced_by:
                    referenced_by[prereq_id] = []
                referenced_by[prereq_id].append((npc_id, quest))
    
    # Verificar quests que são referenciadas mas não têm pré-requisitos
    for quest_id, referencing_quests in referenced_by.items():
        if quest_id not in quest_by_id:
            continue
        
        prereq_npc, prereq_quest = quest_by_id[quest_id]
        prereq_prerequisites = prereq_quest.get('prerequisites', [])
        prereq_prerequisites_external = prereq_quest.get('prerequisitesExternal', [])
        
        # Se a quest não tem pré-requisitos mas é referenciada por outras
        if not prereq_prerequisites and not prereq_prerequisites_external:
            # Verificar se alguma das quests que a referenciam deveria ser pré-requisito
            # (ex: se Part 2 referencia Part 1, Part 1 pode não precisar de pré-requisito)
            # Mas se várias quests diferentes referenciam, pode ser que falte algo
            
            # Por enquanto, só marcar como suspeita se for uma quest "Part" que não tem a parte anterior
            quest_name = prereq_quest.get('name', '').lower()
            if 'part' in quest_name and 'part 1' not in quest_name:
                # Esta é uma quest Part que não tem pré-requisitos, mas outras a referenciam
                # Pode ser que falte a parte anterior
                pass  # Já coberto pela função anterior
    
    return fixes

def apply_fixes(data, fixes):
    """Aplica correções no banco de dados"""
    applied = 0
    skipped = 0
    
    # Agrupar por quest para evitar duplicatas
    fixes_by_quest = {}
    for fix in fixes:
        key = (fix['quest_id'], fix['add_prerequisite'])
        if key not in fixes_by_quest:
            fixes_by_quest[key] = fix
    
    for fix in fixes_by_quest.values():
        npc_id = None
        for nid, npc_data in data.get('npcs', {}).items():
            if npc_data.get('name') == fix['npc']:
                npc_id = nid
                break
        
        if not npc_id:
            skipped += 1
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
    
    return applied, skipped

def main():
    print("=" * 80)
    print("CORRECAO AUTOMATICA DE PRE-REQUISITOS")
    print("=" * 80)
    
    print("\nCarregando banco de dados...")
    data = load_database()
    
    print("Construindo indices...")
    quest_by_id, quest_name_to_id = build_index(data)
    
    print(f"Total de quests: {len(quest_by_id)}")
    
    print("\nProcurando quests Part que faltam pre-requisitos...")
    fixes = find_missing_part_prerequisites(data, quest_by_id, quest_name_to_id)
    
    if fixes:
        print(f"\n[INFO] Encontradas {len(fixes)} correcoes necessarias:\n")
        for fix in fixes:
            print(f"  - {fix['quest_name']} ({fix['npc']})")
            print(f"    Adicionar: {fix['prerequisite_name']} em {fix['location']}")
            print(f"    Razao: {fix['reason']}\n")
        
        print(f"\nAplicando correcoes...")
        applied, skipped = apply_fixes(data, fixes)
        
        if applied > 0:
            print(f"\n[OK] {applied} correcao(oes) aplicada(s)!")
            if skipped > 0:
                print(f"[AVISO] {skipped} correcao(oes) pulada(s)")
            print("Salvando banco de dados...")
            with open('quests-database.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print("[OK] Banco de dados salvo!")
        else:
            print("\n[AVISO] Nenhuma correcao foi aplicada")
    else:
        print("\n[OK] Nenhuma correcao necessaria encontrada para quests Part!")
    
    # Validar após correções
    print("\n" + "=" * 80)
    print("VALIDANDO PRE-REQUISITOS APOS CORRECOES...")
    print("=" * 80)
    
    import subprocess
    result = subprocess.run(['python', 'validate_prerequisites.py'], 
                          capture_output=True, text=True, encoding='utf-8', errors='ignore')
    print(result.stdout)
    if result.stderr:
        print(result.stderr)

if __name__ == '__main__':
    main()


