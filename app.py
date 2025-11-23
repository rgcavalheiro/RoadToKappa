# Arquivo de compatibilidade para o Render
# Importa a aplicação Flask do scraper.py
from scraper import app

# Exportar app para o Gunicorn
if __name__ == '__main__':
    app.run(port=5000, debug=True)



