// Carregar e exibir versão do app
async function loadVersion() {
    try {
        const response = await fetch('version.json');
        const data = await response.json();
        
        const versionElement = document.getElementById('appVersion');
        if (versionElement) {
            versionElement.textContent = `v${data.version} by ${data.author}`;
        }
    } catch (error) {
        console.error('Erro ao carregar versão:', error);
        // Fallback caso o arquivo não exista
        const versionElement = document.getElementById('appVersion');
        if (versionElement) {
            versionElement.textContent = 'v0.0.1 by Rgcavalheiro';
        }
    }
}

// Carregar versão quando a página carregar
document.addEventListener('DOMContentLoaded', loadVersion);







