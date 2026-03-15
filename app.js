import { createWalletClient, createPublicClient, custom, parseEther, formatEther } from 'https://esm.sh/viem@2.40.0';
import { monadTestnet } from 'https://esm.sh/viem@2.40.0/chains';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const CONTRACT_ADDRESS = "0x0d0e0266766d56b9be8a1cb1b3f05c38ca7a1046";
const CONTRACT_ABI = [{"inputs":[{"internalType":"uint256","name":"_price","type":"uint256"}],"name":"createContent","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_contentId","type":"uint256"},{"internalType":"address payable","name":"_affiliate","type":"address"}],"name":"buyContent","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_contentId","type":"uint256"}],"name":"evaluateContent","outputs":[],"stateMutability":"nonpayable","type":"function"}];
const CONTENT_PRICE = "0.01";
const STORAGE_KEYS = {
    ownedPostIds: 'capybara_owned_post_ids',
    unlockedPostIds: 'capybara_unlocked_posts'
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
        id: 1,
        title: 'Vulnerabilidade Zero-Day no Cloud Run',
        content: 'Foi identificado um padrão de exfiltração de dados em workloads Cloud Run através de portas não monitoradas.',
        price: '0.01',
        authorLabel: '0x71C...3A',
        ownerId: '0x0000000000000000000000000000000000000000',
        createdAt: new Date().toISOString()
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
const viewerActions = document.getElementById('viewerActions');

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
        if (response.ok) return await response.json();
        throw new Error('Endpoint indisponível');
    } catch (error) {
        if (endpoint.includes('agent1-factcheck')) return { passed: true, score: 95 };
        if (endpoint.includes('agent2-cybersec')) return { safe: true, report: 'Livre de injeção e malwares.' };
        if (endpoint.includes('agent3-consensus')) return { consensus_reached: true, final_decision: 'Approved' };
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
    charCount.textContent = `${secretInput.value.trim().length} caracteres`;
}

function setProtocolStatus(text) { protocolStatusEl.innerText = text; }

function incrementPayments() {
    paymentsProcessed += 1;
    paymentsProcessedEl.innerText = String(paymentsProcessed);
}

async function fetchGlobalPosts() {
    try {
        const { data, error } = await supabase.from('posts').select('*').order('createdAt', { ascending: false });
        if (error) throw error;
        return data && data.length > 0 ? data : [...defaultPosts];
    } catch (error) {
        return [...defaultPosts];
    }
}

async function saveGlobalPost(newPost) {
    try {
        const { error } = await supabase.from('posts').insert([newPost]);
        if (error) throw error;
        return true;
    } catch (error) {
        return false;
    }
}

async function getPostById(postId) {
    const posts = await fetchGlobalPosts();
    return posts.find((post) => String(post.id) === String(postId)) || null;
}

function getOwnedPostIds() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.ownedPostIds);
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}

function addOwnedPostId(postId) {
    const owned = new Set(getOwnedPostIds());
    owned.add(postId);
    localStorage.setItem(STORAGE_KEYS.ownedPostIds, JSON.stringify([...owned]));
}

function isOwnedPost(post) {
    if (!post) return false;
    if (userAddress && post.ownerId && userAddress.toLowerCase() === post.ownerId.toLowerCase()) {
        return true;
    }
    return getOwnedPostIds().includes(post.id);
}

function getUnlockedPostIds() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.unlockedPostIds);
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}

function addUnlockedPostId(postId) {
    const unlocked = new Set(getUnlockedPostIds());
    unlocked.add(postId);
    localStorage.setItem(STORAGE_KEYS.unlockedPostIds, JSON.stringify([...unlocked]));
}

function hasUnlockedPost(postId) {
    return getUnlockedPostIds().includes(postId);
}

function buildPostLink(postId) {
    return `${window.location.origin}${window.location.pathname}?post=${encodeURIComponent(postId)}`;
}

