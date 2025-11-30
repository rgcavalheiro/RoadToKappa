// Carregar dados das missões
let questsData = {};
let currentNPC = null;
let progress = {};
let questOrder = {}; // Armazenar ordem personalizada das quests por NPC

// NPCs que precisam ser desbloqueados por quests de outros NPCs
// Formato: { npcId: { questId: 'id_da_quest', npcId: 'npc_que_tem_a_quest' } }
const npcUnlockRequirements = {
    'jaeger': {
        questId: 'introduction',
        npcId: 'mechanic'
    }
    // Adicione outros NPCs bloqueados aqui se necessário
};

// Quests mutuamente exclusivas (escolhas)
// Quando uma quest é completada, as outras do mesmo grupo ficam bloqueadas
// Formato: { groupId: [questId1, questId2, ...] }
const mutuallyExclusiveQuests = {
    'postman_pat_choice': [
        'youve_got_mail_1',      // Prapor - escolha 1
        'possessor_1',            // Prapor - escolha 2
        'postman_pat_part_2'      // Therapist - escolha 3
    ]
    // Adicione outros grupos de escolhas aqui
};

// Verificar se um NPC está desbloqueado
function isNPCUnlocked(npcId) {
    // Se não há requisito de desbloqueio, está sempre desbloqueado
    if (!npcUnlockRequirements[npcId]) {
        return true;
    }
    
    const requirement = npcUnlockRequirements[npcId];
    const npcProgress = progress[requirement.npcId] || { completed: [], current: null };
    const completedIds = npcProgress.completed || [];
    
    // Verificar se a quest que desbloqueia o NPC foi completada
    return completedIds.includes(requirement.questId);
}

// Configuração da URL da API
// Se você hospedar o Flask no Render, coloque a URL aqui (ex: 'https://seu-app.onrender.com')
const RENDER_API_URL = 'https://roadtokappa.onrender.com';

// Detectar URL da API automaticamente
let API_BASE_URL;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Desenvolvimento local - tentar Flask local primeiro
    API_BASE_URL = 'http://localhost:5000';
} else if (window.location.hostname.includes('github.io')) {
    // GitHub Pages - não usar API externa por padrão (usar dados pré-processados)
    // Mas manter Render como fallback se configurado
    API_BASE_URL = null; // Desabilitado por padrão - usar dados pré-processados
} else {
    // Render ou outro servidor - usar a mesma origem
    API_BASE_URL = window.location.origin;
}

// URLs das imagens dos NPCs (portraits locais)
const npcImages = {
    'prapor': 'traders/prapor.png',
    'therapist': 'traders/therapist.png',
    'skier': 'traders/skier.png',
    'peacekeeper': 'traders/peacekeper.png', // Nota: arquivo tem typo "peacekeper"
    'mechanic': 'traders/mechanic.png',
    'ragman': 'traders/ragman.png',
    'jaeger': 'traders/jaeger.png',
    'fence': 'traders/fence.png',
    'lightkeeper': 'traders/lightkeeper.png' // Se não existir, será ignorado
};

// Carregar progresso salvo
function loadProgress() {
    const saved = localStorage.getItem('tarkovQuestProgress');
    if (saved) {
        progress = JSON.parse(saved);
    }
    
    // Carregar ordem personalizada das quests
    const savedOrder = localStorage.getItem('tarkovQuestOrder');
    if (savedOrder) {
        questOrder = JSON.parse(savedOrder);
    }
}

// Salvar progresso
function saveProgress() {
    localStorage.setItem('tarkovQuestProgress', JSON.stringify(progress));
}

// Salvar ordem personalizada das quests
function saveQuestOrder() {
    localStorage.setItem('tarkovQuestOrder', JSON.stringify(questOrder));
}

// Carregar dados do JSON
async function loadQuestData() {
    try {
        // Carregar apenas o quests-database.json (novo banco de dados)
        const response = await fetch('quests-database.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const databaseData = await response.json();
        
        // A estrutura já está no formato correto, apenas precisamos garantir compatibilidade
        // Remover campos auxiliares se existirem
        const cleanData = {
            npcs: {}
        };
        
        // Processar cada NPC
        Object.keys(databaseData.npcs).forEach(npcId => {
            const npc = databaseData.npcs[npcId];
            cleanData.npcs[npcId] = {
                name: npc.name,
                quests: npc.quests.map(quest => {
                    // Combinar prerequisites e prerequisitesExternal se existirem
                    const allPrerequisites = [
                        ...(quest.prerequisites || []),
                        ...(quest.prerequisitesExternal || [])
                    ];
                    
                    return {
                        id: quest.id,
                        name: quest.name,
                        tier: quest.tier || null, // Tier pode ser null
                        prerequisites: allPrerequisites,
                        wikiUrl: quest.wikiUrl || '',
                        kappaRequired: quest.kappaRequired || false
                    };
                })
            };
        });
        
        questsData = cleanData;
        
        // Validar quests completadas - remover quests que não deveriam estar completadas
        validateCompletedQuests();
        
        initializeNPCs();
        // Atualizar checks verdes e NPCs bloqueados após inicializar
        setTimeout(() => {
            updateNPCButtons();
            checkNPCUnlocks();
        }, 100);
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        console.error('Detalhes do erro:', error.message);
        
        // Tentar carregar quests-data.json como fallback
        try {
            console.log('Tentando carregar quests-data.json como fallback...');
            const fallbackResponse = await fetch('quests-data.json');
            if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                questsData = fallbackData;
                initializeNPCs();
                setTimeout(() => {
                    updateNPCButtons();
                    checkNPCUnlocks();
                }, 100);
                console.log('Fallback carregado com sucesso!');
                return;
            }
        } catch (fallbackError) {
            console.error('Erro no fallback:', fallbackError);
        }
        
        alert(`Erro ao carregar dados das quests.\n\nErro: ${error.message}\n\nVerifique se o arquivo quests-database.json existe e está acessível.`);
    }
}

// Ordem correta dos NPCs (conforme o jogo)
const npcOrder = [
    'prapor',
    'therapist',
    'fence',
    'skier',
    'peacekeeper',
    'mechanic',
    'ragman',
    'jaeger',
    'lightkeeper'
];

// Inicializar botões dos NPCs
function initializeNPCs() {
    const npcButtons = document.getElementById('npcButtons');
    if (!npcButtons) {
        console.error('[INIT] Elemento npcButtons não encontrado!');
        return;
    }
    
    if (!questsData || !questsData.npcs) {
        console.error('[INIT] Dados de quests não carregados ainda!');
        return;
    }
    
    console.log('[INIT] Inicializando', Object.keys(questsData.npcs).length, 'NPCs');
    npcButtons.innerHTML = '';

    // Ordenar NPCs conforme a ordem definida
    const orderedNPCs = npcOrder.filter(npcId => questsData.npcs[npcId]);
    
    orderedNPCs.forEach(npcId => {
        const npc = questsData.npcs[npcId];
        const button = document.createElement('button');
        button.className = 'npc-btn';
        button.setAttribute('data-npc-id', npcId);
        
        // Verificar se o NPC está desbloqueado
        const isUnlocked = isNPCUnlocked(npcId);
        if (!isUnlocked) {
            button.classList.add('locked');
            button.disabled = true;
        }
        
        // Determinar nível do NPC (I ou II) - Peacekeeper é II, outros são I
        const npcLevel = npcId === 'peacekeeper' ? 'II' : 'I';
        
        // Obter URL da imagem local
        const npcImage = npcImages[npcId] || '';
        
        // Se bloqueado, adicionar overlay
        const lockOverlay = !isUnlocked ? '<div class="npc-btn-lock-overlay">🔒</div>' : '';
        
        button.innerHTML = `
            <div class="npc-btn-content">
                <div class="npc-btn-portrait">
                    <img src="${npcImage}" alt="${npc.name}" class="npc-portrait-img" onerror="this.style.display='none'">
                    ${lockOverlay}
                </div>
                <div class="npc-btn-name">${npc.name}</div>
            </div>
        `;
        
        if (isUnlocked) {
            button.onclick = (e) => selectNPC(npcId, button);
        } else {
            button.onclick = (e) => {
                const requirement = npcUnlockRequirements[npcId];
                const unlockNPC = questsData.npcs[requirement.npcId];
                const unlockQuest = unlockNPC.quests.find(q => q.id === requirement.questId);
                alert(`${npc.name} está bloqueado!\n\nComplete a quest "${unlockQuest.name}" do ${unlockNPC.name} para desbloquear.`);
            };
        }
        
        npcButtons.appendChild(button);
    });
    
    // Atualizar visual dos NPCs bloqueados
    updateNPCButtons();
}

// Funções de carregamento de imagens removidas - agora usando imagens locais diretamente

