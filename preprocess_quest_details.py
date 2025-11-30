#!/usr/bin/env python3
"""
Script para pré-processar os detalhes de todas as quests e salvar em JSON local.
Isso permite que a aplicação funcione sem depender de serviços externos.
"""
import json
import sys
from scraper import scrape_quest_info
import time
from urllib.parse import urlparse

def normalize_wiki_url(url):
    """Normaliza a URL da wiki para usar como chave"""
    if not url:
        return None
    
    # Se não começar com http, adicionar
    if not url.startswith('http'):
        url = 'https://' + url
    
    # Parsear e normalizar
    parsed = urlparse(url)
    path = parsed.path
    
    # Garantir que começa com /wiki/
    if not path.startswith('/wiki/'):
        if path.startswith('wiki/'):
            path = '/' + path
        else:
            path = '/wiki/' + path
    
    # Reconstruir URL normalizada
    normalized = f"{parsed.scheme}://{parsed.netloc}{path}"
    
    # Remover query params e fragmentos para normalizar
    return normalized.split('?')[0].split('#')[0]

def load_quests_database():
    """Carrega o banco de dados de quests"""
    try:
        with open('quests-database.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("Erro: quests-database.json não encontrado!")
        sys.exit(1)

def load_existing_details():
    """Carrega detalhes já processados (para continuar de onde parou)"""
    try:
        with open('quests-details.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_details(details):
    """Salva os detalhes em JSON"""
    output = {
        "version": "1.0.0",
        "last_updated": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "details": details
    }
    
    with open('quests-details.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\n✓ Salvo {len(details)} detalhes de quests em quests-details.json")

def main():
    print("=" * 60)
    print("🔄 Pré-processando detalhes das quests")
    print("=" * 60)
    print()
    
    # Carregar banco de dados
    print("📂 Carregando quests-database.json...")
    database = load_quests_database()
    
    # Carregar detalhes existentes
    print("📂 Carregando quests-details.json (se existir)...")
    existing_details = load_existing_details()
    existing_details_data = existing_details.get('details', {})
    
    # Coletar todas as URLs únicas
    all_urls = set()
    quest_count = 0
    
    for npc_id, npc_data in database.get('npcs', {}).items():
        for quest in npc_data.get('quests', []):
            wiki_url = quest.get('wikiUrl')
            if wiki_url:
                normalized_url = normalize_wiki_url(wiki_url)
                if normalized_url:
                    all_urls.add(normalized_url)
                    quest_count += 1
    
    print(f"📊 Encontradas {quest_count} quests com URLs da wiki")
    print(f"📊 {len(all_urls)} URLs únicas para processar")
    print()
    
    # Processar cada URL
    details = existing_details_data.copy()
    processed = 0
    skipped = 0
    errors = 0
    
    for i, wiki_url in enumerate(sorted(all_urls), 1):
        # Verificar se já existe e não tem erro
        if wiki_url in details:
            existing = details[wiki_url]
            # Se já tem dados válidos (não é erro), pular
            if existing.get('name') and not existing.get('error'):
                skipped += 1
                print(f"[{i}/{len(all_urls)}] ⏭️  Já processado: {wiki_url}")
                continue
        
        print(f"[{i}/{len(all_urls)}] 🔍 Processando: {wiki_url}")
        
        try:
            quest_info = scrape_quest_info(wiki_url)
            
            # Verificar se houve erro
            if quest_info.get('error'):
                print(f"    ❌ Erro: {quest_info.get('error')}")
                errors += 1
                # Salvar erro para não tentar novamente
                details[wiki_url] = {
                    'error': quest_info.get('error'),
                    'name': None,
                    'objectives': [],
                    'guide_images': []
                }
            else:
                # Salvar detalhes
                details[wiki_url] = {
                    'name': quest_info.get('name', ''),
                    'npc': quest_info.get('npc', ''),
                    'objectives': quest_info.get('objectives', []),
                    'guide_images': quest_info.get('guide_images', [])
                }
                processed += 1
                print(f"    ✓ Sucesso: {quest_info.get('name', 'N/A')} ({len(quest_info.get('objectives', []))} objetivos, {len(quest_info.get('guide_images', []))} imagens)")
            
            # Salvar progresso a cada 10 quests
            if i % 10 == 0:
                save_details(details)
                print(f"    💾 Progresso salvo...")
            
            # Pequeno delay para não sobrecarregar a wiki
            time.sleep(0.5)
            
        except Exception as e:
            print(f"    ❌ Exceção: {str(e)}")
            errors += 1
            details[wiki_url] = {
                'error': str(e),
                'name': None,
                'objectives': [],
                'guide_images': []
            }
            time.sleep(1)  # Delay maior em caso de erro
    
    # Salvar resultado final
    save_details(details)
    
    print()
    print("=" * 60)
    print("✅ Processamento concluído!")
    print("=" * 60)
    print(f"📊 Processadas: {processed}")
    print(f"⏭️  Já existentes: {skipped}")
    print(f"❌ Erros: {errors}")
    print(f"📁 Total salvo: {len(details)}")
    print()
    print("💡 Agora você pode usar quests-details.json no app.js!")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrompido pelo usuário. Progresso foi salvo.")
        sys.exit(0)

