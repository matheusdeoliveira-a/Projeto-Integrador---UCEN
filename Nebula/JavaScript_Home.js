// ===== VLibras: botão e barra roxos, combinando com o menu de acessibilidade =====
(function () {
    var ROXO = 'hue-rotate(65deg) saturate(1.15)';

    var CSS =
        '#vlibras-button { border-radius: 12px !important; overflow: hidden !important; outline: 2px solid rgba(231,182,230,.6) !important; box-shadow: 0 0 16px rgba(162,60,196,.5) !important; background: #5b2a86 !important; }' +
        '#vlibras-button img { filter: ' + ROXO + ' !important; }' +
        '#vlibras-popup { filter: ' + ROXO + ' !important; border-radius: 20px !important; }';


    var tentativas = 0;
    var timer = setInterval(function () {
        var host = document.getElementById('vlibras-access-wrapper');
        if (host && host.shadowRoot) {
            var s = document.createElement('style');
            s.textContent = CSS;
            host.shadowRoot.appendChild(s);
            clearInterval(timer);
        } else if (++tentativas > 50) {
            clearInterval(timer);
        }
    }, 200);
})();

const track = document.getElementById("track");

// duplica apenas UMA vez
track.innerHTML += track.innerHTML;

let x = 0;
const velocidade = 1.4;

function mover(){

    x -= velocidade;

    const larguraOriginal = track.scrollWidth / 2;

    if(-x >= larguraOriginal){
        x = 0;
    }

    track.style.transform = `translate3d(${x}px,0,0)`;

    requestAnimationFrame(mover);

}

mover();


// Sempre que mudar o tamanho da tela,
// reposiciona corretamente.
window.addEventListener("resize",()=>{

    x = 0;

});

// Teste da IA sirius (talvez apagar depois)
const botao = document.getElementById("abrirSirius");

const janela = document.getElementById("janelaSirius");

const fechar = document.getElementById("fecharSirius");

const botaoExpandir = document.getElementById("expandirSirius");

// Liga/desliga a tela cheia do chat (troca o ícone sem recriar o botão)
function alternarTelaCheia(ativar) {

    janela.classList.toggle("expandida", ativar);

    document.body.style.overflow = ativar ? "hidden" : "";

    const icone = botaoExpandir.querySelector("i");

    icone.classList.toggle("fa-expand", !ativar);
    icone.classList.toggle("fa-compress", ativar);

    botaoExpandir.title = ativar ? "Sair da tela cheia" : "Tela cheia";
    botaoExpandir.setAttribute("aria-label", ativar ? "Sair da tela cheia" : "Expandir o chat");

}

// Fecha o chat e já sai da tela cheia (da próxima vez abre no tamanho normal)
function fecharJanelaSirius() {

    janela.style.display = "none";

    if (janela.classList.contains("expandida")) {
        alternarTelaCheia(false);
    }

}

botao.addEventListener("click", ()=>{

    janela.style.display="flex";

});

fechar.addEventListener("click", fecharJanelaSirius);

botaoExpandir.addEventListener("click", ()=>{

    alternarTelaCheia(!janela.classList.contains("expandida"));

});

// Esc sai da tela cheia
document.addEventListener("keydown", (evento) => {

    if (evento.key === "Escape" && janela.classList.contains("expandida")) {
        alternarTelaCheia(false);
    }

});

// Se clicar fora da janela, fechar o chat do sirius
document.addEventListener("click", (evento) => {

    const clicouNaJanela = janela.contains(evento.target);

    const clicouNoBotao = botao.contains(evento.target);

    if (!clicouNaJanela && !clicouNoBotao) {

        fecharJanelaSirius();

    }

});

// Se clicar em "Enviar", o que estiver escrito será enviado no chat
const campoMensagem = document.getElementById("campoMensagem");

const botaoEnviar = document.getElementById("botaoEnviar");

const mensagens = document.querySelector(".mensagens-sirius");

// Cria uma bolha de mensagem (usuário ou IA) e adiciona no chat
function criarBolhaMensagem(texto, classe) {

    const bolha = document.createElement("div");
    bolha.className = classe;
    bolha.textContent = texto;

    mensagens.appendChild(bolha);
    mensagens.scrollTop = mensagens.scrollHeight;

    return bolha;

}

