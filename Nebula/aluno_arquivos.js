// ==========================================================
// PORTAL DO ALUNO - ARQUIVOS
// Menu lateral + pesquisa expansível (comuns) + arquivos (somente leitura)
// Os arquivos são os que os professores enviaram (arquivos_professor).
// ==========================================================

// MENU LATERAL
const menu = document.getElementById("menu");
const botaoMenu = document.getElementById("botaoMenuFechar");

botaoMenu?.addEventListener("click", () => {
    menu.classList.toggle("aberto");
});

document.addEventListener("click", (e) => {
    if (menu?.classList.contains("aberto") && !menu.contains(e.target)) {
        menu.classList.remove("aberto");
    }
});

// PESQUISA EXPANSÍVEL
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
    listaHeader.forEach(item => item.style.display = "none");
    mensagemHeader.style.display = "none";
    setTimeout(() => inputHeader.focus(), 50);
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
        listaHeader.forEach(item => item.style.display = "none");
        mensagemHeader.style.display = "none";
        return;
    }

    resultadoPesquisa.style.display = "block";
    let encontrados = 0;

    listaHeader.forEach(item => {
        // normaliza o texto do item também, para "Calendario" achar "Calendário"
        const nome = item.textContent
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

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
// ARQUIVOS (SOMENTE LEITURA)
// Mesma lógica do portal do professor, sem criar, enviar ou excluir.
// ==========================================================

// Pasta dos PHPs (só dos endpoints). Os arquivos enviados ficam em
// uploads/professor_arquivos/ na raiz do site; o campo "caminho" do banco
// já é relativo à página, igual ao que o portal do professor usa.
const PASTA_PHP = "arquivos_crud/";

const iconesPorTipo = {
    pasta: "fa-folder",
    pdf: "fa-file-pdf",
    slide: "fa-file-powerpoint",
    atividade: "fa-file-lines",
    arquivo: "fa-file"
};

let ordemAtual = "desc";   // desc = mais recentes primeiro
let filtroAtual = "todas";
let pastaAtual = null;     // id da pasta atual (null = raiz)

const lista = document.getElementById("lista-arquivos");
const btnOrdenar = document.getElementById("ordenar-btn");
const textoOrdem = document.getElementById("texto-ordem");
const breadcrumb = document.getElementById("breadcrumbArquivos");
const filtroContainer = document.getElementById("filtroTurmaArquivos");

// Mostra uma mensagem simples na lista (carregando, vazio, erro)
function mostrarMensagemLista(texto, classe) {
    lista.innerHTML = "";
    const div = document.createElement("div");
    div.className = classe;
    div.textContent = texto;
    lista.appendChild(div);
}

// Busca no servidor; sem sessão, volta para o login
async function buscarJSON(url) {
    const resposta = await fetch(url);

    if (resposta.status === 401) {
        window.location.href = "login.html";
        return null;
    }

    return resposta.json();
}

// ==========================================================
// BUSCAR E RENDERIZAR (fala com arquivos_listar_aluno.php)
// ==========================================================

async function buscarArquivos() {

    mostrarMensagemLista("Carregando...", "carregando-arquivos-msg");

    const parametros = new URLSearchParams({
        pasta: pastaAtual ?? "",
        turma: filtroAtual,
        ordem: ordemAtual
    });

    try {

        const dados = await buscarJSON(`${PASTA_PHP}arquivos_listar_aluno.php?${parametros}`);

        if (!dados) return;

        if (!dados.sucesso) {
            mostrarMensagemLista("Não foi possível carregar os arquivos.", "sem-arquivos-msg");
            return;
        }

        renderizarBreadcrumb(dados.breadcrumb);
        renderizarItens(dados.itens);

    } catch (erro) {
        console.error("Erro ao carregar arquivos:", erro);
        mostrarMensagemLista("Não foi possível carregar os arquivos.", "sem-arquivos-msg");
    }

}

function renderizarBreadcrumb(caminho) {

    breadcrumb.innerHTML = "";

    const criarItem = (id, nome) => {
        const span = document.createElement("span");
        span.dataset.id = id;
        span.textContent = nome; // textContent: o nome foi digitado pelo professor
        span.addEventListener("click", () => {
            pastaAtual = id ? Number(id) : null;
            buscarArquivos();
        });
        return span;
    };

    breadcrumb.appendChild(criarItem("", "Início"));

    caminho.forEach(pasta => {
        const seta = document.createElement("i");
        seta.className = "fa-solid fa-chevron-right";
        seta.style.fontSize = "10px";
        breadcrumb.appendChild(seta);
        breadcrumb.appendChild(criarItem(pasta.id, pasta.nome));
    });

}

function renderizarItens(itens) {

    lista.innerHTML = "";

    if (!itens.length) {
        mostrarMensagemLista(
            pastaAtual ? "Esta pasta ainda não tem nada." : "Nenhum arquivo encontrado para este filtro.",
            "sem-arquivos-msg"
        );
        return;
    }

    itens.forEach(item => {

        const div = document.createElement("div");
        div.className = "arquivo-item com-acoes clicavel";

        // SEGURANÇA: nome e turma foram digitados por outra pessoa (o professor).
        // Por isso usamos textContent (nunca innerHTML) para eles.
        const info = document.createElement("div");
        info.className = "info-arquivo";

        const icone = document.createElement("i");
        icone.className = `fa-solid ${iconesPorTipo[item.tipo] || "fa-file"}`;

        const nome = document.createElement("span");
        nome.textContent = item.nome;

        info.append(icone, nome);

        const data = document.createElement("div");
        data.className = "data-arquivo";
        data.textContent = item.data_criacao.split(" ")[0].split("-").reverse().join("/");

        const turma = document.createElement("div");
        turma.className = "professor-tag";
        turma.textContent = item.turma;

        // Coluna de ações: baixar (arquivo ou pasta inteira em .zip)
        const acoes = document.createElement("div");
        acoes.className = "acoes-arquivo";

        const btnBaixar = document.createElement("a");
        btnBaixar.className = "btn-icone-acao baixar";
        btnBaixar.href = `${PASTA_PHP}arquivos_baixar_aluno.php?id=${encodeURIComponent(item.id)}`;
        btnBaixar.target = "_blank";
        btnBaixar.rel = "noopener";
        btnBaixar.title = item.tipo === "pasta" ? "Baixar pasta (.zip)" : "Baixar arquivo";
        btnBaixar.setAttribute("aria-label", btnBaixar.title);

        const iconeBaixar = document.createElement("i");
        iconeBaixar.className = "fa-solid fa-download";
        btnBaixar.appendChild(iconeBaixar);

        // Clicar em baixar não deve abrir a pasta nem o arquivo da linha
        btnBaixar.addEventListener("click", (e) => e.stopPropagation());

        acoes.appendChild(btnBaixar);

        div.append(info, data, turma, acoes);

        div.addEventListener("click", () => {
            if (item.tipo === "pasta") {
                pastaAtual = item.id;
                buscarArquivos();
            } else if (item.caminho) {
                window.open(`${PASTA_PHP}arquivos_abrir.php?id=${encodeURIComponent(item.id)}`, "_blank", "noopener");
            }
        });

        lista.appendChild(div);

    });

}

// ==========================================================
// FILTRO POR TURMA (botões do topo)
// ==========================================================

async function buscarTurmasDisponiveis() {

    try {

        const dados = await buscarJSON(`${PASTA_PHP}arquivos_turmas_aluno.php`);

        if (dados?.sucesso) renderizarFiltroTurmas(dados.turmas);

    } catch (erro) {
        // Se falhar, ficam só os botões "Todas as turmas"; o resto continua funcionando
        console.error("Erro ao carregar turmas:", erro);
    }

}

function renderizarFiltroTurmas(turmas) {

    const botaoTodas = filtroContainer.querySelector('[data-filtro-turma="todas"]');

    filtroContainer.innerHTML = "";
    filtroContainer.appendChild(botaoTodas);

    turmas.forEach(turma => {

        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "btn-turma-notas";
        botao.dataset.filtroTurma = turma;
        botao.textContent = turma;

        filtroContainer.appendChild(botao);

    });

    filtroContainer.querySelectorAll("[data-filtro-turma]").forEach(botao => {

        botao.classList.toggle("ativo", botao.dataset.filtroTurma === filtroAtual);

        botao.addEventListener("click", () => {

            filtroContainer.querySelectorAll("[data-filtro-turma]").forEach(b => b.classList.remove("ativo"));
            botao.classList.add("ativo");

            filtroAtual = botao.dataset.filtroTurma;
            pastaAtual = null;
            buscarArquivos();

        });

    });

}

// ==========================================================
// ORDENAR POR DATA (alterna entre mais recentes e mais antigos)
// ==========================================================

btnOrdenar?.addEventListener("click", () => {

    ordemAtual = ordemAtual === "desc" ? "asc" : "desc";

    textoOrdem.textContent = ordemAtual === "desc" ? "Mais recentes" : "Mais antigos";
    btnOrdenar.classList.toggle("desc", ordemAtual === "desc");

    buscarArquivos();

});

// ==========================================================
// INICIALIZAÇÃO
// Se a página foi aberta com ?turma=X, já abre filtrada.
// ==========================================================

const turmaNaUrl = new URLSearchParams(window.location.search).get("turma");

if (turmaNaUrl) {
    filtroAtual = turmaNaUrl;
}

buscarTurmasDisponiveis();
buscarArquivos();