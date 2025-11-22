import requests
from bs4 import BeautifulSoup
import re

url = 'https://escapefromtarkov.fandom.com/wiki/Delivery_From_the_Past'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

response = requests.get(url, headers=headers)
soup = BeautifulSoup(response.content, 'html.parser')

print("=== TESTE DE SCRAPING ===\n")

# Título
title = soup.find('h1', class_='page-header__title') or soup.find('h1', {'id': 'firstHeading'})
print(f"Título: {title.get_text(strip=True) if title else 'Não encontrado'}")

# Infobox
infobox = soup.find('aside', class_='portable-infobox')
if infobox:
    print("\n=== INFOBOX ===")
    # Procurar NPC
    npc_data = infobox.find('div', {'data-source': 'trader'})
    if npc_data:
        npc_value = npc_data.find('div', class_='pi-data-value')
        print(f"NPC: {npc_value.get_text(strip=True) if npc_value else 'Não encontrado'}")

# Conteúdo principal
main_content = soup.find('div', class_='mw-parser-output')
if main_content:
    print("\n=== CONTEÚDO PRINCIPAL ===")
    
    # Descrição
    first_p = main_content.find('p')
    if first_p:
        print(f"Primeiro parágrafo: {first_p.get_text(strip=True)[:200]}")
    
    # Procurar seções
    headings = main_content.find_all(['h2', 'h3'])
    print(f"\nSeções encontradas:")
    for h in headings[:10]:
        print(f"  - {h.get_text(strip=True)}")
    
    # Objetivos - usando span com id
    obj_span = main_content.find('span', {'id': 'Objectives'})
    if obj_span:
        print(f"\n=== OBJETIVOS (via span) ===")
        heading = obj_span.find_parent(['h2', 'h3'])
        if heading:
            print(f"Heading encontrado: {heading.get_text(strip=True)}")
            next_elem = heading.find_next_sibling()
            if next_elem and next_elem.name == 'ul':
                for li in next_elem.find_all('li', recursive=False):
                    print(f"  - {li.get_text(' ', strip=True)}")
    
    # Recompensas - usando span com id
    rew_span = main_content.find('span', {'id': 'Rewards'})
    if rew_span:
        print(f"\n=== RECOMPENSAS (via span) ===")
        heading = rew_span.find_parent(['h2', 'h3'])
        if heading:
            print(f"Heading encontrado: {heading.get_text(strip=True)}")
            next_elem = heading.find_next_sibling()
            if next_elem and next_elem.name == 'ul':
                for li in next_elem.find_all('li', recursive=False):
                    print(f"  - {li.get_text(' ', strip=True)}")
    
    # Infobox
    infobox = soup.find('aside', class_='portable-infobox')
    if infobox:
        print(f"\n=== INFOBOX ===")
        npc_data = infobox.find('div', {'data-source': 'trader'})
        if npc_data:
            npc_value = npc_data.find('div', class_='pi-data-value') or npc_data.find('a')
            if npc_value:
                print(f"NPC: {npc_value.get_text(' ', strip=True)}")

