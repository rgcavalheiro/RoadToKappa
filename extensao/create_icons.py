#!/usr/bin/env python3
"""
Script para criar ícones simples para a extensão
Usa PIL/Pillow para gerar ícones com o texto "RTK"
"""
try:
    from PIL import Image, ImageDraw, ImageFont
    import os
    
    def create_icon(size, filename):
        # Criar imagem com fundo azul escuro
        img = Image.new('RGB', (size, size), color='#2c3e50')
        draw = ImageDraw.Draw(img)
        
        # Tentar usar fonte padrão, senão usar fonte básica
        try:
            # Tentar fonte do sistema
            font_size = size // 3
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", size // 3)
            except:
                # Fonte padrão se não encontrar
                font = ImageFont.load_default()
        
        # Desenhar texto "RTK" no centro
        text = "RTK"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        position = ((size - text_width) // 2, (size - text_height) // 2)
        draw.text(position, text, fill='#3498db', font=font)
        
        # Salvar
        img.save(filename)
        print(f"✓ Criado: {filename}")
    
    # Criar ícones em diferentes tamanhos
    create_icon(16, 'icon16.png')
    create_icon(48, 'icon48.png')
    create_icon(128, 'icon128.png')
    
    print("\n✅ Todos os ícones foram criados!")
    
except ImportError:
    print("Pillow não está instalado. Instalando...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    print("Por favor, execute o script novamente.")
except Exception as e:
    print(f"Erro ao criar ícones: {e}")
    print("\nVocê pode criar os ícones manualmente:")
    print("- icon16.png (16x16 pixels)")
    print("- icon48.png (48x48 pixels)")
    print("- icon128.png (128x128 pixels)")
    print("\nOu usar um gerador online de ícones.")

