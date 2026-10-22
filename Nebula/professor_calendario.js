// ==========================================================
// PORTAL DO PROFESSOR - CALENDÁRIO
// Menu lateral + pesquisa (comuns) + lógica do calendário (própria)
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
// CALENDÁRIO
// ==========================================================

// Cache dos eventos do MÊS atualmente exibido.
// Agora vêm do banco (via fetch), não são mais criados só no navegador.
let eventosAcademicos = [];

// NOVO: o calendário abre no mês real de hoje (antes estava fixo em novembro de 2026).
// O dia fica sempre 1 para o setMonth() do modal anual não "pular" de mês.
const hoje = new Date();
let dataAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

const mesesNomes = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

const modalAnual = document.getElementById("modal-visao-anual");
const tituloMesAno = document.getElementById("mes-ano-titulo");
const fecharModalBtn = document.getElementById("fechar-modal-anual");
const gradeDias = document.getElementById("grade-dias");
const listaEventos = document.getElementById("lista-eventos");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");

// Busca no servidor os eventos do mês/ano informados
async function carregarEventosDoMes(ano, mes) {
    try {
        // mes + 1 porque no JS os meses são 0-11, mas no banco/URL usamos 1-12
        const resposta = await fetch(`calendario_crud/calendario_listar.php?ano=${ano}&mes=${mes + 1}`);
        const dados = await resposta.json();
        eventosAcademicos = Array.isArray(dados) ? dados : [];
    } catch (erro) {
        console.error("Erro ao carregar eventos do calendário:", erro);
        eventosAcademicos = [];
    }
}

// Monta a grade de dias do mês exibido, junto com os eventos do mês
async function renderizarCalendario() {

    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth();

    // NOVO: o título aparece na hora (antes esperava a resposta do servidor e mostrava o texto antigo do HTML)
    tituloMesAno.textContent = `${mesesNomes[mes]} de ${ano}`;

    await carregarEventosDoMes(ano, mes);

    const primeiroDia = new Date(ano, mes, 1).getDay();
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();
    const ultimoAnterior = new Date(ano, mes, 0).getDate();

    gradeDias.innerHTML = "";

    // Dias do mês anterior (preenchimento)
    for (let i = primeiroDia; i > 0; i--) {
        const div = document.createElement("div");
        div.className = "dia-num outro-mes";
        div.textContent = ultimoAnterior - i + 1;
        gradeDias.appendChild(div);
    }

    // Dias do mês atual
    for (let dia = 1; dia <= ultimoDia; dia++) {

        const div = document.createElement("div");
        div.className = "dia-num";

        const data = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

                const diaSemana = new Date(ano, mes, dia).getDay();
        const ehDomingo = diaSemana === 0;
        const ehSabado = diaSemana === 6;
        const ehFimDeSemana = ehDomingo || ehSabado;

        if (ehDomingo) div.classList.add("domingo");
        if (ehSabado) div.classList.add("sabado");
        if (eventosAcademicos.some(e => e.data === data)) div.classList.add("com-evento");

        // destaca o dia de hoje
        if (dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()) {
            div.classList.add("hoje");
        }

        div.textContent = dia;

        // fim de semana não aceita atividades (o servidor também deve recusar)
        if (ehFimDeSemana) {
            const nomeDia = ehDomingo ? "aos domingos" : "aos sábados";
            div.title = `Não é possível agendar atividades ${nomeDia}`;
            div.addEventListener("click", () => {
                mostrarToastCalendario(`Não é possível agendar atividades ${nomeDia}`);
            });
        } else {
            div.title = "Adicionar atividade neste dia";
            div.addEventListener("click", () => abrirModalEvento(data, dia, mes, ano));
        }

        gradeDias.appendChild(div);

    }

    // Completa a grade com os dias do próximo mês
    const usados = primeiroDia + ultimoDia;
    const faltam = usados > 35 ? 42 - usados : 35 - usados;

    for (let i = 1; i <= faltam; i++) {
        const div = document.createElement("div");
        div.className = "dia-num outro-mes";
        div.textContent = i;
        gradeDias.appendChild(div);
    }

    renderizarEventos(ano, mes);

}

// Monta os 12 meses do modal de visão anual, com a contagem de provas de cada um
async function renderizarModalAnual() {

    const ano = dataAtual.getFullYear();

    document.getElementById("titulo-ano-modal").textContent = `Ano de ${ano}`;

    // Busca todas as datas com evento no ano inteiro, pra contar quantas caem em cada mês
    let datasDoAno = [];
    try {
        const resposta = await fetch(`calendario_crud/calendario_ano.php?ano=${ano}`);
        datasDoAno = await resposta.json();
    } catch (erro) {
        console.error("Erro ao carregar resumo do ano:", erro);
    }

    const grid = document.getElementById("grid-meses-ano");
    grid.innerHTML = "";

    mesesNomes.forEach((nome, index) => {

        const prefixo = `${ano}-${String(index + 1).padStart(2, "0")}`;
        const qtd = datasDoAno.filter(data => data.startsWith(prefixo)).length;

        const card = document.createElement("div");
        card.className = "card-mes-opcao";

        if (index === dataAtual.getMonth()) card.classList.add("mes-atual-selecionado");
        if (qtd > 0) card.classList.add("com-atividades");

        card.innerHTML = `
            <h4>${nome}</h4>
            ${qtd ? `<span class="badge-qtd-atividades">${qtd} ${qtd === 1 ? "prova" : "provas"}</span>` : ""}
        `;

        card.addEventListener("click", () => {
            dataAtual.setMonth(index);
            renderizarCalendario();
            modalAnual.classList.remove("ativo");
        });

        grid.appendChild(card);

    });

}