// Selecionar NPC
function selectNPC(npcId, buttonElement) {
    currentNPC = npcId;
    
    // Atualizar botões ativos
    document.querySelectorAll('.npc-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (buttonElement) {
        buttonElement.classList.add('active');
    }

    // Inicializar progresso se não existir
    if (!progress[npcId]) {
        progress[npcId] = {
            completed: [],
            current: null
        };
    }

    updateQuestList();
    document.getElementById('questLayout').style.display = 'grid';
    document.getElementById('questActions').style.display = 'flex';
    
    // Limpar detalhes ao trocar de NPC
    clearQuestDetails();
    
    // Atualizar check verde nos botões de NPC
    updateNPCButtons();
}

// Verificar se uma quest está bloqueada por quests mutuamente exclusivas
function isBlockedByMutuallyExclusive(questId, allProgress) {
    // Verificar se esta quest está em algum grupo de exclusão mútua
    for (const groupId in mutuallyExclusiveQuests) {
        const group = mutuallyExclusiveQuests[groupId];
        if (group.includes(questId)) {
            // Verificar se alguma outra quest do grupo foi completada
            for (const otherQuestId of group) {
                if (otherQuestId === questId) continue;
                
                // Procurar em todos os NPCs
                for (const npcId in allProgress) {
                    const npcProgress = allProgress[npcId] || { completed: [], current: null };
                    if (npcProgress.completed && npcProgress.completed.includes(otherQuestId)) {
                        return true; // Bloqueada porque outra quest do grupo foi completada
                    }
                }
            }
        }
    }
    return false;
}

// Verificar se todos os pré-requisitos de uma quest foram completados (incluindo cross-NPC)
function areAllPrerequisitesMet(quest, npcId, allProgress) {
    if (!quest.prerequisites || quest.prerequisites.length === 0) {
        return true;
    }
    
    // Verificar pré-requisitos do mesmo NPC
    const npcProgress = allProgress[npcId] || { completed: [], current: null };
    const completedIds = npcProgress.completed || [];
    
    // Verificar cada pré-requisito
    return quest.prerequisites.every(prereqId => {
        // Primeiro, verificar se está no mesmo NPC
        if (completedIds.includes(prereqId)) {
            return true;
        }
        
        // Se não está no mesmo NPC, procurar em outros NPCs
        for (const otherNpcId in allProgress) {
            const otherProgress = allProgress[otherNpcId] || { completed: [], current: null };
            if (otherProgress.completed && otherProgress.completed.includes(prereqId)) {
                return true;
            }
        }
        
        return false;
    });
}

// Validar quests completadas - remover quests que não têm pré-requisitos completados
function validateCompletedQuests() {
    if (!questsData || !questsData.npcs) {
        console.warn('validateCompletedQuests: questsData nao carregado ainda');
        return;
    }
    
    let removedCount = 0;
    const removedQuests = [];
    
    for (const npcId in progress) {
        const npcProgress = progress[npcId];
        if (!npcProgress || !npcProgress.completed || npcProgress.completed.length === 0) continue;
        
        const npc = questsData.npcs[npcId];
        if (!npc) {
            console.warn(`validateCompletedQuests: NPC ${npcId} nao encontrado em questsData`);
            continue;
        }
        
        const validCompleted = [];
        
        for (const questId of [...npcProgress.completed]) { // Copiar array para evitar problemas durante iteração
            const quest = npc.quests.find(q => q.id === questId);
            if (!quest) {
                // Quest não existe mais - remover
                removedCount++;
                removedQuests.push(`${questId} (nao existe)`);
                continue;
            }
            
            // Verificar se todos os pré-requisitos foram completados
            const allPrerequisitesMet = areAllPrerequisitesMet(quest, npcId, progress);
            
            if (allPrerequisitesMet) {
                validCompleted.push(questId);
            } else {
                // Quest foi completada mas não tem pré-requisitos completados - remover
                removedCount++;
                removedQuests.push(`${quest.name} (${questId})`);
                console.warn(`Removendo quest completada invalida: ${quest.name} (${questId}) - pre-requisitos nao completos`);
            }
        }
        
        if (removedCount > 0 || validCompleted.length !== npcProgress.completed.length) {
            npcProgress.completed = validCompleted;
        }
    }
    
    if (removedCount > 0) {
        saveProgress();
        console.log(`Validacao: ${removedCount} quest(s) removida(s) da lista de completadas:`, removedQuests);
        // Mostrar alerta para o usuário
        alert(`${removedCount} quest(s) foram removidas da lista de completadas porque nao tinham pre-requisitos completos.\n\nQuests removidas:\n${removedQuests.join('\n')}`);
    } else {
        console.log('Validacao: Todas as quests completadas sao validas');
    }
}

// Atualizar lista de quests disponíveis
function updateQuestList() {
    if (!currentNPC) return;

    const npc = questsData.npcs[currentNPC];
    const npcProgress = progress[currentNPC] || { completed: [], current: null };
    const completedIds = npcProgress.completed || [];
    
    const showCompleted = document.getElementById('showCompleted').checked;
    const showLocked = document.getElementById('showLocked').checked;
    const showKappa = document.getElementById('showKappa').checked;
    
    const container = document.getElementById('questListContainer');
    container.innerHTML = '';
    
    let availableCount = 0;
    let completedCount = 0;
    
    // Filtrar e preparar quests
    const filteredQuests = [];
    npc.quests.forEach(quest => {
        // Filtrar por Kappa se o checkbox estiver marcado
        if (showKappa && !quest.kappaRequired) return;
        
        const isCompleted = completedIds.includes(quest.id);
        const allPrerequisitesMet = areAllPrerequisitesMet(quest, currentNPC, progress);
        const isBlockedByExclusive = !isCompleted && isBlockedByMutuallyExclusive(quest.id, progress);
        const isLocked = !allPrerequisitesMet && !isCompleted;
        
        // Filtrar quests baseado nas opções
        if (isCompleted && !showCompleted) return;
        if ((isLocked || isBlockedByExclusive) && !showLocked) return;
        
        if (!isCompleted && allPrerequisitesMet && !isBlockedByExclusive) {
            availableCount++;
        }
        if (isCompleted) {
            completedCount++;
        }
        
        filteredQuests.push({
            quest: quest,
            isCompleted: isCompleted,
            isLocked: isLocked,
            isBlockedByExclusive: isBlockedByExclusive
        });
    });
    
    // Aplicar ordem personalizada se existir
    const npcOrder = questOrder[currentNPC] || [];
    if (npcOrder.length > 0) {
        // Criar mapa de IDs para ordenação
        const orderMap = new Map();
        npcOrder.forEach((id, index) => {
            orderMap.set(id, index);
        });
        
        // Ordenar: primeiro as que têm ordem personalizada, depois as outras
        filteredQuests.sort((a, b) => {
            const aOrder = orderMap.has(a.quest.id) ? orderMap.get(a.quest.id) : Infinity;
            const bOrder = orderMap.has(b.quest.id) ? orderMap.get(b.quest.id) : Infinity;
            return aOrder - bOrder;
        });
    }
    
    // Criar elementos das quests
    filteredQuests.forEach(({quest, isCompleted, isLocked, isBlockedByExclusive}) => {
        const questItem = document.createElement('div');
        questItem.className = 'quest-list-item';
        questItem.draggable = true;
        questItem.dataset.questId = quest.id;
        
        if (isCompleted) {
            questItem.classList.add('completed');
        }
        if (isLocked) {
            questItem.classList.add('locked');
        }
        if (isBlockedByExclusive) {
            questItem.classList.add('blocked-exclusive');
            questItem.title = 'Esta quest esta bloqueada porque voce completou uma quest alternativa';
        }
        
        let statusText = '';
        if (isBlockedByExclusive && !isCompleted) {
            statusText = '<span class="quest-list-item-status blocked-exclusive">Bloqueada (escolha alternativa)</span>';
        }
        
        questItem.innerHTML = `
            <div class="quest-list-item-header">
                <div class="quest-list-item-drag-handle">⋮⋮</div>
                <div class="quest-list-item-name">${quest.name}</div>
                ${!isCompleted && !isLocked && !isBlockedByExclusive ? `
                    <button class="quest-list-item-complete-btn" onclick="completeQuest('${quest.id}'); event.stopPropagation();">
                        ✓ Complete
                    </button>
                ` : isCompleted ? `
                    <button class="quest-list-item-undo-btn" onclick="undoCompleteQuest('${quest.id}'); event.stopPropagation();">
                        ↶ Desfazer
                    </button>
                ` : isBlockedByExclusive ? `
                    ${statusText}
                ` : isLocked ? `
                    <span class="quest-list-item-status locked">Locked</span>
                ` : ''}
            </div>
        `;
        
        // Adicionar eventos de drag and drop
        questItem.addEventListener('dragstart', handleDragStart);
        questItem.addEventListener('dragover', handleDragOver);
        questItem.addEventListener('drop', handleDrop);
        questItem.addEventListener('dragend', handleDragEnd);
        
        // Adicionar evento de clique para selecionar quest
        if (!isLocked) {
            questItem.addEventListener('click', (e) => {
                // Não selecionar se clicou no botão de completar, desfazer ou no handle de drag
                if (e.target.classList.contains('quest-list-item-complete-btn') || 
                    e.target.classList.contains('quest-list-item-undo-btn') ||
                    e.target.classList.contains('quest-list-item-drag-handle')) {
                    return;
                }
                selectQuest(quest);
            });
        }
        
        container.appendChild(questItem);
    });
    
    // Atualizar progresso
    const totalAvailable = availableCount + completedCount;
    document.getElementById('questProgress').textContent = `${completedCount}/${totalAvailable}`;
}

