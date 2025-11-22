#!/usr/bin/env python3
"""
Script para detectar criação de nova branch e incrementar versão automaticamente.
Executa quando você cria/checkout uma nova branch.
"""

import json
import subprocess
import sys
import os
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

def get_current_branch():
    """Obtém o nome da branch atual"""
    try:
        result = subprocess.run(
            ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except:
        return None

def branch_exists_in_remote(branch_name):
    """Verifica se a branch existe no repositório remoto"""
    try:
        result = subprocess.run(
            ['git', 'ls-remote', '--heads', 'origin', branch_name],
            capture_output=True,
            text=True,
            check=False
        )
        return len(result.stdout.strip()) > 0
    except:
        return False

def branch_exists_local(branch_name):
    """Verifica se a branch existe localmente"""
    try:
        result = subprocess.run(
            ['git', 'branch', '--list', branch_name],
            capture_output=True,
            text=True,
            check=False
        )
        return len(result.stdout.strip()) > 0
    except:
        return False

def get_master_version():
    """Obtém a versão da branch master"""
    try:
        result = subprocess.run(
            ['git', 'show', 'master:version.json'],
            capture_output=True,
            text=True,
            check=False
        )
        if result.returncode == 0:
            master_data = json.loads(result.stdout)
            return master_data.get('version', '0.0.1')
    except:
        pass
    return '0.0.1'

def is_new_branch():
    """Detecta se é uma branch nova e precisa incrementar versão"""
    current_branch = get_current_branch()
    if not current_branch or current_branch == 'HEAD':
        return False
    
    # Ignora branches principais
    if current_branch in ['master', 'main']:
        return False
    
    # Exceção: hu05 é a branch de start do sistema, não incrementa
    if current_branch == 'hu05':
        return False
    
    # Verifica se a branch existe no remoto
    exists_remote = branch_exists_in_remote(current_branch)
    
    # Se existe no remoto, não é nova
    if exists_remote:
        return False
    
    # Verifica se a versão atual é diferente da master
    # Se for igual, significa que ainda não foi incrementada (é uma branch nova)
    master_version = get_master_version()
    current_version = get_current_version()
    
    # Se a versão atual é igual à da master, é uma branch nova que precisa incrementar
    return current_version == master_version

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
    import io
    
    # Configurar stdout para UTF-8 no Windows
    if sys.platform == 'win32':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    # Verifica se está em um repositório git
    if not Path('.git').exists():
        return
    
    # Verifica se é uma branch nova
    if not is_new_branch():
        return
    
    # Pega a versão da master e incrementa
    master_version = get_master_version()
    major, minor, patch = parse_version(master_version)
    major, minor, patch = increment_patch(major, minor, patch)
    new_version = format_version(major, minor, patch)
    
    update_version_file(new_version)
    
    current_branch = get_current_branch()
    print(f"[INFO] Nova branch detectada: {current_branch}")
    print(f"[INFO] Versao da master: v{master_version}")
    print(f"[INFO] Versao incrementada automaticamente para v{new_version}")
    print(f"[INFO] Faca commit da versao atualizada na nova branch")

if __name__ == '__main__':
    main()

