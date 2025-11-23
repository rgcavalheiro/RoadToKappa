// Carregar dados das missões
let questsData = {};
let currentNPC = null;
let progress = {};

// Configuração da URL da API
// Se você hospedar o Flask no Render, coloque a URL aqui (ex: 'https://seu-app.onrender.com')
const RENDER_API_URL = 'https://roadtokappa.onrender.com';

// Detectar URL da API automaticamente
let API_BASE_URL;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Desenvolvimento local
    API_BASE_URL = 'http://localhost:5000';
} else if (window.location.hostname.includes('github.io')) {
    // GitHub Pages - usar Render se configurado, senão desabilitar API
    API_BASE_URL = RENDER_API_URL || null;
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
}

// Salvar progresso
function saveProgress() {
    localStorage.setItem('tarkovQuestProgress', JSON.stringify(progress));
}

// Carregar dados do JSON
async function loadQuestData() {
    try {
        // Carregar ambos os arquivos
        const [orderResponse, detailsResponse] = await Promise.all([
            fetch('questdata2025.json'),
            fetch('quests-data.json')
        ]);
        
        const orderData = await orderResponse.json(); // Array com tier, npc, quest
        const detailsData = await detailsResponse.json(); // Estrutura completa com npcs
        
        // Criar um mapa para buscar detalhes por nome da quest e NPC
        const questDetailsMap = {};
        Object.keys(detailsData.npcs).forEach(npcId => {
            const npc = detailsData.npcs[npcId];
            npc.quests.forEach(quest => {
                const key = `${npc.name}|${quest.name}`;
                questDetailsMap[key] = {
                    ...quest,
                    npcId: npcId,
                    npcName: npc.name
                };
            });
        });
        
        // Reorganizar dados usando a ordem do questdata2025.json
        const reorganizedData = { npcs: {} };
        
        orderData.forEach(orderQuest => {
            const npcName = orderQuest.npc;
            const questName = orderQuest.quest;
            const key = `${npcName}|${questName}`;
            
            // Buscar detalhes da quest
            const questDetails = questDetailsMap[key];
            
            if (questDetails) {
                // Encontrar ou criar o NPC
                const npcId = questDetails.npcId;
                if (!reorganizedData.npcs[npcId]) {
                    reorganizedData.npcs[npcId] = {
                        name: npcName,
                        quests: []
                    };
                }
                
                // Adicionar quest na ordem correta (já está ordenada por tier no array)
                reorganizedData.npcs[npcId].quests.push({
                    id: questDetails.id,
                    name: questDetails.name,
                    tier: orderQuest.tier, // Usar tier do questdata2025.json
                    prerequisites: questDetails.prerequisites || [],
                    wikiUrl: questDetails.wikiUrl
                });
            } else {
                // Quest não encontrada nos detalhes - criar entrada básica
                console.warn(`Quest não encontrada nos detalhes: ${npcName} - ${questName}`);
                const npcId = npcName.toLowerCase().replace(/\s+/g, '');
                if (!reorganizedData.npcs[npcId]) {
                    reorganizedData.npcs[npcId] = {
                        name: npcName,
                        quests: []
                    };
                }
                reorganizedData.npcs[npcId].quests.push({
                    id: questName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
                    name: questName,
                    tier: orderQuest.tier,
                    prerequisites: [],
                    wikiUrl: `https://escapefromtarkov.fandom.com/wiki/${encodeURIComponent(questName.replace(/\s+/g, '_'))}`
                });
            }
        });
        
        questsData = reorganizedData;
        initializeNPCs();
        // Atualizar checks verdes após inicializar
        setTimeout(() => updateNPCButtons(), 100);
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

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

    Object.keys(questsData.npcs).forEach(npcId => {
        const npc = questsData.npcs[npcId];
        const button = document.createElement('button');
        button.className = 'npc-btn';
        button.setAttribute('data-npc-id', npcId);
        
        // Determinar nível do NPC (I ou II) - Peacekeeper é II, outros são I
        const npcLevel = npcId === 'peacekeeper' ? 'II' : 'I';
        
        // Obter URL da imagem local
        const npcImage = npcImages[npcId] || '';
        
        button.innerHTML = `
            <div class="npc-btn-content">
                <div class="npc-btn-portrait">
                    <img src="${npcImage}" alt="${npc.name}" class="npc-portrait-img" onerror="this.style.display='none'">
                </div>
                <div class="npc-btn-name">${npc.name}</div>
            </div>
        `;
        
        button.onclick = (e) => selectNPC(npcId, button);
        npcButtons.appendChild(button);
    });
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

// Atualizar lista de quests disponíveis
function updateQuestList() {
    if (!currentNPC) return;

    const npc = questsData.npcs[currentNPC];
    const npcProgress = progress[currentNPC] || { completed: [], current: null };
    const completedIds = npcProgress.completed || [];
    
    const showCompleted = document.getElementById('showCompleted').checked;
    const showLocked = document.getElementById('showLocked').checked;
    
    const container = document.getElementById('questListContainer');
    container.innerHTML = '';
    
    let availableCount = 0;
    let completedCount = 0;
    
    npc.quests.forEach(quest => {
        const isCompleted = completedIds.includes(quest.id);
        const allPrerequisitesMet = quest.prerequisites.every(prereqId => 
            completedIds.includes(prereqId)
        );
        const isLocked = !allPrerequisitesMet && !isCompleted;
        
        // Filtrar quests baseado nas opções
        if (isCompleted && !showCompleted) return;
        if (isLocked && !showLocked) return;
        
        if (!isCompleted && allPrerequisitesMet) {
            availableCount++;
        }
        if (isCompleted) {
            completedCount++;
        }
        
        const questItem = document.createElement('div');
        questItem.className = 'quest-list-item';
        if (isCompleted) {
            questItem.classList.add('completed');
        }
        if (isLocked) {
            questItem.classList.add('locked');
        }
        
        const statusClass = isCompleted ? 'completed' : (isLocked ? 'locked' : 'active');
        const statusText = isCompleted ? 'Completed' : (isLocked ? 'Locked' : 'Active!');
        
        questItem.innerHTML = `
            <div class="quest-list-item-header">
                <div class="quest-list-item-name">${quest.name}</div>
                <span class="quest-list-item-status ${statusClass}">${statusText}</span>
            </div>
            ${!isCompleted && !isLocked ? `
                <button class="quest-list-item-complete-btn" onclick="completeQuest('${quest.id}')">
                    ✅ Complete
                </button>
            ` : ''}
        `;
        
        // Adicionar evento de clique para selecionar quest
        if (!isLocked) {
            questItem.addEventListener('click', (e) => {
                // Não selecionar se clicou no botão de completar
                if (e.target.classList.contains('quest-list-item-complete-btn')) {
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

// Carregar detalhes da quest para o painel
function loadQuestDetailsForPanel(wikiUrl, contentElement) {
    // Verificar se a API está disponível
    if (!API_BASE_URL) {
        contentElement.innerHTML = `
            <div class="quest-details-error">
                API não configurada. Configure a URL do Render no app.js (RENDER_API_URL) ou use o Render para hospedar o backend.
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
    
    fetch(`${API_BASE_URL}/api/quest/${questUrl}`, {
        signal: controller.signal,
        headers: {
            'Accept': 'application/json'
        }
    })
        .then(response => {
            clearTimeout(timeoutId);
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
                    
                    img.onerror = function() {
                        const loading = document.getElementById(`guide-loading-${index}`);
                        if (loading) {
                            loading.textContent = 'Erro ao carregar';
                            loading.style.color = '#e74c3c';
                        }
                    };
                    
                    // Usar proxy se API disponível
                    if (API_BASE_URL) {
                        const proxyUrl = `${API_BASE_URL}/api/image-proxy?url=${encodeURIComponent(imgSrc)}`;
                        img.src = proxyUrl;
                    } else {
                        img.src = imgSrc;
                    }
                });
            }
        })
        .catch(err => {
            clearTimeout(timeoutId);
            contentElement.innerHTML = `
                <div class="quest-details-error">
                    Erro ao carregar informações da quest. ${err.message}
                </div>
            `;
            console.error('Erro ao carregar quest:', err);
        });
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
    
    // Verificar pré-requisitos
    const completedIds = npcProgress.completed || [];
    const allPrerequisitesMet = quest.prerequisites.every(prereqId => 
        completedIds.includes(prereqId)
    );
    
    if (!allPrerequisitesMet) {
        alert('Você precisa completar os pré-requisitos primeiro!');
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
    
    updateNPCButtons();
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
    
    // Verificar se a API está disponível
    if (!API_BASE_URL) {
        loading.style.display = 'none';
        error.style.display = 'block';
        error.textContent = 'API não configurada. Configure a URL do Render no app.js (RENDER_API_URL) ou use o Render para hospedar o backend.';
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
                    
                    // Usar proxy para evitar problemas de CORS (se API disponível)
                    if (API_BASE_URL) {
                        const proxyUrl = `${API_BASE_URL}/api/image-proxy?url=${encodeURIComponent(imgSrc)}`;
                        img.src = proxyUrl;
                    } else {
                        // Tentar carregar diretamente (pode falhar por CORS)
                        img.src = imgSrc;
                    }
                    
                    guideImages.appendChild(imgContainer);
                });
                document.getElementById('guideSection').style.display = 'block';
            }
            
            content.style.display = 'block';
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
                errorMessage += 'Timeout: O servidor Render pode estar "dormindo" (cold start). Aguarde alguns segundos e tente novamente clicando em "Ver Detalhes".';
            } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('Network request failed')) {
                errorMessage += `Não foi possível conectar com o servidor Render (${API_BASE_URL}). O servidor pode estar iniciando. Aguarde 30-60 segundos e tente novamente.`;
            } else if (err.message.includes('HTTP')) {
                errorMessage += err.message;
            } else {
                errorMessage += `Erro: ${err.message || 'Erro desconhecido'}`;
            }
            
            error.textContent = errorMessage;
            console.error('Erro ao carregar quest:', err);
            console.error('URL tentada:', `${API_BASE_URL}/api/quest/${questUrl}`);
            console.error('API_BASE_URL:', API_BASE_URL);
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
    
    // Usar proxy se API disponível, senão tentar direto
    let finalSrc = API_BASE_URL 
        ? `${API_BASE_URL}/api/image-proxy?url=${encodeURIComponent(imgSrc)}`
        : imgSrc;
    
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