// Variáveis para drag and drop
let draggedElement = null;
let draggedOverElement = null;

// Handlers de drag and drop
function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    
    // Remover highlight anterior
    if (draggedOverElement && draggedOverElement !== this) {
        draggedOverElement.classList.remove('drag-over');
    }
    
    // Adicionar highlight
    if (this !== draggedElement) {
        this.classList.add('drag-over');
        draggedOverElement = this;
    }
    
    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (draggedElement !== this) {
        const container = document.getElementById('questListContainer');
        const allItems = Array.from(container.querySelectorAll('.quest-list-item'));
        const draggedIndex = allItems.indexOf(draggedElement);
        const targetIndex = allItems.indexOf(this);
        
        // Reordenar no DOM
        if (draggedIndex < targetIndex) {
            container.insertBefore(draggedElement, this.nextSibling);
        } else {
            container.insertBefore(draggedElement, this);
        }
        
        // Salvar nova ordem
        saveCurrentOrder();
    }
    
    this.classList.remove('drag-over');
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    
    // Remover todos os highlights
    document.querySelectorAll('.quest-list-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    
    draggedElement = null;
    draggedOverElement = null;
}

// Salvar ordem atual das quests
function saveCurrentOrder() {
    if (!currentNPC) return;
    
    const container = document.getElementById('questListContainer');
    const items = Array.from(container.querySelectorAll('.quest-list-item'));
    const order = items.map(item => item.dataset.questId);
    
    if (!questOrder[currentNPC]) {
        questOrder[currentNPC] = [];
    }
    questOrder[currentNPC] = order;
    saveQuestOrder();
}

// Selecionar quest para mostrar detalhes
let selectedQuest = null;

function selectQuest(quest) {
    selectedQuest = quest;
    
    // Atualizar seleção visual
    document.querySelectorAll('.quest-list-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Encontrar o item correspondente e marcar como selecionado
    const items = document.querySelectorAll('.quest-list-item');
    items.forEach(item => {
        const questName = item.querySelector('.quest-list-item-name').textContent;
        if (questName === quest.name) {
            item.classList.add('selected');
        }
    });
    
    // Mostrar detalhes na direita
    showQuestDetailsInPanel(quest);
}

// Mostrar detalhes da quest no painel direito
function showQuestDetailsInPanel(quest) {
    const panel = document.getElementById('questDetailsPanel');
    const placeholder = panel.querySelector('.quest-details-placeholder');
    
    // Remover conteúdo anterior se existir
    const existingContent = panel.querySelector('.quest-details-content');
    if (existingContent) {
        existingContent.remove();
    }
    
    // Criar novo conteúdo
    const content = document.createElement('div');
    content.className = 'quest-details-content';
    content.id = 'questDetailsContentPanel';
    
    // Mostrar loading
    content.innerHTML = `
        <div class="quest-details-loading">
            <p>Carregando informações da quest...</p>
        </div>
    `;
    
    placeholder.style.display = 'none';
    content.style.display = 'flex';
    content.classList.add('active');
    panel.appendChild(content);
    
    // Carregar dados da quest
    loadQuestDetailsForPanel(quest.wikiUrl, content);
}

// ==================== SISTEMA DE CACHE DE DETALHES ====================

// Detalhes pré-processados (carregados do quests-details.json)
let preprocessedQuestDetails = {};

// Carregar cache de detalhes das quests (localStorage)
let questDetailsCache = {};

function loadQuestDetailsCache() {
    try {
        const cached = localStorage.getItem('questDetailsCache');
        if (cached) {
            questDetailsCache = JSON.parse(cached);
            console.log('[CACHE] Cache carregado:', Object.keys(questDetailsCache).length, 'quests em cache');
        }
    } catch (error) {
        console.error('[CACHE] Erro ao carregar cache:', error);
        questDetailsCache = {};
    }
}

// Salvar cache de detalhes das quests
function saveQuestDetailsCache() {
    try {
        localStorage.setItem('questDetailsCache', JSON.stringify(questDetailsCache));
        console.log('[CACHE] Cache salvo:', Object.keys(questDetailsCache).length, 'quests');
    } catch (error) {
        console.error('[CACHE] Erro ao salvar cache:', error);
        // Se o localStorage estiver cheio, limpar cache antigo
        if (error.name === 'QuotaExceededError') {
            console.warn('[CACHE] localStorage cheio, limpando cache antigo...');
            const keys = Object.keys(questDetailsCache);
            // Remover metade das entradas mais antigas (assumindo ordem de inserção)
            const keysToRemove = keys.slice(0, Math.floor(keys.length / 2));
            keysToRemove.forEach(key => delete questDetailsCache[key]);
            try {
                localStorage.setItem('questDetailsCache', JSON.stringify(questDetailsCache));
                console.log('[CACHE] Cache limpo e salvo novamente');
            } catch (e) {
                console.error('[CACHE] Erro ao salvar cache após limpeza:', e);
            }
        }
    }
}

// Verificar se os detalhes estão em cache
function getCachedQuestDetails(wikiUrl) {
    if (questDetailsCache[wikiUrl]) {
        console.log('[CACHE] Detalhes encontrados em cache para:', wikiUrl);
        return questDetailsCache[wikiUrl];
    }
    return null;
}

// Salvar detalhes no cache
function setCachedQuestDetails(wikiUrl, details) {
    questDetailsCache[wikiUrl] = {
        ...details,
        cachedAt: new Date().toISOString()
    };
    saveQuestDetailsCache();
}

// Carregar detalhes pré-processados do arquivo JSON
async function loadPreprocessedQuestDetails() {
    try {
        const response = await fetch('quests-details.json');
        if (response.ok) {
            const data = await response.json();
            preprocessedQuestDetails = data.details || {};
            console.log('[PREPROCESSED] Carregados', Object.keys(preprocessedQuestDetails).length, 'detalhes pré-processados');
        } else {
            console.warn('[PREPROCESSED] quests-details.json não encontrado (status:', response.status, '). Execute preprocess_quest_details.py para gerar.');
            preprocessedQuestDetails = {}; // Garantir que é um objeto vazio
        }
    } catch (error) {
        console.warn('[PREPROCESSED] Erro ao carregar quests-details.json:', error);
        preprocessedQuestDetails = {}; // Garantir que é um objeto vazio mesmo em caso de erro
    }
}

// Normalizar URL da wiki para busca
function normalizeWikiUrl(url) {
    if (!url || typeof url !== 'string') return null;
    
    try {
        // Se não começar com http, adicionar
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        
        // Parsear e normalizar
        const urlObj = new URL(url);
        let path = urlObj.pathname;
        
        // Garantir que começa com /wiki/
        if (!path.startsWith('/wiki/')) {
            if (path.startsWith('wiki/')) {
                path = '/' + path;
            } else if (path === '/' || path === '') {
                // URL vazia ou só domínio
                return null;
            } else {
                path = '/wiki/' + path;
            }
        }
        
        // Reconstruir URL normalizada (sem query params e fragmentos)
        return `${urlObj.protocol}//${urlObj.host}${path}`;
    } catch (e) {
        // Se falhar o parse, retornar URL original limpa
        console.warn('[normalizeWikiUrl] Erro ao normalizar URL:', url, e);
        return url ? url.split('?')[0].split('#')[0] : null;
    }
}

// ==================== FIM DO SISTEMA DE CACHE ====================

// Carregar detalhes da quest para o painel
function loadQuestDetailsForPanel(wikiUrl, contentElement) {
    if (!wikiUrl) {
        contentElement.innerHTML = `
            <div class="quest-details-error">
                URL da quest não fornecida.
            </div>
        `;
        return;
    }
    
    // 1. PRIMEIRO: Verificar dados pré-processados (mais rápido, funciona offline)
    try {
        const normalizedUrl = normalizeWikiUrl(wikiUrl);
        if (normalizedUrl && preprocessedQuestDetails && preprocessedQuestDetails[normalizedUrl]) {
            const preprocessed = preprocessedQuestDetails[normalizedUrl];
            // Verificar se não é um erro
            if (preprocessed && preprocessed.name && !preprocessed.error) {
                console.log('[PREPROCESSED] Usando dados pré-processados para:', normalizedUrl);
                displayQuestDetails(preprocessed, contentElement);
                return;
            }
        }
    } catch (e) {
        console.warn('[PREPROCESSED] Erro ao verificar dados pré-processados:', e);
    }
    
    // 2. SEGUNDO: Verificar cache do localStorage
    try {
        const cachedDetails = getCachedQuestDetails(wikiUrl);
        if (cachedDetails) {
            console.log('[CACHE] Usando dados do cache localStorage');
            displayQuestDetails(cachedDetails, contentElement);
            return;
        }
    } catch (e) {
        console.warn('[CACHE] Erro ao verificar cache:', e);
    }
    
    // 3. TERCEIRO: Fazer requisição à API (fallback, apenas se disponível)
    console.log('[API] Dados não encontrados localmente, tentando API...');
    
    // Verificar se a API está disponível
    if (!API_BASE_URL) {
        contentElement.innerHTML = `
            <div class="quest-details-error">
                <p>Detalhes não encontrados localmente e API não disponível.</p>
                <p style="margin-top: 10px; font-size: 0.9em; opacity: 0.8;">
                    Para usar offline, execute: <code>python preprocess_quest_details.py</code>
                </p>
                <p style="margin-top: 10px; font-size: 0.9em; opacity: 0.8;">
                    Ou inicie o servidor Flask local na porta 5000.
                </p>
            </div>
        `;
        return;
    }
    
    // Codificar URL
    let questUrl = wikiUrl;
    if (wikiUrl.startsWith('http://') || wikiUrl.startsWith('https://')) {
        questUrl = encodeURIComponent(wikiUrl);
    } else {
        questUrl = encodeURIComponent(wikiUrl);
    }
    
    // Criar AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    console.log('[DEBUG] Fazendo requisição para:', `${API_BASE_URL}/api/quest/${questUrl}`);
    
    fetch(`${API_BASE_URL}/api/quest/${questUrl}`, {
        signal: controller.signal,
        headers: {
            'Accept': 'application/json'
        },
        mode: 'cors'
    })
        .then(response => {
            clearTimeout(timeoutId);
            console.log('[DEBUG] Resposta recebida:', response.status, response.statusText);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                contentElement.innerHTML = `
                    <div class="quest-details-error">
                        Erro ao carregar informações: ${data.error}
                    </div>
                `;
                return;
            }
            
            // Salvar no cache antes de exibir
            setCachedQuestDetails(wikiUrl, data);
            
            // Exibir os detalhes
            displayQuestDetails(data, contentElement);
        })
        .catch(err => {
            clearTimeout(timeoutId);
            console.error('[DEBUG] Erro ao carregar quest:', err);
            console.error('[DEBUG] API_BASE_URL:', API_BASE_URL);
            console.error('[DEBUG] URL completa:', `${API_BASE_URL}/api/quest/${questUrl}`);
            
            if (err.name === 'AbortError') {
                contentElement.innerHTML = `
                    <div class="quest-details-error">
                        Timeout ao carregar informações. O servidor pode estar lento ou indisponível.
                    </div>
                `;
            } else {
                contentElement.innerHTML = `
                    <div class="quest-details-error">
                        Erro ao carregar informações: ${err.message}
                    </div>
                `;
            }
        });
}

