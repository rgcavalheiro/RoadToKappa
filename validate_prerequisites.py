#!/usr/bin/env python3
"""
Script para validar pré-requisitos das missões no quests-database.json
Verifica:
- IDs de pré-requisitos que não existem
- Referências circulares
- Quests que deveriam estar disponíveis mas não estão
- Pré-requisitos externos incorretos
"""

import json
from collections import defaultdict, deque

def load_database():
    """Carrega o banco de dados de quests"""
    try:
        with open('quests-database.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("ERRO: Arquivo quests-database.json não encontrado!")
        return None
    except json.JSONDecodeError as e:
        print(f"ERRO: JSON inválido: {e}")
        return None

def build_quest_index(data):
    """Cria um índice de todas as quests por ID e NPC"""
    quest_by_id = {}  # {quest_id: (npc_id, quest)}
    quest_by_npc = defaultdict(dict)  # {npc_id: {quest_id: quest}}
    
    for npc_id, npc_data in data.get('npcs', {}).items():
        for quest in npc_data.get('quests', []):
            quest_id = quest.get('id')
            if quest_id:
                quest_by_id[quest_id] = (npc_id, quest)
                quest_by_npc[npc_id][quest_id] = quest
    
    return quest_by_id, quest_by_npc

def validate_prerequisite_ids(data, quest_by_id):
    """Valida se todos os IDs de pré-requisitos existem"""
    errors = []
    warnings = []
    
    for npc_id, npc_data in data.get('npcs', {}).items():
        for quest in npc_data.get('quests', []):
            quest_id = quest.get('id')
            quest_name = quest.get('name', 'Unknown')
            
            # Verificar prerequisites (mesmo NPC)
            prerequisites = quest.get('prerequisites', [])
            for prereq_id in prerequisites:
                if prereq_id not in quest_by_id:
                    errors.append({
                        'type': 'missing_prerequisite',
                        'npc': npc_data.get('name', npc_id),
                        'quest_id': quest_id,
                        'quest_name': quest_name,
                        'prerequisite_id': prereq_id,
                        'prerequisite_type': 'internal'
                    })
                elif quest_by_id[prereq_id][0] != npc_id:
                    # Pré-requisito está em outro NPC, mas está em prerequisites ao invés de prerequisitesExternal
                    warnings.append({
                        'type': 'wrong_prerequisite_type',
                        'npc': npc_data.get('name', npc_id),
                        'quest_id': quest_id,
                        'quest_name': quest_name,
                        'prerequisite_id': prereq_id,
                        'prerequisite_npc': quest_by_id[prereq_id][0],
                        'suggestion': 'Mover para prerequisitesExternal'
                    })
            
            # Verificar prerequisitesExternal (outros NPCs)
            prerequisites_external = quest.get('prerequisitesExternal', [])
            for prereq_id in prerequisites_external:
                if prereq_id not in quest_by_id:
                    errors.append({
                        'type': 'missing_prerequisite',
                        'npc': npc_data.get('name', npc_id),
                        'quest_id': quest_id,
                        'quest_name': quest_name,
                        'prerequisite_id': prereq_id,
                        'prerequisite_type': 'external'
                    })
                elif quest_by_id[prereq_id][0] == npc_id:
                    # Pré-requisito está no mesmo NPC, mas está em prerequisitesExternal
                    warnings.append({
                        'type': 'wrong_prerequisite_type',
                        'npc': npc_data.get('name', npc_id),
                        'quest_id': quest_id,
                        'quest_name': quest_name,
                        'prerequisite_id': prereq_id,
                        'prerequisite_npc': quest_by_id[prereq_id][0],
                        'suggestion': 'Mover para prerequisites'
                    })
    
    return errors, warnings

def detect_circular_dependencies(data, quest_by_id):
    """Detecta dependências circulares"""
    circular = []
    
    def has_cycle(quest_id, visited, rec_stack, path):
        """DFS para detectar ciclos"""
        visited.add(quest_id)
        rec_stack.add(quest_id)
        path.append(quest_id)
        
        if quest_id not in quest_by_id:
            rec_stack.remove(quest_id)
            path.pop()
            return False
        
        _, quest = quest_by_id[quest_id]
        all_prereqs = (quest.get('prerequisites', []) + 
                      quest.get('prerequisitesExternal', []))
        
        for prereq_id in all_prereqs:
            if prereq_id not in quest_by_id:
                continue
            
            if prereq_id not in visited:
                if has_cycle(prereq_id, visited, rec_stack, path):
                    return True
            elif prereq_id in rec_stack:
                # Ciclo detectado
                cycle_start = path.index(prereq_id)
                cycle = path[cycle_start:] + [prereq_id]
                circular.append(cycle)
                return True
        
        rec_stack.remove(quest_id)
        path.pop()
        return False
    
    visited = set()
    for quest_id in quest_by_id.keys():
        if quest_id not in visited:
            has_cycle(quest_id, visited, set(), [])
    
    return circular

def find_orphan_quests(data, quest_by_id):
    """Encontra quests que não têm pré-requisitos mas não aparecem como disponíveis"""
    orphans = []
    
    for npc_id, npc_data in data.get('npcs', {}).items():
        for quest in npc_data.get('quests', []):
            quest_id = quest.get('id')
            prerequisites = quest.get('prerequisites', [])
            prerequisites_external = quest.get('prerequisitesExternal', [])
            
            # Quest sem pré-requisitos deve estar sempre disponível
            if not prerequisites and not prerequisites_external:
                # Verificar se tem algum pré-requisito inválido que está bloqueando
                all_prereqs = prerequisites + prerequisites_external
                invalid_prereqs = [p for p in all_prereqs if p not in quest_by_id]
                
                if invalid_prereqs:
                    orphans.append({
                        'npc': npc_data.get('name', npc_id),
                        'quest_id': quest_id,
                        'quest_name': quest.get('name', 'Unknown'),
                        'invalid_prerequisites': invalid_prereqs
                    })
    
    return orphans

def find_blocked_quests(data, quest_by_id):
    """Encontra quests que deveriam estar disponíveis mas estão bloqueadas por pré-requisitos inválidos"""
    blocked = []
    
    for npc_id, npc_data in data.get('npcs', {}).items():
        for quest in npc_data.get('quests', []):
            quest_id = quest.get('id')
            prerequisites = quest.get('prerequisites', [])
            prerequisites_external = quest.get('prerequisitesExternal', [])
            all_prereqs = prerequisites + prerequisites_external
            
            # Verificar se algum pré-requisito não existe
            invalid_prereqs = [p for p in all_prereqs if p not in quest_by_id]
            
            if invalid_prereqs:
                blocked.append({
                    'npc': npc_data.get('name', npc_id),
                    'quest_id': quest_id,
                    'quest_name': quest.get('name', 'Unknown'),
                    'invalid_prerequisites': invalid_prereqs,
                    'all_prerequisites': all_prereqs
                })
    
    return blocked

def analyze_quest_availability(data, quest_by_id):
    """Analisa quais quests estão disponíveis e quais estão bloqueadas"""
    # Simular progresso vazio (todas as quests disponíveis se não tiverem pré-requisitos)
    available = []
    blocked_by_missing = []
    
    for npc_id, npc_data in data.get('npcs', {}).items():
        for quest in npc_data.get('quests', []):
            quest_id = quest.get('id')
            prerequisites = quest.get('prerequisites', [])
            prerequisites_external = quest.get('prerequisitesExternal', [])
            all_prereqs = prerequisites + prerequisites_external
            
            # Verificar se todos os pré-requisitos existem
            missing_prereqs = [p for p in all_prereqs if p not in quest_by_id]
            
            if missing_prereqs:
                blocked_by_missing.append({
                    'npc': npc_data.get('name', npc_id),
                    'quest_id': quest_id,
                    'quest_name': quest.get('name', 'Unknown'),
                    'missing_prerequisites': missing_prereqs
                })
            elif not all_prereqs:
                # Quest sem pré-requisitos - deve estar disponível
                available.append({
                    'npc': npc_data.get('name', npc_id),
                    'quest_id': quest_id,
                    'quest_name': quest.get('name', 'Unknown')
                })
    
    return available, blocked_by_missing

def print_report(errors, warnings, circular, orphans, blocked, available, blocked_by_missing):
    """Imprime relatório completo"""
    print("\n" + "=" * 80)
    print("RELATORIO DE VALIDACAO DE PRE-REQUISITOS")
    print("=" * 80)
    
    # Erros críticos
    if errors:
        print(f"\n[ERRO] ERROS CRITICOS ({len(errors)}):")
        print("-" * 80)
        for error in errors:
            print(f"  NPC: {error['npc']}")
            print(f"  Quest: {error['quest_name']} (ID: {error['quest_id']})")
            print(f"  Pre-requisito invalido: {error['prerequisite_id']} ({error['prerequisite_type']})")
            print()
    else:
        print("\n[OK] Nenhum erro critico encontrado!")
    
    # Avisos
    if warnings:
        print(f"\n[AVISO] AVISOS ({len(warnings)}):")
        print("-" * 80)
        for warning in warnings:
            print(f"  NPC: {warning['npc']}")
            print(f"  Quest: {warning['quest_name']} (ID: {warning['quest_id']})")
            print(f"  Pre-requisito: {warning['prerequisite_id']} esta em {warning['prerequisite_npc']}")
            print(f"  Sugestao: {warning['suggestion']}")
            print()
    else:
        print("\n[OK] Nenhum aviso encontrado!")
    
    # Dependências circulares
    if circular:
        print(f"\n[CICLO] DEPENDENCIAS CIRCULARES ({len(circular)}):")
        print("-" * 80)
        for cycle in circular:
            print(f"  Ciclo detectado: {' -> '.join(cycle)}")
            print()
    else:
        print("\n[OK] Nenhuma dependencia circular encontrada!")
    
    # Quests órfãs
    if orphans:
        print(f"\n[ORFA] QUESTS ORFAS ({len(orphans)}):")
        print("-" * 80)
        for orphan in orphans:
            print(f"  NPC: {orphan['npc']}")
            print(f"  Quest: {orphan['quest_name']} (ID: {orphan['quest_id']})")
            print(f"  Pre-requisitos invalidos: {', '.join(orphan['invalid_prerequisites'])}")
            print()
    else:
        print("\n[OK] Nenhuma quest orfa encontrada!")
    
    # Quests bloqueadas
    if blocked:
        print(f"\n[BLOQ] QUESTS BLOQUEADAS POR PRE-REQUISITOS INVALIDOS ({len(blocked)}):")
        print("-" * 80)
        for block in blocked:
            print(f"  NPC: {block['npc']}")
            print(f"  Quest: {block['quest_name']} (ID: {block['quest_id']})")
            print(f"  Pre-requisitos invalidos: {', '.join(block['invalid_prerequisites'])}")
            print(f"  Todos os pre-requisitos: {', '.join(block['all_prerequisites']) or 'Nenhum'}")
            print()
    else:
        print("\n[OK] Nenhuma quest bloqueada por pre-requisitos invalidos!")
    
    # Estatísticas
    print("\n" + "=" * 80)
    print("ESTATÍSTICAS")
    print("=" * 80)
    print(f"  Total de erros: {len(errors)}")
    print(f"  Total de avisos: {len(warnings)}")
    print(f"  Dependências circulares: {len(circular)}")
    print(f"  Quests órfãs: {len(orphans)}")
    print(f"  Quests bloqueadas: {len(blocked)}")
    print(f"  Quests disponíveis (sem pré-requisitos): {len(available)}")
    print(f"  Quests bloqueadas por pré-requisitos faltando: {len(blocked_by_missing)}")
    
    # Resumo por NPC
    print("\n" + "=" * 80)
    print("RESUMO POR NPC")
    print("=" * 80)
    
    npc_stats = defaultdict(lambda: {'errors': 0, 'warnings': 0, 'blocked': 0})
    
    for error in errors:
        npc_stats[error['npc']]['errors'] += 1
    for warning in warnings:
        npc_stats[warning['npc']]['warnings'] += 1
    for block in blocked:
        npc_stats[block['npc']]['blocked'] += 1
    
    for npc, stats in sorted(npc_stats.items()):
        print(f"\n  {npc}:")
        print(f"    Erros: {stats['errors']}")
        print(f"    Avisos: {stats['warnings']}")
        print(f"    Bloqueadas: {stats['blocked']}")

def main():
    """Função principal"""
    print("Carregando quests-database.json...")
    data = load_database()
    
    if not data:
        return
    
    print("Construindo índice de quests...")
    quest_by_id, quest_by_npc = build_quest_index(data)
    
    print(f"Total de quests encontradas: {len(quest_by_id)}")
    print(f"Total de NPCs: {len(quest_by_npc)}")
    
    print("\nValidando pré-requisitos...")
    errors, warnings = validate_prerequisite_ids(data, quest_by_id)
    
    print("Detectando dependências circulares...")
    circular = detect_circular_dependencies(data, quest_by_id)
    
    print("Procurando quests órfãs...")
    orphans = find_orphan_quests(data, quest_by_id)
    
    print("Procurando quests bloqueadas...")
    blocked = find_blocked_quests(data, quest_by_id)
    
    print("Analisando disponibilidade de quests...")
    available, blocked_by_missing = analyze_quest_availability(data, quest_by_id)
    
    # Gerar relatório
    print_report(errors, warnings, circular, orphans, blocked, available, blocked_by_missing)
    
    # Salvar relatório em arquivo
    report = {
        'errors': errors,
        'warnings': warnings,
        'circular_dependencies': circular,
        'orphan_quests': orphans,
        'blocked_quests': blocked,
        'available_quests': available,
        'blocked_by_missing': blocked_by_missing
    }
    
    with open('prerequisites_validation_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print("\n" + "=" * 80)
    print("Relatório salvo em: prerequisites_validation_report.json")
    print("=" * 80)
    
    # Retornar código de saída baseado em erros
    if errors:
        print("\n[ERRO] Validacao falhou! Corrija os erros antes de continuar.")
        return 1
    elif warnings:
        print("\n[AVISO] Validacao concluida com avisos.")
        return 0
    else:
        print("\n[OK] Validacao concluida com sucesso!")
        return 0

if __name__ == '__main__':
    exit(main())

