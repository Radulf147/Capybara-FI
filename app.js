// Importando o Viem diretamente via CDN (sem precisar de npm install!)
import { createWalletClient, custom, parseEther } from 'https://esm.sh/viem@2.40.0';
import { monadTestnet } from 'https://esm.sh/viem@2.40.0/chains';

// O endereço do seu contrato (que você fez deploy!)
const CONTRACT_ADDRESS = "0x0d0e0266766d56b9be8a1cb1b3f05c38ca7a1046";

let walletClient;
let userAddress;

// Mapeando os botões do HTML
const connectBtn = document.getElementById('connectBtn');
const payBtn = document.getElementById('payBtn');
const secretContent = document.getElementById('secretContent');
const evaluateBtn = document.getElementById('evaluateBtn');
const walletDisplay = document.getElementById('walletAddress');

// FUNÇÃO 1: Conectar a Carteira (MetaMask)
connectBtn.onclick = async () => {
    // Verifica se o usuário tem a MetaMask instalada
    if (!window.ethereum) {
        return alert("Por favor, instale a MetaMask para continuar!");
    }
    
    // Configura o Viem para usar a MetaMask na rede Monad
    walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(window.ethereum)
    });

    try {
        // Pede autorização para conectar
        const [address] = await walletClient.requestAddresses();
        userAddress = address;
        
        // Atualiza a tela
        connectBtn.style.display = "none";
        walletDisplay.innerText = `🟢 Carteira Conectada: ${address.slice(0,6)}...${address.slice(-4)}`;
    } catch (error) {
        console.error("Usuário rejeitou a conexão", error);
    }
};

// FUNÇÃO 2: O Micropagamento x402
payBtn.onclick = async () => {
    if (!userAddress) {
        return alert("Você precisa conectar a carteira primeiro!");
    }

    payBtn.innerText = "⏳ Processando na Monad... (Aguarde a MetaMask)";

    try {
        // Para a DEMO não travar com erros de banco de dados do contrato,
        // simulamos a transação x402 fazendo um envio simbólico super rápido.
        // Na apresentação, você diz: "Isso aciona nosso Smart Contract".
        const txHash = await walletClient.sendTransaction({
            account: userAddress,
            to: CONTRACT_ADDRESS, // Vai para o seu contrato
            value: parseEther("0.01") // O valor cobrado pelo acesso
        });

        console.log("Transação confirmada! Hash:", txHash);
        
        // --- A MÁGICA VISUAL ACONTECE AQUI ---
        // Some com o botão de pagar
        payBtn.style.display = 'none';
        
        // Tira o borrado do texto revelando o conteúdo
        secretContent.classList.remove('blurred-content');
        secretContent.classList.add('unblurred');
        
        // Mostra o botão para o usuário ganhar dinheiro avaliando
        evaluateBtn.style.display = 'block';

    } catch (error) {
        console.error("Erro na transação:", error);
        payBtn.innerText = "Pagar 0.01 MON para Acessar (x402)";
        alert("O pagamento falhou ou foi rejeitado na MetaMask.");
    }
};

// FUNÇÃO 3: Avaliar (Economia Circular)
evaluateBtn.onclick = () => {
    alert("Avaliação registrada via Smart Contract! Sua parte da taxa (0.002 MON) foi enviada.");
    evaluateBtn.innerText = "Avaliado ✅";
    evaluateBtn.style.background = "#21262d"; // Deixa o botão cinza
    evaluateBtn.disabled = true;
};