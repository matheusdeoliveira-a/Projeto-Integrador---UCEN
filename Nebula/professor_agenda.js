// ==========================================================
// PORTAL DO PROFESSOR - AGENDA
// Menu lateral + pesquisa (comuns) + lógica da agenda (própria)
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
// AGENDA SEMANAL
// ==========================================================

const horas = [19, 20, 21, 22];

// Descobre a segunda-feira da semana de "referencia" (hoje, por padrão)
function obterSegundaFeira(referencia) {
    const data = new Date(referencia);
    const diaSemana = data.getDay(); // 0 = domingo ... 6 = sábado
    const diferenca = diaSemana === 0 ? -6 : 1 - diaSemana;
    data.setDate(data.getDate() + diferenca);
    data.setHours(0, 0, 0, 0);
    return data;
}

// Formata Date -> "YYYY-MM-DD" (o que o banco espera na coluna `data`)
function formatarDataISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

const labelsDias = ["Seg.", "Ter.", "Quar.", "Quin.", "Sex."];
const segundaFeira = obterSegundaFeira(new Date());

// Monta os 5 dias (Seg a Sex) da semana atual com data real de cada um
const dias = labelsDias.map((label, indice) => {
    const dataDia = new Date(segundaFeira);
    dataDia.setDate(segundaFeira.getDate() + indice);
    return {
        label,
        numero: dataDia.getDate(),
        data: formatarDataISO(dataDia)
    };
});

// Turmas do professor (professor_minhas_turmas.php) e a turma cuja agenda está aberta
let turmasAgenda = [];
let turmaAtual = null;
const seletorTurma = document.getElementById("seletorTurma");

function esc(t) {
    const d = document.createElement("div");
    d.textContent = t;
    return d.innerHTML;
}

function renderSeletorTurma() {
    if (!seletorTurma) return;
    if (turmasAgenda.length === 0) {
        seletorTurma.innerHTML = '<span class="aviso-sem-turma">Você ainda não tem turmas atribuídas. Procure o suporte.</span>';
        return;
    }
    seletorTurma.innerHTML = turmasAgenda.map(t => `
        <button type="button" class="chip-turma ${String(t.id) === String(turmaAtual) ? "ativo" : ""}" data-turma="${t.id}">
            ${esc(t.curso)} · ${esc(t.sala)} · ${esc(t.turno)}
        </button>`).join("");
    seletorTurma.querySelectorAll(".chip-turma").forEach(b => {
        b.addEventListener("click", () => {
            turmaAtual = b.dataset.turma;
            const url = new URL(window.location.href);
            url.searchParams.set("turma", turmaAtual);
            window.history.replaceState({}, "", url);
            renderSeletorTurma();
            carregarAgenda();
        });
    });
}

// Descobre as turmas do professor e escolhe: ?turma=ID da URL, senão a PRIMEIRA turma
async function carregarTurmasAgenda() {
    try {
        const resposta = await fetch("professor_minhas_turmas.php", { credentials: "same-origin" });
        const dados = await resposta.json();
        turmasAgenda = dados.sucesso ? dados.turmas : [];
    } catch (erro) {
        console.error("Erro ao carregar as turmas:", erro);
        turmasAgenda = [];
    }
    const daUrl = new URLSearchParams(window.location.search).get("turma");
    const valida = turmasAgenda.find(t => String(t.id) === String(daUrl));
    turmaAtual = valida ? valida.id : (turmasAgenda[0] ? turmasAgenda[0].id : null);
    renderSeletorTurma();
}

// Compromissos carregados do banco (chave = "data-hora", ex: "2026-11-24-19")
let eventosAgenda = {};

const agendaSemanal = document.getElementById("agendaSemanal");
const semanaAgendaEl = document.querySelector(".semana-agenda");

// Atualiza o texto "23 - 27 de novembro de 2026" com a semana real
function atualizarLabelSemana() {
    if (!semanaAgendaEl) return;
    const meses = [
        "janeiro", "fevereiro", "março", "abril", "maio", "junho",
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];
    const primeiro = dias[0];
    const ultimo = dias[dias.length - 1];
    const mesReferencia = meses[new Date(ultimo.data).getMonth()];
    const anoReferencia = new Date(ultimo.data).getFullYear();
    semanaAgendaEl.textContent =
        `${primeiro.numero} - ${ultimo.numero} de ${mesReferencia} de ${anoReferencia}`;
}

