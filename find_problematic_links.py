import json
import re

# Carregar JSON
with open('quests-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("Procurando links que podem ter problemas...\n")
print("Links com caracteres especiais ou formatos incomuns:\n")

problematic = []

for npc_id, npc_data in data['npcs'].items():
    for quest in npc_data['quests']:
        url = quest['wikiUrl']
        name = quest['name']
        
        # Verificar padrões que podem causar problemas
        issues = []
        
        # Verificar se tem caracteres especiais não codificados
        if "'" in name and "%27" not in url:
            issues.append("Apostrofo nao codificado")
        
        if "?" in name and "%3F" not in url:
            issues.append("Interrogacao nao codificada")
        
        # Verificar formato de "Part X"
        if " - Part " in name and "_-_Part_" not in url:
            issues.append("Formato de 'Part' pode estar incorreto")
        
        # Verificar espaços
        if " " in name and name.count(" ") > name.count("_"):
            issues.append("Pode ter espacos nao convertidos")
        
        if issues:
            problematic.append((npc_data['name'], name, url, issues))

if problematic:
    print(f"Encontrados {len(problematic)} links potencialmente problematicos:\n")
    for npc_name, quest_name, url, issues in problematic:
        print(f"{npc_name} - {quest_name}")
        print(f"  URL: {url}")
        print(f"  Problemas: {', '.join(issues)}")
        print()
else:
    print("Nenhum link problematico encontrado baseado nos padroes verificados.")