async function enviarMensagemSirius() {

    const texto = campoMensagem.value.trim();
    

    if (texto === "") return;

    // Mostra a mensagem do usuário na hora
    criarBolhaMensagem(texto, "mensagem-usuario");

    campoMensagem.value = "";
    campoMensagem.disabled = true;

    // Bolha de "digitando..." enquanto espera a IA responder
    const bolhaCarregando = criarBolhaMensagem("", "mensagem-ia");
    bolhaCarregando.innerHTML = 'Sirius está digitando <span class="pontinhos"><span>.</span><span>.</span><span>.</span></span>';

    try {

           const resposta = await fetch("sirius_gemini/sirius_ia.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "mensagem=" + encodeURIComponent(texto)
        });

        const dados = await resposta.json();

        if (dados.sucesso) {
            bolhaCarregando.style.whiteSpace = "pre-line";   // respeita as quebras de linha da resposta
            bolhaCarregando.textContent = dados.resposta;
        } else {
            bolhaCarregando.textContent = "Desculpa, tive um problema: " + (dados.erro || "erro desconhecido");
        }

    } catch (erro) {

        bolhaCarregando.textContent = "Não consegui me conectar agora. Tenta de novo em instantes.";
        console.error("Erro ao falar com o Sirius:", erro);

    }

    campoMensagem.disabled = false;
    campoMensagem.focus();
    mensagens.scrollTop = mensagens.scrollHeight;

}

botaoEnviar.addEventListener("click", enviarMensagemSirius);

// Poder enviar com "Enter"
campoMensagem.addEventListener("keydown", (evento) => {

    if (evento.key === "Enter") {

        evento.preventDefault();

        botaoEnviar.click();

    }

});

// Caixa pesquisa..............................................................

  const inputPesquisa = document.getElementById('pesquisa-grande');
  const dropdown = document.getElementById('dropdown-graduacoes');
  const itensLista = dropdown.querySelectorAll('li');
  const mensagemVazia = document.getElementById('mensagem-vazia');
  const historicoHero = document.getElementById('historico-hero');

  // Ao focar/clicar na caixa
  inputPesquisa.addEventListener('focus', () => {
    dropdown.classList.add('ativo');

    if (inputPesquisa.value.trim() === "") {
      mostrarHistoricoHero(); // Campo vazio: mostra o histórico
    } else {
      filtrarCursos(); // Aplica o filtro atual
    }
  });

  // Ao digitar algo
  inputPesquisa.addEventListener('input', filtrarCursos);

  function filtrarCursos() {
    const texto = inputPesquisa.value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Se o campo estiver VAZIO: esconde todos os cursos e a mensagem, mostra o histórico
    if (texto === "") {
      itensLista.forEach(item => item.style.display = "none");
      mensagemVazia.style.display = "none";
      mostrarHistoricoHero();
      return;
    }

    // Tem texto digitado: esconde o histórico e busca os cursos correspondentes
    esconderHistoricoHero();

    let visiveis = 0;
    itensLista.forEach(item => {
      const itemTexto = item.textContent.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      if (itemTexto.includes(texto)) {
        item.style.display = "block";
        visiveis++;
      } else {
        item.style.display = "none";
      }
    });

    // Se digitou algo mas não encontrou nada da lista
    mensagemVazia.style.display = (visiveis === 0) ? "block" : "none";
  }

  // Ao clicar ele redireciona ao curso desejado
itensLista.forEach(item => {
  item.addEventListener('click', () => {
    const urlDestino = item.getAttribute('data-url');
    salvarNoHistorico(item.textContent.trim());
    if (urlDestino) {
      window.location.href = urlDestino; // Leva o usuário para a página correspondente
    }
  });
});

  // Esconde a caixa ao clicar fora
  document.addEventListener('click', (e) => {
    if (!inputPesquisa.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('ativo');
    }
  });


//..............................................................................
// ===============================================
// Flip dos cards de Networking
// ===============================================

// Seleciona todos os cards da seção
const cardsNetworking = document.querySelectorAll(".card-networking");

