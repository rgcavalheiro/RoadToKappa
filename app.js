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
        const response = await fetch('quests-data.json');
        questsData = await response.json();
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

    updateQuestDisplay();
    document.getElementById('questDisplay').style.display = 'grid';
    document.getElementById('questActions').style.display = 'flex';
    
    // Atualizar check verde nos botões de NPC
    updateNPCButtons();
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

    // Botão principal: Ver Detalhes (destacado)
    const detailsButton = `
        <button onclick="showQuestDetailsScreen('${quest.wikiUrl}')" class="quest-btn-primary">
            📋 Ver Detalhes
        </button>
    `;
    
    // Botão secundário: Ver na Wiki (mais oculto)
    const wikiButton = `
        <a href="${quest.wikiUrl}" target="_blank" class="quest-link-secondary">
            📖 Wiki
        </a>
    `;

    element.innerHTML = `
        <div class="quest-name">${quest.name}</div>
        <div class="quest-buttons-container">
            ${detailsButton}
            ${wikiButton}
        </div>
    `;
}

// Atualizar botões de NPC (check verde agora é controlado pelo CSS quando .active)
function updateNPCButtons() {
    // Função mantida para compatibilidade, mas o check verde agora é controlado pelo CSS
    // quando o botão tem a classe .active
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
    updateNPCButtons();
}

// Resetar progresso
function resetProgress() {
    if (!currentNPC) return;
    
    if (confirm('Tem certeza que deseja resetar o progresso deste NPC?')) {
        progress[currentNPC] = { completed: [], current: null };
        saveProgress();
        updateQuestDisplay();
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

