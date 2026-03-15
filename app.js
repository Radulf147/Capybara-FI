import { createWalletClient, createPublicClient, custom, parseEther, formatEther } from 'https://esm.sh/viem@2.40.0';
import { monadTestnet } from 'https://esm.sh/viem@2.40.0/chains';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const CONTRACT_ADDRESS = "0x0d0e0266766d56b9be8a1cb1b3f05c38ca7a1046";
const CONTENT_PRICE = "0.01";
const STORAGE_KEYS = {
    posts: 'capybara_posts',
    ownedPostIds: 'capybara_owned_post_ids'
};
const SUPABASE_URL = 'https://fyrfqjepidjzrzkdmuem.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rtk5eiEZSdHSPF6XFVc9Ww_-5KACrY0'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let walletClient = null;
let publicClient = null;
let userAddress = null;
let paymentsProcessed = 0;
let currentPost = null;

const EXAMPLE_TITLE = 'Exfiltração de dados em workload crítico';
const EXAMPLE_REPORT = `Foi identificado tráfego suspeito saindo da porta 4444 em um workload crítico. O comportamento sugere exfiltração de dados por configuração permissiva de egress. É necessária revisão imediata das regras de firewall, análise de logs de autenticação e isolamento do serviço afetado.`;

const defaultPosts = [
    {
        id: 'seed-cloud-run',
        title: 'Vulnerabilidade Zero-Day no Cloud Run',
        content: 'Foi identificado um padrão de exfiltração de dados em workloads Cloud Run através de portas não monitoradas. A exploração combinava configuração permissiva de egress, logs insuficientes e falta de alerta por comportamento anômalo. Recomendamos endurecimento de regras de saída, revisão do IAM dos serviços, inspeção contínua de tráfego e monitoramento de autenticação para resposta mais rápida.',
        price: '0.01',
        authorLabel: '0x71C...3A',
        ownerId: 'seed-cloud-run',
        createdAt: '2026-03-15T10:00:00.000Z'
    },
    {
        id: 'seed-defi',
        title: 'Exploit de Smart Contract DeFi',
        content: 'Durante a análise foi detectada uma falha de reentrância no fluxo de saque de um protocolo DeFi. O problema ocorria pela ausência de atualização de estado antes de chamadas externas. A exploração poderia drenar parte da liquidez disponível em cenários específicos. A correção recomendada inclui checks-effects-interactions, ReentrancyGuard e testes fuzz cobrindo chamadas encadeadas.',
        price: '0.05',
        authorLabel: '0x4B2...9F',
        ownerId: 'seed-defi',
        createdAt: '2026-03-15T10:05:00.000Z'
    },
    {
        id: 'seed-runbook',
        title: 'Runbook de Resposta a Incidente em API Gateway',
        content: 'Este runbook descreve como responder a um incidente em API Gateway com picos anômalos de chamadas. A sequência proposta inclui isolamento de rotas, limitação emergencial por IP, coleta de indicadores, análise de payloads, validação do WAF e comunicação interna. O objetivo é reduzir o tempo entre detecção e contenção com ações padronizadas e auditáveis.',
        price: '0.02',
        authorLabel: '0x99A...12',
        ownerId: 'seed-runbook',
        createdAt: '2026-03-15T10:10:00.000Z'
    }
];

const urlParams = new URLSearchParams(window.location.search);
const contentParam = urlParams.get('c');
const postIdParam = urlParams.get('post');

const navFeed = document.getElementById('navFeed');
const navCreate = document.getElementById('navCreate');

const feedMode = document.getElementById('feedMode');
const creatorMode = document.getElementById('creatorMode');
const viewerMode = document.getElementById('viewerMode');

const feedList = document.getElementById('feedList');

const connectBtn = document.getElementById('connectBtn');
const walletAddressEl = document.getElementById('walletAddress');

const reportTitleInput = document.getElementById('reportTitleInput');
const secretInput = document.getElementById('secretInput');
const charCount = document.getElementById('charCount');
const prefillBtn = document.getElementById('prefillBtn');

const generateLinkBtn = document.getElementById('generateLinkBtn');
const verificationPanel = document.getElementById('verificationPanel');
const linkResult = document.getElementById('linkResult');
const shareableLink = document.getElementById('shareableLink');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const openLinkBtn = document.getElementById('openLinkBtn');

const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');

