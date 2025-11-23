import json
import requests
from bs4 import BeautifulSoup
import re
import time
from urllib.parse import unquote

def get_npc_from_wiki(wiki_url):
    """Extrai o NPC da página da wiki"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(wiki_url, timeout=10, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Procurar por infobox (geralmente contém NPC e outras informações)
        infobox = soup.find('aside', class_='portable-infobox') or soup.find('table', class_='infobox')
        if infobox:
            # Procurar NPC/Trader usando data-source
            npc_data = infobox.find('div', {'data-source': 'trader'})
            if npc_data:
                npc_value = npc_data.find('div', class_='pi-data-value') or npc_data.find('a')
                if npc_value:
                    npc_name = npc_value.get_text(' ', strip=True)
                    return npc_name
            else:
                # Fallback: procurar por texto
                npc_labels = infobox.find_all(['th', 'td'], string=re.compile(r'[Tt]rader|[Nn]pc|[Gg]iver', re.I))
                for label in npc_labels:
                    if label.name == 'th':
                        npc_value = label.find_next_sibling('td')
                    else:
                        npc_value = label
                    if npc_value:
                        npc_text = npc_value.get_text(' ', strip=True)
                        if npc_text and npc_text.lower() not in ['trader', 'npc', 'giver']:
                            return npc_text
        
        # Fallback: procurar em qualquer lugar da página
        npc_links = soup.find_all('a', href=re.compile(r'/wiki/(Prapor|Therapist|Skier|Peacekeeper|Mechanic|Ragman|Jaeger|Lightkeeper)'))
        if npc_links:
            npc_name = npc_links[0].get_text(' ', strip=True)
            return npc_name
        
        return None
    except Exception as e:
        print(f"  ERRO ao acessar {wiki_url}: {e}")
        return None

def normalize_npc_name(npc_name):
    """Normaliza o nome do NPC para comparação"""
    if not npc_name:
        return None
    
    npc_name = npc_name.strip()
    
    # Mapeamento de variações comuns
    npc_map = {
        'prapor': 'Prapor',
        'therapist': 'Therapist',
        'skier': 'Skier',
        'peacekeeper': 'Peacekeeper',
        'mechanic': 'Mechanic',
        'ragman': 'Ragman',
        'jaeger': 'Jaeger',
        'jäger': 'Jaeger',
        'lightkeeper': 'Lightkeeper',
        'light keeper': 'Lightkeeper'
    }
    
    npc_lower = npc_name.lower()
    for key, value in npc_map.items():
        if key in npc_lower:
            return value
    
    return npc_name

def validate_quests():
    """Valida todas as quests contra a wiki"""
    # Carregar dados
    with open('quests-data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    issues = []
    total_quests = 0
    checked_quests = 0
    
    # Mapeamento de IDs para nomes esperados
    npc_id_to_name = {
        'prapor': 'Prapor',
        'therapist': 'Therapist',
        'skier': 'Skier',
        'peacekeeper': 'Peacekeeper',
        'mechanic': 'Mechanic',
        'ragman': 'Ragman',
        'jaeger': 'Jaeger',
        'lightkeeper': 'Lightkeeper'
    }
    
    print("Iniciando validacao de NPCs das quests...\n")
    
    for npc_id, npc_data in data['npcs'].items():
        npc_name_expected = npc_id_to_name.get(npc_id, npc_data['name'])
        print(f"\nVerificando {npc_name_expected} ({len(npc_data['quests'])} quests)...")
        
        for quest in npc_data['quests']:
            total_quests += 1
            quest_name = quest['name']
            wiki_url = quest['wikiUrl']
            
            print(f"  [ ] {quest_name}...", end=' ', flush=True)
            
            # Extrair NPC da wiki
            npc_from_wiki = get_npc_from_wiki(wiki_url)
            npc_normalized = normalize_npc_name(npc_from_wiki)
            
            checked_quests += 1
            
            if npc_normalized and npc_normalized.lower() != npc_name_expected.lower():
                print(f"PROBLEMA!")
                print(f"     Esperado: {npc_name_expected}")
                print(f"     Encontrado na wiki: {npc_normalized}")
                issues.append({
                    'npc_id': npc_id,
                    'npc_expected': npc_name_expected,
                    'quest_id': quest['id'],
                    'quest_name': quest_name,
                    'wiki_url': wiki_url,
                    'npc_found': npc_normalized
                })
            elif npc_normalized:
                print(f"OK ({npc_normalized})")
            else:
                print(f"NPC nao encontrado na wiki")
                issues.append({
                    'npc_id': npc_id,
                    'npc_expected': npc_name_expected,
                    'quest_id': quest['id'],
                    'quest_name': quest_name,
                    'wiki_url': wiki_url,
                    'npc_found': None,
                    'note': 'NPC nao encontrado na wiki'
                })
            
            # Pequeno delay para não sobrecarregar o servidor
            time.sleep(0.5)
    
    print(f"\n\nResumo:")
    print(f"  Total de quests: {total_quests}")
    print(f"  Quests verificadas: {checked_quests}")
    print(f"  Problemas encontrados: {len(issues)}")
    
    if issues:
        print(f"\nProblemas encontrados:\n")
        for issue in issues:
            print(f"  Quest: {issue['quest_name']}")
            print(f"    NPC esperado: {issue['npc_expected']}")
            print(f"    NPC encontrado: {issue['npc_found'] or 'NAO ENCONTRADO'}")
            print(f"    URL: {issue['wiki_url']}")
            print()
    else:
        print("\nTodas as quests estao com o NPC correto!")
    
    return issues

if __name__ == '__main__':
    validate_quests()

