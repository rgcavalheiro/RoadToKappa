import json
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

def test_link(quest_info):
    """Testa se um link funciona"""
    npc_name, quest_name, url = quest_info
    try:
        response = requests.get(url, timeout=8, allow_redirects=True)
        if response.status_code == 200:
            content = response.text.lower()
            # Verificar se é uma página válida
            if "page not found" not in content and "search results" not in content:
                if "escape from tarkov" in content or "quest" in content or "mission" in content:
                    return (npc_name, quest_name, url, True, None)
        return (npc_name, quest_name, url, False, "Pagina invalida")
    except Exception as e:
        return (npc_name, quest_name, url, False, str(e))

# Carregar JSON
print("Carregando quests-data.json...")
with open('quests-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Preparar lista de links para testar
quests_to_test = []
for npc_id, npc_data in data['npcs'].items():
    for quest in npc_data['quests']:
        quests_to_test.append((npc_data['name'], quest['name'], quest['wikiUrl']))

print(f"Testando {len(quests_to_test)} links...")
print("Isso pode levar alguns minutos...\n")

broken_links = []
working_links = 0

# Testar em paralelo (mas com limite para não sobrecarregar)
with ThreadPoolExecutor(max_workers=5) as executor:
    futures = {executor.submit(test_link, quest_info): quest_info for quest_info in quests_to_test}
    
    for future in as_completed(futures):
        npc_name, quest_name, url, is_working, error = future.result()
        if is_working:
            working_links += 1
            print(f"OK: {npc_name} - {quest_name}")
        else:
            broken_links.append((npc_name, quest_name, url, error))
            print(f"ERRO: {npc_name} - {quest_name}")
            print(f"  URL: {url}")
            print(f"  Erro: {error}\n")
        time.sleep(0.1)  # Pequeno delay

# Resumo
print("\n" + "=" * 60)
print(f"Resumo:")
print(f"  Links funcionando: {working_links}")
print(f"  Links quebrados: {len(broken_links)}")

if broken_links:
    print(f"\nLinks quebrados encontrados:")
    for npc_name, quest_name, url, error in broken_links:
        print(f"  - {npc_name}: {quest_name}")
        print(f"    URL: {url}")
        print(f"    Erro: {error}\n")
else:
    print("\nTodos os links estao funcionando!")

