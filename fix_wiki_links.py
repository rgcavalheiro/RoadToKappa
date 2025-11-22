import json
import urllib.parse

def fix_wiki_url(quest_name):
    """Corrige o nome da missão para formato correto de URL da wiki"""
    # Base URL
    base = "https://escapefromtarkov.fandom.com/wiki/"
    
    # Normalizar o nome
    # 1. Substituir " - " por "_-_" (para partes de missões)
    url_name = quest_name.replace(" - ", "_-_")
    
    # 2. Substituir espaços por underscores
    url_name = url_name.replace(" ", "_")
    
    # 3. Codificar caracteres especiais (como ?, ', etc)
    # Mas manter underscores e hífens
    parts = url_name.split('_')
    encoded_parts = []
    for part in parts:
        # Codificar cada parte, mas preservar underscores
        if part:
            # Codificar caracteres especiais, mas não underscores/hífens
            encoded = urllib.parse.quote(part, safe='')
            encoded_parts.append(encoded)
    
    url_name = '_'.join(encoded_parts)
    
    return base + url_name

# Carregar JSON
print("Carregando quests-data.json...")
with open('quests-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Corrigir todos os links
print("\nCorrigindo links da wiki...")
fixed_count = 0

for npc_id, npc_data in data['npcs'].items():
    print(f"\n{npc_data['name']}:")
    for quest in npc_data['quests']:
        old_url = quest['wikiUrl']
        new_url = fix_wiki_url(quest['name'])
        
        if old_url != new_url:
            print(f"  {quest['name']}")
            print(f"    Antigo: {old_url}")
            print(f"    Novo:   {new_url}")
            quest['wikiUrl'] = new_url
            fixed_count += 1

# Salvar
print(f"\nSalvando... ({fixed_count} links corrigidos)")
with open('quests-data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Concluido!")

