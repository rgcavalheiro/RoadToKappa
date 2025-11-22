import requests
from bs4 import BeautifulSoup

url = 'https://escapefromtarkov.fandom.com/wiki/Delivery_From_the_Past'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

response = requests.get(url, headers=headers)
soup = BeautifulSoup(response.content, 'html.parser')

main_content = soup.find('div', class_='mw-parser-output')
guide_span = main_content.find('span', {'id': 'Guide'})

if guide_span:
    heading = guide_span.find_parent(['h2', 'h3'])
    if heading:
        next_elem = heading.find_next_sibling()
        while next_elem:
            if next_elem.name in ['h2', 'h3']:
                break
            
            images = next_elem.find_all('img')
            for img in images:
                src = img.get('src', '')
                data_src = img.get('data-src', '')
                data_lazy = img.get('data-lazy-src', '')
                
                if 'lazyload' in str(img.get('class', [])):
                    print(f"Lazy load image:")
                    print(f"  src: {src[:100] if src else 'None'}")
                    print(f"  data-src: {data_src[:100] if data_src else 'None'}")
                    print(f"  data-lazy-src: {data_lazy[:100] if data_lazy else 'None'}")
                    print()
            
            next_elem = next_elem.find_next_sibling()
            if next_elem is None:
                break

