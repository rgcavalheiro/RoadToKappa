#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para importar quests do Prapor da API tarkov.dev
"""

import requests
import json
import sys
import io
from pathlib import Path
from datetime import datetime

# Corrigir encoding no Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

API_URL = 'https://api.tarkov.dev/graphql'

def get_traders():
    """Buscar lista de traders"""
    query = {
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
        response = requests.post(API_URL, json=query, timeout=10)
        response.raise_for_status()
        data = response.json()
        return data.get('data', {}).get('traders', [])
    except Exception as e:
        print(f"Erro ao buscar traders: {e}")
        return []

def get_prapor_quests():
    """Buscar quests do Prapor"""
    # Primeiro, vamos buscar o ID do Prapor
    traders = get_traders()
    prapor_id = None
    
    for trader in traders:
        if trader.get('name', '').lower() == 'prapor':
            prapor_id = trader.get('id')
            print(f"[OK] Prapor encontrado! ID: {prapor_id}")
            break
    
    if not prapor_id:
        print("[ERRO] Prapor nao encontrado na lista de traders")
        return []
    
    # Agora buscar as tasks (quests) do Prapor
    # A API usa "tasks" e filtra por "faction" (que é o trader)
    query = {
        "query": """
        {
            tasks(faction: "Prapor", lang: en) {
                id
                name
                wikiLink
                kappaRequired
                objectives {
                    id
                    type
                    description
                }
                taskRequirements {
                    task {
                        id
                        name
                    }
                }
                trader {
                    id
                    name
                }
            }
        }
        """
    }
    
    try:
        print(f"\n[INFO] Buscando quests do Prapor na API...")
        response = requests.post(API_URL, json=query, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        if 'errors' in data:
            print(f"[ERRO] Erro na API: {data['errors']}")
            return None
        
        tasks = data.get('data', {}).get('tasks', [])
        
        if not tasks:
            print("[ERRO] Nenhuma task encontrada")
            return None
        
        # Pegar informações do trader da primeira task
        trader_info = tasks[0].get('trader', {}) if tasks else {}
        trader_name = trader_info.get('name', 'Prapor')
        
        # Garantir que o nome está correto (a API pode retornar diferente)
        if 'prapor' in trader_name.lower() or prapor_id == trader_info.get('id'):
            trader_name = 'Prapor'
        
        print(f"[OK] {len(tasks)} tasks encontradas!")
        return {
            'trader': {
                'id': trader_info.get('id', prapor_id),
                'name': trader_name
            },
            'quests': tasks
        }
    except Exception as e:
        print(f"[ERRO] Erro ao buscar quests: {e}")
        import traceback
        traceback.print_exc()
        return None

def generate_quest_id(quest_name):
    """Gera um ID legível baseado no nome da quest"""
    if not quest_name:
        return ''
    
    # Converter para lowercase e substituir espaços e caracteres especiais
    quest_id = quest_name.lower()
    quest_id = quest_id.replace(' - ', '_')
    quest_id = quest_id.replace(' ', '_')
    quest_id = quest_id.replace("'", '')
    quest_id = quest_id.replace('-', '_')
    quest_id = quest_id.replace(':', '')
    quest_id = quest_id.replace(',', '')
    # Remover caracteres especiais
    quest_id = ''.join(c if c.isalnum() or c == '_' else '' for c in quest_id)
    # Remover underscores duplicados
    while '__' in quest_id:
        quest_id = quest_id.replace('__', '_')
    # Remover underscore no início/fim
    quest_id = quest_id.strip('_')
    
    return quest_id

def convert_to_database_format(api_data):
    """Converter dados da API para o formato do nosso banco"""
    if not api_data:
        return None
    
    trader = api_data['trader']
    quests = api_data['quests']
    
    # Criar estrutura no formato do nosso banco
    npc_id = 'prapor'
    trader_name = 'Prapor'  # Sempre Prapor para este script
    
    # Criar mapa de ID da API -> ID legível para pré-requisitos
    api_id_to_legible_id = {}
    
    database_data = {
        "version": "1.0.0",
        "last_updated": "",
        "npcs": {
            npc_id: {
                "name": trader_name,
                "quests": []
            }
        }
    }
    
    # Primeiro, criar o mapa de IDs
    for quest in quests:
        api_id = quest.get('id', '')
        quest_name = quest.get('name', '')
        legible_id = generate_quest_id(quest_name)
        if api_id and legible_id:
            api_id_to_legible_id[api_id] = legible_id
    
    # Filtrar apenas quests do Prapor (verificar pelo trader)
    prapor_id = '54cb50c76803fa8b248b4571'
    prapor_quests = []
    
    for quest in quests:
        quest_trader = quest.get('trader', {})
        if quest_trader.get('id') == prapor_id:
            prapor_quests.append(quest)
    
    print(f"[INFO] Filtrando quests do Prapor: {len(prapor_quests)} de {len(quests)} total")
    
    # Converter cada quest do Prapor
    for quest in prapor_quests:
        quest_name = quest.get('name', '')
        legible_id = generate_quest_id(quest_name)
        
        quest_data = {
            "id": legible_id,
            "name": quest_name,
            "tier": None,  # A API não fornece tier diretamente
            "prerequisites": [],
            "wikiUrl": quest.get('wikiLink', ''),
            "kappaRequired": quest.get('kappaRequired', False)
        }
        
        # Extrair pré-requisitos das taskRequirements e converter IDs
        task_requirements = quest.get('taskRequirements', [])
        if task_requirements:
            for req in task_requirements:
                task = req.get('task')
                if task:
                    api_prereq_id = task.get('id', '')
                    # Converter para ID legível
                    legible_prereq_id = api_id_to_legible_id.get(api_prereq_id)
                    if legible_prereq_id:
                        quest_data['prerequisites'].append(legible_prereq_id)
        
        database_data['npcs'][npc_id]['quests'].append(quest_data)
    
    return database_data

def save_to_database(database_data):
    """Salvar dados no arquivo quests-database.json"""
    if not database_data:
        print("[ERRO] Nenhum dado para salvar")
        return False
    
    database_data['last_updated'] = datetime.now().isoformat()
    
    filepath = Path('quests-database.json')
    
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(database_data, f, indent=2, ensure_ascii=False)
        print(f"\n[OK] Dados salvos em {filepath}")
        print(f"   Total de quests: {len(database_data['npcs']['prapor']['quests'])}")
        return True
    except Exception as e:
        print(f"[ERRO] Erro ao salvar arquivo: {e}")
        return False

def main():
    print("=" * 80)
    print("IMPORTAÇÃO DE QUESTS DO PRAPOR - API TARKOV.DEV")
    print("=" * 80)
    
    # Buscar dados da API
    api_data = get_prapor_quests()
    
    if not api_data:
        print("\n[ERRO] Falha ao buscar dados da API")
        return
    
    # Converter para formato do banco
    print("\n[INFO] Convertendo dados para formato do banco...")
    database_data = convert_to_database_format(api_data)
    
    if not database_data:
        print("[ERRO] Falha ao converter dados")
        return
    
    # Salvar no arquivo
    print("\n[INFO] Salvando dados...")
    if save_to_database(database_data):
        print("\n[OK] Importacao concluida com sucesso!")
    else:
        print("\n[ERRO] Falha ao salvar dados")

if __name__ == '__main__':
    main()