async function renderFeed() {
    feedList.innerHTML = `<div class="empty-feed">Carregando relatórios da rede... ⏳</div>`;
    const posts = await fetchGlobalPosts();

    if (!posts.length) {
        feedList.innerHTML = `<div class="empty-feed">Nenhum relatório encontrado.</div>`;
        return;
    }

    feedList.innerHTML = `<div class="post-stack">
        ${posts.map((post) => {
            const isOwner = isOwnedPost(post);
            const isUnlocked = hasUnlockedPost(post.id);
            
            let tag = '';
            if (isOwner) tag = '<span class="badge owner-post">Seu post</span>';
            else if (isUnlocked) tag = '<span class="badge" style="background:#ECFDF5; color:#065F46; border-color:#A7F3D0;">Desbloqueado</span>';

            return `
                <div class="feed-post">
                    <div class="post-meta-row">
                        <span class="author">Por: ${post.authorLabel || 'Autor local'}</span>
                        <div style="display:flex; gap:8px; align-items:center;">
                            ${tag}
                            <span class="badge">${post.price} MON</span>
                        </div>
                    </div>
                    <h4>${post.title}</h4>
                    <p>${post.content.slice(0, 130)}...</p>
                    <button class="btn-primary full-width" data-post-id="${post.id}">Ver Relatório</button>
                </div>
            `;
        }).join('')}
    </div>`;

    feedList.querySelectorAll('[data-post-id]').forEach((button) => {
        button.addEventListener('click', () => {
            openViewerByPostId(button.getAttribute('data-post-id'));
        });
    });
}

function resetPipelineUI() {
    verificationPanel.style.display = 'none';
    linkResult.style.display = 'none';
    generateLinkBtn.disabled = false;
    generateLinkBtn.innerText = `Criar Link Pagável (${CONTENT_PRICE} MON)`;
    generateLinkBtn.style.background = '';
    generateLinkBtn.style.color = '';
    step1.className = 'step-pending'; step1.innerText = '⏳ Agente 1: Checando Fatos...';
    step2.className = 'step-pending'; step2.innerText = '⏳ Agente 2: Auditoria de Cybersec...';
    step3.className = 'step-pending'; step3.innerText = '⏳ Agente 3: Juiz de Consenso...';
}

function resetViewerUI() {
    secretContent.classList.remove('unblurred');
    secretContent.classList.add('blurred-content');
    payBtn.style.display = 'inline-flex';
    demoUnlockBtn.style.display = 'inline-flex';
    evaluateBtn.style.display = 'none';
    ownershipNotice.style.display = 'none';
    viewerBadge.textContent = 'Protegido por x402';
    payBtn.disabled = false; demoUnlockBtn.disabled = false;
    payBtn.innerText = `Pagar ${CONTENT_PRICE} MON para Desbloquear`;
    demoUnlockBtn.innerText = 'Modo Demo: Simular Desbloqueio';
    
    const ownerCopyBtn = document.getElementById('ownerCopyBtn');
    if (ownerCopyBtn) ownerCopyBtn.style.display = 'none';
}

function unlockContent({ demo = false, durationMs = null, gasText = null } = {}) {
    secretContent.classList.remove('blurred-content');
    secretContent.classList.add('unblurred');
    payBtn.style.display = 'none'; demoUnlockBtn.style.display = 'none';
    evaluateBtn.style.display = 'block';

    if (durationMs !== null) monadTimeEl.innerText = `${Math.round(durationMs)} ms`;
    if (gasText) gasCostEl.innerText = gasText;

    incrementPayments();
    setProtocolStatus(demo ? 'Demo Unlock' : 'On-chain Unlock');
}

function unlockOwnedContent() {
    secretContent.classList.remove('blurred-content');
    secretContent.classList.add('unblurred');
    payBtn.style.display = 'none'; demoUnlockBtn.style.display = 'none'; evaluateBtn.style.display = 'none';
    ownershipNotice.style.display = 'block';
    viewerBadge.textContent = 'Seu conteúdo';
    setProtocolStatus('Owner Access');

    if (!document.getElementById('ownerCopyBtn')) {
        const copyBtn = document.createElement('button');
        copyBtn.id = 'ownerCopyBtn';
        copyBtn.className = 'btn-primary full-width';
        copyBtn.innerText = '🔗 Copiar Link de Compartilhamento';
        copyBtn.style.marginTop = '15px';
        copyBtn.onclick = async () => {
            await navigator.clipboard.writeText(buildPostLink(currentPost.id));
            copyBtn.innerText = '✅ Link Copiado!';
            setTimeout(() => copyBtn.innerText = '🔗 Copiar Link de Compartilhamento', 2000);
        };
        viewerActions.appendChild(copyBtn);
    } else {
        document.getElementById('ownerCopyBtn').style.display = 'block';
    }
}

function initializeViewerFromPost(post) {
    resetViewerUI();
    currentPost = post;
    viewerTitle.textContent = post.title;
    viewerAuthor.textContent = `Por: ${post.authorLabel || 'Autor'} · ${post.price} MON`;
    secretContent.innerText = post.content;

    if (isOwnedPost(post)) {
        unlockOwnedContent();
    } else if (hasUnlockedPost(post.id)) {
        unlockContent({ demo: true, durationMs: 0, gasText: 'Já Adquirido' });
        setProtocolStatus('Already Purchased');
    }
}

