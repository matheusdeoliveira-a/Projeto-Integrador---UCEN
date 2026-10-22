// ==========================================================
// PORTAL DO PROFESSOR - MINHAS TURMAS
// Menu lateral + pesquisa (comuns) + lógica de turmas (própria)
// ==========================================================

// ==========================================
// ABRIR / FECHAR MENU LATERAL
// ==========================================

const menu = document.getElementById("menu");
const botaoMenu = document.getElementById("botaoMenuFechar");

botaoMenu?.addEventListener("click", function () {
    menu.classList.toggle("aberto");
});

document.addEventListener("click", function (evento) {
    if (
        menu.classList.contains("aberto") &&
        !menu.contains(evento.target)
    ) {
        menu.classList.remove("aberto");
    }
});

// ===============================================
// CAIXA DE PESQUISA DO CABEÇALHO
// ===============================================

const caixaPesquisa = document.getElementById("caixaPesquisa");
const overlay = document.getElementById("overlayPesquisa");
const fecharPesquisa = document.getElementById("fecharPesquisa");

const inputHeader = document.getElementById("pesquisa-header");
const listaHeader = document.querySelectorAll("#lista-header li");

const mensagemHeader = document.getElementById("mensagem-header");
const resultadoPesquisa = document.querySelector(".resultado-pesquisa");

caixaPesquisa?.addEventListener("click", () => {
    overlay.classList.add("ativo");
    document.body.style.overflow = "hidden";
    inputHeader.value = "";
    resultadoPesquisa.style.display = "none";
    listaHeader.forEach(item => { item.style.display = "none"; });
    mensagemHeader.style.display = "none";
    setTimeout(() => { inputHeader.focus(); }, 50);
});

fecharPesquisa?.addEventListener("click", () => {
    overlay.classList.remove("ativo");
    document.body.style.overflow = "auto";
});

overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) {
        overlay.classList.remove("ativo");
        document.body.style.overflow = "auto";
    }
});

inputHeader?.addEventListener("input", () => {

    const texto = inputHeader.value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    if (texto === "") {
        resultadoPesquisa.style.display = "none";
        listaHeader.forEach(item => { item.style.display = "none"; });
        mensagemHeader.style.display = "none";
        return;
    }

    resultadoPesquisa.style.display = "block";

    let encontrados = 0;

    listaHeader.forEach(item => {
        const nome = item.textContent.toLowerCase();
        if (nome.includes(texto)) {
            item.style.display = "block";
            encontrados++;
        } else {
            item.style.display = "none";
        }
    });

    mensagemHeader.style.display = encontrados === 0 ? "block" : "none";

});

listaHeader.forEach(item => {
    item.addEventListener("click", () => {
        const url = item.getAttribute("data-url");
        if (url) window.location.href = url;
    });
});

// ==========================================================
// MINHAS TURMAS
// Dados reais: só as turmas que o suporte atribuiu ao professor logado
// (professor_minhas_turmas.php), cada uma com os alunos matriculados.
// ==========================================================

let turmasProfessor = [];

const listaTurmas = document.getElementById("listaTurmas");
const avisoSemTurmas = document.getElementById("avisoSemTurmas");
const detalheTurma = document.getElementById("detalheTurma");
const btnVoltarTurmas = document.getElementById("btnVoltarTurmas");

const tituloTurmaDetalhe = document.getElementById("tituloTurmaDetalhe");
const subtituloTurmaDetalhe = document.getElementById("subtituloTurmaDetalhe");
const statAlunosTurma = document.getElementById("statAlunosTurma");
const listaAlunosTurma = document.getElementById("listaAlunosTurma");