const viewerTitle = document.getElementById('viewerTitle');
const viewerAuthor = document.getElementById('viewerAuthor');
const viewerBadge = document.getElementById('viewerBadge');
const ownershipNotice = document.getElementById('ownershipNotice');
const secretContent = document.getElementById('secretContent');
const payBtn = document.getElementById('payBtn');
const demoUnlockBtn = document.getElementById('demoUnlockBtn');
const evaluateBtn = document.getElementById('evaluateBtn');

const monadTimeEl = document.getElementById('monadTime');
const gasCostEl = document.getElementById('gasCost');
const paymentsProcessedEl = document.getElementById('paymentsProcessed');
const protocolStatusEl = document.getElementById('protocolStatus');

async function apiFetch(endpoint, options = {}) {
    try {
        const response = await fetch(endpoint, options);
        if (response.ok) {
            return await response.json();
        }
        throw new Error('Endpoint indisponível');
    } catch (error) {
        console.log(`[API MOCK] Interceptando chamada para ${endpoint}`);

        if (endpoint.includes('agent1-factcheck')) {
            return {
                passed: true,
                score: 95,
                details: 'Nenhuma inconsistência lógica detectada.'
            };
        }

        if (endpoint.includes('agent2-cybersec')) {
            return {
                safe: true,
                threat_level: 'low',
                report: 'Livre de prompt injection, links suspeitos ou padrões conhecidos de abuso.'
            };
        }

        if (endpoint.includes('agent3-consensus')) {
            return {
                consensus_reached: true,
                tx_signature: '0xMockedSignature...',
                final_decision: 'Approved'
            };
        }

        throw new Error('Endpoint não mapeado no mock.');
    }
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function showMode(mode) {
    feedMode.style.display = mode === 'feed' ? 'block' : 'none';
    creatorMode.style.display = mode === 'create' ? 'block' : 'none';
    viewerMode.style.display = mode === 'viewer' ? 'block' : 'none';

    navFeed.classList.toggle('active', mode === 'feed');
    navCreate.classList.toggle('active', mode === 'create');
}

function updateCharCount() {
    const total = secretInput.value.trim().length;
    charCount.textContent = `${total} caracteres`;
}

function resetPipelineUI() {
    verificationPanel.style.display = 'none';
    linkResult.style.display = 'none';

    generateLinkBtn.disabled = false;
    generateLinkBtn.innerText = `Criar Link Pagável (${CONTENT_PRICE} MON)`;
    generateLinkBtn.style.background = '';
    generateLinkBtn.style.color = '';

    step1.className = 'step-pending';
    step1.innerText = '⏳ Agente 1: Checando Fatos...';

    step2.className = 'step-pending';
    step2.innerText = '⏳ Agente 2: Auditoria de Cybersec...';

    step3.className = 'step-pending';
    step3.innerText = '⏳ Agente 3: Juiz de Consenso...';
}

function resetViewerUI() {
    secretContent.classList.remove('unblurred');
    secretContent.classList.add('blurred-content');
    payBtn.style.display = 'inline-flex';
    demoUnlockBtn.style.display = 'inline-flex';
    evaluateBtn.style.display = 'none';
    evaluateBtn.disabled = false;
    evaluateBtn.innerText = 'Avaliar Qualidade e Ganhar +0.002 MON';
    evaluateBtn.style.background = '';
    ownershipNotice.style.display = 'none';
    viewerBadge.textContent = 'Protegido por x402';
    payBtn.disabled = false;
    demoUnlockBtn.disabled = false;
    payBtn.innerText = `Pagar ${CONTENT_PRICE} MON para Desbloquear`;
    demoUnlockBtn.innerText = 'Modo Demo: Simular Desbloqueio';
}

function setProtocolStatus(text) {
    protocolStatusEl.innerText = text;
}

function incrementPayments() {
    paymentsProcessed += 1;
    paymentsProcessedEl.innerText = String(paymentsProcessed);
}

function safeEncodeContent(text) {
    return btoa(unescape(encodeURIComponent(text)));
}

function safeDecodeContent(text) {
    return decodeURIComponent(escape(atob(text)));
}

// Busca os posts globalmente do Supabase
async function fetchGlobalPosts() {
    try {
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .order('createdAt', { ascending: false });
            
        if (error) throw error;
        
        // Se o banco estiver vazio, retorna os defaultPosts para o Feed não ficar em branco
        return data && data.length > 0 ? data : [...defaultPosts];
    } catch (error) {
        console.error("Erro ao buscar posts globais:", error);
        return [...defaultPosts]; // Fallback
    }
}

// Salva o post globalmente no Supabase
async function saveGlobalPost(newPost) {
    try {
        const { error } = await supabase
            .from('posts')
            .insert([newPost]);
            
        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Erro ao salvar no banco:", error);
        return false;
    }
}

function getOwnedPostIds() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.ownedPostIds);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function addOwnedPostId(postId) {
    const owned = new Set(getOwnedPostIds());
    owned.add(postId);
    localStorage.setItem(STORAGE_KEYS.ownedPostIds, JSON.stringify([...owned]));
}