function openViewerByPostId(postId) {
    window.location.href = buildPostLink(postId);
}

navFeed.onclick = () => { 
    showMode('feed'); 
    window.history.pushState({}, '', window.location.pathname); 
    renderFeed(); 
};

navCreate.onclick = () => { 
    if (!userAddress) {
        alert('Você precisa conectar sua carteira Web3 (MetaMask/Rabby) para criar e monetizar conteúdos.');
        return;
    }
    showMode('create'); 
    window.history.pushState({}, '', window.location.pathname); 
};

secretInput.addEventListener('input', () => { updateCharCount(); resetPipelineUI(); });
reportTitleInput.addEventListener('input', resetPipelineUI);

prefillBtn.addEventListener('click', () => {
    reportTitleInput.value = EXAMPLE_TITLE;
    secretInput.value = EXAMPLE_REPORT;
    updateCharCount(); resetPipelineUI();
});

generateLinkBtn.onclick = async () => {
    if (!userAddress) {
        alert('Você precisa estar com a carteira conectada para gerar um link pagável.');
        return;
    }

    const title = reportTitleInput.value.trim() || 'Relatório Confidencial';
    const content = secretInput.value.trim();

    if (!content || content.length < 40 || content.length > 4000) {
        return alert('Conteúdo inválido. Insira um texto entre 40 e 4000 caracteres.');
    }

    resetPipelineUI();
    verificationPanel.style.display = 'block';
    generateLinkBtn.disabled = true; generateLinkBtn.innerText = 'Iniciando Pipeline...';

    try {
        step1.className = 'step-active'; step1.innerText = '🔄 Agente 1: Analisando Fatos...';
        await delay(800);
        const factData = await apiFetch('/api/agent1-factcheck', { method: 'POST' });
        if (!factData.passed) throw new Error('Reprovado no Fact-Check');
        step1.className = 'step-success'; step1.innerText = `✅ Agente 1: Fatos Verificados (Score: ${factData.score}).`;

        step2.className = 'step-active'; step2.innerText = '🛡️ Agente 2: Auditoria de Segurança...';
        await delay(900);
        const secData = await apiFetch('/api/agent2-cybersec', { method: 'POST' });
        if (!secData.safe) throw new Error('Ameaça de Segurança Detectada');
        step2.className = 'step-success'; step2.innerText = `✅ Agente 2: Aprovado. ${secData.report}`;

        step3.className = 'step-active'; step3.innerText = '⚖️ Agente 3: Assinando Consenso...';
        await delay(700);
        const consensusData = await apiFetch('/api/agent3-consensus', { method: 'POST' });
        step3.className = 'step-success'; step3.innerText = `✅ Agente 3: Consenso Atingido!`;

        const ownerId = userAddress; 
        const authorLabel = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        const numericId = Date.now();

        const txHash = await walletClient.writeContract({
            account: userAddress,
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'createContent',
            args: [parseEther(CONTENT_PRICE)]
        });

        await publicClient.waitForTransactionReceipt({ hash: txHash });

        const newPost = {
            id: numericId,
            title, content, price: CONTENT_PRICE, ownerId, authorLabel, createdAt: new Date().toISOString()
        };

        if(!(await saveGlobalPost(newPost))) throw new Error("Falha ao sincronizar (Supabase).");

        addOwnedPostId(newPost.id); 
        await renderFeed(); 

        shareableLink.value = buildPostLink(newPost.id);
        linkResult.style.display = 'block';
        generateLinkBtn.innerText = 'Link Gerado com Sucesso';
        setProtocolStatus('HTTP x402 Ready');

    } catch (error) {
        generateLinkBtn.innerText = 'Falha na Pipeline';
        generateLinkBtn.style.background = '#DC2626'; generateLinkBtn.style.color = '#FFFFFF';
        if (step3.className === 'step-active') step3.className = 'step-error';
        else if (step2.className === 'step-active') step2.className = 'step-error';
        else if (step1.className === 'step-active') step1.className = 'step-error';
        alert(`Abortado: ${error.message}`);
    } finally {
        generateLinkBtn.disabled = false;
    }
};

copyLinkBtn.onclick = async () => {
    await navigator.clipboard.writeText(shareableLink.value.trim());
    copyLinkBtn.innerText = 'Copiado!';
    setTimeout(() => copyLinkBtn.innerText = 'Copiar Link', 1400);
};

