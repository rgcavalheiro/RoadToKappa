# Como Testar a Extensão

## Passo a Passo

### 1. Abrir o Chrome e ir para Extensões

1. Abra o Google Chrome
2. Digite na barra de endereços: `chrome://extensions/`
3. Pressione Enter

### 2. Ativar Modo do Desenvolvedor

1. No canto superior direito, você verá um toggle "Modo do desenvolvedor"
2. Ative esse toggle (deve ficar azul/ligado)

### 3. Carregar a Extensão

1. Clique no botão "Carregar sem compactação" (ou "Load unpacked" se estiver em inglês)
2. Navegue até a pasta do projeto: `C:\AiProjects\RoadToKappa\extensao`
3. Selecione a pasta `extensao` e clique em "Selecionar pasta" (ou "Select Folder")

### 4. Verificar Instalação

Você deve ver a extensão "RoadToKappa - Wiki Redirect" na lista de extensões instaladas.

### 5. Testar a Extensão

**Opção 1: Testar em uma página qualquer com link da wiki**

1. Abra qualquer página (ex: Reddit, Discord, fórum, etc)
2. Encontre um link que aponte para `escapefromtarkov.fandom.com/wiki/...`
3. Clique no link
4. Deve redirecionar para `https://rgcavalheiro.github.io/RoadToKappa/?search=NomeDaQuest`

**Opção 2: Criar uma página de teste**

1. Crie um arquivo HTML simples com um link:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Teste Extensão</title>
</head>
<body>
    <h1>Teste da Extensão RoadToKappa</h1>
    <p>
        <a href="https://escapefromtarkov.fandom.com/wiki/Introduction">
            Clique aqui para testar (deve redirecionar)
        </a>
    </p>
    <p>
        <a href="https://escapefromtarkov.fandom.com/wiki/Shooting_Cans">
            Outro link de teste
        </a>
    </p>
</body>
</html>
```

2. Abra esse arquivo no Chrome
3. Clique nos links
4. Deve redirecionar para o GitHub Pages com busca automática

### 6. Verificar Console (Opcional)

1. Abra o DevTools (F12)
2. Vá para a aba "Console"
3. Você deve ver mensagens como:
   - `[RoadToKappa] Extensão ativada! Links da wiki serão redirecionados.`
   - `[RoadToKappa] Link interceptado: ...`
   - `[RoadToKappa] Quest: ...`
   - `[RoadToKappa] Redirecionando para: ...`

## Troubleshooting

**A extensão não aparece:**
- Verifique se o "Modo do desenvolvedor" está ativado
- Verifique se você selecionou a pasta `extensao` correta (deve conter `manifest.json`)

**O link não redireciona:**
- Verifique no console se há erros
- Verifique se o link realmente aponta para `escapefromtarkov.fandom.com`
- Tente recarregar a página

**A busca não funciona:**
- Verifique se o GitHub Pages está funcionando
- Verifique no console do GitHub Pages se há erros