// Percorre cada card
cardsNetworking.forEach(card => {

    // Quando clicar em um card
    card.addEventListener("click", (event) => {

        // Se o clique foi no link (LinkedIn ou Instagram),
        // não interfere. O navegador abre o link normalmente.
        if (event.target.closest(".link-rede")) {

        // Impede que o clique chegue ao document
        event.stopPropagation();

        // Deixa o navegador abrir o link normalmente
            return;
    }

        // Impede que o clique continue até o document,
        // evitando que o card seja fechado imediatamente.
        event.stopPropagation();

        // Se este card já está aberto,
        // não faz absolutamente nada.
        if (card.classList.contains("ativo")) {
            return;
        }

        // Fecha todos os cards
        cardsNetworking.forEach(c => c.classList.remove("ativo"));

        // Abre apenas o card clicado
        card.classList.add("ativo"); 

    });

});

// Quando clicar em qualquer lugar da página
document.addEventListener("click", () => {

    // Fecha todos os cards
    cardsNetworking.forEach(card => {
        card.classList.remove("ativo");
    });

});

// Proteção: se a biblioteca não carregar (internet instável, bloqueio, offline),
// cria uma versão "vazia" para o resto do código (inclusive o menu hambúrguer) continuar funcionando.
if (typeof ScrollReveal === 'undefined') {
    window.ScrollReveal = function () {
        return { reveal: function () {} };
    };
}

// Animação ScrollReveal
const sr = ScrollReveal({
    distance: '60px',
    duration: 900,
    delay: 100,
    easing: 'ease-out',
    reset: true,
    cleanup: true, // Faz que quando a animação termina, não influencie em animações como o hover
    mobile: false // MELHOR sem animação no Responsivo
                  // Daria para usar "if (window.innerWidth > 768)" se quiser ter mais controle por tamanho de tela, então veremos
});
sr.reveal('.universo-content', {
    origin: 'bottom'
});

sr.reveal('.titulo-principal', {
    origin: 'left'
});

sr.reveal('.espaciais', {
    origin: 'bottom'
});

sr.reveal('.engenharias', {
    origin: 'left'
});

sr.reveal('.exatas', {
    origin: 'right'
});

sr.reveal('.titulo-modalidades-container', {
    origin: 'top'
});

sr.reveal('.card-reveal-wrapper', {
    origin: 'bottom',
    interval: 100 // Faz os cards aparecerem em "cascata", um por um
});

/*  sr.reveal('.card-modalidade', {
    origin: 'bottom'
});  */

sr.reveal('.titulo-vestibular-container', {
    origin: 'left'
});

sr.reveal('.caixa-vestibular', {
    origin: 'right'
});

sr.reveal('.conteudo-mec', {
    origin: 'left'
});

sr.reveal('.cards-networking', {
    origin: 'bottom'
});

sr.reveal('.titulo-parcerias', {
    origin: 'top'
});

sr.reveal('.linha-parcerias', {
    origin: 'left',
    delay: 200
});

sr.reveal('.marquee', {
    origin: 'bottom'
});

sr.reveal('.block-left', {
    origin: 'left'
});

sr.reveal('.block-right', {
    origin: 'right'
});

sr.reveal('.block-center', {
    origin: 'left'
});

/* Caso queiramos deixar mais controlavel a questão de pixels pro mobile sem depender do (mobile: false) da biblioteca
if (window.innerWidth > 768) {

    const sr = ScrollReveal({
        distance: '60px',
        duration: 900,
        delay: 100,
        easing: 'ease-out',
        reset: true
    });

    sr.reveal('.universo-content', {
        origin: 'bottom'
    });

    sr.reveal('.titulo-principal', {
        origin: 'left'
    });

    sr.reveal('.espaciais', {
        origin: 'bottom'
    });

    sr.reveal('.engenharias', {
        origin: 'left'
    });

    sr.reveal('.exatas', {
        origin: 'right'
    });

    sr.reveal('.titulo-modalidades-container', {
        origin: 'top'
    });

    sr.reveal('.card-modalidade', {
        origin: 'bottom',
        interval: 200
    });

    sr.reveal('.titulo-vestibular-container', {
        origin: 'left'
    });

    sr.reveal('.caixa-vestibular', {
        origin: 'right'
    });

    sr.reveal('.conteudo-mec', {
        origin: 'left'
    });

    sr.reveal('.cards-networking', {
        origin: 'bottom'
    });

    sr.reveal('.container-parcerias', {
        origin: 'top'
    });

    sr.reveal('.marquee', {
        origin: 'bottom'
    });

} */

