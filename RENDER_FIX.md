# 🔧 Correção do Erro no Render

## Problema
O Render estava tentando usar `app:app` mas o arquivo Flask é `scraper.py`, causando o erro:
```
ModuleNotFoundError: No module named 'app'
```

## Solução

### 1. Verificar Configuração no Dashboard do Render

No dashboard do Render, vá em **Settings** do seu serviço e verifique:

1. **Start Command**: Deve ser `gunicorn --bind 0.0.0.0:$PORT scraper:app`
   - ❌ **ERRADO**: `gunicorn app:app`
   - ✅ **CORRETO**: `gunicorn scraper:app` ou `gunicorn --bind 0.0.0.0:$PORT scraper:app`

2. **Build Command**: Deve ser `pip install -r requirements.txt`

### 2. Se o render.yaml não estiver sendo usado

Se o Render não detectar o `render.yaml` automaticamente:

1. Vá em **Settings** → **Build & Deploy**
2. Configure manualmente:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT scraper:app`

### 3. Verificar Arquivos

Certifique-se de que:
- ✅ `Procfile` contém: `web: gunicorn --bind 0.0.0.0:$PORT scraper:app`
- ✅ `scraper.py` existe e contém `app = Flask(__name__)`
- ✅ `requirements.txt` contém `gunicorn==21.2.0`

### 4. Após corrigir

1. Faça commit das mudanças
2. O Render fará redeploy automaticamente
3. Verifique os logs para confirmar que está funcionando

## Comando Correto

O comando correto para iniciar o servidor é:
```bash
gunicorn --bind 0.0.0.0:$PORT scraper:app
```

Onde:
- `scraper` = nome do arquivo Python (scraper.py)
- `app` = nome da variável Flask no arquivo
- `$PORT` = porta fornecida pelo Render (variável de ambiente)

