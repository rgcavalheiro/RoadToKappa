# 🎯 Tarkov Kappa Quest Tracker

Uma aplicação web para acompanhar seu progresso nas missões do Kappa Container no jogo Escape from Tarkov.

## 📋 Funcionalidades

- **Seleção de NPC**: Escolha entre os 8 NPCs principais (Prapor, Therapist, Skier, Peacekeeper, Mechanic, Ragman, Jaeger, Lightkeeper)
- **Visualização de Progresso**: Veja sua última missão completada, missão atual e próxima missão
- **Sistema de Tiers**: Missões organizadas por níveis de dificuldade e dependências
- **Links para Wiki**: Acesso direto à wiki do Escape from Tarkov para cada missão
- **Persistência Local**: Seu progresso é salvo automaticamente no navegador
- **Lista Completa**: Visualize todas as missões de um NPC com seus status (Completada, Atual, Disponível, Bloqueada)

## 🚀 Como Usar

1. Abra o arquivo `index.html` no seu navegador
2. Selecione um NPC clicando no botão correspondente
3. A aplicação mostrará:
   - **Última Missão Completada**: A última missão que você finalizou
   - **Missão Atual**: A próxima missão que você deve fazer
   - **Próxima Missão**: A missão que virá após completar a atual
4. Clique em "✅ Marcar como Completada" quando terminar uma missão
5. Use "📋 Ver Todas as Missões" para ver a lista completa com status de cada missão
6. Clique nos links "📖 Ver na Wiki" para obter mais informações sobre cada missão

## 📁 Estrutura de Arquivos

- `index.html` - Interface principal
- `styles.css` - Estilos e design da aplicação
- `app.js` - Lógica da aplicação e gerenciamento de progresso
- `quests-data.json` - Dados de todas as missões organizadas por NPC

## 💾 Armazenamento

O progresso é salvo localmente no navegador usando `localStorage`. Seus dados não são enviados para nenhum servidor.

## 🔄 Resetar Progresso

Para resetar o progresso de um NPC específico, clique no botão "🔄 Resetar Progresso" quando estiver visualizando as missões daquele NPC.

## 📝 Notas

- As missões são organizadas por tiers baseados nas dependências entre elas
- Uma missão só fica disponível quando todas as suas pré-requisitos foram completadas
- Os links da wiki apontam para a Escape from Tarkov Wiki oficial

## 🎮 NPCs Disponíveis

1. **Prapor** - 16 missões
2. **Therapist** - 18 missões
3. **Skier** - 15 missões
4. **Peacekeeper** - 25 missões
5. **Mechanic** - 50+ missões
6. **Ragman** - 30 missões
7. **Jaeger** - 18 missões
8. **Lightkeeper** - 6 missões

Boa sorte na sua jornada para o Kappa Container! 🎯