// ===============================================
// Caixa de pesquisa do cabeçalho
// ===============================================

const caixaPesquisa = document.getElementById("caixaPesquisa");
const overlay = document.getElementById("overlayPesquisa");
const fecharPesquisa = document.getElementById("fecharPesquisa");

const inputHeader = document.getElementById("pesquisa-header");

const listaHeader = document.querySelectorAll("#lista-header li");

const mensagemHeader = document.getElementById("mensagem-header");

const resultadoPesquisa = document.querySelector(".resultado-pesquisa");
const historicoHeader = document.getElementById("historico-header");

const painelPesquisa = document.querySelector(".painel-pesquisa");


// ===============================================
// Abrir pesquisa
// ===============================================

caixaPesquisa.addEventListener("click", () => {

    overlay.classList.add("ativo");

    // Trava o scroll da página enquanto a pesquisa está aberta
    document.body.style.overflow = "hidden";

    inputHeader.value = "";

    listaHeader.forEach(item => {

        item.style.display = "none";

    });

    mensagemHeader.style.display = "none";

    mostrarHistoricoHeader(); // Campo sempre abre vazio, então mostra o histórico

    // Foca o campo assim que a animação de abertura do painel terminar.
    // (transitionend é mais confiável que requestAnimationFrame aqui,
    // porque espera a transição CSS do painel realmente concluir)
    painelPesquisa.addEventListener("transitionend", function focarCampo() {
        inputHeader.focus();
        painelPesquisa.removeEventListener("transitionend", focarCampo);
    });

});


// ===============================================
// Fechar pesquisa
// ===============================================

fecharPesquisa.addEventListener("click", () => {

    overlay.classList.remove("ativo");

    // Libera o scroll da página de novo
    document.body.style.overflow = "";

});


// ===============================================
// Fechar clicando fora
// ===============================================

overlay.addEventListener("click", (e) => {

    if (e.target === overlay) {

        overlay.classList.remove("ativo");

        // Libera o scroll da página de novo
        document.body.style.overflow = "";

    }

});


// ==========================================================
// PESQUISA DA HERO (A DO MEIO DA TELA)
// ==========================================================

function filtrarHero(){

    const texto = inputPesquisa.value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"");

    if(texto === ""){

        itensLista.forEach(item => {

            item.style.display = "none";

        });

        mensagemVazia.style.display = "none";

        return;

    }

    let encontrados = 0;

    itensLista.forEach(item => {

        const nome = item.textContent
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g,"");

        if(nome.includes(texto)){

            item.style.display = "block";
            encontrados++;

        }else{

            item.style.display = "none";

        }

    });

    mensagemVazia.style.display =
        encontrados === 0 ? "block" : "none";

}


// ==========================================================
// PESQUISA DO CABEÇALHO
// ==========================================================

function filtrarHeader(){

    const texto = inputHeader.value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"");

    // Campo vazio
    if(texto === ""){

        listaHeader.forEach(item => {

            item.style.display = "none";

        });

        mensagemHeader.style.display = "none";

        mostrarHistoricoHeader();

        return;

    }

    esconderHistoricoHeader();

    resultadoPesquisa.style.display = "block";

    let encontrados = 0;

    listaHeader.forEach(item => {

        const nome = item.textContent
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g,"");

        if(nome.includes(texto)){

            item.style.display = "block";
            encontrados++;

        }else{

            item.style.display = "none";

        }

    });

    mensagemHeader.style.display =
        encontrados === 0 ? "block" : "none";

}


// ==========================================================
// Eventos
// ==========================================================

inputPesquisa.addEventListener("input", filtrarHero);

inputHeader.addEventListener("input", filtrarHeader);