// Função auxiliar para exibir os detalhes da quest (reutilizada para cache e API)
function displayQuestDetails(data, contentElement) {
    if (data.error) {
        contentElement.innerHTML = `
            <div class="quest-details-error">
                Erro ao carregar informações: ${data.error}
            </div>
        `;
        return;
    }
    
    // Preencher informações
    let html = `
        <div class="quest-details-header">
            <h1>${data.name || 'Quest'}</h1>
            <span class="npc-badge">${data.npc || currentNPC}</span>
        </div>
        <div class="quest-details-body">
    `;
    
    if (data.objectives && data.objectives.length > 0) {
        html += `
            <div class="quest-details-section">
                <h2 class="section-title">Objetivos</h2>
                <ul class="objectives-list">
        `;
        data.objectives.forEach(objective => {
            html += `<li>${objective}</li>`;
        });
        html += `
                </ul>
            </div>
        `;
    }
    
    if (data.guide_images && data.guide_images.length > 0) {
        html += `
            <div class="quest-details-section">
                <h2 class="section-title">Guia</h2>
                <div class="guide-images">
        `;
        
        data.guide_images.forEach((imgSrc, index) => {
            html += `
                <div class="guide-image-container">
                    <div style="text-align:center;padding:20px;color:#7f8c8d;" id="guide-loading-${index}">
                        Carregando imagem...
                    </div>
                    <img 
                        class="guide-image" 
                        style="display:none;" 
                        alt="Guia da quest - Imagem ${index + 1}"
                        data-src="${imgSrc}"
                        data-index="${index}"
                    >
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    html += `
        </div>
    `;
    
    contentElement.innerHTML = html;
    
    // Carregar imagens
    if (data.guide_images && data.guide_images.length > 0) {
        const images = contentElement.querySelectorAll('.guide-image');
        images.forEach(img => {
            const imgSrc = img.getAttribute('data-src');
            const index = img.getAttribute('data-index');
            
            img.onload = function() {
                const loading = document.getElementById(`guide-loading-${index}`);
                if (loading) {
                    loading.remove();
                }
                img.style.display = 'block';
                img.style.cursor = 'pointer';
                
                img.addEventListener('click', function(e) {
                    e.stopPropagation();
                    openImageModal(imgSrc, e);
                });
            };
            
            // Usar proxy se API disponível, senão usar proxy CORS público
            if (API_BASE_URL) {
                const proxyUrl = `${API_BASE_URL}/api/image-proxy?url=${encodeURIComponent(imgSrc)}`;
                img.src = proxyUrl;
                
                // Handler de erro para API
                img.onerror = function() {
                    const loading = document.getElementById(`guide-loading-${index}`);
                    if (loading) {
                        loading.textContent = 'Erro ao carregar';
                        loading.style.color = '#e74c3c';
                    }
                };
            } else {
                // Usar proxy CORS público para GitHub Pages
                // Tentar múltiplos proxies para maior confiabilidade
                const corsProxies = [
                    `https://corsproxy.io/?${encodeURIComponent(imgSrc)}`,
                    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(imgSrc)}`,
                    `https://cors-anywhere.herokuapp.com/${imgSrc}`,
                    imgSrc // Fallback direto (pode falhar por CORS)
                ];
                
                // Tentar primeiro proxy
                let proxyIndex = 0;
                img.src = corsProxies[proxyIndex];
                
                // Se falhar, tentar próximo proxy
                img.onerror = function() {
                    if (proxyIndex < corsProxies.length - 1) {
                        proxyIndex++;
                        console.log(`[IMAGE] Tentando proxy ${proxyIndex + 1}/${corsProxies.length}: ${corsProxies[proxyIndex]}`);
                        this.src = corsProxies[proxyIndex];
                    } else {
                        // Todos os proxies falharam
                        console.error('[IMAGE] Todos os proxies falharam para:', imgSrc);
                        const loading = document.getElementById(`guide-loading-${index}`);
                        if (loading) {
                            loading.textContent = 'Erro ao carregar imagem';
                            loading.style.color = '#e74c3c';
                        }
                    }
                };
            }
        });
    }
}

// Limpar detalhes da quest
function clearQuestDetails() {
    const panel = document.getElementById('questDetailsPanel');
    const placeholder = panel.querySelector('.quest-details-placeholder');
    const existingContent = panel.querySelector('.quest-details-content');
    
    if (existingContent) {
        existingContent.remove();
    }
    
    placeholder.style.display = 'flex';
    selectedQuest = null;
}

