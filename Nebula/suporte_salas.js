const menu = document.getElementById("menu");
document.getElementById("botaoMenuFechar")?.addEventListener("click", () => menu.classList.toggle("aberto"));
document.addEventListener("click", e => {
    if (menu?.classList.contains("aberto") && !menu.contains(e.target)) menu.classList.remove("aberto");
});

const caixaPesquisa = document.getElementById("caixaPesquisa");
const overlay = document.getElementById("overlayPesquisa");
const fecharPesquisa = document.getElementById("fecharPesquisa");
const inputHeader = document.getElementById("pesquisa-header");
const listaHeader = document.querySelectorAll("#lista-header li");
const mensagemHeader = document.getElementById("mensagem-header");
const resultadoPesquisa = document.querySelector(".resultado-pesquisa");

caixaPesquisa?.addEventListener("click", () => {
    overlay.classList.add("ativo"); document.body.style.overflow = "hidden";
    inputHeader.value = ""; resultadoPesquisa.style.display = "none";
    listaHeader.forEach(i => i.style.display = "none"); mensagemHeader.style.display = "none";
    setTimeout(() => inputHeader.focus(), 50);
});
fecharPesquisa?.addEventListener("click", () => { overlay.classList.remove("ativo"); document.body.style.overflow = "auto"; });
overlay?.addEventListener("click", e => { if (e.target === overlay) { overlay.classList.remove("ativo"); document.body.style.overflow = "auto"; } });

inputHeader?.addEventListener("input", () => {
    const texto = inputHeader.value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!texto) { resultadoPesquisa.style.display = "none"; listaHeader.forEach(i => i.style.display = "none"); mensagemHeader.style.display = "none"; return; }
    resultadoPesquisa.style.display = "block";
    let encontrados = 0;
    listaHeader.forEach(item => {
        const ok = item.textContent.toLowerCase().includes(texto);
        item.style.display = ok ? "block" : "none";
        if (ok) encontrados++;
    });
    mensagemHeader.style.display = encontrados ? "none" : "block";
});
listaHeader.forEach(item => item.addEventListener("click", () => { const url = item.dataset.url; if (url) location.href = url; }));

let salas = [
    {id:"SL-01", nome:"Laboratório de Física", local:"Bloco A · 2º andar", capacidade:32, recursos:"Projetor · Bancadas · Computadores", status:"Disponível"},
    {id:"SL-02", nome:"Sala 201", local:"Bloco A · 2º andar", capacidade:45, recursos:"Projetor · Quadro digital", status:"Disponível"},
    {id:"SL-03", nome:"Sala 305", local:"Bloco B · 3º andar", capacidade:40, recursos:"Projetor · Ar-condicionado", status:"Em uso"},
    {id:"SL-04", nome:"Auditório Nebula", local:"Bloco Central · Térreo", capacidade:180, recursos:"Áudio · Projetor · Palco", status:"Disponível"},
    {id:"SL-05", nome:"Laboratório de Computação", local:"Bloco C · 1º andar", capacidade:36, recursos:"36 computadores · Projetor", status:"Disponível"}
];

let reservas = [
    {data:"2026-09-08", hora:"08:00", horaFim:"10:00", sala:"SL-01", evento:"Aula de Astrofísica I", responsavel:"Prof. Rafael Martins"},
    {data:"2026-09-08", hora:"10:00", horaFim:"12:00", sala:"SL-02", evento:"Aula de Matemática II", responsavel:"Prof. Camila Torres"},
    {data:"2026-09-08", hora:"14:00", horaFim:"16:00", sala:"SL-03", evento:"Reunião de coordenação", responsavel:"Coordenação Acadêmica"},
    {data:"2026-09-08", hora:"19:00", horaFim:"21:00", sala:"SL-04", evento:"Palestra — Semana Nebula", responsavel:"Eventos FTAN"},
    {data:"2026-09-09", hora:"08:00", horaFim:"10:00", sala:"SL-05", evento:"Laboratório de Computação", responsavel:"Prof. Lucas Mendes"},
    {data:"2026-09-09", hora:"19:00", horaFim:"21:00", sala:"SL-02", evento:"Aula de Física III", responsavel:"Prof. Rafael Martins"}
];

let dataCalendario = new Date(2026, 8, 8);
let dataSelecionada = "2026-09-08";

function salaNome(id) { return salas.find(s => s.id === id)?.nome || id; }

function hojeISO() {
    const agora = new Date();
    return `${agora.getFullYear()}-${String(agora.getMonth()+1).padStart(2,"0")}-${String(agora.getDate()).padStart(2,"0")}`;
}

