import json
import requests
import urllib.parse

def test_link(url):
    """Testa se um link funciona"""
    try:
        response = requests.get(url, timeout=5, allow_redirects=True)
        if response.status_code == 200:
            content = response.text.lower()
            # Verificar se é uma página válida (não erro 404 ou busca)
            if "page not found" not in content and "search results" not in content:
                if "escape from tarkov" in content or "quest" in content:
                    return True
        return False
    except:
        return False

# Carregar JSON
with open('quests-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Testar algumas missões de exemplo de cada NPC
print("Testando links de exemplo...\n")
test_quests = [
    ("Prapor", "Debut"),
    ("Prapor", "The Punisher - Part 1"),
    ("Therapist", "Shortage"),
    ("Therapist", "Health Care Privacy - Part 1"),
    ("Skier", "What's on the Flash Drive?"),
    ("Skier", "Chemical - Part 1"),
]

for npc_name, quest_name in test_quests:
    npc_data = None
    for npc_id, npc in data['npcs'].items():
        if npc['name'] == npc_name:
            npc_data = npc
            break
    
    if npc_data:
        quest = next((q for q in npc_data['quests'] if q['name'] == quest_name), None)
        if quest:
            url = quest['wikiUrl']
            print(f"{npc_name} - {quest_name}")
            print(f"  URL atual: {url}")
            
            if test_link(url):
                print("  Status: OK")
            else:
                print("  Status: ERRO - Link nao funciona")
                # Tentar variações
                variations = [
                    url.replace("_-_", "_"),
                    url.replace("_", " ").replace(" ", "_"),
                    urllib.parse.quote(url.split('/')[-1], safe=''),
                ]
                print("  Tentando variacoes...")
                for var in variations:
                    test_url = "https://escapefromtarkov.fandom.com/wiki/" + var
                    if test_link(test_url):
                        print(f"  ENCONTRADO: {test_url}")
                        break
            print()

print("\nTeste concluido!")

