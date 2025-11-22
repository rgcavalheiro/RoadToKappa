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
        <button onclick="showQuestDetailsScreen('${quest.wikiUrl}')" class="quest-link quest-link-details" style="margin-top: 10px; display: block; width: 100%; text-align: center;">
            📋 Ver Detalhes
        </button>
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
                <a href="#" onclick="event.preventDefault(); showQuestDetailsScreen('${quest.wikiUrl}'); return false;" class="quest-item-link" style="color: var(--warning-color);">📋 Ver Detalhes →</a>
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

// Funções de navegação entre telas
function showMainScreen() {
    const mainScreen = document.getElementById('mainScreen');
    const detailsScreen = document.getElementById('questDetailsScreen');
    
    mainScreen.classList.add('active');
    detailsScreen.classList.remove('active');
}

function showQuestDetailsScreen(wikiUrl) {
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
    
    // Carregar dados da quest
    fetch(`http://localhost:5000/api/quest/${encodeURIComponent(wikiUrl)}`)
        .then(response => response.json())
        .then(data => {
            loading.style.display = 'none';
            
            if (data.error) {
                error.style.display = 'block';
                error.textContent = 'Erro ao carregar informações: ' + data.error;
                return;
            }
            
            // Preencher informações
            if (data.name) {
                document.getElementById('questDetailsName').textContent = data.name;
            }
            
            if (data.npc) {
                document.getElementById('questDetailsNPC').textContent = data.npc;
            }
            
            if (data.objectives && data.objectives.length > 0) {
                const objectivesList = document.getElementById('objectivesList');
                data.objectives.forEach(objective => {
                    const li = document.createElement('li');
                    li.textContent = objective;
                    objectivesList.appendChild(li);
                });
                document.getElementById('objectivesSection').style.display = 'block';
            }
            
            if (data.guide_images && data.guide_images.length > 0) {
                const guideImages = document.getElementById('guideImages');
                
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
                    
                    img.onerror = function() {
                        console.error('Erro ao carregar imagem:', imgSrc);
                        const loading = document.getElementById(`guide-loading-${index}`);
                        if (loading) {
                            loading.textContent = 'Erro ao carregar';
                            loading.style.color = '#e74c3c';
                        }
                    };
                    
                    // Usar proxy para evitar problemas de CORS
                    const proxyUrl = `http://localhost:5000/api/image-proxy?url=${encodeURIComponent(imgSrc)}`;
                    img.src = proxyUrl;
                    
                    guideImages.appendChild(imgContainer);
                });
                document.getElementById('guideSection').style.display = 'block';
            }
            
            content.style.display = 'block';
        })
        .catch(err => {
            loading.style.display = 'none';
            error.style.display = 'block';
            error.textContent = 'Erro ao conectar com o servidor. Certifique-se de que o servidor Flask está rodando na porta 5000.';
            console.error('Erro:', err);
        });
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
    
    // Usar proxy sempre
    let finalSrc = `http://localhost:5000/api/image-proxy?url=${encodeURIComponent(imgSrc)}`;
    
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

// Inicializar aplicação
loadProgress();
loadQuestData();