// Busca os compromissos da semana atual no banco
async function carregarAgenda() {

    const inicio = dias[0].data;
    const fim = dias[dias.length - 1].data;

    eventosAgenda = {};
    const turmaDaRequisicao = turmaAtual;

    if (!turmaAtual) {
        renderizarAgenda();
        return;
    }

    try {

        const resposta = await fetch(`agenda_crud/agenda-listar.php?id_turma=${turmaAtual}&inicio=${inicio}&fim=${fim}`);
        const lista = await resposta.json();

        // Se o professor trocou de turma enquanto esta resposta vinha, descarta
        if (turmaDaRequisicao !== turmaAtual) return;

        eventosAgenda = {};

        if (Array.isArray(lista)) {
            lista.forEach(evento => {
                const chave = `${evento.data}-${evento.hora}`;
                eventosAgenda[chave] = {
                    id: evento.id_agenda,
                    titulo: evento.titulo,
                    horario: evento.horario,
                    local: evento.local,
                    cor: evento.cor
                };
            });
        }

    } catch (erro) {
        console.error("Erro ao carregar a agenda:", erro);
        mostrarToast("Não foi possível carregar a agenda");
    }

    renderizarAgenda();

}

function renderizarAgenda() {

    // Remove as colunas de dias já existentes (mantém a coluna de horas fixa no HTML)
    agendaSemanal.querySelectorAll(".dia-agenda").forEach(el => el.remove());

    dias.forEach(dia => {

        const colunaDia = document.createElement("div");
        colunaDia.className = "dia-agenda";

        const cabecalho = document.createElement("div");
        cabecalho.className = "cabecalho-dia";
        cabecalho.innerHTML = `
            <div class="badge-dia">
                <span>${dia.label}</span>
                <strong>${dia.numero}</strong>
            </div>
        `;
        colunaDia.appendChild(cabecalho);

        horas.forEach(hora => {

            const chave = `${dia.data}-${hora}`;
            const evento = eventosAgenda[chave];

            if (evento) {

                const cardAula = document.createElement("div");
                cardAula.className = `aula linha${hora}`;
                cardAula.innerHTML = `
                    <button type="button" class="btn-excluir-aula" title="Remover este compromisso">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                    <h4>${evento.titulo}</h4>
                    <p>${evento.horario}</p>
                    <span class="local-aula">${evento.local}</span>
                    <div class="cor-aula ${evento.cor}"></div>
                `;

                cardAula.querySelector(".btn-excluir-aula").addEventListener("click", async (e) => {
                    e.stopPropagation();
                    await excluirCompromisso(chave, evento);
                });

                colunaDia.appendChild(cardAula);

            } else {

                const slot = document.createElement("div");
                slot.className = `slot-vazio slot${hora}`;
                slot.title = "Adicionar compromisso";
                slot.addEventListener("click", () => {
                    abrirModalCompromisso(dia, hora);
                });

                colunaDia.appendChild(slot);

            }

        });

        agendaSemanal.appendChild(colunaDia);

    });

}

// Remove um compromisso no banco e, se der certo, atualiza a tela
async function excluirCompromisso(chave, evento) {

    try {

        const dados = new FormData();
        dados.append("id_agenda", evento.id);
        dados.append("id_turma", turmaAtual);

        const resposta = await fetch("agenda_crud/agenda-excluir.php", {
            method: "POST",
            body: dados
        });
        const resultado = await resposta.json();

        if (resultado.sucesso) {
            // Recarrega do banco: a tela passa a mostrar exatamente o que existe na turma
            await carregarAgenda();
            mostrarToast(`"${evento.titulo}" foi removido da agenda`);
        } else {
            mostrarToast("Não foi possível remover o compromisso");
        }

    } catch (erro) {
        console.error("Erro ao excluir compromisso:", erro);
        mostrarToast("Não foi possível remover o compromisso");
    }

}

// ==========================================================
// MODAL: NOVO COMPROMISSO
// ==========================================================