// Lista, ao lado do calendário, os eventos do mês em exibição
function renderizarEventos(ano, mes) {

    listaEventos.innerHTML = "";

    const prefixo = `${ano}-${String(mes + 1).padStart(2, "0")}`;
    const eventos = eventosAcademicos.filter(e => e.data.startsWith(prefixo));

    if (!eventos.length) {
        listaEventos.innerHTML = `
            <div class="sem-eventos-msg">
                Nenhuma prova ou anotação para este mês.
            </div>
        `;
        return;
    }

    eventos.forEach(evento => {

        const dia = evento.data.split("-")[2];

        const card = document.createElement("div");
        card.className = "card-evento-cal";

        card.innerHTML = `
            <div class="badge-dia-evento">${dia}</div>

            <div class="info-evento-cal">
                <h4>${evento.titulo}</h4>
                <p>${evento.horario}</p>
            </div>

            <button type="button" class="btn-excluir-evento-cal" title="Remover esta atividade">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;

        card.querySelector(".btn-excluir-evento-cal").addEventListener("click", async () => {
            try {
                await fetch("calendario_crud/calendario_excluir.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: evento.id })
                });
                await renderizarCalendario();
                mostrarToastCalendario(`"${evento.titulo}" foi removido do calendário`);
            } catch (erro) {
                console.error("Erro ao excluir evento:", erro);
                mostrarToastCalendario("Erro ao remover atividade. Tente novamente.");
            }
        });

        listaEventos.appendChild(card);

    });

}

// Abrir modal de visão anual
tituloMesAno?.addEventListener("click", async () => {
    await renderizarModalAnual();
    modalAnual.classList.add("ativo");
});

// Fechar pelo X
fecharModalBtn?.addEventListener("click", () => {
    modalAnual.classList.remove("ativo");
});

// Fechar clicando no fundo
modalAnual?.addEventListener("click", (e) => {
    if (e.target === modalAnual) modalAnual.classList.remove("ativo");
});

// Navegação entre meses
btnPrev?.addEventListener("click", () => {
    dataAtual.setMonth(dataAtual.getMonth() - 1);
    renderizarCalendario();
});

btnNext?.addEventListener("click", () => {
    dataAtual.setMonth(dataAtual.getMonth() + 1);
    renderizarCalendario();
});

// ==========================================================
// MODAL: NOVA ATIVIDADE
// ==========================================================

const modalEvento = document.getElementById("modal-nova-atividade");
const fecharModalEventoBtn = document.getElementById("fechar-modal-atividade");
const formEvento = document.getElementById("formAtividadeCalendario");
const infoModalEvento = document.getElementById("infoModalAtividade");
const inputTituloEvento = document.getElementById("tituloAtividadeCal");
const inputHorarioEvento = document.getElementById("horarioAtividadeCal");

let dataEventoSelecionada = null;

function abrirModalEvento(dataStr, dia, mes, ano) {

    dataEventoSelecionada = dataStr;

    formEvento.reset();

    infoModalEvento.textContent = `${dia} de ${mesesNomes[mes]} de ${ano}`;

    modalEvento.classList.add("ativo");

    setTimeout(() => { inputTituloEvento.focus(); }, 50);

}

fecharModalEventoBtn?.addEventListener("click", () => {
    modalEvento.classList.remove("ativo");
});

modalEvento?.addEventListener("click", (e) => {
    if (e.target === modalEvento) modalEvento.classList.remove("ativo");
});

formEvento?.addEventListener("submit", async (e) => {

    e.preventDefault();

    if (!dataEventoSelecionada) return;

    const tituloDigitado = inputTituloEvento.value.trim();
    const horarioDigitado = inputHorarioEvento.value.trim();

    try {

        const resposta = await fetch("calendario_crud/calendario_adicionar.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                data: dataEventoSelecionada,
                titulo: tituloDigitado,
                horario: horarioDigitado
            })
        });

        const novoEvento = await resposta.json();

        if (novoEvento.erro) {
            mostrarToastCalendario(novoEvento.erro);
            return;
        }

        modalEvento.classList.remove("ativo");
        await renderizarCalendario();
        mostrarToastCalendario(`"${tituloDigitado}" adicionado ao calendário`);

    } catch (erro) {
        console.error("Erro ao adicionar evento:", erro);
        mostrarToastCalendario("Erro ao adicionar atividade. Tente novamente.");
    }

});

// ==========================================================
// MENSAGEM DE CONFIRMAÇÃO (TOAST)
// ==========================================================

let toastCalendarioTimer = null;

function mostrarToastCalendario(mensagem) {

    let toast = document.getElementById("toastCalendario");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toastCalendario";
        toast.className = "toast-agenda";
        document.body.appendChild(toast);
    }

    toast.textContent = mensagem;
    toast.classList.add("ativo");

    clearTimeout(toastCalendarioTimer);
    toastCalendarioTimer = setTimeout(() => {
        toast.classList.remove("ativo");
    }, 2200);

}

// ==========================================================
// INICIALIZAÇÃO
// ==========================================================

renderizarCalendario();