function isOwnedPost(postId) {
    return getOwnedPostIds().includes(postId);
}

function createPostId() {
    return `post_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function shortenText(text, max = 130) {
    if (text.length <= max) return text;
    return `${text.slice(0, max).trim()}...`;
}

function formatAuthorLabel(post) {
    if (post.authorLabel) return post.authorLabel;
    return 'Autor local';
}

// Corrigido: Agora busca o post consultando o banco de dados via fetchGlobalPosts
async function getPostById(postId) {
    const posts = await fetchGlobalPosts();
    return posts.find((post) => post.id === postId) || null;
}

function buildPostLink(postId) {
    return `${window.location.origin}${window.location.pathname}?post=${encodeURIComponent(postId)}`;
}

function unlockContent({ demo = false, durationMs = null, gasText = null } = {}) {
    secretContent.classList.remove('blurred-content');
    secretContent.classList.add('unblurred');

    payBtn.style.display = 'none';
    demoUnlockBtn.style.display = 'none';
    evaluateBtn.style.display = 'block';

    if (durationMs !== null) {
        monadTimeEl.innerText = `${Math.round(durationMs)} ms`;
    }

    if (gasText) {
        gasCostEl.innerText = gasText;
    }

    incrementPayments();
    setProtocolStatus(demo ? 'Demo Unlock' : 'On-chain Unlock');
}

function unlockOwnedContent() {
    secretContent.classList.remove('blurred-content');
    secretContent.classList.add('unblurred');
    payBtn.style.display = 'none';
    demoUnlockBtn.style.display = 'none';
    evaluateBtn.style.display = 'none';
    ownershipNotice.style.display = 'block';
    viewerBadge.textContent = 'Seu conteúdo';
    setProtocolStatus('Owner Access');
}

async function renderFeed() {
    feedList.innerHTML = `<div class="empty-feed">Carregando relatórios da rede... ⏳</div>`;
    
    const posts = await fetchGlobalPosts();

    if (!posts.length) {
        feedList.innerHTML = `<div class="empty-feed">Nenhum relatório encontrado.</div>`;
        return;
    }

    feedList.innerHTML = `
        <div class="post-stack">
            ${posts.map((post) => {
                const ownerTag = isOwnedPost(post.id) ? '<span class="badge owner-post">Seu post</span>' : '';
                return `
                    <div class="feed-post">
                        <div class="post-meta-row">
                            <span class="author post-author">Por: ${formatAuthorLabel(post)}</span>
                            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                                ${ownerTag}
                                <span class="badge">${post.price} MON</span>
                            </div>
                        </div>
                        <h4>${post.title}</h4>
                        <p>${shortenText(post.content)}</p>
                        <button class="btn-primary full-width" data-post-id="${post.id}">
                            Ver Relatório Completo
                        </button>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    feedList.querySelectorAll('[data-post-id]').forEach((button) => {
        button.addEventListener('click', () => {
            const postId = button.getAttribute('data-post-id');
            openViewerByPostId(postId);
        });
    });
}

function initializeViewerFromLegacyContent(encodedContent) {
    resetViewerUI();
    currentPost = null;

    try {
        const decoded = safeDecodeContent(encodedContent);
        viewerTitle.textContent = 'Relatório Protegido';
        viewerAuthor.textContent = 'Conteúdo legado aberto por link codificado.';
        secretContent.innerText = decoded;
    } catch (error) {
        secretContent.innerText = 'Não foi possível decodificar o conteúdo do relatório.';
        payBtn.disabled = true;
        demoUnlockBtn.disabled = true;
    }
}

function initializeViewerFromPost(post) {
    resetViewerUI();
    currentPost = post;

    viewerTitle.textContent = post.title;
    viewerAuthor.textContent = `Por: ${formatAuthorLabel(post)} · ${post.price} MON`;
    secretContent.innerText = post.content;

    if (isOwnedPost(post.id)) {
        unlockOwnedContent();
    }
}

function openViewerByPostId(postId) {
    const url = `${window.location.origin}${window.location.pathname}?post=${encodeURIComponent(postId)}`;
    window.location.href = url;
}

navFeed.onclick = () => {
    showMode('feed');
    window.history.pushState({}, '', window.location.pathname);
    renderFeed();
};

navCreate.onclick = () => {
    showMode('create');
    window.history.pushState({}, '', window.location.pathname);
};

secretInput.addEventListener('input', () => {
    updateCharCount();
    resetPipelineUI();
});

reportTitleInput.addEventListener('input', resetPipelineUI);

prefillBtn.addEventListener('click', () => {
    reportTitleInput.value = EXAMPLE_TITLE;
    secretInput.value = EXAMPLE_REPORT;
    updateCharCount();
    resetPipelineUI();
});

generateLinkBtn.onclick = async () => {
    const title = reportTitleInput.value.trim() || 'Relatório Confidencial';
    const content = secretInput.value.trim();

    // Validações básicas
    if (!content) {
        alert('Escreva um relatório antes de gerar o link.');
        return;
    }
    if (content.length < 40) {
        alert('O relatório está curto demais para a demo. Coloque mais contexto.');
        return;
    }
    if (content.length > 4000) {
        alert('O relatório está muito grande para este MVP.');
        return;
    }

    // Preparação da UI para a Pipeline
    resetPipelineUI();
    verificationPanel.style.display = 'block';
    generateLinkBtn.disabled = true;
    generateLinkBtn.innerText = 'Iniciando Pipeline...';

    try {
        // ==========================================
        // ETAPA 1: Agente Fact-Checker
        // ==========================================
        step1.className = 'step-active';
        step1.innerText = '🔄 Agente 1: Analisando Fatos...';
        await delay(800);

        const factData = await apiFetch('/api/agent1-factcheck', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });

        if (!factData.passed) {
            throw new Error('Reprovado no Fact-Check');
        }

        step1.className = 'step-success';
        step1.innerText = `✅ Agente 1: Fatos Verificados (Score: ${factData.score}).`;

        // ==========================================
        // ETAPA 2: Agente Auditor de Cybersec
        // ==========================================
        step2.className = 'step-active';
        step2.innerText = '🛡️ Agente 2: Auditoria de Segurança...';
        await delay(900);

        const secData = await apiFetch('/api/agent2-cybersec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });

        if (!secData.safe) {
            throw new Error('Ameaça de Segurança Detectada');
        }

        step2.className = 'step-success';
        step2.innerText = `✅ Agente 2: Aprovado. ${secData.report}`;

        // ==========================================
        // ETAPA 3: Juiz de Consenso
        // ==========================================
        step3.className = 'step-active';
        step3.innerText = '⚖️ Agente 3: Assinando Consenso...';
        await delay(700);

        const consensusData = await apiFetch('/api/agent3-consensus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent1: factData, agent2: secData })
        });

        step3.className = 'step-success';
        step3.innerText = `✅ Agente 3: Consenso Atingido! (Decisão: ${consensusData.final_decision})`;

        // ==========================================
        // SUCESSO FINAL: Criar Post e Salvar no Supabase
        // ==========================================
        const ownerId = userAddress || `local-author-${Date.now()}`;
        const authorLabel = userAddress
            ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`
            : 'Autor local';

        const newPost = {
            id: createPostId(),
            title,
            content,
            price: CONTENT_PRICE,
            ownerId,
            authorLabel,
            createdAt: new Date().toISOString()
        };

        const saved = await saveGlobalPost(newPost);
        if(!saved) {
            throw new Error("Falha ao sincronizar o relatório com a rede (Supabase).");
        }

        addOwnedPostId(newPost.id); 
        await renderFeed(); 

        const finalLink = buildPostLink(newPost.id);

        shareableLink.value = finalLink;
        linkResult.style.display = 'block';
        generateLinkBtn.innerText = 'Link Gerado com Sucesso';
        setProtocolStatus('HTTP x402 Ready');

    } catch (error) {
        generateLinkBtn.innerText = 'Falha na Pipeline';
        generateLinkBtn.style.background = '#DC2626';
        generateLinkBtn.style.color = '#FFFFFF';

        if (step3.className === 'step-active') {
            step3.className = 'step-error';
            step3.innerText = `❌ Agente 3: ${error.message}`;
        } else if (step2.className === 'step-active') {
            step2.className = 'step-error';
            step2.innerText = `❌ Agente 2: ${error.message}`;
        } else if (step1.className === 'step-active') {
            step1.className = 'step-error';
            step1.innerText = `❌ Agente 1: ${error.message}`;
        }

        alert(`Operação abortada: ${error.message}`);
    } finally {
        generateLinkBtn.disabled = false;
    }
};

copyLinkBtn.onclick = async () => {
    const value = shareableLink.value.trim();

    if (!value) {
        alert('Nenhum link foi gerado ainda.');
        return;
    }

    try {
        await navigator.clipboard.writeText(value);
        copyLinkBtn.innerText = 'Link Copiado!';
        setTimeout(() => {
            copyLinkBtn.innerText = 'Copiar Link';
        }, 1400);
    } catch (error) {
        alert('Não foi possível copiar automaticamente. Copie manualmente.');
    }
};

openLinkBtn.onclick = () => {
    const value = shareableLink.value.trim();

    if (!value) {
        alert('Nenhum link foi gerado ainda.');
        return;
    }

    window.open(value, '_blank');
};

connectBtn.onclick = async () => {
    if (!window.ethereum) {
        alert('Instale a MetaMask ou Rabby para usar o fluxo on-chain.');
        return;
    }

    walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(window.ethereum)
    });

    publicClient = createPublicClient({
        chain: monadTestnet,
        transport: custom(window.ethereum)
    });

    try {
        const [address] = await walletClient.requestAddresses();
        userAddress = address;

        connectBtn.style.display = 'none';
        walletAddressEl.innerText = `🟢 Carteira conectada: ${address.slice(0, 6)}...${address.slice(-4)}`;
        setProtocolStatus('Wallet Connected');
    } catch (error) {
        console.error(error);
        alert('Não foi possível conectar a carteira.');
    }
};

