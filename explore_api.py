#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import requests
import json
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

API_URL = 'https://api.tarkov.dev/graphql'

# Introspection query para descobrir a estrutura
introspection_query = {
    "query": """
    {
        __type(name: "Quest") {
            name
            fields {
                name
                type {
                    name
                    kind
                }
            }
        }
    }
    """
}

print("Explorando estrutura da API Quest...")
try:
    r = requests.post(API_URL, json=introspection_query, timeout=10)
    data = r.json()
    
    if 'errors' in data:
        print(f"ERRO: {data['errors']}")
    else:
        quest_type = data.get('data', {}).get('__type')
        if quest_type:
            print(f"\nCampos disponíveis em Quest:")
            for field in quest_type.get('fields', []):
                field_type = field.get('type', {})
                type_name = field_type.get('name') or field_type.get('kind', '')
                print(f"  - {field['name']}: {type_name}")
        else:
            print("Tipo Quest não encontrado")
            
    # Tentar buscar quests com campos básicos
    print("\n" + "="*60)
    print("Tentando buscar quests...")
    
    # Testar com __schema para ver Query type
    schema_query = {
        "query": """
        {
            __schema {
                queryType {
                    fields {
                        name
                        args {
                            name
                            type {
                                name
                            }
                        }
                    }
                }
            }
        }
        """
    }
    
    r2 = requests.post(API_URL, json=schema_query, timeout=10)
    data2 = r2.json()
    
    if 'data' in data2:
        query_fields = data2['data']['__schema']['queryType']['fields']
        print("\nCampos disponíveis em Query:")
        for field in query_fields:
            args = [arg['name'] for arg in field.get('args', [])]
            print(f"  - {field['name']}({', '.join(args) if args else 'sem args'})")
            
except Exception as e:
    print(f"EXCEÇÃO: {e}")
    import traceback
    traceback.print_exc()

