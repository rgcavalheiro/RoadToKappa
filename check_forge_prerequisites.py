#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import requests
import json
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

API_URL = 'https://api.tarkov.dev/graphql'

query = {
    "query": """
    {
        tasks(lang: en) {
            id
            name
            trader {
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

for task in tasks:
    if 'Forge a Friendship' in task.get('name', ''):
        print(f"\nQuest: {task.get('name')}")
        print(f"Trader: {task.get('trader', {}).get('name')}")
        reqs = task.get('taskRequirements', [])
        print(f"Pré-requisitos ({len(reqs)}):")
        for req in reqs:
            req_task = req.get('task', {})
            print(f"  - {req_task.get('name')} (Trader: {req_task.get('trader', {}).get('name')})")

