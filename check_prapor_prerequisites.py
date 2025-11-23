#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para verificar pré-requisitos das quests do Prapor na API tarkov.dev
"""

import requests
import json
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

API_URL = 'https://api.tarkov.dev/graphql'

# Quests problemáticas que estão aparecendo sem pré-requisitos
PROBLEM_QUESTS = [
    "Polikhim Hobo",
    "Green Corridor",
    "Shipping Delay - Part 1",
    "Forge a Friendship",
    "The Good Times - Part 2",
    "Viewer",
    "Grenadier"
]

def get_prapor_quests():
    """Buscar todas as quests do Prapor"""
    # Primeiro buscar o trader Prapor
    traders_query = {
        "query": """
        {
            traders {
                id
                name
            }
        }
        """
    }
    
    try:
        response = requests.post(API_URL, json=traders_query, timeout=10)
        response.raise_for_status()
        data = response.json()
        traders = data.get('data', {}).get('traders', [])
        
        prapor_id = None
        for trader in traders:
            if trader.get('name', '').lower() == 'prapor':
                prapor_id = trader.get('id')
                break
        
        if not prapor_id:
            print("[ERRO] Prapor não encontrado na lista de traders")
            return []
        
        # Agora buscar todas as tasks e filtrar por trader
        query = {
            "query": """
            {
                tasks(lang: en) {
                    id
                    name
                    trader {
                        id
                        name
                    }
                    taskRequirements {
                        task {
                            id
                            name
                        }
                    }
                }
            }
            """
        }
        
        response = requests.post(API_URL, json=query, timeout=30)
        response.raise_for_status()
        data = response.json()
        tasks = data.get('data', {}).get('tasks', [])
        
        # Filtrar apenas quests do Prapor
        prapor_tasks = []
        for task in tasks:
            trader = task.get('trader', {})
            if trader.get('id') == prapor_id:
                prapor_tasks.append(task)
        
        return prapor_tasks
    except Exception as e:
        print(f"Erro ao buscar quests: {e}")
        import traceback
        traceback.print_exc()
        return []

def find_quest_by_name(tasks, quest_name):
    """Encontrar quest pelo nome"""
    for task in tasks:
        if task.get('name', '').strip() == quest_name.strip():
            return task
    return None

def main():
    print("=" * 80)
    print("VERIFICANDO PRÉ-REQUISITOS DAS QUESTS PROBLEMÁTICAS")
    print("=" * 80)
    
    # Buscar todas as quests do Prapor
    print("\n[INFO] Buscando quests do Prapor na API...")
    prapor_tasks = get_prapor_quests()
    print(f"[INFO] Encontradas {len(prapor_tasks)} quests do Prapor")
    
    print("\n" + "=" * 80)
    print("ANÁLISE DAS QUESTS PROBLEMÁTICAS")
    print("=" * 80)
    
    for quest_name in PROBLEM_QUESTS:
        print(f"\n{'=' * 80}")
        print(f"Quest: {quest_name}")
        print('=' * 80)
        
        quest = find_quest_by_name(prapor_tasks, quest_name)
        
        if not quest:
            print(f"  ⚠ Quest '{quest_name}' NÃO encontrada na API!")
            continue
        
        requirements = quest.get('taskRequirements', [])
        
        if not requirements:
            print(f"  ✓ Quest '{quest_name}' realmente NÃO tem pré-requisitos na API")
        else:
            print(f"  ⚠ Quest '{quest_name}' TEM {len(requirements)} pré-requisito(s) na API:")
            for req in requirements:
                req_task = req.get('task', {})
                req_name = req_task.get('name', 'Unknown')
                req_id = req_task.get('id', 'Unknown')
                print(f"    - {req_name} (ID: {req_id})")

if __name__ == '__main__':
    main()

