#!/usr/bin/env python3
"""
Script para simular a disponibilidade de quests baseado nos pré-requisitos
Isso ajuda a identificar quests que deveriam estar disponíveis mas não estão aparecendo
"""

import json
from collections import defaultdict

def load_database():
    """Carrega o banco de dados de quests"""
    try:
        with open('quests-database.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("ERRO: Arquivo quests-database.json nao encontrado!")
        return None

def build_quest_index(data):
    """Cria um índice de todas as quests por ID"""
    quest_by_id = {}  # {quest_id: (npc_id, quest)}
    
    for npc_id, npc_data in data.get('npcs', {}).items():
        for quest in npc_data.get('quests', []):
            quest_id = quest.get('id')
            if quest_id:
                quest_by_id[quest_id] = (npc_id, quest)
    
    return quest_by_id

def are_all_prerequisites_met(quest, npc_id, completed_quests, quest_by_id):
    """Verifica se todos os pré-requisitos de uma quest foram completados"""
    prerequisites = quest.get('prerequisites', [])
    prerequisites_external = quest.get('prerequisitesExternal', [])
    all_prereqs = prerequisites + prerequisites_external
    
    if not all_prereqs:
        return True
    
    # Verificar cada pré-requisito
    for prereq_id in all_prereqs:
        if prereq_id not in quest_by_id:
            # Pré-requisito não existe - quest bloqueada
            return False
        
        if prereq_id not in completed_quests:
            # Pré-requisito não foi completado
            return False
    
    return True

def simulate_quest_availability(data, quest_by_id, initial_completed=None):
    """Simula quais quests estão disponíveis baseado nos pré-requisitos"""
    if initial_completed is None:
        initial_completed = set()
    
    completed_quests = set(initial_completed)
    available_quests = defaultdict(list)  # {npc_id: [quest_ids]}
    locked_quests = defaultdict(list)  # {npc_id: [quest_ids]}
    
    # Primeira passagem: encontrar quests sem pré-requisitos
    for npc_id, npc_data in data.get('npcs', {}).items():
        for quest in npc_data.get('quests', []):
            quest_id = quest.get('id')
            prerequisites = quest.get('prerequisites', [])
            prerequisites_external = quest.get('prerequisitesExternal', [])
            
            if not prerequisites and not prerequisites_external:
                # Quest sem pré-requisitos - sempre disponível
                if quest_id not in completed_quests:
                    available_quests[npc_id].append({
                        'id': quest_id,
                        'name': quest.get('name', 'Unknown'),
                        'reason': 'Sem pre-requisitos'
                    })
            else:
                # Verificar se todos os pré-requisitos foram completados
                if are_all_prerequisites_met(quest, npc_id, completed_quests, quest_by_id):
                    if quest_id not in completed_quests:
                        available_quests[npc_id].append({
                            'id': quest_id,
                            'name': quest.get('name', 'Unknown'),
                            'reason': 'Pre-requisitos completos'
                        })
                else:
                    # Encontrar quais pré-requisitos estão faltando
                    missing = []
                    all_prereqs = prerequisites + prerequisites_external
                    for prereq_id in all_prereqs:
                        if prereq_id not in completed_quests:
                            prereq_npc, prereq_quest = quest_by_id.get(prereq_id, (None, None))
                            if prereq_quest:
                                missing.append({
                                    'id': prereq_id,
                                    'name': prereq_quest.get('name', 'Unknown'),
                                    'npc': prereq_npc
                                })
                    
                    locked_quests[npc_id].append({
                        'id': quest_id,
                        'name': quest.get('name', 'Unknown'),
                        'missing_prerequisites': missing
                    })
    
    return available_quests, locked_quests

def print_simulation_report(available_quests, locked_quests, data):
    """Imprime relatório da simulação"""
    print("\n" + "=" * 80)
    print("SIMULACAO DE DISPONIBILIDADE DE QUESTS")
    print("=" * 80)
    
    total_available = sum(len(quests) for quests in available_quests.values())
    total_locked = sum(len(quests) for quests in locked_quests.values())
    
    print(f"\nTotal de quests disponiveis: {total_available}")
    print(f"Total de quests bloqueadas: {total_locked}")
    
    # Quests disponíveis por NPC
    print("\n" + "-" * 80)
    print("QUESTS DISPONIVEIS POR NPC:")
    print("-" * 80)
    
    for npc_id in sorted(available_quests.keys()):
        npc_name = data['npcs'][npc_id]['name']
        quests = available_quests[npc_id]
        
        if quests:
            print(f"\n  {npc_name} ({len(quests)} quests disponiveis):")
            for quest in quests:
                print(f"    - {quest['name']} (ID: {quest['id']})")
                print(f"      Razao: {quest['reason']}")
        else:
            print(f"\n  {npc_name}: Nenhuma quest disponivel")
    
    # Quests bloqueadas por NPC
    if total_locked > 0:
        print("\n" + "-" * 80)
        print("QUESTS BLOQUEADAS POR NPC:")
        print("-" * 80)
        
        for npc_id in sorted(locked_quests.keys()):
            npc_name = data['npcs'][npc_id]['name']
            quests = locked_quests[npc_id]
            
            if quests:
                print(f"\n  {npc_name} ({len(quests)} quests bloqueadas):")
                for quest in quests[:10]:  # Mostrar apenas as primeiras 10
                    print(f"    - {quest['name']} (ID: {quest['id']})")
                    if quest['missing_prerequisites']:
                        print(f"      Pre-requisitos faltando:")
                        for prereq in quest['missing_prerequisites'][:3]:  # Mostrar apenas os primeiros 3
                            print(f"        - {prereq['name']} ({prereq['npc']})")
                
                if len(quests) > 10:
                    print(f"    ... e mais {len(quests) - 10} quests bloqueadas")

def main():
    """Função principal"""
    print("Carregando quests-database.json...")
    data = load_database()
    
    if not data:
        return 1
    
    print("Construindo indice de quests...")
    quest_by_id = build_quest_index(data)
    
    print(f"Total de quests: {len(quest_by_id)}")
    
    print("\nSimulando disponibilidade de quests (progresso inicial vazio)...")
    available_quests, locked_quests = simulate_quest_availability(data, quest_by_id)
    
    print_simulation_report(available_quests, locked_quests, data)
    
    # Salvar relatório
    report = {
        'available_quests': {
            npc_id: quests for npc_id, quests in available_quests.items()
        },
        'locked_quests': {
            npc_id: quests for npc_id, quests in locked_quests.items()
        }
    }
    
    with open('quest_availability_simulation.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print("\n" + "=" * 80)
    print("Relatorio salvo em: quest_availability_simulation.json")
    print("=" * 80)
    
    return 0

if __name__ == '__main__':
    exit(main())