// ===============================================
// Enter: se sobrou um único curso visível, entra nele direto
// ===============================================

inputPesquisa.addEventListener("keydown", (evento) => {

    if (evento.key !== "Enter") return;

    const visiveis = Array.from(itensLista).filter(item => item.style.display !== "none");

    if (visiveis.length === 1) {
        evento.preventDefault();
        visiveis[0].click(); // reaproveita o clique que já salva no histórico e redireciona
    }

});

inputHeader.addEventListener("keydown", (evento) => {

    if (evento.key !== "Enter") return;

    const visiveis = Array.from(listaHeader).filter(item => item.style.display !== "none");

    if (visiveis.length === 1) {
        evento.preventDefault();
        visiveis[0].click();
    }

});

// ===============================================
// Clique nos cursos do cabeçalho
// ===============================================

listaHeader.forEach(item => {

    item.addEventListener("click", () => {

        const urlDestino = item.getAttribute("data-url");

        salvarNoHistorico(item.textContent.trim());

        if (urlDestino) {

            window.location.href = urlDestino;

        }

    });

});


// ==========================================================
// HISTÓRICO DE PESQUISA
// ==========================================================

// Busca o histórico do usuário logado no servidor
async function carregarHistorico() {

    try {

        const resposta = await fetch("historico_cookie/listar_historico.php");

        // Sem consentimento de cookies o servidor bloqueia (403): histórico vazio
        if (!resposta.ok) return [];

        const dados = await resposta.json();
        return Array.isArray(dados) ? dados : [];

    } catch (erro) {

        console.error("Erro ao carregar histórico:", erro);
        return [];

    }

}

// Manda apagar um item específico (clique no X)
async function apagarHistorico(idHistorico) {

    try {

        await fetch("historico_cookie/apagar_historico.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "id_historico=" + encodeURIComponent(idHistorico)
        });

    } catch (erro) {

        console.error("Erro ao apagar item do histórico:", erro);

    }

}

// Salva um termo pesquisado (chamado ao escolher um curso)
async function salvarNoHistorico(termo) {

    if (!termo) return;

    try {

        await fetch("historico_cookie/salvar_historico.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "termo=" + encodeURIComponent(termo)
        });

    } catch (erro) {

        console.error("Erro ao salvar histórico:", erro);

    }

}

// Monta o elemento visual de UM item de histórico (relógio + texto + X)
function criarItemHistorico(item, aoSelecionar) {

    const linha = document.createElement("div");
    linha.className = "item-historico";

    linha.innerHTML = `
        <span class="icone-relogio"><i class="fa-regular fa-clock"></i></span>
        <span class="texto-historico"></span>
        <span class="botao-apagar-historico"><i class="fa-solid fa-xmark"></i></span>
    `;

    // textContent em vez de innerHTML, pra não correr risco de HTML
    // estranho vindo de um termo salvo
    linha.querySelector(".texto-historico").textContent = item.termo_pesquisado;

    linha.addEventListener("click", () => {
        aoSelecionar(item.termo_pesquisado);
    });

    const botaoApagar = linha.querySelector(".botao-apagar-historico");

    botaoApagar.addEventListener("click", async (evento) => {

        evento.stopPropagation(); // não deixa o clique "vazar" pro item e disparar a pesquisa

        await apagarHistorico(item.id_historico);

        const container = linha.parentElement;

        linha.remove();

        // Se apagou o último item, esconde a caixa do histórico
        if (container && container.children.length === 0) {
            container.style.display = "none";
        }

    });

    return linha;

}

// --- Histórico da barra de pesquisa grande (hero) ---

async function mostrarHistoricoHero() {

    itensLista.forEach(item => item.style.display = "none");
    mensagemVazia.style.display = "none";

    const historico = await carregarHistorico();

    historicoHero.innerHTML = "";

    if (historico.length === 0) {
        historicoHero.style.display = "none";
        return;
    }

    historico.forEach(item => {
        historicoHero.appendChild(criarItemHistorico(item, (termo) => {
            inputPesquisa.value = termo;
            esconderHistoricoHero();
            filtrarCursos();
        }));
    });

    historicoHero.style.display = "block";

}

