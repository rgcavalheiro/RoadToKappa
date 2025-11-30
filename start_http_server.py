#!/usr/bin/env python3
"""
Script para iniciar apenas o servidor HTTP estático na porta 8000
"""
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
import webbrowser
import time

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

def main():
    """Função principal"""
    print("=" * 60)
    print("🌐 Iniciando servidor HTTP estático")
    print("=" * 60)
    print()
    print("📁 Servindo arquivos estáticos em http://localhost:8000")
    print()
    print("Pressione Ctrl+C para parar o servidor")
    print("=" * 60)
    print()
    
    try:
        server = HTTPServer(('0.0.0.0', 8000), CustomHTTPRequestHandler)
        print("[HTTP] Servidor rodando em http://localhost:8000")
        
        # Abrir navegador automaticamente
        time.sleep(1)
        try:
            webbrowser.open('http://localhost:8000')
            print("[Browser] Abrindo navegador...")
        except:
            pass
        
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n" + "=" * 60)
        print("🛑 Parando servidor...")
        print("=" * 60)
        sys.exit(0)
    except Exception as e:
        print(f"[HTTP] Erro ao iniciar servidor: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()