// Completar quest específica
function completeQuest(questId) {
    if (!currentNPC) return;
    
    // Prevenir seleção da quest ao clicar no botão
    if (event) {
        event.stopPropagation();
    }
    
    const npc = questsData.npcs[currentNPC];
    const npcProgress = progress[currentNPC] || { completed: [], current: null };
    
    // Verificar se a quest existe
    const quest = npc.quests.find(q => q.id === questId);
    if (!quest) return;
    
    // Verificar se já foi completada
    if (npcProgress.completed && npcProgress.completed.includes(questId)) {
        return;
    }
    
    // Verificar pré-requisitos (incluindo cross-NPC)
    const allPrerequisitesMet = areAllPrerequisitesMet(quest, currentNPC, progress);
    
    if (!allPrerequisitesMet) {
        alert('Você precisa completar os pré-requisitos primeiro!');
        return;
    }
    
    // Verificar se está bloqueada por exclusão mútua
    const isBlockedByExclusive = isBlockedByMutuallyExclusive(questId, progress);
    if (isBlockedByExclusive) {
        // Encontrar qual quest alternativa foi completada
        let alternativeQuest = null;
        for (const groupId in mutuallyExclusiveQuests) {
            const group = mutuallyExclusiveQuests[groupId];
            if (group.includes(questId)) {
                for (const otherQuestId of group) {
                    if (otherQuestId === questId) continue;
                    for (const npcId in progress) {
                        const npcProgress = progress[npcId] || { completed: [], current: null };
                        if (npcProgress.completed && npcProgress.completed.includes(otherQuestId)) {
                            // Encontrar nome da quest
                            for (const checkNpcId in questsData.npcs) {
                                const checkQuest = questsData.npcs[checkNpcId].quests.find(q => q.id === otherQuestId);
                                if (checkQuest) {
                                    alternativeQuest = checkQuest.name;
                                    break;
                                }
                            }
                            if (alternativeQuest) break;
                        }
                    }
                    if (alternativeQuest) break;
                }
                if (alternativeQuest) break;
            }
        }
        
        const message = alternativeQuest 
            ? `Esta quest está bloqueada porque você completou "${alternativeQuest}". Quests mutuamente exclusivas não podem ser completadas juntas.`
            : 'Esta quest está bloqueada porque você completou uma quest alternativa. Quests mutuamente exclusivas não podem ser completadas juntas.';
        alert(message);
        return;
    }
    
    // Adicionar à lista de completadas
    if (!npcProgress.completed) {
        npcProgress.completed = [];
    }
    npcProgress.completed.push(questId);
    
    // Limpar missão atual se for a mesma
    if (npcProgress.current === questId) {
        npcProgress.current = null;
    }
    
    // Salvar progresso
    progress[currentNPC] = npcProgress;
    saveProgress();
    
    // Atualizar lista (isso fará com que novas quests liberadas apareçam)
    updateQuestList();
    
    // Se a quest completada estava selecionada, limpar detalhes
    if (selectedQuest && selectedQuest.id === questId) {
        clearQuestDetails();
    }
    
    // Verificar se alguma quest completada desbloqueou um NPC
    checkNPCUnlocks();
    
    updateNPCButtons();
}

// Desfazer conclusão de quest
function undoCompleteQuest(questId) {
    if (!currentNPC) return;
    
    // Prevenir seleção da quest ao clicar no botão
    if (event) {
        event.stopPropagation();
    }
    
    const npc = questsData.npcs[currentNPC];
    const npcProgress = progress[currentNPC] || { completed: [], current: null };
    
    // Verificar se a quest existe
    const quest = npc.quests.find(q => q.id === questId);
    if (!quest) return;
    
    // Verificar se está na lista de completadas
    if (!npcProgress.completed || !npcProgress.completed.includes(questId)) {
        return;
    }
    
    // Remover da lista de completadas
    npcProgress.completed = npcProgress.completed.filter(id => id !== questId);
    
    // Salvar progresso
    progress[currentNPC] = npcProgress;
    saveProgress();
    
    // Atualizar lista (isso fará com que a quest volte a aparecer como disponível)
    updateQuestList();
    
    // Verificar se alguma quest desfeita bloqueou um NPC
    checkNPCUnlocks();
    
    updateNPCButtons();
}

// Verificar se alguma quest completada desbloqueou um NPC
function checkNPCUnlocks() {
    Object.keys(npcUnlockRequirements).forEach(npcId => {
        const requirement = npcUnlockRequirements[npcId];
        const npcProgress = progress[requirement.npcId] || { completed: [], current: null };
        const completedIds = npcProgress.completed || [];
        
        // Se a quest foi completada, desbloquear o NPC
        if (completedIds.includes(requirement.questId)) {
            const button = document.querySelector(`[data-npc-id="${npcId}"]`);
            if (button && button.classList.contains('locked')) {
                button.classList.remove('locked');
                button.disabled = false;
                
                // Remover overlay de bloqueio
                const lockOverlay = button.querySelector('.npc-btn-lock-overlay');
                if (lockOverlay) {
                    lockOverlay.remove();
                }
                
                // Adicionar evento de clique
                button.onclick = (e) => selectNPC(npcId, button);
            }
        }
    });
}

// Funções antigas removidas - não são mais necessárias com o novo layout

// Atualizar botões de NPC (check verde agora é controlado pelo CSS quando .active)
function updateNPCButtons() {
    // Função mantida para compatibilidade, mas o check verde agora é controlado pelo CSS
    // quando o botão tem a classe .active
}

// Função mantida para compatibilidade (não é mais usada, mas pode ser chamada de outros lugares)
function completeCurrentQuest() {
    // Esta função não é mais usada, mas mantida para compatibilidade
    // Use completeQuest(questId) em vez disso
}

// Resetar progresso
function resetProgress() {
    if (!currentNPC) return;
    
    if (confirm('Tem certeza que deseja resetar o progresso deste NPC?')) {
        progress[currentNPC] = { completed: [], current: null };
        saveProgress();
        updateQuestList();
        clearQuestDetails();
        updateNPCButtons();
    }
}

// Funções de lista de missões removidas - não são mais necessárias

// Funções de navegação entre telas
function showMainScreen() {
    const mainScreen = document.getElementById('mainScreen');
    const detailsScreen = document.getElementById('questDetailsScreen');
    
    mainScreen.classList.add('active');
    detailsScreen.classList.remove('active');
}

function showQuestDetailsScreen(wikiUrl, retryCount = 0) {
    const mainScreen = document.getElementById('mainScreen');
    const detailsScreen = document.getElementById('questDetailsScreen');
    const loading = document.getElementById('questDetailsLoading');
    const content = document.getElementById('questDetailsContent');
    const error = document.getElementById('questDetailsError');
    
    // Esconder tela principal e mostrar tela de detalhes
    mainScreen.classList.remove('active');
    detailsScreen.classList.add('active');
    
    // Resetar
    loading.style.display = 'block';
    content.style.display = 'none';
    error.style.display = 'none';
    
    // Limpar conteúdo anterior
    document.getElementById('questDetailsName').textContent = '';
    document.getElementById('questDetailsNPC').textContent = '';
    document.getElementById('objectivesList').innerHTML = '';
    document.getElementById('guideImages').innerHTML = '';
    document.getElementById('objectivesSection').style.display = 'none';
    document.getElementById('guideSection').style.display = 'none';
    
    // 1. PRIMEIRO: Verificar dados pré-processados
    const normalizedUrl = normalizeWikiUrl(wikiUrl);
    if (normalizedUrl && preprocessedQuestDetails[normalizedUrl]) {
        const preprocessed = preprocessedQuestDetails[normalizedUrl];
        if (preprocessed.name && !preprocessed.error) {
            loading.style.display = 'none';
            fillQuestDetailsScreen(preprocessed);
            return;
        }
    }
    
    // 2. SEGUNDO: Verificar cache do localStorage
    const cachedDetails = getCachedQuestDetails(wikiUrl);
    if (cachedDetails) {
        loading.style.display = 'none';
        fillQuestDetailsScreen(cachedDetails);
        return;
    }
    
    // 3. TERCEIRO: Fazer requisição à API (fallback)
    if (!API_BASE_URL) {
        loading.style.display = 'none';
        error.style.display = 'block';
        error.textContent = 'Detalhes não encontrados localmente e API não disponível.\n\nExecute python preprocess_quest_details.py para gerar os dados localmente.';
        return;
    }
    
    // Carregar dados da quest
    // Se a URL já está completa, usar diretamente; caso contrário, codificar
    let questUrl = wikiUrl;
    if (wikiUrl.startsWith('http://') || wikiUrl.startsWith('https://')) {
        // URL completa - codificar apenas para passar como parâmetro de path
        questUrl = encodeURIComponent(wikiUrl);
    } else {
        // URL parcial - codificar normalmente
        questUrl = encodeURIComponent(wikiUrl);
    }
    
    // Atualizar mensagem de loading
    const loadingText = loading.querySelector('p');
    if (loadingText) {
        if (retryCount > 0) {
            loadingText.textContent = `Tentando novamente... (tentativa ${retryCount + 1}/3)`;
        } else {
            loadingText.textContent = 'Carregando informações da quest... (pode demorar na primeira requisição)';
        }
    }
    
    // Criar AbortController para timeout (Render pode demorar no cold start)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos para Render
    
    fetch(`${API_BASE_URL}/api/quest/${questUrl}`, {
        signal: controller.signal,
        headers: {
            'Accept': 'application/json'
        }
    })
        .then(response => {
            clearTimeout(timeoutId);
            // Verificar se a resposta está OK
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            loading.style.display = 'none';
            
            if (data.error) {
                error.style.display = 'block';
                error.textContent = 'Erro ao carregar informações: ' + data.error;
                return;
            }
            
            // Salvar no cache antes de exibir
            setCachedQuestDetails(wikiUrl, data);
            
            // Preencher informações
            fillQuestDetailsScreen(data);
        })
        .catch(err => {
            clearTimeout(timeoutId);
            
            // Tentar novamente se for erro de rede/timeout e ainda tiver tentativas
            const maxRetries = 3;
            const isRetryableError = err.name === 'AbortError' || 
                                   err.message.includes('Failed to fetch') || 
                                   err.message.includes('NetworkError') || 
                                   err.message.includes('Network request failed');
            
            if (isRetryableError && retryCount < maxRetries) {
                // Aguardar antes de tentar novamente (exponencial backoff)
                const delay = Math.min(2000 * Math.pow(2, retryCount), 10000); // 2s, 4s, 8s, max 10s
                
                const loadingText = loading.querySelector('p');
                if (loadingText) {
                    loadingText.textContent = `Servidor iniciando... Tentando novamente em ${delay/1000} segundos (${retryCount + 1}/${maxRetries})...`;
                }
                
                setTimeout(() => {
                    showQuestDetailsScreen(wikiUrl, retryCount + 1);
                }, delay);
                return;
            }
            
            // Se não for possível retry ou esgotou tentativas, mostrar erro
            loading.style.display = 'none';
            error.style.display = 'block';
            
            let errorMessage = 'Erro ao carregar informações da quest. ';
            
            if (err.name === 'AbortError') {
                errorMessage += 'Timeout: O servidor pode estar lento ou indisponível.';
            } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('Network request failed')) {
                errorMessage += `Não foi possível conectar com o servidor (${API_BASE_URL}).`;
            } else if (err.message.includes('HTTP')) {
                errorMessage += err.message;
            } else {
                errorMessage += `Erro: ${err.message || 'Erro desconhecido'}`;
            }
            
            error.textContent = errorMessage;
            console.error('Erro ao carregar quest:', err);
        });
}