function esconderHistoricoHero() {
    historicoHero.style.display = "none";
    historicoHero.innerHTML = "";
}

// --- Histórico da pesquisa do cabeçalho ---

async function mostrarHistoricoHeader() {

    listaHeader.forEach(item => item.style.display = "none");
    mensagemHeader.style.display = "none";

    const historico = await carregarHistorico();

    historicoHeader.innerHTML = "";

    if (historico.length === 0) {
        historicoHeader.style.display = "none";
        resultadoPesquisa.style.display = "none";
        return;
    }

    historico.forEach(item => {
        historicoHeader.appendChild(criarItemHistorico(item, (termo) => {
            inputHeader.value = termo;
            esconderHistoricoHeader();
            filtrarHeader();
        }));
    });

    historicoHeader.style.display = "block";
    resultadoPesquisa.style.display = "block";

}

function esconderHistoricoHeader() {
    historicoHeader.style.display = "none";
    historicoHeader.innerHTML = "";
}

// ==========================================================
// BANNER DE COOKIES
// ==========================================================

const bannerCookies = document.getElementById("bannerCookies");
const botaoAceitarCookies = document.getElementById("botaoAceitarCookies");
const botaoRejeitarCookies = document.getElementById("botaoRejeitarCookies");

// Envia a escolha ao PHP (aceitar_cookies.php ou rejeitar_cookies.php)
// e só esconde o banner se o servidor confirmar
async function enviarEscolhaCookies(urlPhp) {

    botaoAceitarCookies.disabled = true;
    botaoRejeitarCookies.disabled = true;

    try {

        const resposta = await fetch(urlPhp, { method: "POST" });
        const dados = await resposta.json();

        if (dados.sucesso) {

            bannerCookies.classList.add("saindo");
            setTimeout(() => bannerCookies.remove(), 400);
            return;

        }

    } catch (erro) {

        console.error("Erro ao registrar escolha de cookies:", erro);

    }

    botaoAceitarCookies.disabled = false;
    botaoRejeitarCookies.disabled = false;

}

if (bannerCookies && botaoAceitarCookies && botaoRejeitarCookies) {

    botaoAceitarCookies.addEventListener("click", () => enviarEscolhaCookies("historico_cookie/aceitar_cookies.php"));
    botaoRejeitarCookies.addEventListener("click", () => enviarEscolhaCookies("historico_cookie/rejeitar_cookies.php"));

}


/* ===========================
    Aviso do "Cadastre-se"
    O cadastro só abre pelo botão do e-mail enviado depois da matrícula.
   =========================== */
const linkCadastroHome   = document.getElementById("linkCadastroHome");
const avisoCadastro      = document.getElementById("avisoCadastro");
const fecharAvisoCadastro = document.getElementById("fecharAvisoCadastro");
const entendiAvisoCadastro = document.getElementById("entendiAvisoCadastro");
const verVestibularAviso = document.getElementById("verVestibularAviso");

function abrirAvisoCadastro() {
    avisoCadastro.classList.add("ativo");
    entendiAvisoCadastro.focus();
}

function fecharAvisoDoCadastro() {
    avisoCadastro.classList.remove("ativo");
}

if (linkCadastroHome && avisoCadastro) {

    linkCadastroHome.addEventListener("click", (evento) => {
        evento.preventDefault();
        abrirAvisoCadastro();
    });

    fecharAvisoCadastro.addEventListener("click", fecharAvisoDoCadastro);
    entendiAvisoCadastro.addEventListener("click", fecharAvisoDoCadastro);
    verVestibularAviso.addEventListener("click", fecharAvisoDoCadastro);

    // Clicar fora da caixa fecha
    avisoCadastro.addEventListener("click", (evento) => {
        if (evento.target === avisoCadastro) fecharAvisoDoCadastro();
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape" && avisoCadastro.classList.contains("ativo")) {
            fecharAvisoDoCadastro();
        }
    });

}


// O menu hambúrguer agora fica num <script> inline no fim do home.php (independente deste arquivo,
// para continuar funcionando mesmo se algo acima der erro ou o navegador usar um JS antigo em cache).