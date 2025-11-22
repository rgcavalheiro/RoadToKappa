import json
import re

# Carregar JSON
with open('quests-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Padrões de capitalização conhecidos que podem estar incorretos
# A wiki geralmente capitaliza palavras importantes como "From", "The", "Of", "In", etc.
capitalization_fixes = {
    # Padrões comuns que precisam de correção
    r'_from_the_': '_From_the_',
    r'_of_the_': '_Of_the_',
    r'_in_the_': '_In_the_',
    r'_on_the_': '_On_the_',
    r'_to_the_': '_To_the_',
    r'_at_the_': '_At_the_',
    r'_for_the_': '_For_the_',
    r'_with_the_': '_With_the_',
    r'_by_the_': '_By_the_',
    # Partes de missões
    r'_-_part_': '_-_Part_',
    r'_-_Part_': '_-_Part_',  # Já está correto, mas vamos manter
}

print("Verificando e corrigindo capitalizacao nos links...\n")

fixed_count = 0

for npc_id, npc_data in data['npcs'].items():
    for quest in npc_data['quests']:
        old_url = quest['wikiUrl']
        new_url = old_url
        
        # Aplicar correções de capitalização
        for pattern, replacement in capitalization_fixes.items():
            if re.search(pattern, new_url, re.IGNORECASE):
                new_url = re.sub(pattern, replacement, new_url, flags=re.IGNORECASE)
        
        # Correções específicas conhecidas
        specific_fixes = {
            'Delivery_from_the_Past': 'Delivery_From_the_Past',
            'What\'s_on_the_Flash_Drive': 'What\'s_on_the_Flash_Drive',  # Já está codificado
        }
        
        for old, new in specific_fixes.items():
            if old in new_url:
                new_url = new_url.replace(old, new)
        
        if old_url != new_url:
            print(f"{npc_data['name']} - {quest['name']}")
            print(f"  Antigo: {old_url}")
            print(f"  Novo:   {new_url}\n")
            quest['wikiUrl'] = new_url
            fixed_count += 1

# Salvar
if fixed_count > 0:
    print(f"Salvando... ({fixed_count} links corrigidos)")
    with open('quests-data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("Concluido!")
else:
    print("Nenhuma correcao necessaria.")

