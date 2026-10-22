// ==========================================================
// PORTAL DO SUPORTE - INÍCIO
// Menu lateral + pesquisa do cabeçalho (comuns a todas as páginas)
// ==========================================================

// ==========================================
// ABRIR / FECHAR MENU LATERAL
// ==========================================

const menu = document.getElementById("menu");
const botaoMenu = document.getElementById("botaoMenuFechar");

botaoMenu?.addEventListener("click", function () {
    menu.classList.toggle("aberto");
});

// Fechar ao clicar fora do menu
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

// Abrir pesquisa
caixaPesquisa?.addEventListener("click", () => {

    overlay.classList.add("ativo");
    document.body.style.overflow = "hidden";

    inputHeader.value = "";
    resultadoPesquisa.style.display = "none";

    listaHeader.forEach(item => {
        item.style.display = "none";
    });

    mensagemHeader.style.display = "none";

    setTimeout(() => {
        inputHeader.focus();
    }, 50);

});

// Fechar pesquisa
fecharPesquisa?.addEventListener("click", () => {
    overlay.classList.remove("ativo");
    document.body.style.overflow = "auto";
});

// Fechar clicando fora
overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) {
        overlay.classList.remove("ativo");
        document.body.style.overflow = "auto";
    }
});

// Filtrar itens da pesquisa
inputHeader?.addEventListener("input", () => {

    const texto = inputHeader.value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    if (texto === "") {
        resultadoPesquisa.style.display = "none";
        listaHeader.forEach(item => {
            item.style.display = "none";
        });
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

// Clique em um item da pesquisa navega para a página correspondente
listaHeader.forEach(item => {
    item.addEventListener("click", () => {
        const url = item.getAttribute("data-url");
        if (url) {
            window.location.href = url;
        }
    });
});


// ===============================================
// NÚMEROS E CHAMADOS RECENTES (VÊM DO BANCO)
// ===============================================
// Busca em suporte_inicio_crud/suporte_inicio_resumo.php.
// O servidor devolve null para o que o operador não tem permissão de ver;
// nesse caso o card mostra "—" e a lista de chamados some.

const statAlunos = document.getElementById("statAlunos");
const statProfessores = document.getElementById("statProfessores");
const statChamados = document.getElementById("statChamados");
const secaoChamados = document.getElementById("secaoChamadosRecentes");
const listaChamados = document.getElementById("listaChamadosRecentes");

const CLASSE_STATUS = {
    "Pendente": "pendente",
    "Em andamento": "andamento",
    "Respondido": "respondido"
};

function mostrarNumero(elemento, valor) {
    if (!elemento) return;
    elemento.textContent = (typeof valor === "number")
        ? valor.toLocaleString("pt-BR")
        : "—";
}

function mensagemNaLista(texto) {
    if (!listaChamados) return;
    listaChamados.replaceChildren();

    const linha = document.createElement("div");
    linha.className = "linha-chamado";
    const info = document.createElement("div");
    info.className = "info-chamado";
    const span = document.createElement("span");
    span.textContent = texto;

    info.appendChild(span);
    linha.appendChild(info);
    listaChamados.appendChild(linha);
}

// Nome e assunto vêm de formulários públicos: entram só como TEXTO (nunca innerHTML)
function desenharChamados(recentes) {
    if (!listaChamados) return;

    if (!recentes.length) {
        mensagemNaLista("Nenhum chamado ainda.");
        return;
    }

    listaChamados.replaceChildren();

    recentes.forEach(c => {
        const linha = document.createElement("div");
        linha.className = "linha-chamado";

        const info = document.createElement("div");
        info.className = "info-chamado";

        const nome = document.createElement("strong");
        nome.textContent = c.nome || "Sem nome";

        const detalhe = document.createElement("span");
        detalhe.textContent = (c.assunto || "Sem assunto") + " · " + c.quando;

        info.append(nome, detalhe);

        const badge = document.createElement("span");
        badge.className = "badge-chamado " + (CLASSE_STATUS[c.status] || "");
        badge.textContent = c.status;

        linha.append(info, badge);
        listaChamados.appendChild(linha);
    });
}

async function carregarResumoInicio() {
    try {
        const resposta = await fetch("suporte_inicio_crud/suporte_inicio_resumo.php");
        const json = await resposta.json();

        if (!json.sucesso) throw new Error(json.mensagem || "Falha ao carregar");

        mostrarNumero(statAlunos, json.alunos);
        mostrarNumero(statProfessores, json.professores);

        if (json.chamados) {
            mostrarNumero(statChamados, json.chamados.pendentes);
            desenharChamados(json.chamados.recentes);
        } else {
            mostrarNumero(statChamados, null);
            if (secaoChamados) secaoChamados.style.display = "none";
        }

    } catch (erro) {
        console.error("Não foi possível carregar o painel:", erro);
        mostrarNumero(statAlunos, null);
        mostrarNumero(statProfessores, null);
        mostrarNumero(statChamados, null);
        mensagemNaLista("Não foi possível carregar os chamados.");
    }
}

carregarResumoInicio();