// ==========================================================
// VALIDAÇÃO DE RESERVAS (horário de início e término)
// Regras:
//  1) O término precisa ser depois do início.
//  2) A mesma sala não pode ter dois horários que se sobreponham no mesmo dia.
//     Ex.: reservada 19:00–21:00 -> bloqueia qualquer horário que "toque" esse
//     intervalo (19:00, 20:00, 18:00–19:30 etc.). Reservas colando uma na outra
//     (uma termina 21:00 e a outra começa 21:00) são permitidas.
// ==========================================================
const MSG_HORARIO_INVALIDO = "O horário de término precisa ser depois do horário de início.";
const MSG_CONFLITO = "Esta sala já está reservada neste dia e horário. Escolha outro horário ou outra sala.";

// "19:30" -> 1170 (minutos desde 00:00), facilita comparar horários
function paraMinutos(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
}

// Dois intervalos se sobrepõem quando cada um começa antes de o outro terminar
function existeConflito(sala, data, inicio, fim) {
    const ini = paraMinutos(inicio), f = paraMinutos(fim);
    return reservas.some(r =>
        r.sala === sala && r.data === data &&
        ini < paraMinutos(r.horaFim) && f > paraMinutos(r.hora)
    );
}

// Atualiza a caixa de aviso do modal e devolve true se a reserva NÃO pode ser salva
function validarReserva() {
    const sala = document.getElementById("salaReserva").value;
    const data = document.getElementById("dataReserva").value;
    const inicio = document.getElementById("horaReserva").value;
    const fim = document.getElementById("horaFimReserva").value;

    let mensagem = "";
    if (inicio && fim) {
        if (paraMinutos(fim) <= paraMinutos(inicio)) mensagem = MSG_HORARIO_INVALIDO;
        else if (data && existeConflito(sala, data, inicio, fim)) mensagem = MSG_CONFLITO;
    }

    document.getElementById("textoAviso").textContent = mensagem;
    document.getElementById("avisoConflito").classList.toggle("visivel", mensagem !== "");
    return mensagem !== "";
}

function abrirNovaReserva(dataPreenchida) {
    document.getElementById("dataReserva").value = dataPreenchida || dataSelecionada;
    validarReserva();
    abrirModal("modalReserva");
}

const mesesNomes = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

function renderizarModalAno() {
    const ano = dataCalendario.getFullYear();
    document.getElementById("tituloAnoModal").textContent = `Ano de ${ano}`;
    const grid = document.getElementById("gridMesesAno");
    grid.innerHTML = mesesNomes.map((nome, indice) => {
        const prefixo = `${ano}-${String(indice + 1).padStart(2, "0")}`;
        const qtd = reservas.filter(r => r.data.startsWith(prefixo)).length;
        const atual = indice === dataCalendario.getMonth() ? "mes-atual" : "";
        return `<div class="card-mes-ano ${atual}" data-mes="${indice}">
            <h4>${nome}</h4>
            ${qtd ? `<span>${qtd} ${qtd === 1 ? "reserva" : "reservas"}</span>` : ""}
        </div>`;
    }).join("");
    grid.querySelectorAll("[data-mes]").forEach(card => card.addEventListener("click", () => {
        dataCalendario.setMonth(Number(card.dataset.mes));
        renderCalendario();
        fecharModal("modalAno");
    }));
}

function renderSelectSalas() {
    const f = document.getElementById("filtroSala");
    const s = document.getElementById("salaReserva");
    f.innerHTML = '<option value="">Todas as salas</option>';
    s.innerHTML = "";
    salas.forEach(x => {
        f.innerHTML += `<option value="${x.id}">${x.nome}</option>`;
        s.innerHTML += `<option value="${x.id}">${x.nome}</option>`;
    });
}

function renderAgenda() {
    const filtro = document.getElementById("filtroSala").value;
    const lista = reservas.filter(r => r.data === dataSelecionada && (!filtro || r.sala === filtro)).sort((a,b) => a.hora.localeCompare(b.hora));
    document.getElementById("dataSelecionada").textContent = new Date(dataSelecionada + "T12:00:00").toLocaleDateString("pt-BR", {day:"2-digit", month:"long"});
    document.getElementById("listaAgenda").innerHTML = lista.map(r => `
        <div class="evento">
            <div class="hora">${r.hora} – ${r.horaFim}</div>
            <div class="evento-info">
                <strong>${r.evento}</strong>
                <span>${salaNome(r.sala)} · ${r.responsavel}</span>
            </div>
            <span class="status-evento">Reservado</span>
        </div>
    `).join("") || `<div class="vazio-agenda" id="vazioAgenda" title="Adicionar reserva para este dia">
        Nenhum evento agendado para este dia.<br>
        <span class="link-adicionar"><i class="fa-solid fa-plus"></i> Adicionar reserva</span>
    </div>`;
    document.getElementById("vazioAgenda")?.addEventListener("click", () => abrirNovaReserva(dataSelecionada));
}

