from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import re

app = Flask(__name__)
CORS(app)

def scrape_quest_info(wiki_url):
    """Faz scraping das informações da quest na wiki"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(wiki_url, timeout=10, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Estrutura para armazenar as informações
        quest_info = {
            'name': '',
            'npc': '',
            'objectives': [],
            'guide_images': []
        }
        
        # Encontrar o título da quest
        title_elem = soup.find('h1', class_='page-header__title')
        if not title_elem:
            title_elem = soup.find('h1', {'id': 'firstHeading'})
        if title_elem:
            quest_info['name'] = title_elem.get_text(' ', strip=True)
        
        # Procurar por infobox (geralmente contém NPC e outras informações)
        infobox = soup.find('aside', class_='portable-infobox') or soup.find('table', class_='infobox')
        if infobox:
            # Procurar NPC/Trader usando data-source
            npc_data = infobox.find('div', {'data-source': 'trader'})
            if npc_data:
                npc_value = npc_data.find('div', class_='pi-data-value') or npc_data.find('a')
                if npc_value:
                    quest_info['npc'] = npc_value.get_text(' ', strip=True)
            else:
                # Fallback: procurar por texto
                npc_labels = infobox.find_all(['th', 'td'], string=re.compile(r'[Tt]rader|[Nn]pc|[Gg]iver', re.I))
                for label in npc_labels:
                    if label.name == 'th':
                        npc_value = label.find_next_sibling('td')
                    else:
                        npc_value = label.find_next('td')
                    if npc_value:
                        quest_info['npc'] = npc_value.get_text(' ', strip=True)
                        break
        
        # Procurar por seções usando headings
        main_content = soup.find('div', class_='mw-parser-output')
        if not main_content:
            main_content = soup.find('div', {'id': 'mw-content-text'})
        
        if main_content:
            # Descrição removida - não precisamos mais
            
            # Objetivos - procurar por span com id="Objectives"
            objectives_span = main_content.find('span', {'id': 'Objectives'})
            if objectives_span:
                # Encontrar o heading pai
                heading = objectives_span.find_parent(['h2', 'h3'])
                if heading:
                    # Procurar lista após o heading
                    next_elem = heading.find_next_sibling()
                    while next_elem:
                        if next_elem.name == 'ul':
                            for li in next_elem.find_all('li', recursive=False):
                                obj_text = li.get_text(' ', strip=True)
                                if obj_text and obj_text not in quest_info['objectives']:
                                    quest_info['objectives'].append(obj_text)
                            break
                        elif next_elem.name in ['h2', 'h3']:
                            break
                        next_elem = next_elem.find_next_sibling()
            
            # Guide - procurar por span com id="Guide" e pegar imagens
            guide_span = main_content.find('span', {'id': 'Guide'})
            if guide_span:
                heading = guide_span.find_parent(['h2', 'h3'])
                if heading:
                    # Procurar todas as imagens após o heading Guide até o próximo heading
                    next_elem = heading.find_next_sibling()
                    while next_elem:
                        if next_elem.name in ['h2', 'h3']:
                            break
                        
                        # Procurar imagens neste elemento e seus filhos
                        images = next_elem.find_all('img')
                        for img in images:
                            # Priorizar data-src para lazy loading, depois src
                            img_src = img.get('data-src') or img.get('src')
                            
                            if not img_src:
                                continue
                            
                            # Ignorar placeholders de lazy load (data:image/gif)
                            if img_src.startswith('data:image'):
                                # Tentar pegar o data-src real
                                img_src = img.get('data-src') or img.get('data-lazy-src')
                                if not img_src or img_src.startswith('data:image'):
                                    continue
                            
                            # Filtrar ícones pequenos e avatares
                            img_class = img.get('class', [])
                            if any('icon' in str(c).lower() or 'avatar' in str(c).lower() for c in img_class):
                                continue
                            
                            # Converter para URL completa se necessário
                            if img_src.startswith('//'):
                                img_src = 'https:' + img_src
                            elif img_src.startswith('/'):
                                img_src = 'https://escapefromtarkov.fandom.com' + img_src
                            
                            # Filtrar imagens muito pequenas (provavelmente ícones)
                            img_width = img.get('width')
                            if img_width:
                                try:
                                    width_val = int(str(img_width))
                                    if width_val < 100:  # Filtrar imagens menores que 100px
                                        continue
                                except:
                                    pass
                            
                            # Adicionar se for uma URL válida e não for placeholder
                            if img_src.startswith('http') and img_src not in quest_info['guide_images']:
                                # Remover parâmetros de scale para obter imagem em tamanho completo
                                # Exemplo: .../image.png/revision/latest/scale-to-width-down/450?cb=... 
                                # Vira: .../image.png/revision/latest
                                if '/scale-to-width-down/' in img_src:
                                    # Pegar a parte antes de /scale-to-width-down/
                                    img_src = img_src.split('/scale-to-width-down/')[0]
                                    # Se tiver ?cb= no final, manter apenas até /latest
                                    if '/revision/latest' in img_src:
                                        img_src = img_src.split('?')[0]  # Remove query params
                                
                                quest_info['guide_images'].append(img_src)
                        
                        next_elem = next_elem.find_next_sibling()
            
        
        return quest_info
        
    except Exception as e:
        import traceback
        return {'error': str(e), 'traceback': traceback.format_exc()}

@app.route('/api/quest/<path:wiki_url>')
def get_quest_info(wiki_url):
    """Endpoint para obter informações da quest"""
    # Decodificar a URL
    from urllib.parse import unquote
    full_url = unquote(wiki_url)
    
    # Se não começar com http, adicionar
    if not full_url.startswith('http'):
        full_url = 'https://' + full_url
    
    quest_info = scrape_quest_info(full_url)
    return jsonify(quest_info)

@app.route('/quest-details.html')
def quest_details_page():
    """Servir a página de detalhes da quest"""
    return send_from_directory('.', 'quest-details.html')

@app.route('/api/image-proxy')
def image_proxy():
    """Proxy para imagens, evitando problemas de CORS"""
    from urllib.parse import unquote
    import urllib.parse
    
    img_url = request.args.get('url')
    if not img_url:
        return jsonify({'error': 'URL não fornecida'}), 400
    
    try:
        img_url = unquote(img_url)
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://escapefromtarkov.fandom.com/'
        }
        response = requests.get(img_url, headers=headers, timeout=10, stream=True)
        response.raise_for_status()
        
        from flask import Response
        return Response(
            response.content,
            mimetype=response.headers.get('Content-Type', 'image/png'),
            headers={
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET'
            }
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)

