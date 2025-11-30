# RoadToKappa - Wiki Redirect Extension

Extensão do Chrome que intercepta links da wiki do Tarkov e redireciona para o RoadToKappa no GitHub Pages.

## Como Instalar

1. Abra o Chrome e vá para `chrome://extensions/`
2. Ative o "Modo do desenvolvedor" (toggle no canto superior direito)
3. Clique em "Carregar sem compactação"
4. Selecione a pasta `extensao` deste projeto
5. Pronto! A extensão está instalada

## Como Funciona

- Quando você clicar em qualquer link que aponta para `escapefromtarkov.fandom.com`, a extensão intercepta e redireciona para `https://rgcavalheiro.github.io/RoadToKappa/`
- Funciona em qualquer página que você visitar

## Estrutura

- `manifest.json` - Configuração da extensão
- `content.js` - Script que intercepta os links
- `icon*.png` - Ícones da extensão (precisa criar)

## Melhorias Futuras

- Buscar a quest específica no GitHub Pages ao invés de apenas redirecionar para a página principal
- Adicionar opções para configurar a URL de destino
- Adicionar ícone personalizado