// Função auxiliar para preencher a tela de detalhes
function fillQuestDetailsScreen(data) {
    if (data.error) {
        const error = document.getElementById('questDetailsError');
        error.style.display = 'block';
        error.textContent = 'Erro ao carregar informações: ' + data.error;
        return;
    }
    
    const content = document.getElementById('questDetailsContent');
    
    // Preencher informações
    if (data.name) {
        document.getElementById('questDetailsName').textContent = data.name;
    }
    
    if (data.npc) {
        document.getElementById('questDetailsNPC').textContent = data.npc;
    }
    
    if (data.objectives && data.objectives.length > 0) {
        const objectivesList = document.getElementById('objectivesList');
        objectivesList.innerHTML = ''; // Limpar antes
        data.objectives.forEach(objective => {
            const li = document.createElement('li');
            li.textContent = objective;
            objectivesList.appendChild(li);
        });
        document.getElementById('objectivesSection').style.display = 'block';
    }
    
    if (data.guide_images && data.guide_images.length > 0) {
        const guideImages = document.getElementById('guideImages');
        guideImages.innerHTML = ''; // Limpar antes
        
        data.guide_images.forEach((imgSrc, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'guide-image-container';
            
            // Adicionar loading state
            const loadingDiv = document.createElement('div');
            loadingDiv.style.cssText = 'text-align:center;padding:20px;color:#7f8c8d;';
            loadingDiv.textContent = 'Carregando imagem...';
            loadingDiv.id = `guide-loading-${index}`;
            imgContainer.appendChild(loadingDiv);
            
            const img = document.createElement('img');
            img.alt = `Guia da quest - Imagem ${index + 1}`;
            img.className = 'guide-image';
            img.style.display = 'none';
            
            img.onload = function() {
                const loading = document.getElementById(`guide-loading-${index}`);
                if (loading) {
                    loading.remove();
                }
                img.style.display = 'block';
                img.style.cursor = 'pointer';
                
                // Adicionar evento de clique para abrir modal de zoom
                img.addEventListener('click', function(e) {
                    e.stopPropagation();
                    openImageModal(imgSrc, e);
                });
                
                imgContainer.appendChild(img);
            };
            
            // Usar proxy para evitar problemas de CORS (se API disponível)
            if (API_BASE_URL) {
                const proxyUrl = `${API_BASE_URL}/api/image-proxy?url=${encodeURIComponent(imgSrc)}`;
                img.src = proxyUrl;
                
                // Handler de erro para API
                img.onerror = function() {
                    console.error('Erro ao carregar imagem:', imgSrc);
                    const loading = document.getElementById(`guide-loading-${index}`);
                    if (loading) {
                        loading.textContent = 'Erro ao carregar';
                        loading.style.color = '#e74c3c';
                    }
                };
            } else {
                // Usar proxy CORS público para GitHub Pages
                const corsProxies = [
                    `https://corsproxy.io/?${encodeURIComponent(imgSrc)}`,
                    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(imgSrc)}`,
                    `https://cors-anywhere.herokuapp.com/${imgSrc}`,
                    imgSrc // Fallback direto
                ];
                
                let proxyIndex = 0;
                img.src = corsProxies[proxyIndex];
                
                // Se falhar, tentar próximo proxy
                img.onerror = function() {
                    if (proxyIndex < corsProxies.length - 1) {
                        proxyIndex++;
                        console.log(`[IMAGE] Tentando proxy ${proxyIndex + 1}/${corsProxies.length}`);
                        this.src = corsProxies[proxyIndex];
                    } else {
                        // Todos os proxies falharam
                        console.error('Erro ao carregar imagem:', imgSrc);
                        const loading = document.getElementById(`guide-loading-${index}`);
                        if (loading) {
                            loading.textContent = 'Erro ao carregar';
                            loading.style.color = '#e74c3c';
                        }
                    }
                };
            }
            
            guideImages.appendChild(imgContainer);
        });
        document.getElementById('guideSection').style.display = 'block';
    }
    
    content.style.display = 'block';
}


// Funções do modal de imagem com zoom (reutilizadas do quest-details.html)
let currentZoom = 1;
let isZoomed = false;

function openImageModal(imgSrc, clickEvent) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const modalContainer = document.getElementById('modalImageContainer');
    
    // Resetar estado
    currentZoom = 1;
    isZoomed = false;
    modalImg.style.transform = 'scale(1)';
    modalImg.style.transformOrigin = 'center center';
    modalImg.style.cursor = 'zoom-in';
    modal.style.cursor = 'zoom-in';
    modalImg.classList.remove('zoomed');
    
    // Limpar loading anterior se existir
    const existingLoading = document.getElementById('modal-loading');
    if (existingLoading) {
        existingLoading.remove();
    }
    
    // Resetar imagem
    modalImg.src = '';
    modalImg.style.opacity = '0';
    modalImg.style.display = 'block';
    
    // Mostrar loading
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'modal-loading';
    loadingIndicator.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#3498db;font-size:18px;z-index:20002;';
    loadingIndicator.textContent = 'Carregando imagem...';
    modalContainer.appendChild(loadingIndicator);
    
    // Usar proxy se API disponível, senão usar proxy CORS público
    let finalSrc;
    if (API_BASE_URL) {
        finalSrc = `${API_BASE_URL}/api/image-proxy?url=${encodeURIComponent(imgSrc)}`;
    } else {
        // Usar proxy CORS público para GitHub Pages (tentar corsproxy.io primeiro)
        finalSrc = `https://corsproxy.io/?${encodeURIComponent(imgSrc)}`;
    }
    
    modalImg.onload = function() {
        this.style.opacity = '1';
        const loading = document.getElementById('modal-loading');
        if (loading) {
            loading.remove();
        }
    };
    
    modalImg.onerror = function() {
        console.error('Erro ao carregar imagem no modal:', finalSrc);
        const loading = document.getElementById('modal-loading');
        if (loading) {
            loading.textContent = 'Erro ao carregar imagem';
            loading.style.color = '#e74c3c';
        }
    };
    
    // Abrir modal primeiro
    modal.classList.add('active');
    
    // Depois carregar a imagem
    modalImg.src = finalSrc;
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    const modalContainer = document.getElementById('modalImageContainer');
    const loading = document.getElementById('modal-loading');
    if (loading) {
        loading.remove();
    }
    modal.classList.remove('active');
    currentZoom = 1;
    isZoomed = false;
}

// Event listeners do modal de imagem
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const modalContainer = document.getElementById('modalImageContainer');
    
    if (!modal || !modalImg || !modalContainer) return;
    
    // Clique esquerdo: zoom in no ponto do mouse
    modalContainer.addEventListener('click', function(e) {
        if (e.button === 0 || !e.button) {
            if (isZoomed) {
                closeImageModal();
            } else {
                currentZoom = 2.5;
                isZoomed = true;
                modalImg.style.cursor = 'move';
                modal.style.cursor = 'move';
                modalImg.classList.add('zoomed');
                
                const imgRect = modalImg.getBoundingClientRect();
                const imgX = e.clientX - imgRect.left;
                const imgY = e.clientY - imgRect.top;
                
                const originX = (imgX / imgRect.width) * 100;
                const originY = (imgY / imgRect.height) * 100;
                
                modalImg.style.transformOrigin = `${originX}% ${originY}%`;
                modalImg.style.transform = `scale(${currentZoom})`;
            }
        }
    });
    
    // Clique direito: resetar zoom
    modalContainer.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        currentZoom = 1;
        isZoomed = false;
        modalImg.style.transform = 'scale(1)';
        modalImg.style.transformOrigin = 'center center';
        modalImg.style.cursor = 'zoom-in';
        modal.style.cursor = 'zoom-in';
        modalImg.classList.remove('zoomed');
    });
    
    // Fechar com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (modal.classList.contains('active')) {
                closeImageModal();
            } else {
                const detailsScreen = document.getElementById('questDetailsScreen');
                if (detailsScreen && detailsScreen.classList.contains('active')) {
                    showMainScreen();
                }
            }
        }
    });
    
    // Fechar clicando fora da imagem
    modal.addEventListener('click', function(e) {
        if (e.target === modal || e.target === modalContainer) {
            closeImageModal();
        }
    });
});

