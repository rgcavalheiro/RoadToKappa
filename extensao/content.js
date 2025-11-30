// RoadToKappa - Wiki Redirect Extension
// Intercepta links da wiki do Tarkov e redireciona para o GitHub Pages

(function() {
    'use strict';
    
    const GITHUB_PAGES_URL = 'https://rgcavalheiro.github.io/RoadToKappa/';
    const WIKI_DOMAIN = 'escapefromtarkov.fandom.com';
    
    // Função para extrair o nome da quest da URL da wiki
    function extractQuestNameFromWikiUrl(wikiUrl) {
        try {
            const url = new URL(wikiUrl);
            // Exemplo: https://escapefromtarkov.fandom.com/wiki/Introduction
            // Retorna: Introduction
            const pathParts = url.pathname.split('/');
            const questName = pathParts[pathParts.length - 1];
            return decodeURIComponent(questName);
        } catch (e) {
            console.error('[RoadToKappa] Erro ao extrair nome da quest:', e);
            return null;
        }
    }
    
    // Função para verificar se é um link da wiki do Tarkov
    function isTarkovWikiLink(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.includes(WIKI_DOMAIN) || 
                   urlObj.hostname === WIKI_DOMAIN;
        } catch (e) {
            return false;
        }
    }
    
    // Interceptar cliques em links
    document.addEventListener('click', function(e) {
        // Encontrar o link mais próximo
        let target = e.target;
        while (target && target.tagName !== 'A') {
            target = target.parentElement;
        }
        
        if (!target || !target.href) {
            return;
        }
        
        const href = target.href;
        
        // Verificar se é um link da wiki do Tarkov
        if (isTarkovWikiLink(href)) {
            e.preventDefault();
            e.stopPropagation();
            
            // Extrair nome da quest
            const questName = extractQuestNameFromWikiUrl(href);
            
            if (questName) {
                // Abrir GitHub Pages em nova aba com busca automática
                const searchUrl = `${GITHUB_PAGES_URL}?search=${encodeURIComponent(questName)}`;
                window.open(searchUrl, '_blank');
                
                console.log('[RoadToKappa] Link interceptado:', href);
                console.log('[RoadToKappa] Quest:', questName);
                console.log('[RoadToKappa] Abrindo em nova aba:', searchUrl);
            } else {
                // Se não conseguir extrair o nome, apenas abre a página principal em nova aba
                window.open(GITHUB_PAGES_URL, '_blank');
            }
            
            return false;
        }
    }, true); // Use capture phase para interceptar antes de outros handlers
    
    // Interceptar navegação programática (window.open)
    const originalOpen = window.open;
    window.open = function(url, target, features) {
        if (url && isTarkovWikiLink(url)) {
            const questName = extractQuestNameFromWikiUrl(url);
            const redirectUrl = questName 
                ? `${GITHUB_PAGES_URL}?search=${encodeURIComponent(questName)}`
                : GITHUB_PAGES_URL;
            console.log('[RoadToKappa] window.open interceptado:', url);
            // Sempre abrir em nova aba (_blank)
            return originalOpen.call(this, redirectUrl, '_blank', features);
        }
        return originalOpen.apply(this, arguments);
    };
    
    console.log('[RoadToKappa] Extensão ativada! Links da wiki serão redirecionados para o RoadToKappa.');
})();

