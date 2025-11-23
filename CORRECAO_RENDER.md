# ⚠️ CORREÇÃO URGENTE - Render Dashboard

## O Problema
O Render está tentando usar `app:app` mas o arquivo é `scraper.py`, causando:
```
ModuleNotFoundError: No module named 'app'
```

## ✅ SOLUÇÃO - Passo a Passo

### 1. Acesse o Dashboard do Render
- Vá em: https://dashboard.render.com
- Faça login

### 2. Abra o Serviço "RoadToKappa"
- Clique no serviço que está falhando

### 3. Vá em Settings
- No menu lateral esquerdo, clique em **"Settings"**

### 4. Role até "Build & Deploy"

### 5. Encontre o campo "Start Command"
- **ATUAL (ERRADO)**: Provavelmente está `gunicorn app:app` ou vazio
- **ALTERE PARA**: `gunicorn --bind 0.0.0.0:$PORT scraper:app`

### 6. Verifique o "Build Command"
- Deve ser: `pip install -r requirements.txt`

### 7. Salve as Alterações
- Clique em **"Save Changes"** ou similar

### 8. O Render fará redeploy automaticamente
- Aguarde alguns minutos
- Verifique os logs para confirmar que funcionou

## 📸 Onde encontrar no Dashboard

```
RoadToKappa (serviço)
  └─ Settings (menu lateral)
      └─ Build & Deploy (seção)
          └─ Start Command (campo)
              └─ [ALTERE AQUI]
```

## ✅ Comando Correto

```
gunicorn --bind 0.0.0.0:$PORT scraper:app
```

**Explicação:**
- `scraper` = nome do arquivo (scraper.py)
- `app` = nome da variável Flask dentro do arquivo
- `$PORT` = porta fornecida pelo Render (automático)

## 🔍 Como Verificar se Funcionou

Após salvar, vá em **"Logs"** e procure por:
- ✅ `Booting worker` = Funcionou!
- ❌ `ModuleNotFoundError: No module named 'app'` = Ainda está errado

## 💡 Dica

Se não encontrar o campo "Start Command", pode estar em:
- **Settings** → **Environment** → **Start Command**
- Ou em **Settings** → **Deploy** → **Start Command**