// ==================== CONFIGURAÇÕES ====================

// Variáveis para dados brutos
let rawQuestData = null;
let rawQuestData2 = null;

// Mostrar tela de configurações
function showSettings() {
    const settingsScreen = document.getElementById('settingsScreen');
    settingsScreen.classList.add('active');
    
    // Carregar dados brutos se ainda não foram carregados
    if (!rawQuestData) {
        loadRawQuestData();
    } else {
        updateRawDataTable();
    }
    
    // Carregar dados brutos 2 se ainda não foram carregados
    if (!rawQuestData2) {
        loadRawQuestData2();
    } else {
        updateRawData2Table();
    }
}

// Esconder tela de configurações
function hideSettings() {
    const settingsScreen = document.getElementById('settingsScreen');
    settingsScreen.classList.remove('active');
}

// Mostrar seção específica nas configurações
function showSettingsSection(sectionId, buttonElement) {
    // Remover active de todas as seções
    document.querySelectorAll('.settings-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.settings-menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Adicionar active na seção e menu selecionados
    document.getElementById(sectionId + '-section').classList.add('active');
    if (buttonElement) {
        buttonElement.classList.add('active');
    }
}

// Carregar dados brutos das quests
async function loadRawQuestData() {
    try {
        const response = await fetch('quests-data.json');
        rawQuestData = await response.json();
        
        // Popular dropdown de NPCs
        populateNPCsDropdown();
        
        // Atualizar tabela
        updateRawDataTable();
    } catch (error) {
        console.error('Erro ao carregar dados brutos:', error);
    }
}

// Popular dropdown de NPCs
function populateNPCsDropdown() {
    const npcSelect = document.getElementById('rawDataNPC');
    const npcs = Object.keys(rawQuestData.npcs);
    
    // Limpar opções existentes (exceto "Todos")
    while (npcSelect.children.length > 1) {
        npcSelect.removeChild(npcSelect.lastChild);
    }
    
    // Adicionar NPCs
    npcs.forEach(npcId => {
        const npc = rawQuestData.npcs[npcId];
        const option = document.createElement('option');
        option.value = npcId;
        option.textContent = npc.name;
        npcSelect.appendChild(option);
    });
}

// Atualizar tabela de dados brutos
function updateRawDataTable() {
    if (!rawQuestData) return;
    
    const npcSelect = document.getElementById('rawDataNPC');
    const searchInput = document.getElementById('rawDataSearch');
    const tableBody = document.getElementById('rawDataTableBody');
    
    const selectedNPC = npcSelect.value;
    const searchTerm = searchInput.value.toLowerCase();
    
    // Limpar tabela
    tableBody.innerHTML = '';
    
    // Filtrar e popular dados
    Object.keys(rawQuestData.npcs).forEach(npcId => {
        const npc = rawQuestData.npcs[npcId];
        
        // Filtrar por NPC
        if (selectedNPC !== 'all' && npcId !== selectedNPC) {
            return;
        }
        
        // Filtrar quests
        npc.quests.forEach(quest => {
            // Filtrar por termo de busca
            if (searchTerm) {
                const searchableText = `${npc.name} ${quest.name} ${quest.id} ${quest.tier}`.toLowerCase();
                if (!searchableText.includes(searchTerm)) {
                    return;
                }
            }
            
            // Criar linha da tabela
            const row = document.createElement('tr');
            
            // NPC
            const npcCell = document.createElement('td');
            npcCell.textContent = npc.name;
            row.appendChild(npcCell);
            
            // ID
            const idCell = document.createElement('td');
            idCell.textContent = quest.id;
            row.appendChild(idCell);
            
            // Nome
            const nameCell = document.createElement('td');
            nameCell.textContent = quest.name;
            row.appendChild(nameCell);
            
            // Tier
            const tierCell = document.createElement('td');
            tierCell.textContent = quest.tier || '-';
            row.appendChild(tierCell);
            
            // Pré-requisitos
            const prereqCell = document.createElement('td');
            if (quest.prerequisites && quest.prerequisites.length > 0) {
                quest.prerequisites.forEach(prereq => {
                    const badge = document.createElement('span');
                    badge.className = 'prereq-badge';
                    badge.textContent = prereq;
                    prereqCell.appendChild(badge);
                });
            } else {
                prereqCell.textContent = '-';
            }
            row.appendChild(prereqCell);
            
            // Wiki URL
            const urlCell = document.createElement('td');
            if (quest.wikiUrl) {
                const link = document.createElement('a');
                link.href = quest.wikiUrl;
                link.target = '_blank';
                link.textContent = '🔗 Wiki';
                link.style.color = 'var(--accent-color)';
                urlCell.appendChild(link);
            } else {
                urlCell.textContent = '-';
            }
            row.appendChild(urlCell);
            
            tableBody.appendChild(row);
        });
    });
}

// ==================== RAW DATA QUESTS 2 ====================

// Carregar dados brutos 2 (arquivo limpo)
async function loadRawQuestData2() {
    try {
        const response = await fetch('quests-database.json');
        rawQuestData2 = await response.json();
        
        // Popular dropdown de NPCs
        populateNPCsDropdown2();
        
        // Atualizar tabela
        updateRawData2Table();
    } catch (error) {
        console.error('Erro ao carregar dados brutos 2:', error);
        // Se o arquivo não existir, criar estrutura vazia
        rawQuestData2 = {
            "version": "1.0.0",
            "last_updated": new Date().toISOString(),
            "npcs": {}
        };
        populateNPCsDropdown2();
        updateRawData2Table();
    }
}

// Popular dropdown de NPCs 2
function populateNPCsDropdown2() {
    const npcSelect = document.getElementById('rawData2NPC');
    const npcs = Object.keys(rawQuestData2.npcs || {});
    
    // Limpar opções existentes (exceto "Todos")
    while (npcSelect.children.length > 1) {
        npcSelect.removeChild(npcSelect.lastChild);
    }
    
    // Adicionar NPCs
    npcs.forEach(npcId => {
        const npc = rawQuestData2.npcs[npcId];
        const option = document.createElement('option');
        option.value = npcId;
        option.textContent = npc.name || npcId;
        npcSelect.appendChild(option);
    });
}

// Atualizar tabela de dados brutos 2
function updateRawData2Table() {
    if (!rawQuestData2) return;
    
    const npcSelect = document.getElementById('rawData2NPC');
    const searchInput = document.getElementById('rawData2Search');
    const tableBody = document.getElementById('rawData2TableBody');
    
    const selectedNPC = npcSelect.value;
    const searchTerm = searchInput.value.toLowerCase();
    
    // Limpar tabela
    tableBody.innerHTML = '';
    
    // Verificar se há dados
    if (!rawQuestData2.npcs || Object.keys(rawQuestData2.npcs).length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-color); opacity: 0.6;">
                    📭 Nenhuma quest cadastrada ainda.<br>
                    <small>Execute: python import_tarkov_api.py para importar dados.</small>
                </td>
            </tr>
        `;
        return;
    }
    
    // Filtrar e popular dados
    Object.keys(rawQuestData2.npcs).forEach(npcId => {
        const npc = rawQuestData2.npcs[npcId];
        
        // Filtrar por NPC
        if (selectedNPC !== 'all' && npcId !== selectedNPC) {
            return;
        }
        
        // Filtrar quests
        if (npc.quests && npc.quests.length > 0) {
            npc.quests.forEach(quest => {
                // Filtrar por termo de busca
                if (searchTerm) {
                    const kappaText = quest.kappaRequired ? 'kappa sim' : 'kappa não';
                    const searchableText = `${npc.name || npcId} ${quest.name} ${quest.id} ${kappaText}`.toLowerCase();
                    if (!searchableText.includes(searchTerm)) {
                        return;
                    }
                }
                
                // Criar linha da tabela
                const row = document.createElement('tr');
                
                // NPC
                const npcCell = document.createElement('td');
                npcCell.textContent = npc.name || npcId;
                row.appendChild(npcCell);
                
                // ID
                const idCell = document.createElement('td');
                idCell.textContent = quest.id || '-';
                row.appendChild(idCell);
                
                // Nome
                const nameCell = document.createElement('td');
                nameCell.textContent = quest.name || '-';
                row.appendChild(nameCell);
                
                // Kappa Required
                const kappaCell = document.createElement('td');
                const kappaRequired = quest.kappaRequired === true || quest.kappaRequired === 'true';
                if (kappaRequired) {
                    kappaCell.innerHTML = '<span style="color: #f39c12; font-weight: bold;">✓ Sim</span>';
                } else {
                    kappaCell.textContent = 'Não';
                }
                row.appendChild(kappaCell);
                
                // Pré-requisitos
                const prereqCell = document.createElement('td');
                const hasPrereqs = quest.prerequisites && quest.prerequisites.length > 0;
                const hasExternalPrereqs = quest.prerequisitesExternal && quest.prerequisitesExternal.length > 0;
                
                if (hasPrereqs || hasExternalPrereqs) {
                    // Pré-requisitos do mesmo NPC
                    if (hasPrereqs) {
                        quest.prerequisites.forEach(prereq => {
                            const badge = document.createElement('span');
                            badge.className = 'prereq-badge';
                            badge.textContent = prereq;
                            prereqCell.appendChild(badge);
                        });
                    }
                    
                    // Pré-requisitos externos (outros NPCs)
                    if (hasExternalPrereqs) {
                        quest.prerequisitesExternal.forEach(prereq => {
                            const badge = document.createElement('span');
                            badge.className = 'prereq-badge prereq-external';
                            badge.textContent = prereq;
                            badge.title = 'Pré-requisito de outro NPC';
                            prereqCell.appendChild(badge);
                        });
                    }
                } else {
                    prereqCell.textContent = '-';
                }
                row.appendChild(prereqCell);
                
                // Wiki URL
                const urlCell = document.createElement('td');
                if (quest.wikiUrl) {
                    const link = document.createElement('a');
                    link.href = quest.wikiUrl;
                    link.target = '_blank';
                    link.textContent = '🔗 Wiki';
                    link.style.color = 'var(--accent-color)';
                    urlCell.appendChild(link);
                } else {
                    urlCell.textContent = '-';
                }
                row.appendChild(urlCell);
                
                tableBody.appendChild(row);
            });
        }
    });
}


// Fechar configurações com ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const settingsScreen = document.getElementById('settingsScreen');
        if (settingsScreen && settingsScreen.classList.contains('active')) {
            hideSettings();
        }
    }
});

// ==================== SISTEMA DE ABAS ====================

// Trocar entre abas
function switchTab(tabName) {
    // Atualizar botões de aba
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // Atualizar conteúdo das abas
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-content-${tabName}`).classList.add('active');
    
    // Se mudou para a aba de busca, focar no input
    if (tabName === 'search') {
        setTimeout(() => {
            const searchInput = document.getElementById('questSearchInput');
            if (searchInput) {
                searchInput.focus();
            }
        }, 100);
    }
}