const modalCompromisso = document.getElementById("modalCompromisso");
const fecharModalCompromisso = document.getElementById("fecharModalCompromisso");
const formCompromisso = document.getElementById("formCompromisso");
const infoModalCompromisso = document.getElementById("infoModalCompromisso");
const inputCorCompromisso = document.getElementById("corCompromisso");
const inputHorarioCompromisso = document.getElementById("horarioCompromisso");

let diaSelecionado = null;
let horaSelecionada = null;

function abrirModalCompromisso(dia, hora) {

    if (!turmaAtual) { mostrarToast("Escolha uma turma para adicionar compromissos"); return; }

    diaSelecionado = dia;
    horaSelecionada = hora;

    formCompromisso.reset();

    infoModalCompromisso.textContent = `${dia.label} (${dia.numero}) · a partir das ${hora}h`;
    inputHorarioCompromisso.value = `${hora}:00 - ${hora + 1}:00`;

    document.querySelectorAll(".opcao-cor").forEach(botao => botao.classList.remove("ativo"));
    document.querySelector('.opcao-cor[data-cor="branco"]').classList.add("ativo");
    inputCorCompromisso.value = "branco";

    modalCompromisso.classList.add("ativo");

}

fecharModalCompromisso?.addEventListener("click", () => {
    modalCompromisso.classList.remove("ativo");
});

modalCompromisso?.addEventListener("click", (e) => {
    if (e.target === modalCompromisso) modalCompromisso.classList.remove("ativo");
});

// Seleção da cor do compromisso (mesma paleta da legenda)
document.querySelectorAll(".opcao-cor").forEach(botao => {
    botao.addEventListener("click", () => {
        document.querySelectorAll(".opcao-cor").forEach(b => b.classList.remove("ativo"));
        botao.classList.add("ativo");
        inputCorCompromisso.value = botao.dataset.cor;
    });
});

formCompromisso?.addEventListener("submit", async (e) => {

    e.preventDefault();

    if (!diaSelecionado || !horaSelecionada) return;

    const titulo = document.getElementById("tituloCompromisso").value.trim();
    const horario = inputHorarioCompromisso.value.trim();
    const local = document.getElementById("localCompromisso").value.trim();
    const cor = inputCorCompromisso.value;

    const botaoSalvar = formCompromisso.querySelector('button[type="submit"]');
    if (botaoSalvar) botaoSalvar.disabled = true;

    try {

        const dados = new FormData();
        dados.append("id_turma", turmaAtual);
        dados.append("data", diaSelecionado.data);
        dados.append("hora", horaSelecionada);
        dados.append("titulo", titulo);
        dados.append("horario", horario);
        dados.append("local", local);
        dados.append("cor", cor);

        const resposta = await fetch("agenda_crud/agenda-inserir.php", {
            method: "POST",
            body: dados
        });
        const resultado = await resposta.json();

        if (resultado.sucesso) {

            const chave = `${diaSelecionado.data}-${horaSelecionada}`;
            eventosAgenda[chave] = { id: resultado.id_agenda, titulo, horario, local, cor };

            modalCompromisso.classList.remove("ativo");
            renderizarAgenda();
            mostrarToast(`"${titulo}" foi adicionado à agenda`);

        } else {
            mostrarToast("Não foi possível salvar o compromisso");
        }

    } catch (erro) {
        console.error("Erro ao salvar compromisso:", erro);
        mostrarToast("Não foi possível salvar o compromisso");
    } finally {
        if (botaoSalvar) botaoSalvar.disabled = false;
    }

});

// ==========================================================
// MENSAGEM DE CONFIRMAÇÃO (TOAST)
// ==========================================================

let toastAgendaTimer = null;

function mostrarToast(mensagem) {

    let toast = document.getElementById("toastAgenda");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toastAgenda";
        toast.className = "toast-agenda";
        document.body.appendChild(toast);
    }

    toast.textContent = mensagem;
    toast.classList.add("ativo");

    clearTimeout(toastAgendaTimer);
    toastAgendaTimer = setTimeout(() => {
        toast.classList.remove("ativo");
    }, 2200);

}

// ==========================================================
// INICIALIZAÇÃO
// ==========================================================

atualizarLabelSemana();
carregarTurmasAgenda().then(carregarAgenda);