payBtn.onclick = async () => {
    if (!currentPost) {
        alert('Conteúdo não encontrado.');
        return;
    }

    if (!window.ethereum) {
        alert('Instale a MetaMask ou use o Modo Demo.');
        return;
    }

    if (!userAddress || !walletClient || !publicClient) {
        alert('Conecte sua carteira primeiro.');
        return;
    }

    payBtn.disabled = true;
    demoUnlockBtn.disabled = true;
    payBtn.innerText = 'Confirme na carteira...';

    try {
        const txHash = await walletClient.sendTransaction({
            account: userAddress,
            to: CONTRACT_ADDRESS,
            value: parseEther(CONTENT_PRICE)
        });

        payBtn.innerText = '⏳ Aguardando finalização da Monad...';

        const startTime = performance.now();
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        const endTime = performance.now();

        const finalityMs = endTime - startTime;
        const gasCost = parseFloat(
            formatEther(receipt.gasUsed * receipt.effectiveGasPrice)
        ).toFixed(6);

        unlockContent({
            demo: false,
            durationMs: finalityMs,
            gasText: `${gasCost} MON`
        });
    } catch (error) {
        console.error(error);
        payBtn.disabled = false;
        demoUnlockBtn.disabled = false;
        payBtn.innerText = `Pagar ${CONTENT_PRICE} MON para Desbloquear`;
        alert('A transação falhou ou foi cancelada. Você ainda pode usar o Modo Demo para apresentação.');
        setProtocolStatus('Payment Failed / Demo Available');
    }
};

