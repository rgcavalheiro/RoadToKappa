# 🚀 Guia de Deploy

Este projeto pode ser hospedado de duas formas:

## Opção 1: Render (Recomendado - Suporta Flask)

### Passos:

1. **Criar conta no Render**: https://render.com (gratuito)

2. **Conectar repositório GitHub**:
   - No dashboard do Render, clique em "New +" → "Web Service"
   - Conecte seu repositório GitHub
   - Render detectará automaticamente o `render.yaml`

3. **Configuração automática**:
   - O Render usará o `render.yaml` para configurar tudo
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn scraper:app`

4. **URL da aplicação**:
   - Render fornecerá uma URL como: `https://seu-app.onrender.com`
   - A aplicação estará acessível nessa URL

### Vantagens:
- ✅ Gratuito
- ✅ Suporta Flask (API funciona)
- ✅ Deploy automático ao fazer push no GitHub
- ✅ HTTPS automático

---

## Opção 2: GitHub Pages (Apenas Frontend)

### Limitações:
- ❌ Não suporta Flask (API não funcionará)
- ❌ Funcionalidade "Ver Detalhes" não carregará objetivos/imagens
- ✅ Resto da aplicação funciona (tracker de progresso, lista de quests)

### Passos:

1. **Configurar GitHub Pages**:
   - No repositório: Settings → Pages
   - Source: `main` branch
   - Folder: `/ (root)`

2. **A URL será**: `https://seu-usuario.github.io/tarkovhelp`

---

## Configuração do Ambiente

O `app.js` detecta automaticamente se está em:
- **Desenvolvimento local**: usa `http://localhost:5000`
- **Produção (Render)**: usa a URL do Render automaticamente

Não precisa alterar nada no código!

---

## Testando Localmente

```bash
# Terminal 1: Servidor Flask
python scraper.py

# Terminal 2: Servidor HTTP (opcional, para testar como GitHub Pages)
python -m http.server 8000
```

Acesse: http://localhost:5000 (Flask serve tudo) ou http://localhost:8000 (apenas frontend)