// ==================== SISTEMA DE BUSCA ====================

// Realizar busca de quests
function performSearch() {
    const searchInput = document.getElementById('questSearchInput');
    const searchTerm = searchInput.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('searchResultsContainer');
    const resultsCount = document.getElementById('searchResultsCount');
    const detailsPanel = document.getElementById('searchDetailsPanel');
    
    // Limpar detalhes ao buscar
    clearSearchDetails();
    
    if (!searchTerm) {
        resultsContainer.innerHTML = `
            <div class="search-placeholder">
                <p>Digite no campo acima para buscar quests...</p>
            </div>
        `;
        resultsCount.textContent = '';
        return;
    }
    
    if (!questsData || !questsData.npcs) {
        resultsContainer.innerHTML = `
            <div class="search-placeholder">
                <p>Carregando dados das quests...</p>
            </div>
        `;
        return;
    }
    
    // Buscar em todas as quests
    const results = [];
    Object.keys(questsData.npcs).forEach(npcId => {
        const npc = questsData.npcs[npcId];
        npc.quests.forEach(quest => {
            const searchableText = `${quest.name} ${quest.id} ${npc.name}`.toLowerCase();
            if (searchableText.includes(searchTerm)) {
                results.push({
                    quest: quest,
                    npc: npc,
                    npcId: npcId
                });
            }
        });
    });
    
    // Atualizar contador
    resultsCount.textContent = `${results.length} resultado(s)`;
    
    // Limpar container
    resultsContainer.innerHTML = '';
    
    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="search-placeholder">
                <p>Nenhuma quest encontrada para "${searchInput.value}"</p>
            </div>
        `;
        return;
    }
    
    // Exibir resultados
    results.forEach(({quest, npc, npcId}) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        resultItem.dataset.questId = quest.id;
        resultItem.dataset.npcId = npcId;
        
        // Verificar status da quest
        const npcProgress = progress[npcId] || { completed: [], current: null };
        const isCompleted = npcProgress.completed && npcProgress.completed.includes(quest.id);
        const allPrerequisitesMet = areAllPrerequisitesMet(quest, npcId, progress);
        const isLocked = !allPrerequisitesMet && !isCompleted;
        
        if (isCompleted) {
            resultItem.classList.add('completed');
        }
        if (isLocked) {
            resultItem.classList.add('locked');
        }
        
        resultItem.innerHTML = `
            <div class="search-result-item-header">
                <div class="search-result-item-name">${quest.name}</div>
                <div class="search-result-item-npc">${npc.name}</div>
            </div>
            <div class="search-result-item-id">ID: ${quest.id}</div>
        `;
        
        // Adicionar evento de clique
        resultItem.addEventListener('click', () => {
            selectSearchQuest(quest, npc, npcId, resultItem);
        });
        
        resultsContainer.appendChild(resultItem);
    });
}

// Selecionar quest na busca
function selectSearchQuest(quest, npc, npcId, resultElement) {
    // Atualizar seleção visual
    document.querySelectorAll('.search-result-item').forEach(item => {
        item.classList.remove('selected');
    });
    resultElement.classList.add('selected');
    
    // Mostrar detalhes
    showSearchQuestDetails(quest, npc, npcId);
}

// Mostrar detalhes da quest na busca
function showSearchQuestDetails(quest, npc, npcId) {
    const panel = document.getElementById('searchDetailsPanel');
    const placeholder = panel.querySelector('.quest-details-placeholder');
    
    // Remover conteúdo anterior se existir
    const existingContent = panel.querySelector('.quest-details-content');
    if (existingContent) {
        existingContent.remove();
    }
    
    // Criar novo conteúdo
    const content = document.createElement('div');
    content.className = 'quest-details-content';
    content.id = 'searchQuestDetailsContent';
    
    // Mostrar loading
    content.innerHTML = `
        <div class="quest-details-loading">
            <p>Carregando informações da quest...</p>
        </div>
    `;
    
    placeholder.style.display = 'none';
    content.style.display = 'flex';
    content.classList.add('active');
    panel.appendChild(content);
    
    // Carregar dados da quest
    loadQuestDetailsForPanel(quest.wikiUrl, content);
}

// Limpar detalhes da busca
function clearSearchDetails() {
    const panel = document.getElementById('searchDetailsPanel');
    const placeholder = panel.querySelector('.quest-details-placeholder');
    const existingContent = panel.querySelector('.quest-details-content');
    
    if (existingContent) {
        existingContent.remove();
    }
    
    placeholder.style.display = 'flex';
}

// Inicializar aplicação
loadProgress();
loadQuestDetailsCache(); // Carregar cache de detalhes das quests (localStorage)
loadPreprocessedQuestDetails(); // Carregar detalhes pré-processados (quests-details.json)
loadQuestData();

// Verificar se há parâmetros de URL para busca automática
(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const searchTerm = urlParams.get('search');
    if (searchTerm) {
        // Função para executar busca quando dados estiverem prontos
        function executeAutoSearch() {
            // Verificar se os dados foram carregados
            if (!questsData || !questsData.npcs || Object.keys(questsData.npcs).length === 0) {
                // Ainda não carregou, tentar novamente
                setTimeout(executeAutoSearch, 500);
                return;
            }
            
            // Mudar para aba de busca
            switchTab('search');
            
            // Preencher campo de busca
            const searchInput = document.getElementById('questSearchInput');
            if (searchInput) {
                // Decodificar o termo de busca (pode ter underscores ou outros caracteres)
                const decodedTerm = decodeURIComponent(searchTerm).replace(/_/g, ' ');
                searchInput.value = decodedTerm;
                
                // Executar busca
                performSearch();
                
                console.log('[AUTO-SEARCH] Busca automática executada para:', decodedTerm);
            }
        }
        
        // Iniciar tentativas após um pequeno delay
        setTimeout(executeAutoSearch, 500);
    }
})();

// Esconder botão de configurações se não estiver em localhost
(function() {
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname === '';
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        if (!isLocalhost) {
            settingsBtn.style.display = 'none';
        }
    }
})();

