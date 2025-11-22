# 🔧 Configuração da API

## Para usar no GitHub Pages

Se você está hospedando o frontend no **GitHub Pages** e o backend no **Render**, você precisa configurar a URL da API:

1. **Abra o arquivo `app.js`**
2. **Encontre a linha 7-8**:
   ```javascript
   const RENDER_API_URL = ''; // Deixe vazio se não tiver Render configurado ainda
   ```
3. **Cole a URL do seu Render**:
   ```javascript
   const RENDER_API_URL = 'https://seu-app.onrender.com';
   ```
4. **Faça commit e push**

## Exemplo

Se seu Render está em `https://tarkov-quest-tracker-api.onrender.com`, configure assim:

```javascript
const RENDER_API_URL = 'https://tarkov-quest-tracker-api.onrender.com';
```

## Status Atual

- ✅ **GitHub Pages**: Frontend funcionando em https://rgcavalheiro.github.io/RoadToKappa/
- ⚠️ **Render**: Backend precisa ser configurado e a URL adicionada no `app.js`

## Próximos Passos

1. Fazer deploy no Render (seguir `README_DEPLOY.md`)
2. Copiar a URL do Render
3. Colar no `app.js` na variável `RENDER_API_URL`
4. Fazer commit e push
5. Pronto! A API funcionará no GitHub Pages

