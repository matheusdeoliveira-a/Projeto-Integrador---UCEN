// ==========================================================
// PORTAL DO ALUNO - INÍCIO
// Data atual + menu lateral + pesquisa do cabeçalho
// ==========================================================

// DATA ATUAL (PT-BR)
function exibirDataAtual() {
    const elemento = document.getElementById("dataAtual");
    if (!elemento) return;

    const formatado = new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
    }).format(new Date());

    elemento.textContent = formatado.charAt(0).toUpperCase() + formatado.slice(1);
}

exibirDataAtual();

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
// PRÓXIMA AULA (vem da agenda cadastrada pelo professor)
// ==========================================================

// "2026-11-24" -> "Hoje" | "Amanhã" | "Terça-feira, 24/11"
function rotuloDoDia(dataISO) {
    const [ano, mes, dia] = dataISO.split("-").map(Number);
    const dataAula = new Date(ano, mes - 1, dia);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const diferencaDias = Math.round((dataAula - hoje) / 86400000);

    if (diferencaDias === 0) return "Hoje";
    if (diferencaDias === 1) return "Amanhã";

    const semana = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(dataAula);
    const diaMes = `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;
    return semana.charAt(0).toUpperCase() + semana.slice(1) + ", " + diaMes;
}

async function carregarProximaAula() {

    const tituloEl = document.getElementById("tituloProximaAula");
    const horarioEl = document.getElementById("horarioProximaAula");
    if (!tituloEl || !horarioEl) return;

    try {

        const resposta = await fetch("agenda_crud/agenda-proxima-aluno.php");

        // Sem sessão: volta para o login
        if (resposta.status === 401) {
            window.location.href = "login.html";
            return;
        }

        // Erro do servidor (500 etc.) não é "sem aula": cai no catch e mostra a mensagem de erro
        if (!resposta.ok) throw new Error("HTTP " + resposta.status);

        const aula = await resposta.json();

        if (!aula.existe) {
            tituloEl.textContent = "Nenhuma aula agendada ainda";
            horarioEl.textContent = "Assim que o professor cadastrar, ela aparece aqui.";
            return;
        }

        // textContent (nunca innerHTML): título e local foram digitados pelo professor
        tituloEl.textContent = aula.titulo;
        // Só junta o local se ele foi preenchido, para não sobrar um " - " no fim
        const partes = [`${rotuloDoDia(aula.data)}, ${aula.horario}`];
        if (aula.local) partes.push(aula.local);
        horarioEl.textContent = partes.join(" - ");

    } catch (erro) {

        console.error("Erro ao carregar a próxima aula:", erro);
        tituloEl.textContent = "Não foi possível carregar";
        horarioEl.textContent = "";

    }

}

carregarProximaAula();


// ==========================================================
// PRÓXIMAS AVALIAÇÕES (vêm do calendário cadastrado pelo professor)
// ==========================================================

const mesesAbreviados = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

// Mensagem simples dentro do painel (sem avaliações, erro etc.)
function mostrarMensagemAvaliacoes(lista, texto) {
    lista.replaceChildren();

    const item = document.createElement("div");
    item.className = "item-avaliacao";

    const info = document.createElement("div");
    info.className = "info-materia";

    const p = document.createElement("p");
    p.textContent = texto;

    info.appendChild(p);
    item.appendChild(info);
    lista.appendChild(item);
}

async function carregarProximasAvaliacoes() {

    const lista = document.getElementById("listaProximasAvaliacoes");
    if (!lista) return;

    try {

        const resposta = await fetch("calendario_crud/calendario_proximas_aluno.php");

        // Sem sessão: volta para o login
        if (resposta.status === 401) {
            window.location.href = "login.html";
            return;
        }

        // Erro do servidor (500 etc.) não é "sem avaliações"
        if (!resposta.ok) throw new Error("HTTP " + resposta.status);

        const avaliacoes = await resposta.json();

        if (!Array.isArray(avaliacoes) || avaliacoes.length === 0) {
            mostrarMensagemAvaliacoes(lista, "Nenhuma avaliação marcada ainda.");
            return;
        }

        lista.replaceChildren();

        avaliacoes.forEach(avaliacao => {

            // "2026-11-11" -> dia "11" e mês "NOV" (sem usar Date, para não ter problema de fuso)
            const [, mes, dia] = avaliacao.data.split("-");

            const item = document.createElement("div");
            item.className = "item-avaliacao";

            const badge = document.createElement("div");
            badge.className = "data-badge";

            const diaEl = document.createElement("span");
            diaEl.className = "dia";
            diaEl.textContent = dia;

            const mesEl = document.createElement("span");
            mesEl.className = "mes";
            mesEl.textContent = mesesAbreviados[Number(mes) - 1] || "";

            badge.append(diaEl, mesEl);

            // textContent (nunca innerHTML): título e horário foram digitados pelo professor
            const info = document.createElement("div");
            info.className = "info-materia";

            const titulo = document.createElement("h3");
            titulo.textContent = avaliacao.titulo;

            const horario = document.createElement("p");
            horario.textContent = avaliacao.horario;

            info.append(titulo, horario);
            item.append(badge, info);
            lista.appendChild(item);

        });

    } catch (erro) {

        console.error("Erro ao carregar as próximas avaliações:", erro);
        mostrarMensagemAvaliacoes(lista, "Não foi possível carregar as avaliações.");

    }

}

carregarProximasAvaliacoes();