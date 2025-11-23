#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import requests
import json
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

API_URL = 'https://api.tarkov.dev/graphql'

# Buscar traders primeiro
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

response = requests.post(API_URL, json=traders_query, timeout=10)
data = response.json()
traders = data.get('data', {}).get('traders', [])

prapor_id = None
for trader in traders:
    if trader.get('name', '').lower() == 'prapor':
        prapor_id = trader.get('id')
        break

# Buscar todas as tasks
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
                    trader {
                        name
                    }
                }
            }
        }
    }
    """
}

response = requests.post(API_URL, json=query, timeout=30)
data = response.json()
tasks = data.get('data', {}).get('tasks', [])

# Filtrar apenas do Prapor
prapor_tasks = [t for t in tasks if t.get('trader', {}).get('id') == prapor_id]

# Encontrar Test Drive - Part 1
for task in prapor_tasks:
    if 'Test Drive - Part 1' in task.get('name', ''):
        print(f"\nQuest: {task.get('name')}")
        print(f"Trader: {task.get('trader', {}).get('name')}")
        reqs = task.get('taskRequirements', [])
        print(f"Pré-requisitos ({len(reqs)}):")
        if not reqs:
            print("  ✓ Nenhum pré-requisito na API")
        else:
            for req in reqs:
                req_task = req.get('task', {})
                req_name = req_task.get('name', 'Unknown')
                req_trader = req_task.get('trader', {}).get('name', 'Unknown')
                print(f"  - {req_name} (Trader: {req_trader})")
        break