function esc(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderCardsTurmas() {

    document.getElementById("statTotalTurmas").textContent = turmasProfessor.length;
    document.getElementById("statTotalAlunos").textContent =
        turmasProfessor.reduce((soma, t) => soma + t.alunos.length, 0);

    if (turmasProfessor.length === 0) {
        listaTurmas.innerHTML = "";
        avisoSemTurmas.textContent = "Você ainda não tem turmas atribuídas. Procure o suporte para definir as suas salas e turmas.";
        avisoSemTurmas.style.display = "block";
        return;
    }

    avisoSemTurmas.style.display = "none";

    listaTurmas.innerHTML = turmasProfessor.map(t => `
        <div class="card-turma" data-turma="${t.id}">
            <span class="semestre-tag">${esc(t.turno)}</span>
            <h3>${esc(t.sala)} · ${esc(t.curso)}</h3>
            <div class="detalhes-card-turma">
                <span><i class="fa-solid fa-users"></i>${t.alunos.length} ${t.alunos.length === 1 ? "aluno matriculado" : "alunos matriculados"}</span>
                <span><i class="fa-solid fa-door-open"></i>${esc(t.sala)}</span>
                <span><i class="fa-solid fa-clock"></i>Turno ${esc(t.turno.toLowerCase())}</span>
            </div>
            <div class="rodape-card-turma">
                <button type="button" class="btn-entrar-turma">Entrar na turma</button>
            </div>
        </div>`).join("");
}

function abrirTurma(idTurma) {

    const turma = turmasProfessor.find(t => String(t.id) === String(idTurma));
    if (!turma) return;

    tituloTurmaDetalhe.textContent = turma.curso;
    subtituloTurmaDetalhe.textContent = `${turma.sala} · Turno ${turma.turno.toLowerCase()}`;
    statAlunosTurma.textContent = turma.alunos.length;

    listaAlunosTurma.innerHTML = turma.alunos.length === 0
        ? '<li class="aluno-vazio">Nenhum aluno matriculado nesta turma ainda.</li>'
        : turma.alunos.map(a => `<li><span>${esc(a.nome)}</span>${a.confirmada ? "" : '<small class="aluno-pendente">Aguardando pagamento</small>'}</li>`).join("");

    // Sempre volta para a aba "Visão Geral" ao abrir uma turma
    document.querySelectorAll(".btn-opcao[data-aba-turma]").forEach(b => b.classList.remove("ativo"));
    document.querySelector('.btn-opcao[data-aba-turma="visao"]')?.classList.add("ativo");
    document.querySelectorAll(".conteudo-aba-turma").forEach(c => c.classList.remove("ativo"));
    document.querySelector('.conteudo-aba-turma[data-conteudo-aba="visao"]')?.classList.add("ativo");

    listaTurmas.classList.add("escondido");
    detalheTurma.classList.add("ativo");

    window.scrollTo({ top: 0, behavior: "smooth" });

}

function fecharTurma() {
    detalheTurma.classList.remove("ativo");
    listaTurmas.classList.remove("escondido");
}

// Clique em um card da listagem abre o detalhe da turma
listaTurmas.addEventListener("click", (evento) => {
    const card = evento.target.closest(".card-turma");
    if (card) abrirTurma(card.dataset.turma);
});

// Botão "Voltar para Minhas Turmas"
btnVoltarTurmas?.addEventListener("click", fecharTurma);

// Alternar abas dentro do detalhe da turma (Visão Geral / Arquivos / Notas / Agenda)
document.querySelectorAll(".btn-opcao[data-aba-turma]").forEach(botao => {
    botao.addEventListener("click", () => {

        const alvo = botao.dataset.abaTurma;

        document.querySelectorAll(".btn-opcao[data-aba-turma]").forEach(b => b.classList.remove("ativo"));
        botao.classList.add("ativo");

        document.querySelectorAll(".conteudo-aba-turma").forEach(c => c.classList.remove("ativo"));
        document.querySelector(`.conteudo-aba-turma[data-conteudo-aba="${alvo}"]`)?.classList.add("ativo");

    });
});

async function carregarTurmasProfessor() {

    try {

        const resposta = await fetch("professor_minhas_turmas.php");
        const dados = await resposta.json();

        if (!dados.sucesso) {
            avisoSemTurmas.textContent = dados.mensagem || "Não foi possível carregar as suas turmas.";
            avisoSemTurmas.style.display = "block";
            return;
        }

        turmasProfessor = dados.turmas;

    } catch (erro) {

        console.error("Erro ao carregar as turmas:", erro);
        avisoSemTurmas.textContent = "Não foi possível conectar ao servidor.";
        avisoSemTurmas.style.display = "block";
        return;

    }

    renderCardsTurmas();

    // Se a página foi aberta com ?turma=ID (vindo do Início, por exemplo), já abre a turma
    const turmaNaUrl = new URLSearchParams(window.location.search).get("turma");
    if (turmaNaUrl) abrirTurma(turmaNaUrl);

}

carregarTurmasProfessor();
