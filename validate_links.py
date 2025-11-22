import json
import requests
import time
from urllib.parse import quote

def normalize_quest_name(name):
    """Normaliza o nome da missão para formato de URL da wiki"""
    # Remover caracteres especiais e normalizar
    normalized = name.replace(" - ", "_").replace("-", "_").replace(" ", "_")
    # Remover underscores duplos
    normalized = normalized.replace("__", "_")
    # Remover underscore no final se houver
    normalized = normalized.rstrip("_")
    return normalized

def test_url(url):
    """Testa se uma URL está acessível"""
    try:
        response = requests.get(url, timeout=10, allow_redirects=True)
        # Verificar se é uma página válida da wiki (não página de erro)
        if response.status_code == 200:
            # Verificar se não é página de erro ou redirecionamento
            content = response.text.lower()
            if "escape from tarkov" in content or "quest" in content or "mission" in content:
                # Verificar se não é página de busca ou erro
                if "search results" not in content and "page not found" not in content:
                    return True
        return False
    except:
        return False

def find_correct_url(quest_name):
    """Tenta encontrar a URL correta para uma missão"""
    base_url = "https://escapefromtarkov.fandom.com/wiki/"
    
    # Tentar diferentes formatos
    formats = [
        quest_name,  # Nome original
        quest_name.replace(" ", "_"),  # Com underscore
        normalize_quest_name(quest_name),  # Normalizado
        quest_name.replace(" - ", "_").replace(" ", "_"),  # Partes com underscore
        quest_name.replace(" - ", "_-_").replace(" ", "_"),  # Partes com underscore e hífen
        quest_name.replace("'", "").replace(" ", "_"),  # Sem apóstrofos
    ]
    
    # Remover duplicatas
    formats = list(dict.fromkeys(formats))
    
    for fmt in formats:
        url = base_url + fmt
        if test_url(url):
            return url
        time.sleep(0.2)  # Pequeno delay para não sobrecarregar
    
    return None

# Carregar o JSON
print("Carregando quests-data.json...")
with open('quests-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Estatísticas
total_quests = 0
fixed_quests = 0
broken_quests = []

print("\nValidando links da wiki...")
print("=" * 60)

for npc_id, npc_data in data['npcs'].items():
    print(f"\nValidando {npc_data['name']} ({len(npc_data['quests'])} missoes)...")
    
    for quest in npc_data['quests']:
        total_quests += 1
        current_url = quest['wikiUrl']
        quest_name = quest['name']
        
        # Testar link atual
        if test_url(current_url):
            print(f"  OK: {quest_name}")
        else:
            print(f"  ERRO: {quest_name}: Link quebrado")
            broken_quests.append((npc_data['name'], quest_name, current_url))
            
            # Tentar encontrar o link correto
            print(f"     Procurando link correto...")
            correct_url = find_correct_url(quest_name)
            
            if correct_url:
                quest['wikiUrl'] = correct_url
                fixed_quests += 1
                print(f"     CORRIGIDO para: {correct_url}")
            else:
                print(f"     AVISO: Nao foi possivel encontrar link correto")
            time.sleep(0.5)  # Delay entre requisições

# Salvar JSON atualizado se houver correções
if fixed_quests > 0:
    print(f"\nSalvando correcoes...")
    with open('quests-data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Arquivo salvo!")

# Resumo
print("\n" + "=" * 60)
print(f"Resumo:")
print(f"   Total de missoes: {total_quests}")
print(f"   Links quebrados encontrados: {len(broken_quests)}")
print(f"   Links corrigidos: {fixed_quests}")
print(f"   Links nao corrigidos: {len(broken_quests) - fixed_quests}")

if broken_quests and fixed_quests < len(broken_quests):
    print(f"\nAVISO: Missoes com links quebrados que nao foram corrigidos:")
    for npc_name, quest_name, url in broken_quests:
        if not test_url(url):
            print(f"   - {npc_name}: {quest_name}")

print("\nValidacao concluida!")
