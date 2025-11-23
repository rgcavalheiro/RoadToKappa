#!/usr/bin/env python3
"""
Script para atualizar a versão automaticamente baseado em merges.
Detecta merges no histórico do git e incrementa a versão.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

VERSION_FILE = Path('version.json')

def get_current_version():
    """Lê a versão atual do arquivo version.json"""
    if VERSION_FILE.exists():
        with open(VERSION_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('version', '0.0.1')
    return '0.0.1'

def parse_version(version_str):
    """Converte string de versão (ex: '0.0.1') para tupla (0, 0, 1)"""
    parts = version_str.split('.')
    return tuple(int(p) for p in parts)

def format_version(major, minor, patch):
    """Converte tupla de versão para string (ex: (0, 0, 1) -> '0.0.1')"""
    return f"{major}.{minor}.{patch}"

def increment_patch(major, minor, patch):
    """Incrementa a versão patch (0.0.1 -> 0.0.2)"""
    return major, minor, patch + 1

def increment_minor(major, minor, patch):
    """Incrementa a versão minor (0.0.1 -> 0.1.0)"""
    return major, minor + 1, 0

def increment_major(major, minor, patch):
    """Incrementa a versão major (0.0.1 -> 1.0.0)"""
    return major + 1, 0, 0

def check_recent_merges():
    """Verifica se há merges recentes no histórico do git"""
    try:
        # Verifica últimos 10 commits procurando por merges
        result = subprocess.run(
            ['git', 'log', '--oneline', '-10', '--merges'],
            capture_output=True,
            text=True,
            check=False
        )
        return len(result.stdout.strip().split('\n')) > 0 and result.stdout.strip() != ''
    except:
        return False

def update_version_file(new_version):
    """Atualiza o arquivo version.json com a nova versão"""
    data = {
        'version': new_version,
        'author': 'Rgcavalheiro'
    }
    with open(VERSION_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print(f"[OK] Versao atualizada para: v{new_version}")

def main():
    """Função principal"""
    import sys
    import io
    
    # Configurar stdout para UTF-8 no Windows
    if sys.platform == 'win32':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    current_version = get_current_version()
    major, minor, patch = parse_version(current_version)
    
    # Verifica se há merges recentes
    has_merges = check_recent_merges()
    
    if has_merges:
        # Incrementa patch para cada merge detectado
        major, minor, patch = increment_patch(major, minor, patch)
        new_version = format_version(major, minor, patch)
        update_version_file(new_version)
    else:
        print(f"[INFO] Nenhum merge recente detectado. Versao atual: v{current_version}")
        print(f"       Para atualizar manualmente, edite version.json")

if __name__ == '__main__':
    main()

