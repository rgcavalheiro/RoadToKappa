#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import requests
import json
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

API_URL = 'https://api.tarkov.dev/graphql'

# Testar diferentes queries
queries = [
    {'name': 'Quests simples', 'query': '{ quests { id name } }'},
    {'name': 'Quests com trader filter', 'query': '{ quests(trader: "54cb50c76803fa8b248b4571") { id name trader { name } } }'},
    {'name': 'Traders com estrutura', 'query': '{ traders { id name } }'},
]

for test in queries:
    print(f"\n{'='*60}")
    print(f"Teste: {test['name']}")
    print('='*60)
    try:
        r = requests.post(API_URL, json={'query': test['query']}, timeout=10)
        data = r.json()
        
        if 'errors' in data:
            print(f"ERRO: {data['errors']}")
        else:
            result = data.get('data', {})
            if 'quests' in result:
                quests = result['quests']
                print(f"Quests encontradas: {len(quests)}")
                if quests:
                    print(f"Primeira quest: {json.dumps(quests[0], indent=2, ensure_ascii=False)[:300]}")
            elif 'traders' in result:
                traders = result['traders']
                print(f"Traders encontrados: {len(traders)}")
                if traders:
                    print(f"Primeiro trader: {json.dumps(traders[0], indent=2, ensure_ascii=False)[:200]}")
    except Exception as e:
        print(f"EXCEÇÃO: {e}")