function renderCalendario() {
    const ano = dataCalendario.getFullYear(), mes = dataCalendario.getMonth();
    const primeiro = new Date(ano, mes, 1).getDay(), total = new Date(ano, mes + 1, 0).getDate();
    document.getElementById("mesTitulo").textContent = dataCalendario.toLocaleDateString("pt-BR", {month:"long", year:"numeric"}).replace(/^./, c => c.toUpperCase());
    let html = "";
    for (let i = 0; i < primeiro; i++) html += '<span class="dia vazio-dia"></span>';
    for (let d = 1; d <= total; d++) {
        const iso = `${ano}-${String(mes+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        const tem = reservas.some(r => r.data === iso);
        html += `<button type="button" class="dia ${iso === dataSelecionada ? "selecionado" : ""}" data-date="${iso}" title="Ver agenda deste dia">${d}${tem ? '<b></b>' : ""}</button>`;
    }
    document.getElementById("gradeCalendario").innerHTML = html;
    document.querySelectorAll(".dia[data-date]").forEach(b => b.addEventListener("click", () => {
        dataSelecionada = b.dataset.date;
        renderCalendario();
        renderAgenda();
    }));
}

function renderSalas() {
    document.getElementById("tabelaSalas").innerHTML = salas.map(s => `
        <tr>
            <td><strong>${s.nome}</strong><small>${s.id}</small></td>
            <td>${s.local}</td>
            <td>${s.capacidade} lugares</td>
            <td>${s.recursos}</td>
            <td><span class="badge ${s.status === "Em uso" ? "em-uso" : "disponivel"}">${s.status}</span></td>
            <td>
                <div class="acoes-tabela">
                    <button type="button" class="btn-tabela" title="Visualizar" aria-label="Visualizar sala"><i class="fa-solid fa-eye"></i></button>
                    <button type="button" class="btn-tabela btn-editar" title="Editar" aria-label="Editar sala"><i class="fa-solid fa-pencil"></i></button>
                    <button type="button" class="btn-tabela btn-excluir" title="Excluir" aria-label="Excluir sala"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join("");
}

function atualizarStats() {
    document.getElementById("statSalas").textContent = salas.length;
    document.getElementById("statUso").textContent = reservas.filter(r => r.data === hojeISO()).length;
    document.getElementById("statReservas").textContent = reservas.length;
    document.getElementById("statOcupacao").textContent = "72%";
}

document.getElementById("mesTitulo").addEventListener("click", () => {
    renderizarModalAno();
    abrirModal("modalAno");
});
document.getElementById("mesAnterior").addEventListener("click", () => { dataCalendario.setMonth(dataCalendario.getMonth() - 1); renderCalendario(); });
document.getElementById("mesProximo").addEventListener("click", () => { dataCalendario.setMonth(dataCalendario.getMonth() + 1); renderCalendario(); });
document.getElementById("filtroSala").addEventListener("change", renderAgenda);

function abrirModal(id) { document.getElementById(id).classList.add("ativo"); }
function fecharModal(id) { document.getElementById(id).classList.remove("ativo"); }

document.getElementById("novaReserva").addEventListener("click", () => abrirNovaReserva());
document.getElementById("novaSala").addEventListener("click", () => abrirModal("modalSala"));
document.querySelectorAll(".fechar-modal, [data-close]").forEach(b => b.addEventListener("click", () => {
    const target = b.dataset.close || b.closest(".modal-overlay")?.id;
    if (target) fecharModal(target);
}));
document.querySelectorAll(".modal-overlay").forEach(m => m.addEventListener("click", e => { if (e.target === m) m.classList.remove("ativo"); }));

["salaReserva", "dataReserva", "horaReserva", "horaFimReserva"].forEach(id => {
    const campo = document.getElementById(id);
    campo.addEventListener("input", validarReserva);
    campo.addEventListener("change", validarReserva);
});

document.getElementById("formReserva").addEventListener("submit", e => {
    e.preventDefault();
    if (validarReserva()) return; // bloqueia o salvamento e mantém o aviso na tela
    const dataVal = document.getElementById("dataReserva").value;
    reservas.push({
        data: dataVal,
        hora: document.getElementById("horaReserva").value,
        horaFim: document.getElementById("horaFimReserva").value,
        sala: document.getElementById("salaReserva").value,
        evento: document.getElementById("eventoReserva").value,
        responsavel: document.getElementById("responsavelReserva").value
    });
    e.target.reset();
    fecharModal("modalReserva");
    dataSelecionada = dataVal;
    renderCalendario(); renderAgenda(); atualizarStats();
});

document.getElementById("formSala").addEventListener("submit", e => {
    e.preventDefault();
    salas.push({
        id: `SL-${String(salas.length + 1).padStart(2, "0")}`,
        nome: document.getElementById("nomeSala").value,
        local: document.getElementById("localSala").value,
        capacidade: Number(document.getElementById("capacidadeSala").value),
        recursos: document.getElementById("recursosSala").value || "Não informado",
        status: "Disponível"
    });
    e.target.reset();
    fecharModal("modalSala");
    renderSelectSalas(); renderSalas(); atualizarStats();
});

renderSelectSalas(); renderCalendario(); renderAgenda(); renderSalas(); atualizarStats();