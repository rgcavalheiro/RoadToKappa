import requests
from bs4 import BeautifulSoup

url = 'https://escapefromtarkov.fandom.com/wiki/Delivery_From_the_Past'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

response = requests.get(url, headers=headers)
soup = BeautifulSoup(response.content, 'html.parser')

main_content = soup.find('div', class_='mw-parser-output')

# Guide - procurar por span com id="Guide"
guide_span = main_content.find('span', {'id': 'Guide'})
if guide_span:
    print("=== GUIDE ENCONTRADO ===\n")
    heading = guide_span.find_parent(['h2', 'h3'])
    if heading:
        print(f"Heading: {heading.get_text(strip=True)}\n")
        
        # Procurar todas as imagens após o heading Guide
        next_elem = heading.find_next_sibling()
        image_count = 0
        while next_elem and image_count < 20:  # Limitar para não ficar infinito
            if next_elem.name in ['h2', 'h3']:
                print(f"\nPróximo heading encontrado: {next_elem.get_text(strip=True)}")
                break
            
            # Procurar imagens neste elemento
            images = next_elem.find_all('img')
            for img in images:
                img_src = img.get('src') or img.get('data-src')
                if img_src:
                    # Filtrar ícones pequenos
                    img_class = img.get('class', [])
                    img_width = img.get('width', '')
                    
                    print(f"\nImagem encontrada:")
                    print(f"  Src: {img_src}")
                    print(f"  Class: {img_class}")
                    print(f"  Width: {img_width}")
                    
                    # Converter para URL completa
                    if img_src.startswith('//'):
                        img_src = 'https:' + img_src
                    elif img_src.startswith('/'):
                        img_src = 'https://escapefromtarkov.fandom.com' + img_src
                    
                    print(f"  URL completa: {img_src}")
                    image_count += 1
            
            next_elem = next_elem.find_next_sibling()
        
        print(f"\nTotal de imagens encontradas: {image_count}")
else:
    print("Guide não encontrado!")

