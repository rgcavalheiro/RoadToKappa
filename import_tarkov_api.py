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

def get_trader_quests(trader_name):
    """Buscar quests de um trader específico"""
    # Primeiro, vamos buscar o ID do trader
    traders = get_traders()
    trader_id = None
    
    for trader in traders:
        if trader.get('name', '').lower() == trader_name.lower():
            trader_id = trader.get('id')
            print(f"[OK] {trader_name} encontrado! ID: {trader_id}")
            break
    
    if not trader_id:
        print(f"[ERRO] {trader_name} nao encontrado na lista de traders")
        return None
    
    # Agora buscar TODAS as tasks (a API não filtra bem por faction)
    # Vamos buscar todas e filtrar pelo trader.id depois
    query = {
        "query": """
        {
            tasks(lang: en) {
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
        print(f"\n[INFO] Buscando quests do {trader_name} na API...")
        response = requests.post(API_URL, json=query, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        if 'errors' in data:
            print(f"[ERRO] Erro na API: {data['errors']}")
            return None
        
        all_tasks = data.get('data', {}).get('tasks', [])
        
        if not all_tasks:
            print(f"[ERRO] Nenhuma task encontrada na API")
            return None
        
        # Filtrar apenas tasks do trader específico
        trader_tasks = []
        for task in all_tasks:
            task_trader = task.get('trader', {})
            task_trader_id = task_trader.get('id')
            if task_trader_id == trader_id:
                trader_tasks.append(task)
        
        if not trader_tasks:
            print(f"[ERRO] Nenhuma task encontrada para {trader_name} (ID: {trader_id})")
            return None
        
        # Pegar informações do trader da primeira task filtrada
        trader_info = trader_tasks[0].get('trader', {}) if trader_tasks else {}
        actual_trader_name = trader_info.get('name', trader_name)
        
        print(f"[OK] {len(trader_tasks)} tasks encontradas para {trader_name} (de {len(all_tasks)} total)")
        return {
            'trader': {
                'id': trader_info.get('id', trader_id),
                'name': actual_trader_name
            },
            'quests': trader_tasks
        }
    except Exception as e:
        print(f"[ERRO] Erro ao buscar quests: {e}")
        import traceback
        traceback.print_exc()
        return None

def generate_quest_id(quest_name, existing_ids=None, api_id=None):
    """Gera um ID legível baseado no nome da quest"""
    if not quest_name:
        # Fallback: usar parte do API ID se disponível
        if api_id:
            return f"quest_{api_id[:8]}"
        return 'unknown_quest'
    
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
    
    # Se ID vazio após processamento, usar fallback
    if not quest_id:
        if api_id:
            return f"quest_{api_id[:8]}"
        return 'unknown_quest'
    
    # Detectar e resolver IDs duplicados
    if existing_ids is not None:
        if quest_id in existing_ids:
            counter = 1
            original_id = quest_id
            while f"{original_id}_{counter}" in existing_ids:
                counter += 1
            quest_id = f"{original_id}_{counter}"
            print(f"[WARN] ID duplicado detectado! '{original_id}' -> '{quest_id}'")
    
    return quest_id

def validate_prerequisites(prereq_id, all_quest_ids, current_npc_id, current_import_ids=None):
    """Valida se o pré-requisito existe no banco atual"""
    # Primeiro, verificar se está nas quests sendo importadas AGORA (mesmo NPC)
    if current_import_ids and prereq_id in current_import_ids:
        return True, 'same_npc'
    
    # Verificar no mesmo NPC (banco existente)
    if current_npc_id in all_quest_ids:
        if prereq_id in all_quest_ids[current_npc_id]:
            return True, 'same_npc'
    
    # Verificar em outros NPCs já importados
    for other_npc_id, quest_ids in all_quest_ids.items():
        if other_npc_id != current_npc_id and prereq_id in quest_ids:
            return True, 'other_npc'
    
    # Pré-requisito não encontrado (pode ser de NPC não importado)
    return False, 'missing'

def convert_to_database_format(api_data, existing_database=None, npc_id_override=None, trader_name_override=None):
    """Converter dados da API para o formato do nosso banco"""
    if not api_data:
        return None
    
    trader = api_data['trader']
    quests = api_data['quests']
    
    # Usar nome do trader passado como parâmetro ou o da API
    trader_name = trader_name_override if trader_name_override else trader.get('name', '')
    
    # Determinar NPC ID
    if npc_id_override:
        npc_id = npc_id_override
    else:
        # Gerar NPC ID baseado no nome
        npc_id = trader_name.lower().replace(' ', '_').replace("'", '')
    
    # Carregar quests existentes de outros NPCs para validação de pré-requisitos
    all_quest_ids = {}
    if existing_database and 'npcs' in existing_database:
        for existing_npc_id, existing_npc in existing_database['npcs'].items():
            all_quest_ids[existing_npc_id] = {q['id'] for q in existing_npc.get('quests', [])}
    
    # As quests já vêm filtradas da API, mas vamos garantir
    trader_id = trader.get('id')
    trader_quests = []
    
    for quest in quests:
        quest_trader = quest.get('trader', {})
        quest_trader_id = quest_trader.get('id')
        if quest_trader_id == trader_id:
            trader_quests.append(quest)
    
    print(f"[INFO] Filtrando quests do {trader_name}: {len(trader_quests)} de {len(quests)} total")
    
    if len(trader_quests) == 0:
        print(f"[ERRO] Nenhuma quest do {trader_name} encontrada após filtragem!")
        print(f"[DEBUG] Trader ID esperado: {trader_id}")
        if quests:
            sample_traders = {}
            for q in quests[:5]:
                t = q.get('trader', {})
                t_id = t.get('id', 'unknown')
                t_name = t.get('name', 'unknown')
                if t_id not in sample_traders:
                    sample_traders[t_id] = t_name
            print(f"[DEBUG] Traders encontrados nas quests: {sample_traders}")
    
    if len(trader_quests) == 0:
        print(f"[WARN] Nenhuma quest encontrada para {trader_name}! Verificando trader_id: {trader_id}")
        # Debug: mostrar alguns traders das quests
        if quests:
            sample_traders = {}
            for q in quests[:5]:
                t = q.get('trader', {})
                t_id = t.get('id', 'unknown')
                t_name = t.get('name', 'unknown')
                if t_id not in sample_traders:
                    sample_traders[t_id] = t_name
            print(f"[DEBUG] Traders encontrados nas quests: {sample_traders}")
    
    # Criar mapa de ID da API -> ID legível para pré-requisitos
    # Usar TODAS as quests (não só do Prapor) para mapear pré-requisitos
    api_id_to_legible_id = {}
    existing_ids_in_npc = set()  # IDs já usados neste NPC (apenas do Prapor)
    
    # Se já existe banco, carregar IDs existentes deste NPC
    if existing_database and 'npcs' in existing_database and npc_id in existing_database['npcs']:
        existing_ids_in_npc = {q['id'] for q in existing_database['npcs'][npc_id].get('quests', [])}
        print(f"[INFO] Carregados {len(existing_ids_in_npc)} IDs existentes do {npc_id}")
    
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
    
    # Carregar TODOS os IDs existentes de TODOS os NPCs (para mapear pré-requisitos corretamente)
    all_existing_ids = set()
    if existing_database and 'npcs' in existing_database:
        for existing_npc_id, existing_npc in existing_database['npcs'].items():
            for q in existing_npc.get('quests', []):
                all_existing_ids.add(q['id'])
    
    # Converter cada quest do trader
    warnings = []
    errors = []
    current_import_ids = set()  # IDs das quests sendo importadas agora
    
    # Se já existe banco, carregar IDs existentes deste NPC
    if existing_database and 'npcs' in existing_database and npc_id in existing_database['npcs']:
        existing_ids_in_npc = {q['id'] for q in existing_database['npcs'][npc_id].get('quests', [])}
        current_import_ids.update(existing_ids_in_npc)
        print(f"[INFO] Carregados {len(existing_ids_in_npc)} IDs existentes do {npc_id}")
    
    # Primeiro, gerar todos os IDs DESTE TRADER (para validar pré-requisitos entre si)
    quest_id_map = {}  # api_id -> legible_id para quests do trader
    for quest in trader_quests:
        quest_name = quest.get('name', '')
        api_id = quest.get('id', '')
        # Usar todos os IDs existentes (de todos os NPCs) para evitar duplicatas
        legible_id = generate_quest_id(quest_name, all_existing_ids | current_import_ids, api_id)
        current_import_ids.add(legible_id)
        quest_id_map[api_id] = legible_id
    
    # Agora criar mapa de TODAS as quests (incluindo as que acabamos de gerar) para mapear pré-requisitos
    api_id_to_legible_id = quest_id_map.copy()  # Começar com as quests deste trader
    
    # Adicionar quests de outros NPCs já importados
    if existing_database and 'npcs' in existing_database:
        for existing_npc_id, existing_npc in existing_database['npcs'].items():
            for q in existing_npc.get('quests', []):
                # Tentar encontrar o API ID original (se houver mapeamento)
                # Por enquanto, vamos usar o ID legível diretamente
                pass  # Não temos como mapear de volta, então vamos usar apenas os IDs legíveis
    
    # Agora processar cada quest
    for quest in trader_quests:
        quest_name = quest.get('name', '')
        api_id = quest.get('id', '')
        legible_id = quest_id_map.get(api_id, generate_quest_id(quest_name, None, api_id))
        
        quest_data = {
            "id": legible_id,
            "name": quest_name,
            "tier": None,  # A API não fornece tier diretamente
            "prerequisites": [],
            "prerequisitesExternal": [],  # Pré-requisitos de outros NPCs
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
                    prereq_name = task.get('name', '')
                    
                    # Tentar converter para ID legível
                    # Primeiro, tentar pelo API ID (se for do mesmo trader)
                    legible_prereq_id = api_id_to_legible_id.get(api_prereq_id)
                    
                    # Se não encontrou, tentar buscar em outros NPCs já importados pelo nome
                    if not legible_prereq_id and prereq_name:
                        # Buscar em todos os NPCs já importados
                        if existing_database and 'npcs' in existing_database:
                            for existing_npc_id, existing_npc in existing_database['npcs'].items():
                                for existing_quest in existing_npc.get('quests', []):
                                    if existing_quest.get('name', '').lower() == prereq_name.lower():
                                        legible_prereq_id = existing_quest.get('id')
                                        break
                                if legible_prereq_id:
                                    break
                    
                    if legible_prereq_id:
                        # Validar se o pré-requisito existe
                        exists, location = validate_prerequisites(
                            legible_prereq_id, 
                            all_quest_ids, 
                            npc_id,
                            current_import_ids  # Passar IDs sendo importados agora
                        )
                        
                        if exists:
                            if location == 'same_npc':
                                quest_data['prerequisites'].append(legible_prereq_id)
                            elif location == 'other_npc':
                                # Pré-requisito de outro NPC já importado
                                quest_data['prerequisitesExternal'].append(legible_prereq_id)
                                warnings.append(f"Quest '{quest_name}' tem pré-requisito '{legible_prereq_id}' de outro NPC")
                        else:
                            # Pré-requisito não encontrado (NPC não importado ainda)
                            quest_data['prerequisitesExternal'].append(legible_prereq_id)
                            warnings.append(f"Quest '{quest_name}' tem pré-requisito '{legible_prereq_id}' de NPC não importado")
                    else:
                        # Pré-requisito não encontrado no mapa (pode ser de outro NPC)
                        warnings.append(f"Quest '{quest_name}' tem pré-requisito com API ID '{api_prereq_id}' não encontrado no mapa")
        
        database_data['npcs'][npc_id]['quests'].append(quest_data)
    
    # Retornar apenas os dados deste NPC (não o database completo)
    return {
        'npcs': {
            npc_id: database_data['npcs'][npc_id]
        },
        '_warnings': warnings,
        '_errors': errors
    }

def save_to_database(database_data):
    """Salvar dados no arquivo quests-database.json"""
    if not database_data:
        print("[ERRO] Nenhum dado para salvar")
        return False
    
    database_data['last_updated'] = datetime.now().isoformat()
    
    # Remover campos auxiliares antes de salvar
    if '_all_quest_ids' in database_data:
        del database_data['_all_quest_ids']
    if '_validation' in database_data:
        del database_data['_validation']
    if '_warnings' in database_data:
        del database_data['_warnings']
    if '_errors' in database_data:
        del database_data['_errors']
    
    filepath = Path('quests-database.json')
    
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(database_data, f, indent=2, ensure_ascii=False)
        print(f"\n[OK] Dados salvos em {filepath}")
        
        # Mostrar resumo por NPC
        print(f"\n[INFO] Resumo por NPC:")
        for npc_id, npc_data in database_data['npcs'].items():
            quest_count = len(npc_data.get('quests', []))
            print(f"   - {npc_data.get('name', npc_id)}: {quest_count} quests")
        
        return True
    except Exception as e:
        print(f"[ERRO] Erro ao salvar arquivo: {e}")
        return False

def import_trader(trader_name, existing_database):
    """Importa quests de um trader específico"""
    print(f"\n{'=' * 80}")
    print(f"IMPORTANDO: {trader_name.upper()}")
    print('=' * 80)
    
    # Buscar dados da API
    api_data = get_trader_quests(trader_name)
    
    if not api_data:
        print(f"\n[ERRO] Falha ao buscar dados do {trader_name}")
        return None
    
    # Determinar NPC ID
    npc_id = trader_name.lower().replace(' ', '_').replace("'", '')
    
    # Converter para formato do banco
    print(f"\n[INFO] Convertendo dados do {trader_name} para formato do banco...")
    trader_data = convert_to_database_format(api_data, existing_database, npc_id, trader_name)
    
    if not trader_data:
        print(f"[ERRO] Falha ao converter dados do {trader_name}")
        return None
    
    return trader_data

def main():
    print("=" * 80)
    print("IMPORTAÇÃO DE QUESTS - API TARKOV.DEV")
    print("=" * 80)
    
    # Lista de NPCs para importar
    traders_to_import = [
        'Prapor',
        'Therapist',
        'Skier',
        'Peacekeeper',
        'Mechanic',
        'Ragman',
        'Jaeger',
        'Lightkeeper'
    ]
    
    # Carregar banco existente se houver
    existing_database = None
    try:
        if Path('quests-database.json').exists():
            with open('quests-database.json', 'r', encoding='utf-8') as f:
                existing_database = json.load(f)
            print("[INFO] Banco existente carregado")
    except Exception as e:
        print(f"[WARN] Nao foi possivel carregar banco existente: {e}")
        existing_database = {
            "version": "1.0.0",
            "last_updated": "",
            "npcs": {}
        }
    
    # Inicializar database_data com estrutura existente ou nova
    database_data = existing_database.copy() if existing_database else {
        "version": "1.0.0",
        "last_updated": "",
        "npcs": {}
    }
    
    # Importar cada trader
    for trader_name in traders_to_import:
        trader_data = import_trader(trader_name, database_data)
        
        if trader_data:
            # Adicionar ou atualizar NPC no banco
            npc_id = trader_name.lower().replace(' ', '_').replace("'", '')
            database_data['npcs'][npc_id] = trader_data['npcs'][npc_id]
            
            # Atualizar all_quest_ids para próxima validação
            if '_all_quest_ids' not in database_data:
                database_data['_all_quest_ids'] = {}
            
            # Adicionar IDs deste NPC
            database_data['_all_quest_ids'][npc_id] = {
                q['id'] for q in trader_data['npcs'][npc_id].get('quests', [])
            }
            
            # Mostrar warnings se houver
            if trader_data.get('_warnings'):
                print(f"\n[WARN] {len(trader_data['_warnings'])} warnings para {trader_name}")
                for warning in trader_data['_warnings'][:3]:
                    print(f"   - {warning}")
                if len(trader_data['_warnings']) > 3:
                    print(f"   ... e mais {len(trader_data['_warnings']) - 3} warnings")
    
    # Salvar no arquivo
    print(f"\n{'=' * 80}")
    print("SALVANDO DADOS")
    print('=' * 80)
    
    if save_to_database(database_data):
        total_quests = sum(len(npc.get('quests', [])) for npc in database_data['npcs'].values())
        print(f"\n[OK] Importacao concluida com sucesso!")
        print(f"   Total de NPCs: {len(database_data['npcs'])}")
        print(f"   Total de quests: {total_quests}")
    else:
        print("\n[ERRO] Falha ao salvar dados")

if __name__ == '__main__':
    main()

