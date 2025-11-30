# Sistema de Pré-processamento de Detalhes das Quests

Este sistema permite que a aplicação funcione **completamente offline** e **sem depender de serviços externos** (como Render), tornando o carregamento de detalhes das quests **instantâneo**.

## Como Funciona

1. **Pré-processamento**: Um script Python faz scraping de todas as quests e salva os detalhes em `quests-details.json`
2. **Carregamento Local**: O `app.js` carrega esse arquivo JSON e usa os dados localmente
3. **Fallback**: Se os dados não estiverem disponíveis localmente, tenta usar a API (se disponível)

## Como Usar

### 1. Gerar os Dados Pré-processados

Execute o script para fazer scraping de todas as quests:

```bash
python preprocess_quest_details.py
```

Este script irá:
- Ler todas as quests do `quests-database.json`
- Fazer scraping de cada URL da wiki
- Salvar os detalhes em `quests-details.json`
- Pular quests já processadas (pode ser interrompido e continuado depois)

**Tempo estimado**: Depende da quantidade de quests, mas pode levar alguns minutos. O script salva o progresso a cada 10 quests.

### 2. Incluir o Arquivo no Repositório

Certifique-se de que `quests-details.json` está no repositório e será enviado para o GitHub Pages:

```bash
git add quests-details.json
git commit -m "Adiciona detalhes pré-processados das quests"
git push
```

### 3. Pronto!

Agora a aplicação funcionará:
- ✅ **Offline** - Não precisa de servidor
- ✅ **Rápido** - Carregamento instantâneo
- ✅ **No GitHub Pages** - Funciona perfeitamente
- ✅ **Sem dependências externas** - Não precisa do Render

## Estrutura do Arquivo

O arquivo `quests-details.json` tem a seguinte estrutura:

```json
{
  "version": "1.0.0",
  "last_updated": "2025-01-XX...",
  "details": {
    "https://escapefromtarkov.fandom.com/wiki/Shooting_Cans": {
      "name": "Shooting Cans",
      "npc": "Prapor",
      "objectives": ["Objetivo 1", "Objetivo 2"],
      "guide_images": ["url1", "url2"]
    },
    ...
  }
}
```

## Atualizar os Dados

Se você adicionar novas quests ou quiser atualizar os dados:

1. Execute novamente: `python preprocess_quest_details.py`
2. O script irá:
   - Processar apenas quests novas ou com erro
   - Manter quests já processadas com sucesso
3. Commit e push do arquivo atualizado

## Vantagens

- 🚀 **Performance**: Carregamento instantâneo (sem requisições HTTP)
- 🌐 **Offline**: Funciona sem internet após o primeiro carregamento
- 💰 **Gratuito**: Não precisa de serviços pagos (Render, etc)
- 🔒 **Confiável**: Não depende de serviços externos que podem estar offline
- 📦 **Portátil**: Funciona em qualquer lugar (GitHub Pages, local, etc)

## Notas

- O arquivo `quests-details.json` pode ser grande (vários MB), mas é carregado apenas uma vez
- O script pode ser interrompido (Ctrl+C) e continuado depois - ele salva o progresso
- Se uma quest falhar no scraping, ela será marcada com erro e não será tentada novamente automaticamente

