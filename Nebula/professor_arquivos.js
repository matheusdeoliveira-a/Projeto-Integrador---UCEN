// ==========================================================
// PORTAL DO PROFESSOR - ARQUIVOS
// Menu lateral + pesquisa (comuns) + lógica de arquivos (própria)
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
// ARQUIVOS
// ==========================================================

const iconesPorTipo = {
    pasta: "fa-folder",
    pdf: "fa-file-pdf",
    slide: "fa-file-powerpoint",
    atividade: "fa-file-lines",
    arquivo: "fa-file"
};

let minhasTurmas = [];    // [{id, sala, curso, turno}] vindas de professor_minhas_turmas.php

// Todo texto que veio do banco (nome de pasta/arquivo, turma) passa por aqui antes do innerHTML
function esc(texto) {
    return String(texto ?? "")
        .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

let ordemAtual = "desc";      // desc = mais recentes primeiro
let turmaAtual = null;        // id da turma que está sendo mostrada (a listagem é sempre de UMA turma)
let pastaAtual = null;        // id da pasta em que estamos navegando (null = raiz)

const lista = document.getElementById("lista-arquivos");
const btnOrdenar = document.getElementById("ordenar-btn");
const textoOrdem = document.getElementById("texto-ordem");
const breadcrumb = document.getElementById("breadcrumbArquivos");

// ==========================================================
// BUSCAR E RENDERIZAR (fala com arquivos_listar.php)
// ==========================================================

async function buscarArquivos() {

    if (turmaAtual === null) {
        lista.innerHTML = `<div class="sem-arquivos-msg">Você ainda não tem turmas atribuídas. Peça ao suporte para vincular suas turmas.</div>`;
        return;
    }

    lista.innerHTML = `<div class="carregando-arquivos-msg">Carregando...</div>`;

    const parametros = new URLSearchParams({
        id_turma: turmaAtual,
        pasta: pastaAtual ?? "",
        ordem: ordemAtual
    });

    try {

        const resposta = await fetch(`arquivos_crud/arquivos_listar.php?${parametros.toString()}`);
        const dados = await resposta.json();

        if (!dados.sucesso) {
            lista.innerHTML = `<div class="sem-arquivos-msg">Não foi possível carregar os arquivos.</div>`;
            mostrarToastArquivos(dados.mensagem || "Erro ao carregar os arquivos.", true);
            return;
        }

        renderizarBreadcrumb(dados.breadcrumb);
        renderizarItens(dados.itens);

    } catch (erro) {
        lista.innerHTML = `<div class="sem-arquivos-msg">Não foi possível carregar os arquivos.</div>`;
        mostrarToastArquivos("Erro de conexão ao carregar os arquivos.", true);
    }

}

function renderizarBreadcrumb(caminho) {

    breadcrumb.innerHTML = `<span data-id="">Início</span>`;

    caminho.forEach(pasta => {
        breadcrumb.innerHTML += `<i class="fa-solid fa-chevron-right" style="font-size:10px;"></i><span data-id="${pasta.id}">${esc(pasta.nome)}</span>`;
    });

    breadcrumb.querySelectorAll("span").forEach(span => {
        span.addEventListener("click", () => {
            const id = span.dataset.id;
            pastaAtual = id ? Number(id) : null;
            buscarArquivos();
        });
    });

}

function renderizarItens(itens) {

    lista.innerHTML = "";

    if (!itens.length) {
        lista.innerHTML = `<div class="sem-arquivos-msg">${pastaAtual ? "Esta pasta ainda não tem nada. Use os botões acima para adicionar." : "Nenhum arquivo nesta turma ainda. Use os botões acima para adicionar."}</div>`;
        return;
    }

    itens.forEach(item => {

        const div = document.createElement("div");
        div.className = "arquivo-item professor clicavel";

        const icone = iconesPorTipo[item.tipo] || "fa-file";
        const dataFormatada = item.data_criacao.split(" ")[0].split("-").reverse().join("/");

        div.innerHTML = `
            <div class="info-arquivo">
                <i class="fa-solid ${icone}"></i>
                <span>${esc(item.nome)}</span>
            </div>

            <div class="data-arquivo">
                ${dataFormatada}
            </div>

            <div class="professor-tag">
                ${esc(item.turma)}
            </div>

            <div class="acoes-arquivo">
                <button type="button" class="btn-icone-acao excluir" title="Excluir">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;

        div.querySelector(".info-arquivo").addEventListener("click", () => {
            if (item.tipo === "pasta") {
                pastaAtual = item.id;
                buscarArquivos();
            } else if (item.caminho) {
                window.open(`arquivos_crud/arquivos_abrir.php?id=${encodeURIComponent(item.id)}`, "_blank");
            }
        });

        div.querySelector(".btn-icone-acao.excluir").addEventListener("click", (e) => {
            e.stopPropagation();
            abrirModalExclusao(item.id, item.nome);
        });

        lista.appendChild(div);

    });

}

// ==========================================================
// MINHAS TURMAS (botões do topo + seletor de turma dos modais)
// Só aparecem as turmas que o suporte atribuiu ao professor.
// ==========================================================

const filtroContainer = document.getElementById("filtroTurmaArquivos");
const turmaNovaPasta = document.getElementById("turmaNovaPasta");
const turmaArquivo = document.getElementById("turmaArquivo");

// Mesmo texto do rotuloTurma() do PHP: "Sala 01 - Matutino"
function rotuloTurma(t) {
    return `${t.sala} - ${t.turno}`;
}

async function buscarTurmasDoProfessor() {

    try {

        const resposta = await fetch("professor_minhas_turmas.php");
        const dados = await resposta.json();

        if (dados.sucesso) minhasTurmas = dados.turmas;

    } catch (erro) {
        mostrarToastArquivos("Erro de conexão ao carregar suas turmas.", true);
    }

    // Turma inicial: a da URL (?turma=ID), se for do professor; senão, a primeira
    const idNaUrl = Number(new URLSearchParams(window.location.search).get("turma"));
    turmaAtual = minhasTurmas.find(t => t.id === idNaUrl)?.id ?? minhasTurmas[0]?.id ?? null;

    renderizarFiltroTurmas();
    renderizarOpcoesTurma();

}

function renderizarFiltroTurmas() {

    filtroContainer.innerHTML = "";

    minhasTurmas.forEach(turma => {

        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "btn-turma-notas" + (turma.id === turmaAtual ? " ativo" : "");
        botao.textContent = rotuloTurma(turma);

        botao.addEventListener("click", () => {
            turmaAtual = turma.id;
            pastaAtual = null;
            renderizarFiltroTurmas();
            buscarArquivos();
        });

        filtroContainer.appendChild(botao);

    });

}

// Preenche os seletores "Turma" dos dois modais
function renderizarOpcoesTurma() {

    [turmaNovaPasta, turmaArquivo].forEach(select => {

        select.innerHTML = "";

        minhasTurmas.forEach(turma => {
            const opcao = document.createElement("option");
            opcao.value = turma.id;
            opcao.textContent = rotuloTurma(turma);
            select.appendChild(opcao);
        });

        if (turmaAtual !== null) select.value = String(turmaAtual);

    });

}

// Ordenar por data
btnOrdenar?.addEventListener("click", () => {

    ordemAtual = ordemAtual === "desc" ? "asc" : "desc";

    textoOrdem.textContent = ordemAtual === "asc" ? "Ascendente" : "Descendente";
    btnOrdenar.classList.toggle("desc", ordemAtual === "desc");

    buscarArquivos();

});

// ==========================================================
// DESTINO NOS MODAIS
// Permite escolher a pasta (ou o Início) dentro do próprio modal,
// sem precisar entrar na pasta antes de criar/adicionar.
// ==========================================================

let pastasConhecidas = []; // preenchida via arquivos_todas_pastas.php (só da turma escolhida)

async function buscarPastas(idTurma) {

    pastasConhecidas = [];

    try {

        const resposta = await fetch(`arquivos_crud/arquivos_todas_pastas.php?id_turma=${encodeURIComponent(idTurma)}`);
        const dados = await resposta.json();

        if (dados.sucesso) pastasConhecidas = dados.pastas;

    } catch (erro) {
        // Se falhar, o select mostra só o Início e a pasta atual - o resto continua funcionando
    }

}

// Coloca as pastas em ordem de "árvore": cada pasta aparece logo abaixo da pasta-mãe
function ordenarPastasEmArvore(pastas) {

    const ids = new Set(pastas.map(p => p.id));
    const filhasPorPai = new Map();

    pastas.forEach(pasta => {
        const pai = (pasta.pasta_pai && ids.has(pasta.pasta_pai)) ? pasta.pasta_pai : null;
        if (!filhasPorPai.has(pai)) filhasPorPai.set(pai, []);
        filhasPorPai.get(pai).push(pasta);
    });

    const resultado = [];
    const visitadas = new Set();

    const descer = (pai, nivel) => {
        (filhasPorPai.get(pai) || [])
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
            .forEach(pasta => {
                if (visitadas.has(pasta.id)) return;
                visitadas.add(pasta.id);
                resultado.push({ pasta, nivel });
                descer(pasta.id, nivel + 1);
            });
    };

    descer(null, 0);

    return resultado;

}

// Monta as opções do select e já deixa marcada a pasta em que o professor está
async function montarSelectDestino(select, pastaSelecionada, idTurma) {

    await buscarPastas(idTurma);

    select.innerHTML = "";

    const opcaoInicio = document.createElement("option");
    opcaoInicio.value = "";
    opcaoInicio.dataset.nome = "Início";
    opcaoInicio.textContent = "Início (fora de qualquer pasta)";
    select.appendChild(opcaoInicio);

    ordenarPastasEmArvore(pastasConhecidas).forEach(({ pasta, nivel }) => {

        const opcao = document.createElement("option");
        opcao.value = pasta.id;
        opcao.dataset.nome = pasta.nome;

        // textContent: o nome foi digitado pelo professor, nunca interpretar como HTML
        const recuo = "\u00A0\u00A0\u00A0".repeat(nivel) + (nivel ? "└ " : "");
        opcao.textContent = recuo + pasta.nome;

        select.appendChild(opcao);

    });

    // Se a lista não veio (falha de conexão), mantém ao menos a pasta atual como opção
    if (pastaSelecionada && !select.querySelector(`option[value="${pastaSelecionada}"]`)) {
        const opcaoAtual = document.createElement("option");
        opcaoAtual.value = pastaSelecionada;
        opcaoAtual.dataset.nome = "pasta atual";
        opcaoAtual.textContent = "Pasta atual";
        select.appendChild(opcaoAtual);
    }

    select.value = pastaSelecionada ? String(pastaSelecionada) : "";

}

// A pasta de destino precisa ser da MESMA turma. Por isso, ao trocar a turma no modal,
// a lista de pastas é refeita só com as pastas daquela turma.
function ligarTurmaAoDestino(selectTurma, selectPasta) {
    selectTurma.addEventListener("change", () => {
        montarSelectDestino(selectPasta, null, Number(selectTurma.value));
    });
}

// Depois de salvar numa turma diferente da que está na tela, passa a mostrar essa turma
function acompanharTurma(idTurma) {
    if (idTurma && idTurma !== turmaAtual) {
        turmaAtual = idTurma;
        pastaAtual = null;
        renderizarFiltroTurmas();
    }
}

// Texto usado nos avisos: "em “Nome da pasta”" ou "no Início"
function descreverDestino(select) {
    const opcao = select.selectedOptions[0];
    return select.value ? `em “${opcao?.dataset.nome || "pasta"}”` : "no Início";
}

// ==========================================================
// MODAL: NOVA PASTA
// ==========================================================

const modalNovaPasta = document.getElementById("modalNovaPasta");
const btnNovaPasta = document.getElementById("btnNovaPasta");
const fecharModalPasta = document.getElementById("fecharModalPasta");
const formNovaPasta = document.getElementById("formNovaPasta");
const pastaPaiNovaPasta = document.getElementById("pastaPaiNovaPasta");

ligarTurmaAoDestino(turmaNovaPasta, pastaPaiNovaPasta);

btnNovaPasta?.addEventListener("click", async () => {
    if (turmaAtual === null) {
        mostrarToastArquivos("Você ainda não tem turmas atribuídas.", true);
        return;
    }
    turmaNovaPasta.value = String(turmaAtual);
    await montarSelectDestino(pastaPaiNovaPasta, pastaAtual, turmaAtual);
    modalNovaPasta.classList.add("ativo");
});

fecharModalPasta?.addEventListener("click", () => {
    modalNovaPasta.classList.remove("ativo");
});

modalNovaPasta?.addEventListener("click", (e) => {
    if (e.target === modalNovaPasta) modalNovaPasta.classList.remove("ativo");
});

formNovaPasta?.addEventListener("submit", async (e) => {

    e.preventDefault();

    const dadosForm = new FormData(formNovaPasta);
    const destino = descreverDestino(pastaPaiNovaPasta);

    try {

        const resposta = await fetch("arquivos_crud/arquivos_nova_pasta.php", {
            method: "POST",
            body: dadosForm
        });
        const dados = await resposta.json();

        if (dados.sucesso) {
            acompanharTurma(Number(dadosForm.get("id_turma")));
            formNovaPasta.reset();
            modalNovaPasta.classList.remove("ativo");
            buscarArquivos();
            mostrarToastArquivos(`Pasta criada ${destino}.`);
        } else {
            mostrarToastArquivos(dados.mensagem || "Não foi possível criar a pasta.", true);
        }

    } catch (erro) {
        mostrarToastArquivos("Erro de conexão ao criar a pasta.", true);
    }

});

// ==========================================================
// MODAL: ADICIONAR ARQUIVO
// ==========================================================

const modalAdicionarArquivo = document.getElementById("modalAdicionarArquivo");
const btnAdicionarArquivo = document.getElementById("btnAdicionarArquivo");
const fecharModalArquivo = document.getElementById("fecharModalArquivo");
const formAdicionarArquivo = document.getElementById("formAdicionarArquivo");
const pastaPaiArquivo = document.getElementById("pastaPaiArquivo");

ligarTurmaAoDestino(turmaArquivo, pastaPaiArquivo);

btnAdicionarArquivo?.addEventListener("click", async () => {
    if (turmaAtual === null) {
        mostrarToastArquivos("Você ainda não tem turmas atribuídas.", true);
        return;
    }
    turmaArquivo.value = String(turmaAtual);
    await montarSelectDestino(pastaPaiArquivo, pastaAtual, turmaAtual);
    modalAdicionarArquivo.classList.add("ativo");
});

fecharModalArquivo?.addEventListener("click", () => {
    modalAdicionarArquivo.classList.remove("ativo");
});

modalAdicionarArquivo?.addEventListener("click", (e) => {
    if (e.target === modalAdicionarArquivo) modalAdicionarArquivo.classList.remove("ativo");
});

formAdicionarArquivo?.addEventListener("submit", async (e) => {

    e.preventDefault();

    const dadosForm = new FormData(formAdicionarArquivo);
    const destino = descreverDestino(pastaPaiArquivo);
    const botaoEnviar = formAdicionarArquivo.querySelector("button[type='submit']");
    const textoOriginalBotao = botaoEnviar.innerHTML;

    botaoEnviar.disabled = true;
    botaoEnviar.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Enviando...`;

    try {

        const resposta = await fetch("arquivos_crud/arquivos_upload.php", {
            method: "POST",
            body: dadosForm
        });
        const dados = await resposta.json();

        if (dados.sucesso) {
            acompanharTurma(Number(dadosForm.get("id_turma")));
            formAdicionarArquivo.reset();
            modalAdicionarArquivo.classList.remove("ativo");
            buscarArquivos();
            mostrarToastArquivos(`Arquivo adicionado ${destino}.`);
        } else {
            mostrarToastArquivos(dados.mensagem || "Não foi possível enviar o arquivo.", true);
        }

    } catch (erro) {
        mostrarToastArquivos("Erro de conexão ao enviar o arquivo.", true);
    } finally {
        botaoEnviar.disabled = false;
        botaoEnviar.innerHTML = textoOriginalBotao;
    }

});

// ==========================================================
// MODAL: CONFIRMAR EXCLUSÃO (substitui o confirm() nativo)
// ==========================================================

const modalConfirmarExclusao = document.getElementById("modalConfirmarExclusao");
const textoConfirmarExclusao = document.getElementById("textoConfirmarExclusao");
const fecharModalExclusao = document.getElementById("fecharModalExclusao");
const cancelarExclusao = document.getElementById("cancelarExclusao");
const confirmarExclusao = document.getElementById("confirmarExclusao");

let itemParaExcluir = null;

function abrirModalExclusao(id, nome) {
    itemParaExcluir = id;
    textoConfirmarExclusao.textContent = `Tem certeza que deseja excluir "${nome}"? Se for uma pasta, tudo que está dentro dela também será apagado.`;
    modalConfirmarExclusao.classList.add("ativo");
}

function fecharModalConfirmacao() {
    itemParaExcluir = null;
    modalConfirmarExclusao.classList.remove("ativo");
}

fecharModalExclusao?.addEventListener("click", fecharModalConfirmacao);
cancelarExclusao?.addEventListener("click", fecharModalConfirmacao);

modalConfirmarExclusao?.addEventListener("click", (e) => {
    if (e.target === modalConfirmarExclusao) fecharModalConfirmacao();
});

confirmarExclusao?.addEventListener("click", async () => {

    if (!itemParaExcluir) return;

    const dadosForm = new FormData();
    dadosForm.append("id", itemParaExcluir);

    try {

        const resposta = await fetch("arquivos_crud/arquivos_excluir.php", {
            method: "POST",
            body: dadosForm
        });
        const dados = await resposta.json();

        fecharModalConfirmacao();

        if (dados.sucesso) {
            buscarArquivos();
            mostrarToastArquivos("Item excluído com sucesso.");
        } else {
            mostrarToastArquivos(dados.mensagem || "Não foi possível excluir o item.", true);
        }

    } catch (erro) {
        fecharModalConfirmacao();
        mostrarToastArquivos("Erro de conexão ao excluir o item.", true);
    }

});

// ==========================================================
// TOAST DE CONFIRMAÇÃO (substitui alert())
// ==========================================================

let toastArquivosTimer = null;

function mostrarToastArquivos(mensagem, erro = false) {

    let toast = document.getElementById("toastArquivos");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toastArquivos";
        toast.className = "toast-arquivos";
        document.body.appendChild(toast);
    }

    toast.textContent = mensagem;
    toast.classList.toggle("erro", erro);
    toast.classList.add("ativo");

    clearTimeout(toastArquivosTimer);
    toastArquivosTimer = setTimeout(() => {
        toast.classList.remove("ativo");
    }, 2600);

}

// ==========================================================
// INICIALIZAÇÃO
// Busca as turmas do professor (monta os botões e os seletores dos
// modais) e, em seguida, a lista da turma escolhida. Se a página foi
// aberta com ?turma=ID, já abre nessa turma.
// ==========================================================

(async function iniciarArquivos() {
    await buscarTurmasDoProfessor();
    buscarArquivos();
})();
