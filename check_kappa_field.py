#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import requests
import json
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

API_URL = 'https://api.tarkov.dev/graphql'

# Buscar uma task para ver todos os campos disponíveis
query = {
    "query": """
    {
        tasks(faction: "Prapor", lang: en, limit: 1) {
            id
            name
        }
    }
    """
}

# Introspection para ver campos do Task
introspection = {
    "query": """
    {
        __type(name: "Task") {
            name
            fields {
                name
                type {
                    name
                    kind
                    ofType {
                        name
                        kind
                    }
                }
            }
        }
    }
    """
}

print("Verificando campos disponíveis em Task...")
try:
    r = requests.post(API_URL, json=introspection, timeout=10)
    data = r.json()
    
    if 'data' in data:
        task_type = data['data']['__type']
        print(f"\nCampos disponíveis em Task ({len(task_type['fields'])} campos):")
        print("=" * 60)
        
        for field in task_type['fields']:
            field_name = field['name']
            field_type = field['type']
            type_name = field_type.get('name') or field_type.get('kind', '')
            
            # Destacar campos relacionados a kappa
            highlight = ""
            if 'kappa' in field_name.lower() or 'collector' in field_name.lower():
                highlight = " <-- POSSÍVEL CAMPO KAPPA!"
            
            print(f"  - {field_name}: {type_name}{highlight}")
            
except Exception as e:
    print(f"Erro: {e}")
    import traceback
    traceback.print_exc()

