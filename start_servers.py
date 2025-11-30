#!/usr/bin/env python3
"""
Script para iniciar ambos os servidores:
- Flask API na porta 5000
- Servidor HTTP estático na porta 8000
"""
import subprocess
import sys
import os
import time
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
import webbrowser

class CustomHTTPRequestHandler(SimpleHTTPRequestHandler):
    """Handler customizado para servir arquivos estáticos"""
    
    def end_headers(self):
        # Adicionar headers CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def log_message(self, format, *args):
        """Customizar mensagens de log"""
        print(f"[HTTP Server] {format % args}")

def start_flask_server():
    """Iniciar servidor Flask na porta 5000"""
    print("[Flask] Iniciando servidor Flask na porta 5000...")
    try:
        from scraper import app
        app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)
    except Exception as e:
        print(f"[Flask] Erro ao iniciar servidor: {e}")
        sys.exit(1)

def start_http_server():
    """Iniciar servidor HTTP estático na porta 8000"""
    print("[HTTP] Iniciando servidor HTTP estático na porta 8000...")
    try:
        server = HTTPServer(('0.0.0.0', 8000), CustomHTTPRequestHandler)
        print("[HTTP] Servidor HTTP rodando em http://localhost:8000")
        print("[HTTP] Pressione Ctrl+C para parar")
        server.serve_forever()
    except Exception as e:
        print(f"[HTTP] Erro ao iniciar servidor: {e}")
        sys.exit(1)

def main():
    """Função principal"""
    print("=" * 60)
    print("🚀 Iniciando servidores do RoadToKappa")
    print("=" * 60)
    print()
    print("📡 Flask API: http://localhost:5000")
    print("🌐 Frontend: http://localhost:8000")
    print()
    print("Pressione Ctrl+C para parar ambos os servidores")
    print("=" * 60)
    print()
    
    # Iniciar Flask em thread separada
    flask_thread = threading.Thread(target=start_flask_server, daemon=True)
    flask_thread.start()
    
    # Aguardar um pouco para o Flask iniciar
    time.sleep(2)
    
    # Abrir navegador automaticamente
    try:
        time.sleep(1)
        webbrowser.open('http://localhost:8000')
        print("[Browser] Abrindo navegador em http://localhost:8000")
    except:
        pass
    
    # Iniciar servidor HTTP (bloqueia até Ctrl+C)
    try:
        start_http_server()
    except KeyboardInterrupt:
        print("\n" + "=" * 60)
        print("🛑 Parando servidores...")
        print("=" * 60)
        sys.exit(0)

if __name__ == '__main__':
    main()