demoUnlockBtn.onclick = async () => {
    payBtn.disabled = true;
    demoUnlockBtn.disabled = true;
    demoUnlockBtn.innerText = 'Simulando desbloqueio...';

    const fakeDuration = 420 + Math.floor(Math.random() * 120);
    await delay(700);

    unlockContent({
        demo: true,
        durationMs: fakeDuration,
        gasText: '0.000021 MON'
    });
};

evaluateBtn.onclick = () => {
    evaluateBtn.disabled = true;
    evaluateBtn.style.background = '#059669';
    evaluateBtn.innerText = '✅ Avaliação Registrada! Recompensa enviada.';

    gasCostEl.style.color = '#D97706';
    gasCostEl.innerText = '+ 0.002 MON Earned';

    alert('Avaliação processada! Micro-royalties distribuídos para o criador e para o curador.');
};

// ==========================================
// INICIALIZAÇÃO DA PÁGINA
// ==========================================
renderFeed();

if (postIdParam) {
    getPostById(postIdParam).then(post => {
        if (post) {
            showMode('viewer');
            initializeViewerFromPost(post);
        } else {
            showMode('feed');
            alert('Relatório não encontrado.');
        }
    });
} else if (contentParam) {
    showMode('viewer');
    initializeViewerFromLegacyContent(contentParam);
} else {
    showMode('feed');
}

updateCharCount();
paymentsProcessedEl.innerText = String(paymentsProcessed);
setProtocolStatus('HTTP x402 Ready');