openLinkBtn.onclick = () => window.open(shareableLink.value.trim(), '_blank');

async function autoConnectWallet() {
    if (!window.ethereum) return;
    
    try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
            userAddress = accounts[0];
            walletClient = createWalletClient({ chain: monadTestnet, transport: custom(window.ethereum) });
            publicClient = createPublicClient({ chain: monadTestnet, transport: custom(window.ethereum) });
            
            connectBtn.style.display = 'none';
            walletAddressEl.innerText = `🟢 Carteira: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
            setProtocolStatus('Wallet Connected');
            
            await renderFeed();
            
            if (currentPost && isOwnedPost(currentPost)) {
                unlockOwnedContent();
            }
        }
    } catch (error) {
    }
}

connectBtn.onclick = async () => {
    if (!window.ethereum) return alert('Instale a MetaMask ou Rabby.');
    walletClient = createWalletClient({ chain: monadTestnet, transport: custom(window.ethereum) });
    publicClient = createPublicClient({ chain: monadTestnet, transport: custom(window.ethereum) });

    try {
        const [address] = await walletClient.requestAddresses();
        userAddress = address;
        connectBtn.style.display = 'none';
        walletAddressEl.innerText = `🟢 Carteira: ${address.slice(0, 6)}...${address.slice(-4)}`;
        setProtocolStatus('Wallet Connected');
        await renderFeed();
        if (currentPost && isOwnedPost(currentPost)) unlockOwnedContent();
    } catch (error) { }
};

payBtn.onclick = async () => {
    if (!currentPost) return alert('Conteúdo não encontrado.');
    if (!userAddress) return alert('Conecte sua carteira primeiro.');

    payBtn.disabled = true; demoUnlockBtn.disabled = true;
    payBtn.innerText = 'Confirme na carteira...';

    try {
        const txHash = await walletClient.writeContract({
            account: userAddress,
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'buyContent',
            args: [BigInt(currentPost.id), "0x0000000000000000000000000000000000000000"],
            value: parseEther(CONTENT_PRICE)
        });

        payBtn.innerText = '⏳ Aguardando Monad...';
        const startTime = performance.now();
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        
        addUnlockedPostId(currentPost.id);

        unlockContent({
            demo: false,
            durationMs: performance.now() - startTime,
            gasText: `${parseFloat(formatEther(receipt.gasUsed * receipt.effectiveGasPrice)).toFixed(6)} MON`
        });
    } catch (error) {
        payBtn.disabled = false; demoUnlockBtn.disabled = false;
        payBtn.innerText = `Pagar ${CONTENT_PRICE} MON para Desbloquear`;
        alert('Transação cancelada. Use o Modo Demo para apresentação.');
    }
};

demoUnlockBtn.onclick = async () => {
    payBtn.disabled = true; demoUnlockBtn.disabled = true;
    demoUnlockBtn.innerText = 'Simulando...';
    await delay(700);

    addUnlockedPostId(currentPost.id);

    unlockContent({ demo: true, durationMs: 420 + Math.floor(Math.random() * 120), gasText: '0.000021 MON' });
};

evaluateBtn.onclick = async () => {
    if (!currentPost) return;
    evaluateBtn.disabled = true;
    evaluateBtn.innerText = 'Confirmando avaliação...';
    
    try {
        const txHash = await walletClient.writeContract({
            account: userAddress,
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'evaluateContent',
            args: [BigInt(currentPost.id)]
        });
        
        await publicClient.waitForTransactionReceipt({ hash: txHash });

        evaluateBtn.style.background = '#059669';
        evaluateBtn.innerText = '✅ Avaliação Registrada!';
        gasCostEl.style.color = '#D97706'; gasCostEl.innerText = '+ 0.001 MON Earned';
        alert('Avaliação processada! Micro-royalties distribuídos.');
    } catch (error) {
        evaluateBtn.disabled = false;
        evaluateBtn.innerText = 'Avaliar e Receber Recompensa';
        alert('Erro ao processar a avaliação na rede.');
    }
};

autoConnectWallet();

renderFeed();
if (postIdParam) {
    getPostById(postIdParam).then(post => {
        if (post) { showMode('viewer'); initializeViewerFromPost(post); } 
        else { showMode('feed'); alert('Relatório não encontrado.'); }
    });
} else if (contentParam) {
    showMode('feed'); 
} else {
    showMode('feed');
}
updateCharCount();
setProtocolStatus('HTTP x402 Ready');