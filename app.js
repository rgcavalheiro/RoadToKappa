// Carregar dados das missões
let questsData = {};
let currentNPC = null;
let progress = {};

// Carregar progresso salvo
function loadProgress() {
    const saved = localStorage.getItem('tarkovQuestProgress');
    if (saved) {
        progress = JSON.parse(saved);
    }
}

// Salvar progresso
function saveProgress() {
    localStorage.setItem('tarkovQuestProgress', JSON.stringify(progress));
}

// Carregar dados do JSON
async function loadQuestData() {
    try {
        const response = await fetch('quests-data.json');
        questsData = await response.json();
        initializeNPCs();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

// Inicializar botões dos NPCs
function initializeNPCs() {
    const npcButtons = document.getElementById('npcButtons');
    npcButtons.innerHTML = '';

    Object.keys(questsData.npcs).forEach(npcId => {
        const npc = questsData.npcs[npcId];
        const button = document.createElement('button');
        button.className = 'npc-btn';
        button.textContent = npc.name;
        button.onclick = (e) => selectNPC(npcId, e.target);
        npcButtons.appendChild(button);
    });
}

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

    updateQuestDisplay();
    updateQuestList();
    document.getElementById('questDisplay').style.display = 'grid';
    document.getElementById('questList').style.display = 'block';
}

// Atualizar exibição das missões
function updateQuestDisplay() {
    if (!currentNPC) return;

    const npc = questsData.npcs[currentNPC];
    const npcProgress = progress[currentNPC] || { completed: [], current: null };
    
    // Encontrar última missão completada
    const lastQuest = findLastCompletedQuest(npc, npcProgress);
    displayQuest('lastQuest', lastQuest, 'last');

    // Encontrar missão atual
    const currentQuest = findCurrentQuest(npc, npcProgress);
    displayQuest('currentQuest', currentQuest, 'current');

    // Encontrar próxima missão
    const nextQuest = findNextQuest(npc, npcProgress, currentQuest);
    displayQuest('nextQuest', nextQuest, 'next');

    // Atualizar botão de completar
    const completeBtn = document.getElementById('completeBtn');
    if (currentQuest) {
        completeBtn.style.display = 'inline-block';
    } else {
        completeBtn.style.display = 'none';
    }
}

// Encontrar última missão completada
function findLastCompletedQuest(npc, npcProgress) {
    if (!npcProgress.completed || npcProgress.completed.length === 0) {
        return null;
    }

    const completedIds = npcProgress.completed;
    let lastQuest = null;
    let highestTier = -1;

    completedIds.forEach(questId => {
        const quest = npc.quests.find(q => q.id === questId);
        if (quest && quest.tier > highestTier) {
            highestTier = quest.tier;
            lastQuest = quest;
        }
    });

    return lastQuest;
}

// Encontrar missão atual
function findCurrentQuest(npc, npcProgress) {
    // Se há uma missão atual definida, retorná-la
    if (npcProgress.current) {
        const quest = npc.quests.find(q => q.id === npcProgress.current);
        if (quest && !npcProgress.completed.includes(quest.id)) {
            return quest;
        }
    }

    // Caso contrário, encontrar a primeira missão disponível
    const completedIds = npcProgress.completed || [];
    
    for (const quest of npc.quests) {
        // Se já foi completada, pular
        if (completedIds.includes(quest.id)) {
            continue;
        }

        // Verificar se todos os pré-requisitos foram completados
        const allPrerequisitesMet = quest.prerequisites.every(prereqId => 
            completedIds.includes(prereqId)
        );

        if (allPrerequisitesMet) {
            return quest;
        }
    }

    return null;
}

// Encontrar próxima missão
function findNextQuest(npc, npcProgress, currentQuest) {
    if (!currentQuest) return null;

    const completedIds = npcProgress.completed || [];
    const currentQuestId = currentQuest.id;

    // Encontrar missões que dependem da missão atual
    const nextQuests = npc.quests.filter(quest => {
        if (completedIds.includes(quest.id)) return false;
        return quest.prerequisites.includes(currentQuestId);
    });

    if (nextQuests.length > 0) {
        // Retornar a missão com menor tier
        return nextQuests.sort((a, b) => a.tier - b.tier)[0];
    }

    // Se não há dependentes diretos, procurar a próxima missão disponível após completar a atual
    const allCompleted = [...completedIds, currentQuestId];
    
    for (const quest of npc.quests) {
        if (allCompleted.includes(quest.id)) continue;
        
        const allPrerequisitesMet = quest.prerequisites.every(prereqId => 
            allCompleted.includes(prereqId)
        );

        if (allPrerequisitesMet) {
            return quest;
        }
    }

    return null;
}

// Exibir missão
function displayQuest(elementId, quest, type) {
    const element = document.getElementById(elementId);
    
    if (!quest) {
        if (type === 'last') {
            element.innerHTML = '<p class="no-quest">Nenhuma missão completada ainda</p>';
        } else if (type === 'current') {
            element.innerHTML = '<p class="no-quest">Todas as missões foram completadas! 🎉</p>';
        } else {
            element.innerHTML = '<p class="no-quest">Complete a missão atual primeiro</p>';
        }
        return;
    }

    // Botão de detalhes para todas as quests
    const detailsButton = `
        <a href="quest-details.html?url=${encodeURIComponent(quest.wikiUrl)}" target="_blank" class="quest-link quest-link-details" style="margin-top: 10px; display: block;">
            📋 Ver Detalhes
        </a>
    `;

    element.innerHTML = `
        <div class="quest-name">${quest.name}</div>
        <div class="quest-tier">Tier ${quest.tier}</div>
        <a href="${quest.wikiUrl}" target="_blank" class="quest-link">📖 Ver na Wiki</a>
        ${detailsButton}
    `;
}

// Completar missão atual
function completeCurrentQuest() {
    if (!currentNPC) return;

    const npc = questsData.npcs[currentNPC];
    const npcProgress = progress[currentNPC] || { completed: [], current: null };
    
    const currentQuest = findCurrentQuest(npc, npcProgress);
    if (!currentQuest) return;

    // Adicionar à lista de completadas
    if (!npcProgress.completed) {
        npcProgress.completed = [];
    }
    npcProgress.completed.push(currentQuest.id);

    // Limpar missão atual
    npcProgress.current = null;

    // Salvar progresso
    progress[currentNPC] = npcProgress;
    saveProgress();

    // Atualizar exibição
    updateQuestDisplay();
    updateQuestList();
}

// Resetar progresso
function resetProgress() {
    if (!currentNPC) return;
    
    if (confirm('Tem certeza que deseja resetar o progresso deste NPC?')) {
        progress[currentNPC] = { completed: [], current: null };
        saveProgress();
        updateQuestDisplay();
        updateQuestList();
    }
}

// Atualizar lista de missões
function updateQuestList() {
    if (!currentNPC) return;

    const npc = questsData.npcs[currentNPC];
    const npcProgress = progress[currentNPC] || { completed: [], current: null };
    const questTree = document.getElementById('questTree');
    const npcName = document.getElementById('npcName');

    npcName.textContent = npc.name;
    questTree.innerHTML = '';

    const completedIds = npcProgress.completed || [];
    const currentQuestId = findCurrentQuest(npc, npcProgress)?.id;

    npc.quests.forEach(quest => {
        const questItem = document.createElement('div');
        questItem.className = 'quest-item';

        let status = 'locked';
        let statusText = 'Bloqueada';
        
        if (completedIds.includes(quest.id)) {
            questItem.classList.add('completed');
            status = 'completed';
            statusText = 'Completada';
        } else if (quest.id === currentQuestId) {
            questItem.classList.add('current');
            status = 'current';
            statusText = 'Atual';
        } else {
            const allPrerequisitesMet = quest.prerequisites.every(prereqId => 
                completedIds.includes(prereqId)
            );
            
            if (allPrerequisitesMet) {
                questItem.classList.add('available');
                status = 'available';
                statusText = 'Disponível';
            }
        }

        questItem.innerHTML = `
            <div class="quest-item-header">
                <span class="quest-item-name">${quest.name}</span>
                <div>
                    <span class="quest-item-tier">Tier ${quest.tier}</span>
                    <span class="status-badge status-${status}">${statusText}</span>
                </div>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
                <a href="${quest.wikiUrl}" target="_blank" class="quest-item-link">📖 Ver na Wiki →</a>
                <a href="quest-details.html?url=${encodeURIComponent(quest.wikiUrl)}" target="_blank" class="quest-item-link" style="color: var(--warning-color);">📋 Ver Detalhes →</a>
            </div>
        `;

        questTree.appendChild(questItem);
    });
}

// Alternar visualização da lista
let showQuestList = false;
function toggleQuestList() {
    showQuestList = !showQuestList;
    const questList = document.getElementById('questList');
    const toggleBtn = document.getElementById('toggleViewBtn');
    
    if (showQuestList) {
        questList.style.display = 'block';
        toggleBtn.textContent = '👁️ Ocultar Lista de Missões';
    } else {
        questList.style.display = 'none';
        toggleBtn.textContent = '📋 Ver Todas as Missões';
    }
}

// Inicializar aplicação
loadProgress();
loadQuestData();

