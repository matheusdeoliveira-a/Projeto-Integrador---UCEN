// ==========================================================
// PORTAL DO SUPORTE - ACADÊMICO
// Menu lateral + pesquisa (comuns) + lógica de acadêmico (própria)
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
// ACADÊMICO
// ==========================================================

// Frequência mínima exigida (%) para não entrar como "abaixo do mínimo"
const FREQUENCIA_MINIMA = 75;

// -----------------------------
// DADOS DE EXEMPLO (mock)
// Em produção virão do banco `faculdade_nebula` via PHP/mysqli - o connec se chama connect_nebula
// -----------------------------

// Preenchido pelo banco (academico-listar-nebula.php) em carregarAlunos()
const alunosCadastrados = [];

// Preenchido pelo banco (academico-matriculas-listar-nebula.php) em carregarMatriculas()
const matriculasRegistradas = [];

const frequenciasTurma = [
    { aluno: "Ana Beatriz Souza",     turma: "Banco de Dados",       aulas: 48, faltas: 1 },
    { aluno: "Bruno Carvalho Lima",   turma: "Banco de Dados",       aulas: 48, faltas: 2 },
    { aluno: "Camila Rocha Dias",     turma: "Banco de Dados",       aulas: 48, faltas: 0 },
    { aluno: "Diego Fernandes Costa", turma: "Banco de Dados",       aulas: 48, faltas: 15 },
    { aluno: "Isabela Martins Rocha", turma: "Programação",          aulas: 44, faltas: 3 },
    { aluno: "João Pedro Alves",      turma: "Programação",          aulas: 44, faltas: 5 },
    { aluno: "Lucas Fernandes Prado", turma: "Programação",          aulas: 44, faltas: 13 },
    { aluno: "Rafael Costa Martins",  turma: "Engenharia de Software", aulas: 40, faltas: 5 },
    { aluno: "Thiago Alves Rocha",    turma: "Engenharia de Software", aulas: 40, faltas: 12 },
    { aluno: "Yasmin Ramos Costa",    turma: "Engenharia de Software", aulas: 40, faltas: 3 }
];

const historicoNotas = [
    { aluno: "Ana Beatriz Souza",     disciplina: "Banco de Dados",       periodo: "2026/1", media: 9.0 },
    { aluno: "Bruno Carvalho Lima",   disciplina: "Banco de Dados",       periodo: "2026/1", media: 8.3 },
    { aluno: "Camila Rocha Dias",     disciplina: "Banco de Dados",       periodo: "2026/1", media: 9.3 },
    { aluno: "Diego Fernandes Costa", disciplina: "Banco de Dados",       periodo: "2026/1", media: 6.3 },
    { aluno: "Isabela Martins Rocha", disciplina: "Programação",          periodo: "2026/1", media: 7.8 },
    { aluno: "João Pedro Alves",      disciplina: "Programação",          periodo: "2026/1", media: 7.3 },
    { aluno: "Lucas Fernandes Prado", disciplina: "Programação",          periodo: "2026/1", media: 6.3 },
    { aluno: "Rafael Costa Martins",  disciplina: "Engenharia de Software", periodo: "2026/1", media: 7.3 },
    { aluno: "Thiago Alves Rocha",    disciplina: "Engenharia de Software", periodo: "2026/1", media: 6.3 },
    { aluno: "Yasmin Ramos Costa",    disciplina: "Engenharia de Software", periodo: "2026/1", media: 7.8 }
];

const documentosEnviados = [
    { id: 1,  candidato: "Ana Beatriz Souza",     tipo: "RG",                              processo: "Matrícula", enviado: "18/09/2026", status: "Em análise", observacao: "" },
    { id: 2,  candidato: "Ana Beatriz Souza",     tipo: "Histórico escolar",               processo: "Matrícula", enviado: "18/09/2026", status: "Aprovado",   observacao: "" },
    { id: 3,  candidato: "João Pedro Alves",      tipo: "Comprovante de renda",            processo: "Isenção",   enviado: "18/09/2026", status: "Pendente",   observacao: "" },
    { id: 4,  candidato: "Camila Rocha Dias",     tipo: "Comprovante de residência",       processo: "Matrícula", enviado: "17/09/2026", status: "Aprovado",   observacao: "" },
    { id: 5,  candidato: "Lucas Fernandes Prado", tipo: "Comprovante de renda",            processo: "Isenção",   enviado: "17/09/2026", status: "Recusado",   observacao: "Comprovante desatualizado. Envie um documento emitido nos últimos 90 dias." },
    { id: 6,  candidato: "Bruno Carvalho Lima",   tipo: "CPF",                             processo: "Matrícula", enviado: "17/09/2026", status: "Em análise", observacao: "" },
    { id: 7,  candidato: "Isabela Martins Rocha", tipo: "Declaração de composição familiar", processo: "Isenção", enviado: "16/09/2026", status: "Em análise", observacao: "" },
    { id: 8,  candidato: "Isabela Martins Rocha", tipo: "Histórico escolar",               processo: "Matrícula", enviado: "16/09/2026", status: "Aprovado",   observacao: "" },
    { id: 9,  candidato: "Thiago Alves Rocha",    tipo: "Certidão de nascimento",          processo: "Matrícula", enviado: "15/09/2026", status: "Pendente",   observacao: "Documento cortado nas bordas. Envie a imagem completa." },
    { id: 10, candidato: "Yasmin Ramos Costa",    tipo: "Comprovante de residência",       processo: "Matrícula", enviado: "15/09/2026", status: "Em análise", observacao: "" }
];

// -----------------------------
// HELPERS DE TEXTO / STATUS
// -----------------------------

function normalizarTexto(texto) {
    return texto
        .toString()
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

// Escapa texto vindo do banco antes de colocar em innerHTML (evita XSS)
function escaparHTML(texto) {
    return String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function rotuloStatus(status) {
    const rotulos = { ativo: "Ativo", pendente: "Pendente", trancado: "Trancado", cancelado: "Cancelado" };
    return rotulos[status] || status;
}

function situacaoPorMedia(media) {
    if (media >= 7) return { texto: "Aprovado", classe: "aprovado" };
    if (media >= 5) return { texto: "Recuperação", classe: "recuperacao" };
    return { texto: "Reprovado", classe: "reprovado" };
}

// -----------------------------
// RENDERIZAÇÃO DAS TABELAS
// -----------------------------

// Gera a célula "Ação" (visualizar, editar, excluir) de cada linha.
// Editar e excluir já funcionam na aba Alunos; nas outras abas ainda são só visuais.
// O parâmetro "item" só serve para compor o aria-label (acessibilidade).
function celulaAcoes(item, tipo, indice) {
    return `
            <td>
                <div class="acoes-tabela">
                    <button type="button" class="btn-tabela" data-visualizar="${tipo}" data-indice="${indice}" title="Visualizar" aria-label="Visualizar ${item}"><i class="fa-solid fa-eye"></i></button>
                    <button type="button" class="btn-tabela btn-editar" data-editar="${tipo}" data-indice="${indice}" title="Editar" aria-label="Editar ${item}"><i class="fa-solid fa-pencil"></i></button>
                    <button type="button" class="btn-tabela btn-excluir" data-excluir="${tipo}" data-indice="${indice}" title="Excluir" aria-label="Excluir ${item}"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>`;
}

const corpoTabelaAlunos = document.getElementById("corpoTabelaAlunos");
const corpoTabelaMatriculas = document.getElementById("corpoTabelaMatriculas");
const corpoTabelaFrequencia = document.getElementById("corpoTabelaFrequencia");
const corpoTabelaNotas = document.getElementById("corpoTabelaNotas");

function renderizarAlunos(lista) {

    corpoTabelaAlunos.innerHTML = "";
    

    if (lista.length === 0) {
        corpoTabelaAlunos.innerHTML = `<tr><td colspan="7" class="mensagem-vazia-tabela">Nenhum aluno encontrado.</td></tr>`;
        return;
    }

    lista.forEach(aluno => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${escaparHTML(aluno.nome)}</td>
            <td>${escaparHTML(aluno.matricula)}</td>
            <td>${escaparHTML(aluno.curso)}</td>
            <td>${escaparHTML(aluno.semestre)}</td>
            <td>${escaparHTML(aluno.contato)}</td>
            <td><span class="badge-status ${aluno.status}">${rotuloStatus(aluno.status)}</span></td>${celulaAcoes("aluno", "alunos", alunosCadastrados.indexOf(aluno))}
        `;
        corpoTabelaAlunos.appendChild(linha);
    });

}


function renderizarMatriculas(lista) {

    corpoTabelaMatriculas.innerHTML = "";

    if (lista.length === 0) {
        corpoTabelaMatriculas.innerHTML = `<tr><td colspan="6" class="mensagem-vazia-tabela">Nenhuma matrícula encontrada.</td></tr>`;
        return;
    }

    lista.forEach(matricula => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${escaparHTML(matricula.aluno)}</td>
            <td>${escaparHTML(matricula.curso)}</td>
            <td>${escaparHTML(matricula.data)}</td>
            <td>${escaparHTML(matricula.ingresso)}</td>
            <td><span class="badge-status ${matricula.status}">${rotuloStatus(matricula.status)}</span></td>${celulaAcoes("matrícula", "matriculas", matriculasRegistradas.indexOf(matricula))}
        `;
        corpoTabelaMatriculas.appendChild(linha);
    });

}

function renderizarFrequencia(lista) {

    corpoTabelaFrequencia.innerHTML = "";

    if (lista.length === 0) {
        corpoTabelaFrequencia.innerHTML = `<tr><td colspan="6" class="mensagem-vazia-tabela">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    lista.forEach(registro => {
        const percentual = Math.round(((registro.aulas - registro.faltas) / registro.aulas) * 100);
        const abaixo = percentual < FREQUENCIA_MINIMA;

        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${registro.aluno}</td>
            <td>${registro.turma}</td>
            <td>${registro.aulas}</td>
            <td>${registro.faltas}</td>
            <td><span class="badge-frequencia ${abaixo ? "abaixo" : "ok"}">${percentual}%</span></td>${celulaAcoes("registro de frequência", "frequencia", frequenciasTurma.indexOf(registro))}
        `;
        corpoTabelaFrequencia.appendChild(linha);
    });

}

// ENEM não tem nota sorteada: o suporte confere o boletim (PDF) e aprova ou recusa
function ehEnem(item) {
    return item.ingresso === "enem";
}

function rotuloIngresso(item) {
    return ehEnem(item) ? "ENEM" : "Vestibular";
}

function celulaNota(item) {
    return ehEnem(item) || item.nota === null
        ? `<em>ver boletim (PDF)</em>`
        : `<strong>${item.nota}</strong>`;
}

function renderizarNotas(lista) {

    corpoTabelaNotas.innerHTML = "";

    if (lista.length === 0) {
        corpoTabelaNotas.innerHTML = `<tr><td colspan="7" class="mensagem-vazia-tabela">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    lista.forEach(registro => {
        const situacao = situacaoPorMedia(registro.media);
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${registro.aluno}</td>
            <td>${registro.disciplina}</td>
            <td>${registro.periodo}</td>
            <td>${registro.media.toFixed(1)}</td>
            <td><span class="badge-status ${situacao.classe}">${situacao.texto}</span></td>${celulaAcoes("registro de nota", "notas", historicoNotas.indexOf(registro))}
        `;
        corpoTabelaNotas.appendChild(linha);
    });

}

// -----------------------------
// CARDS DE ESTATÍSTICA (topo da página)
// -----------------------------

function atualizarEstatisticasGerais() {

    const statTotalAlunos = document.getElementById("statTotalAlunos");
    const statMatriculasAtivas = document.getElementById("statMatriculasAtivas");
    const statFrequenciaMedia = document.getElementById("statFrequenciaMedia");
    const statAbaixoMinimo = document.getElementById("statAbaixoMinimo");

    const matriculasAtivas = matriculasRegistradas.filter(m => m.status === "ativo").length;

    const percentuais = frequenciasTurma.map(r => ((r.aulas - r.faltas) / r.aulas) * 100);
    const mediaFrequencia = percentuais.reduce((soma, p) => soma + p, 0) / percentuais.length;
    const abaixoMinimo = percentuais.filter(p => p < FREQUENCIA_MINIMA).length;

    statMatriculasAtivas.textContent = matriculasAtivas;
    statFrequenciaMedia.textContent = Math.round(mediaFrequencia) + "%";
    statAbaixoMinimo.textContent = abaixoMinimo;

}

// -----------------------------
// BUSCA POR ABA
// -----------------------------

document.getElementById("buscaAlunos")?.addEventListener("input", (e) => {
    const termo = normalizarTexto(e.target.value);
    const filtrados = alunosCadastrados.filter(a =>
        normalizarTexto(a.nome).includes(termo) || normalizarTexto(a.curso).includes(termo)
    );
    renderizarAlunos(filtrados);
});

document.getElementById("buscaMatriculas")?.addEventListener("input", (e) => {
    const termo = normalizarTexto(e.target.value);
    const filtrados = matriculasRegistradas.filter(m =>
        normalizarTexto(m.aluno).includes(termo) || normalizarTexto(m.curso).includes(termo)
    );
    renderizarMatriculas(filtrados);
});

document.getElementById("buscaFrequencia")?.addEventListener("input", (e) => {
    const termo = normalizarTexto(e.target.value);
    const filtrados = frequenciasTurma.filter(r =>
        normalizarTexto(r.aluno).includes(termo) || normalizarTexto(r.turma).includes(termo)
    );
    renderizarFrequencia(filtrados);
});

document.getElementById("buscaNotas")?.addEventListener("input", (e) => {
    const termo = normalizarTexto(e.target.value);
    const filtrados = historicoNotas.filter(r =>
        normalizarTexto(r.aluno).includes(termo) || normalizarTexto(r.disciplina).includes(termo)
    );
    renderizarNotas(filtrados);
});

// -----------------------------
// DOCUMENTOS (análise de documentos de matrícula e isenção)
// Tudo apenas no frontend: as decisões (aprovar / recusar / solicitar
// correção) só alteram o array em memória e somem ao recarregar a página.
// -----------------------------



const corpoTabelaDocumentos = document.getElementById("corpoTabelaDocumentos");
const buscaDocumentos = document.getElementById("buscaDocumentos");
const filtroProcessoDocumentos = document.getElementById("filtroProcessoDocumentos");
const filtroStatusDocumentos = document.getElementById("filtroStatusDocumentos");

const modalDocumento = document.getElementById("modalDocumento");
const observacaoRegistrada = document.getElementById("observacaoRegistrada");
const areaObservacao = document.getElementById("areaObservacao");
const campoObservacao = document.getElementById("campoObservacao");
const erroObservacao = document.getElementById("erroObservacao");
const btnConfirmarObservacao = document.getElementById("btnConfirmarObservacao");

let documentoAberto = null;   // documento que está aberto no modal
let acaoObservacao = null;    // "recusar" ou "corrigir" (enquanto o campo de observação está aberto)

const textosObservacao = {
    recusar:  { placeholder: "Documento ilegível. Envie uma nova versão com melhor qualidade.", botao: "Confirmar recusa" },
    corrigir: { placeholder: "Descreva o que precisa ser corrigido no documento.",              botao: "Confirmar solicitação" }
};

// "Em análise" -> "em-analise" (classe do badge no CSS)
function classeStatusDocumento(status) {
    return normalizarTexto(status).replaceAll(" ", "-");
}

function badgeDocumento(status) {
    return `<span class="badge-status ${classeStatusDocumento(status)}">${status}</span>`;
}

// "Histórico escolar" -> "historico-escolar.pdf" (nome simulado do arquivo)
function nomeArquivoDocumento(tipo) {
    return normalizarTexto(tipo).replaceAll(" ", "-") + ".pdf";
}

function renderizarDocumentos(lista) {

    corpoTabelaDocumentos.innerHTML = "";

    if (lista.length === 0) {
        corpoTabelaDocumentos.innerHTML = `<tr><td colspan="7" class="mensagem-vazia-tabela">Nenhum documento encontrado.</td></tr>`;
        return;
    }

    lista.forEach(doc => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${doc.candidato}</td>
            <td>${doc.tipo}</td>
            <td>${doc.processo}</td>
            <td>${doc.enviado}</td>
            <td>${badgeDocumento(doc.status)}</td>
            <td>
                <div class="acoes-tabela">
                    <button type="button" class="btn-tabela" data-documento="${doc.id}" title="Visualizar" aria-label="Visualizar ${doc.tipo} de ${doc.candidato}"><i class="fa-solid fa-eye"></i></button>
                </div>
            </td>
        `;
        corpoTabelaDocumentos.appendChild(linha);
    });

}

// Aplica busca + filtro de processo + filtro de status ao mesmo tempo
function filtrarDocumentos() {
    const termo = normalizarTexto(buscaDocumentos.value);
    const processo = filtroProcessoDocumentos.value;
    const status = filtroStatusDocumentos.value;

    const filtrados = documentosEnviados.filter(d =>
        (normalizarTexto(d.candidato).includes(termo) || normalizarTexto(d.tipo).includes(termo)) &&
        (!processo || d.processo === processo) &&
        (!status || d.status === status)
    );

    renderizarDocumentos(filtrados);
}

buscaDocumentos?.addEventListener("input", filtrarDocumentos);
filtroProcessoDocumentos?.addEventListener("change", filtrarDocumentos);
filtroStatusDocumentos?.addEventListener("change", filtrarDocumentos);

// --- Modal de visualização ---

// Escreve no modal os dados do documento aberto
function preencherModalDocumento() {
    const doc = documentoAberto;

    document.getElementById("docCandidato").textContent = doc.candidato;
    document.getElementById("docTipo").textContent = doc.tipo;
    document.getElementById("docProcesso").textContent = doc.processo;
    document.getElementById("docEnviado").textContent = doc.enviado;
    document.getElementById("docStatus").innerHTML = badgeDocumento(doc.status);
    document.getElementById("docArquivo").textContent = nomeArquivoDocumento(doc.tipo);

    // Observação já registrada (recusa ou pedido de correção)
    document.getElementById("textoObservacaoRegistrada").textContent = doc.observacao;
    observacaoRegistrada.classList.toggle("visivel", doc.observacao !== "");
    observacaoRegistrada.classList.toggle("recusado", doc.status === "Recusado");
}

// Esconde e limpa o campo de observação
function limparAreaObservacao() {
    acaoObservacao = null;
    campoObservacao.value = "";
    areaObservacao.classList.remove("visivel");
    erroObservacao.classList.remove("visivel");
}

// Mostra o campo de observação para "recusar" ou "corrigir"
function abrirAreaObservacao(acao) {
    acaoObservacao = acao;
    campoObservacao.value = "";
    campoObservacao.placeholder = textosObservacao[acao].placeholder;
    btnConfirmarObservacao.textContent = textosObservacao[acao].botao;
    erroObservacao.classList.remove("visivel");
    observacaoRegistrada.classList.remove("visivel");   // esconde a anterior enquanto escreve
    areaObservacao.classList.add("visivel");
    campoObservacao.focus();
}

function abrirModalDocumento(id) {
    documentoAberto = documentosEnviados.find(d => d.id === id);
    if (!documentoAberto) return;

    limparAreaObservacao();
    preencherModalDocumento();
    modalDocumento.classList.add("ativo");
    document.body.style.overflow = "hidden";             // NOVO: trava a rolagem da página
}

function fecharModalDocumento() {
    modalDocumento.classList.remove("ativo");
    document.body.style.overflow = "auto";               // NOVO: libera a rolagem
    limparAreaObservacao();
    documentoAberto = null;
}

// Botão "olho" da tabela (um único listener para todas as linhas)
corpoTabelaDocumentos?.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-documento]");
    if (botao) abrirModalDocumento(Number(botao.dataset.documento));
});

document.getElementById("fecharModalDocumento")?.addEventListener("click", fecharModalDocumento);
modalDocumento?.addEventListener("click", (e) => {
    if (e.target === modalDocumento) fecharModalDocumento();
});

// Esc fecha o modal aberto (documento ou detalhes)
document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (modalDocumento.classList.contains("ativo")) fecharModalDocumento();
    if (modalDetalhe.classList.contains("ativo")) fecharModalDetalhe();
});

// NOVO: Visualizar / Baixar (só agem se o documento tiver a propriedade "url")
document.getElementById("btnVisualizarDocumento")?.addEventListener("click", () => {
    if (documentoAberto?.url) window.open(documentoAberto.url, "_blank");
});

document.getElementById("btnBaixarDocumento")?.addEventListener("click", () => {
    if (!documentoAberto?.url) return;
    const link = document.createElement("a");
    link.href = documentoAberto.url;
    link.download = nomeArquivoDocumento(documentoAberto.tipo);
    link.click();
});

// --- Decisões (apenas visuais) ---

// Aprovar: muda o status na hora e apaga qualquer observação anterior
document.getElementById("btnAprovarDocumento")?.addEventListener("click", () => {
    documentoAberto.status = "Aprovado";
    documentoAberto.observacao = "";
    limparAreaObservacao();
    preencherModalDocumento();
    filtrarDocumentos();
});

// Recusar e Solicitar correção: primeiro pedem a observação
document.getElementById("btnRecusarDocumento")?.addEventListener("click", () => abrirAreaObservacao("recusar"));
document.getElementById("btnCorrigirDocumento")?.addEventListener("click", () => abrirAreaObservacao("corrigir"));

document.getElementById("btnCancelarObservacao")?.addEventListener("click", () => {
    limparAreaObservacao();
    preencherModalDocumento();   // reexibe a observação anterior, se existir
});

// Confirmar: recusa -> "Recusado"; correção -> "Pendente" (aguardando novo envio)
btnConfirmarObservacao?.addEventListener("click", () => {
    const texto = campoObservacao.value.trim();

    if (texto === "") {
        erroObservacao.classList.add("visivel");
        campoObservacao.focus();
        return;
    }

    documentoAberto.status = acaoObservacao === "recusar" ? "Recusado" : "Pendente";
    documentoAberto.observacao = texto;
    limparAreaObservacao();
    preencherModalDocumento();
    filtrarDocumentos();
});

campoObservacao?.addEventListener("input", () => erroObservacao.classList.remove("visivel"));
// -----------------------------
// MODAL DE DETALHES (olho das abas Alunos, Matrículas, Frequência e Notas)
// -----------------------------

const modalDetalhe = document.getElementById("modalDetalhe");
const corpoModalDetalhe = document.getElementById("corpoModalDetalhe");

// Monta os campos de cada tipo de registro: [rótulo, valor]
const detalhesPorTipo = {
    alunos: (a) => ({
        titulo: "Aluno",
        subtitulo: "Confira os dados cadastrais do aluno.",
        campos: [
            ["Nome", escaparHTML(a.nome)],
            ["Matrícula", escaparHTML(a.matricula)],
            ["Curso", escaparHTML(a.curso)],
            ["Semestre", escaparHTML(a.semestre)],
            ["Contato", escaparHTML(a.contato)],
            ["Status", `<span class="badge-status ${a.status}">${rotuloStatus(a.status)}</span>`]
        ]
    }),

    matriculas: (m) => ({
        titulo: "Matrícula",
        subtitulo: "Confira os dados da matrícula.",
        campos: [
            ["Aluno", escaparHTML(m.aluno)],
            ["Curso", escaparHTML(m.curso)],
            ["Data da matrícula", escaparHTML(m.data)],
            ["Forma de ingresso", escaparHTML(m.ingresso)],
            ["Status", `<span class="badge-status ${m.status}">${rotuloStatus(m.status)}</span>`]
        ]
    }),

    frequencia: (r) => {
        const percentual = Math.round(((r.aulas - r.faltas) / r.aulas) * 100);
        const abaixo = percentual < FREQUENCIA_MINIMA;
        return {
            titulo: "Frequência",
            subtitulo: `Frequência mínima exigida: ${FREQUENCIA_MINIMA}%.`,
            campos: [
                ["Aluno", r.aluno],
                ["Turma", r.turma],
                ["Aulas dadas", r.aulas],
                ["Faltas", r.faltas],
                ["Presenças", r.aulas - r.faltas],
                ["Frequência", `<span class="badge-frequencia ${abaixo ? "abaixo" : "ok"}">${percentual}%</span>`]
            ]
        };
    },

    notas: (n) => {
        const situacao = situacaoPorMedia(n.media);
        return {
            titulo: "Histórico de notas",
            subtitulo: "Confira o desempenho do aluno na disciplina.",
            campos: [
                ["Aluno", n.aluno],
                ["Disciplina", n.disciplina],
                ["Período", n.periodo],
                ["Nota final", n.media.toFixed(1)],
                ["Situação", `<span class="badge-status ${situacao.classe}">${situacao.texto}</span>`]
            ]
        };
    }
};

const fontesDetalhe = {
    alunos: alunosCadastrados,
    matriculas: matriculasRegistradas,
    frequencia: frequenciasTurma,
    notas: historicoNotas
};

function abrirModalDetalhe(tipo, indice) {
    const registro = fontesDetalhe[tipo]?.[indice];
    if (!registro) return;

    const detalhe = detalhesPorTipo[tipo](registro);

    document.getElementById("tituloModalDetalhe").textContent = detalhe.titulo;
    document.getElementById("subtituloModalDetalhe").textContent = detalhe.subtitulo;
    corpoModalDetalhe.innerHTML = detalhe.campos.map(([rotulo, valor]) => `
        <div class="info-item">
            <span>${rotulo}</span>
            <strong>${valor}</strong>
        </div>
    `).join("");

    modalDetalhe.classList.add("ativo");
    document.body.style.overflow = "hidden";
}

function fecharModalDetalhe() {
    modalDetalhe.classList.remove("ativo");
    document.body.style.overflow = "auto";
}

// Um único listener para os olhos das quatro tabelas
document.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-visualizar]");
    if (botao) abrirModalDetalhe(botao.dataset.visualizar, Number(botao.dataset.indice));
});

document.getElementById("fecharModalDetalhe")?.addEventListener("click", fecharModalDetalhe);
document.getElementById("btnFecharDetalhe")?.addEventListener("click", fecharModalDetalhe);
modalDetalhe?.addEventListener("click", (e) => {
    if (e.target === modalDetalhe) fecharModalDetalhe();
});

// -----------------------------
// ALTERNÂNCIA DE ABAS
// -----------------------------

document.querySelectorAll(".btn-opcao[data-aba-academico]").forEach(botao => {
    botao.addEventListener("click", () => {

        const alvo = botao.dataset.abaAcademico;

        document.querySelectorAll(".btn-opcao[data-aba-academico]").forEach(b => b.classList.remove("ativo"));
        botao.classList.add("ativo");

        document.querySelectorAll(".conteudo-aba-academico").forEach(c => c.classList.remove("ativo"));
        document.querySelector(`.conteudo-aba-academico[data-conteudo-academico="${alvo}"]`)?.classList.add("ativo");

    });
});

// -----------------------------
// CRUD DE ALUNOS (PHP + mysqli)
// -----------------------------

// Chama um PHP e sempre devolve um objeto { sucesso, ... }
async function chamarPHP(url, dados) {
    try {
        const opcoes = dados ? { method: "POST", body: new URLSearchParams(dados) } : {};
        const resposta = await fetch(url, opcoes);
        return await resposta.json();
    } catch (erro) {
        return { sucesso: false, erro: "Não foi possível conectar ao servidor." };
    }
}

// Lê os alunos do banco e redesenha a tabela (respeitando o texto da busca)
async function carregarAlunos() {
    const resposta = await chamarPHP("academico_crud/academico-listar-nebula.php");

    if (!resposta.sucesso) {
        corpoTabelaAlunos.innerHTML = `<tr><td colspan="7" class="mensagem-vazia-tabela">${escaparHTML(resposta.erro)}</td></tr>`;
        return;
    }

    // splice mantém o MESMO array (fontesDetalhe aponta para ele)
    alunosCadastrados.splice(0, alunosCadastrados.length, ...resposta.alunos);
    atualizarTotalAlunos();
    refazerBuscaAlunos();
}

// Lê as matrículas do banco e redesenha a tabela (respeitando o texto da busca) + cards do topo
async function carregarMatriculas() {
    const resposta = await chamarPHP("academico_crud/academico-matriculas-listar-nebula.php");

    if (!resposta.sucesso) {
        corpoTabelaMatriculas.innerHTML = `<tr><td colspan="7" class="mensagem-vazia-tabela">${escaparHTML(resposta.erro)}</td></tr>`;
        return;
    }

    matriculasRegistradas.splice(0, matriculasRegistradas.length, ...resposta.matriculas);
    document.getElementById("buscaMatriculas").dispatchEvent(new Event("input"));
    atualizarEstatisticasGerais();
}

function atualizarTotalAlunos() {
    document.getElementById("statTotalAlunos").textContent = alunosCadastrados.length;
}

// Dispara o filtro da busca (com campo vazio mostra todos)
function refazerBuscaAlunos() {
    document.getElementById("buscaAlunos").dispatchEvent(new Event("input"));
}

// --- Editar ---

const modalEditarAluno = document.getElementById("modalEditarAluno");
const erroEditarAluno = document.getElementById("erroEditarAluno");
const btnSalvarEdicao = document.getElementById("btnSalvarEdicao");
const camposEdicao = ["nome", "matricula", "curso", "semestre", "contato", "status"];
let alunoEmEdicao = null;

function campoEdicao(campo) {
    return document.getElementById("edit" + campo.charAt(0).toUpperCase() + campo.slice(1));
}

function abrirModalEditarAluno(indice) {
    const aluno = alunosCadastrados[indice];
    if (!aluno) return;

    alunoEmEdicao = aluno;
    camposEdicao.forEach(campo => { campoEdicao(campo).value = aluno[campo]; });

    erroEditarAluno.classList.remove("visivel");
    modalEditarAluno.classList.add("ativo");
    document.body.style.overflow = "hidden";
    campoEdicao("nome").focus();
}

function fecharModalEditarAluno() {
    modalEditarAluno.classList.remove("ativo");
    document.body.style.overflow = "auto";
    alunoEmEdicao = null;
}

btnSalvarEdicao?.addEventListener("click", async () => {
    if (!alunoEmEdicao) return;

    const dados = { id: alunoEmEdicao.id };
    camposEdicao.forEach(campo => { dados[campo] = campoEdicao(campo).value; });

    btnSalvarEdicao.disabled = true;
    const resposta = await chamarPHP("academico_crud/academico-editar-nebula.php", dados);
    btnSalvarEdicao.disabled = false;

    if (!resposta.sucesso) {
        erroEditarAluno.textContent = resposta.erro;
        erroEditarAluno.classList.add("visivel");
        if (resposta.campo) campoEdicao(resposta.campo)?.focus();
        return;
    }

    Object.assign(alunoEmEdicao, resposta.aluno);   // atualiza o registro em memória
    fecharModalEditarAluno();
    refazerBuscaAlunos();
    carregarMatriculas();
});

document.getElementById("fecharModalEditarAluno")?.addEventListener("click", fecharModalEditarAluno);
document.getElementById("btnCancelarEdicao")?.addEventListener("click", fecharModalEditarAluno);
modalEditarAluno?.addEventListener("click", (e) => {
    if (e.target === modalEditarAluno) fecharModalEditarAluno();
});

// --- Excluir ---

const modalExcluirAluno = document.getElementById("modalExcluirAluno");
const erroExcluirAluno = document.getElementById("erroExcluirAluno");
const btnConfirmarExclusao = document.getElementById("btnConfirmarExclusao");
let alunoParaExcluir = null;

function abrirModalExcluirAluno(indice) {
    const aluno = alunosCadastrados[indice];
    if (!aluno) return;

    alunoParaExcluir = aluno;
    document.getElementById("textoExcluirAluno").textContent =
        `Tem certeza que deseja excluir ${aluno.nome} (matrícula ${aluno.matricula})? Essa ação não pode ser desfeita.`;

    erroExcluirAluno.classList.remove("visivel");
    modalExcluirAluno.classList.add("ativo");
    document.body.style.overflow = "hidden";
}

function fecharModalExcluirAluno() {
    modalExcluirAluno.classList.remove("ativo");
    document.body.style.overflow = "auto";
    alunoParaExcluir = null;
}

btnConfirmarExclusao?.addEventListener("click", async () => {
    if (!alunoParaExcluir) return;

    btnConfirmarExclusao.disabled = true;
    const resposta = await chamarPHP("academico_crud/academico-excluir-nebula.php", { id: alunoParaExcluir.id });
    btnConfirmarExclusao.disabled = false;

    if (!resposta.sucesso) {
        erroExcluirAluno.textContent = resposta.erro;
        erroExcluirAluno.classList.add("visivel");
        return;
    }

    alunosCadastrados.splice(alunosCadastrados.indexOf(alunoParaExcluir), 1);
    fecharModalExcluirAluno();
    atualizarTotalAlunos();
    refazerBuscaAlunos();
    carregarMatriculas();
});

document.getElementById("fecharModalExcluirAluno")?.addEventListener("click", fecharModalExcluirAluno);
document.getElementById("btnCancelarExclusao")?.addEventListener("click", fecharModalExcluirAluno);
modalExcluirAluno?.addEventListener("click", (e) => {
    if (e.target === modalExcluirAluno) fecharModalExcluirAluno();
});

// --- Cliques nos botões da tabela (um listener só) e tecla Esc ---

document.addEventListener("click", (e) => {
    const editar = e.target.closest("[data-editar]");
    if (editar?.dataset.editar === "alunos") abrirModalEditarAluno(Number(editar.dataset.indice));

    const excluir = e.target.closest("[data-excluir]");
    if (excluir?.dataset.excluir === "alunos") abrirModalExcluirAluno(Number(excluir.dataset.indice));
});

document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (modalEditarAluno.classList.contains("ativo")) fecharModalEditarAluno();
    if (modalExcluirAluno.classList.contains("ativo")) fecharModalExcluirAluno();
});

// -----------------------------
// VESTIBULAR & ENEM (análise das isenções de taxa)
// Dados reais: vêm do banco (isencao-listar-nebula.php) e a decisão grava no banco
// e manda o e-mail ao candidato (isencao-decidir-nebula.php).
// -----------------------------

const corpoTabelaIsencao = document.getElementById("corpoTabelaIsencao");
const buscaIsencao = document.getElementById("buscaIsencao");
const filtroStatusIsencao = document.getElementById("filtroStatusIsencao");

const modalIsencao = document.getElementById("modalIsencao");
const isoAreaObservacao = document.getElementById("isoAreaObservacao");
const isoCampoMotivo = document.getElementById("isoCampoMotivo");
const isoErroMotivo = document.getElementById("isoErroMotivo");
const isoMensagem = document.getElementById("isoMensagem");

const PASTA_ISENCAO = "academico_crud/";

let isencoes = [];           // lista vinda do banco
let maximoTentativas = 3;
let isencaoAberta = null;    // inscrição aberta no modal
let decidindoIsencao = false;

const STATUS_ISENCAO = {
    em_analise: { texto: "Em análise", classe: "em-analise" },
    aprovada:   { texto: "Aprovada",   classe: "aprovado" },
    recusada:   { texto: "Recusada",   classe: "recusado" }
};

function badgeIsencao(status) {
    const info = STATUS_ISENCAO[status] || { texto: status, classe: "" };
    return `<span class="badge-status ${info.classe}">${info.texto}</span>`;
}

function formatarCpf(cpf) {
    const d = String(cpf).replace(/\D/g, "");
    return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : cpf;
}

function mensagemDoErro(resposta) {
    return resposta.erro || resposta.mensagem || "Não foi possível concluir a ação.";
}

function renderizarIsencoes(lista) {

    corpoTabelaIsencao.innerHTML = "";

    if (lista.length === 0) {
        corpoTabelaIsencao.innerHTML = `<tr><td colspan="7" class="mensagem-vazia-tabela">Nenhum pedido de isenção encontrado.</td></tr>`;
        return;
    }

    lista.forEach(item => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${escaparHTML(item.nome)}</td>
            <td>${escaparHTML(item.curso || "-")}</td>
            <td>Isenção</td>
            <td>${item.tentativas} de ${maximoTentativas}</td>
            <td>${escaparHTML(item.enviado || "-")}</td>
            <td>${badgeIsencao(item.status)}</td>
            <td>
                <div class="acoes-tabela">
                    <button type="button" class="btn-tabela" data-isencao="${item.id}" title="Ver documentos" aria-label="Ver documentos de ${escaparHTML(item.nome)}"><i class="fa-solid fa-eye"></i></button>
                </div>
            </td>
        `;
        corpoTabelaIsencao.appendChild(linha);
    });
}

function filtrarIsencoes() {
    const termo = normalizarTexto(buscaIsencao.value);
    const status = filtroStatusIsencao.value;

    const filtrados = isencoes.filter(i =>
        (termo === "" || normalizarTexto(`${i.nome} ${i.cpf} ${i.curso || ""}`).includes(termo)) &&
        (status === "" || i.status === status)
    );

    renderizarIsencoes(filtrados);
}

buscaIsencao?.addEventListener("input", filtrarIsencoes);
filtroStatusIsencao?.addEventListener("change", filtrarIsencoes);

async function carregarIsencoes() {
    const resposta = await chamarPHP(PASTA_ISENCAO + "isencao-listar-nebula.php");

    if (!resposta.sucesso) {
        corpoTabelaIsencao.innerHTML = `<tr><td colspan="7" class="mensagem-vazia-tabela">${escaparHTML(mensagemDoErro(resposta))}</td></tr>`;
        return;
    }

    isencoes = resposta.inscricoes;
    maximoTentativas = resposta.maximo || 3;
    filtrarIsencoes();
}

// --- Modal ---

function mostrarMensagemIsencao(texto) {
    isoMensagem.textContent = texto;
    isoMensagem.classList.toggle("visivel", texto !== "");
}

function fecharAreaMotivoIsencao() {
    isoAreaObservacao.classList.remove("visivel");
    isoErroMotivo.classList.remove("visivel");
    isoCampoMotivo.value = "";
}

function preencherModalIsencao() {
    const item = isencaoAberta;

    document.getElementById("isoCandidato").textContent = item.nome;
    document.getElementById("isoCpf").textContent = formatarCpf(item.cpf);
    document.getElementById("isoEmail").textContent = item.email;
    document.getElementById("isoCurso").textContent = item.curso || "-";
    document.getElementById("isoTentativa").textContent = `${item.tentativas} de ${maximoTentativas}`;
    document.getElementById("isoStatus").innerHTML = badgeIsencao(item.status);

    const listaDocs = document.getElementById("isoDocumentos");
    if (item.documentos.length === 0) {
        listaDocs.innerHTML = `<p class="mensagem-vazia-tabela">Nenhum documento registrado para esta tentativa.</p>`;
    } else {
        listaDocs.innerHTML = item.documentos.map(d => `
            <div class="doc-linha-isencao">
                <div class="doc-info">
                    <i class="fa-solid fa-file-lines"></i>
                    <div>
                        <strong>${escaparHTML(d.tipo)}</strong>
                        <small>${escaparHTML(d.nome)}</small>
                    </div>
                </div>
                <div class="acoes-visualizador">
                    <a class="btn-secundario btn-pequeno" href="${PASTA_ISENCAO}isencao-documento-nebula.php?id=${d.id}" target="_blank" rel="noopener"><i class="fa-solid fa-eye"></i> Visualizar</a>
                    <a class="btn-secundario btn-pequeno" href="${PASTA_ISENCAO}isencao-documento-nebula.php?id=${d.id}&baixar=1"><i class="fa-solid fa-download"></i> Baixar</a>
                </div>
            </div>
        `).join("");
    }

    // Motivo da recusa (se já foi recusada) e botões de decisão (só enquanto está em análise)
    const observacao = document.getElementById("isoObservacaoRegistrada");
    const mostrarMotivo = item.status === "recusada" && item.motivo;
    observacao.classList.toggle("visivel", Boolean(mostrarMotivo));
    observacao.classList.toggle("recusado", Boolean(mostrarMotivo));
    document.getElementById("isoTextoObservacao").textContent = item.motivo || "";

    document.getElementById("isoAcoes").style.display = item.status === "em_analise" ? "" : "none";
}

function abrirModalIsencao(id) {
    isencaoAberta = isencoes.find(i => i.id === id);
    if (!isencaoAberta) return;

    fecharAreaMotivoIsencao();
    mostrarMensagemIsencao("");
    preencherModalIsencao();
    modalIsencao.classList.add("ativo");
}

function fecharModalIsencao() {
    modalIsencao.classList.remove("ativo");
    fecharAreaMotivoIsencao();
    mostrarMensagemIsencao("");
    isencaoAberta = null;
}

corpoTabelaIsencao?.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-isencao]");
    if (botao) abrirModalIsencao(Number(botao.dataset.isencao));
});

document.getElementById("fecharModalIsencao")?.addEventListener("click", fecharModalIsencao);
modalIsencao?.addEventListener("click", (e) => {
    if (e.target === modalIsencao) fecharModalIsencao();
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalIsencao.classList.contains("ativo")) fecharModalIsencao();
});

// --- Decisão ---

function travarBotoesIsencao(travar) {
    decidindoIsencao = travar;
    ["isoAprovar", "isoRecusar", "isoConfirmarRecusa", "isoCancelarRecusa"].forEach(id => {
        document.getElementById(id).disabled = travar;
    });
}

async function decidirIsencao(acao, motivo) {
    if (decidindoIsencao || !isencaoAberta) return;

    travarBotoesIsencao(true);
    mostrarMensagemIsencao("");

    const dados = { id: isencaoAberta.id, acao: acao };
    if (acao === "recusar") dados.motivo = motivo;

    const resposta = await chamarPHP(PASTA_ISENCAO + "isencao-decidir-nebula.php", dados);

    travarBotoesIsencao(false);

    if (!resposta.sucesso) {
        if (resposta.campo === "motivo") {
            isoErroMotivo.textContent = mensagemDoErro(resposta);
            isoErroMotivo.classList.add("visivel");
        } else {
            mostrarMensagemIsencao(mensagemDoErro(resposta));
        }
        return;
    }

    await carregarIsencoes();
    await carregarNotas();

    if (resposta.sem_vaga) {
        // Sem vaga na 1ª nem na 2ª opção: o sistema reprovou o candidato automaticamente
        notaAberta = notasVestibular.find(n => n.id === notaAberta.id) || notaAberta;
        fecharAreaMotivoNota();
        preencherModalNota();
        mostrarMensagemNota("Sem vagas na 1ª nem na 2ª opção do candidato: ele foi reprovado automaticamente. "
            + (resposta.email_enviado === false
                ? "O e-mail NÃO pôde ser enviado. Avise o candidato por outro contato."
                : "O candidato foi avisado por e-mail."));
        return;
    }

    if (resposta.email_enviado === false) {
        // A decisão foi salva, mas o e-mail falhou: avisa e mantém o modal aberto
        isencaoAberta = isencoes.find(i => i.id === isencaoAberta.id) || isencaoAberta;
        fecharAreaMotivoIsencao();
        preencherModalIsencao();
        mostrarMensagemIsencao("Decisão salva, mas o e-mail NÃO pôde ser enviado. Avise o candidato por outro contato.");
        return;
    }

    fecharModalIsencao();
}

document.getElementById("isoAprovar")?.addEventListener("click", () => decidirIsencao("aprovar"));

document.getElementById("isoRecusar")?.addEventListener("click", () => {
    mostrarMensagemIsencao("");
    isoAreaObservacao.classList.add("visivel");
    isoCampoMotivo.focus();
});

document.getElementById("isoCancelarRecusa")?.addEventListener("click", fecharAreaMotivoIsencao);

document.getElementById("isoConfirmarRecusa")?.addEventListener("click", () => {
    const motivo = isoCampoMotivo.value.trim();

    if (motivo.length < 5) {
        isoErroMotivo.textContent = "Escreva o motivo da recusa (mínimo de 5 caracteres).";
        isoErroMotivo.classList.add("visivel");
        return;
    }

    isoErroMotivo.classList.remove("visivel");
    decidirIsencao("recusar", motivo);
});

// -----------------------------
// VESTIBULAR & ENEM: NOTAS DO VESTIBULAR
// A nota (50 a 100) é gerada pelo PHP quando a isenção é aprovada. Aqui o suporte
// aprova ou recusa (nota-decidir-nebula.php) e o candidato recebe o e-mail.
// -----------------------------

const corpoTabelaNota = document.getElementById("corpoTabelaNota");
const buscaNota = document.getElementById("buscaNota");
const filtroStatusNota = document.getElementById("filtroStatusNota");

const modalNota = document.getElementById("modalNota");
const ntAreaObservacao = document.getElementById("ntAreaObservacao");
const ntCampoMotivo = document.getElementById("ntCampoMotivo");
const ntErroMotivo = document.getElementById("ntErroMotivo");
const ntMensagem = document.getElementById("ntMensagem");

let notasVestibular = [];
let notaAberta = null;
let decidindoNota = false;

const STATUS_NOTA = {
    pendente:  { texto: "Pendente",  classe: "pendente" },
    aprovado:  { texto: "Aprovado",  classe: "aprovado" },
    reprovado: { texto: "Reprovado", classe: "reprovado" }
};

function badgeNota(status) {
    const info = STATUS_NOTA[status] || { texto: status, classe: "" };
    return `<span class="badge-status ${info.classe}">${info.texto}</span>`;
}

// Sub-abas (Isenções / Notas do vestibular)
document.querySelectorAll("[data-sub-vestibular]").forEach(botao => {
    botao.addEventListener("click", () => {
        const alvo = botao.dataset.subVestibular;

        document.querySelectorAll("[data-sub-vestibular]").forEach(b => b.classList.remove("ativo"));
        botao.classList.add("ativo");

        document.querySelectorAll(".sub-conteudo-vestibular").forEach(c => c.classList.remove("ativo"));
        document.querySelector(`.sub-conteudo-vestibular[data-sub-vestibular-conteudo="${alvo}"]`)?.classList.add("ativo");
    });
});

function renderizarNotas(lista) {

    corpoTabelaNota.innerHTML = "";

    if (lista.length === 0) {
        corpoTabelaNota.innerHTML = `<tr><td colspan="7" class="mensagem-vazia-tabela">Nenhuma nota do vestibular encontrada.</td></tr>`;
        return;
    }

    lista.forEach(item => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${escaparHTML(item.nome)}</td>
            <td>${escaparHTML(item.curso || "-")}</td>
            <td>${rotuloIngresso(item)}</td>
            <td>${celulaNota(item)}</td>
            <td>${escaparHTML(item.isencao_em || "-")}</td>
            <td>${badgeNota(item.status)}</td>
            <td>
                <div class="acoes-tabela">
                    <button type="button" class="btn-tabela" data-nota="${item.id}" title="Ver detalhes" aria-label="Ver detalhes de ${escaparHTML(item.nome)}"><i class="fa-solid fa-eye"></i></button>
                </div>
            </td>
        `;
        corpoTabelaNota.appendChild(linha);
    });
}

function filtrarNotas() {
    const termo = normalizarTexto(buscaNota.value);
    const status = filtroStatusNota.value;

    const filtrados = notasVestibular.filter(n =>
        (termo === "" || normalizarTexto(`${n.nome} ${n.cpf} ${n.curso || ""}`).includes(termo)) &&
        (status === "" || n.status === status)
    );

    renderizarNotas(filtrados);
}

buscaNota?.addEventListener("input", filtrarNotas);
filtroStatusNota?.addEventListener("change", filtrarNotas);

async function carregarNotas() {
    const resposta = await chamarPHP(PASTA_ISENCAO + "nota-listar-nebula.php");

    if (!resposta.sucesso) {
        corpoTabelaNota.innerHTML = `<tr><td colspan="7" class="mensagem-vazia-tabela">${escaparHTML(mensagemDoErro(resposta))}</td></tr>`;
        return;
    }

    notasVestibular = resposta.notas;
    filtrarNotas();
}

// --- Modal ---

function mostrarMensagemNota(texto) {
    ntMensagem.textContent = texto;
    ntMensagem.classList.toggle("visivel", texto !== "");
}

function fecharAreaMotivoNota() {
    ntAreaObservacao.classList.remove("visivel");
    ntErroMotivo.classList.remove("visivel");
    ntCampoMotivo.value = "";
}

function preencherModalNota() {
    const item = notaAberta;

    document.getElementById("ntCandidato").textContent = item.nome;
    document.getElementById("ntCpf").textContent = formatarCpf(item.cpf);
    document.getElementById("ntEmail").textContent = item.email;
    document.getElementById("ntCurso").textContent = item.curso || "-";
    document.getElementById("ntIngresso").textContent = rotuloIngresso(item);
    document.getElementById("ntNota").textContent = ehEnem(item) || item.nota === null
        ? "Ver no boletim (PDF)"
        : item.nota;
    document.getElementById("ntStatus").innerHTML = badgeNota(item.status);

    document.getElementById("ntDescricao").textContent = ehEnem(item)
        ? "Abra o Boletim do ENEM, confira a nota no PDF e decida. O candidato receberá o resultado por e-mail."
        : "Confira a nota antes de decidir. O candidato receberá a nota e o resultado por e-mail.";

    // PDFs do ENEM (boletim e laudo): mesmo visualizador/baixador dos documentos de isenção
    const listaDocsNota = document.getElementById("ntDocumentos");
    const docsNota = item.documentos || [];
    listaDocsNota.style.display = docsNota.length ? "" : "none";
    listaDocsNota.innerHTML = docsNota.map(d => `
        <div class="doc-linha-isencao">
            <div class="doc-info">
                <i class="fa-solid fa-file-lines"></i>
                <div>
                    <strong>${escaparHTML(d.tipo)}</strong>
                    <small>${escaparHTML(d.nome)}</small>
                </div>
            </div>
            <div class="acoes-visualizador">
                <a class="btn-secundario btn-pequeno" href="${PASTA_ISENCAO}isencao-documento-nebula.php?id=${d.id}" target="_blank" rel="noopener"><i class="fa-solid fa-eye"></i> Visualizar</a>
                <a class="btn-secundario btn-pequeno" href="${PASTA_ISENCAO}isencao-documento-nebula.php?id=${d.id}&baixar=1"><i class="fa-solid fa-download"></i> Baixar</a>
            </div>
        </div>
    `).join("");

    const observacao = document.getElementById("ntObservacaoRegistrada");
    const mostrarMotivo = item.status === "reprovado" && item.motivo;
    observacao.classList.toggle("visivel", Boolean(mostrarMotivo));
    observacao.classList.toggle("recusado", Boolean(mostrarMotivo));
    document.getElementById("ntTextoObservacao").textContent = item.motivo || "";

    document.getElementById("ntAcoes").style.display = item.status === "pendente" ? "" : "none";
}

function abrirModalNota(id) {
    notaAberta = notasVestibular.find(n => n.id === id);
    if (!notaAberta) return;

    fecharAreaMotivoNota();
    mostrarMensagemNota("");
    preencherModalNota();
    modalNota.classList.add("ativo");
}

function fecharModalNota() {
    modalNota.classList.remove("ativo");
    fecharAreaMotivoNota();
    mostrarMensagemNota("");
    notaAberta = null;
}

corpoTabelaNota?.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-nota]");
    if (botao) abrirModalNota(Number(botao.dataset.nota));
});

document.getElementById("fecharModalNota")?.addEventListener("click", fecharModalNota);
modalNota?.addEventListener("click", (e) => {
    if (e.target === modalNota) fecharModalNota();
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalNota.classList.contains("ativo")) fecharModalNota();
});

// --- Decisão ---

function travarBotoesNota(travar) {
    decidindoNota = travar;
    ["ntAprovar", "ntRecusar", "ntConfirmarRecusa", "ntCancelarRecusa"].forEach(id => {
        document.getElementById(id).disabled = travar;
    });
}

async function decidirNota(acao, motivo) {
    if (decidindoNota || !notaAberta) return;

    travarBotoesNota(true);
    mostrarMensagemNota("");

    const dados = { id: notaAberta.id, acao: acao };
    if (acao === "recusar") dados.motivo = motivo;

    const resposta = await chamarPHP(PASTA_ISENCAO + "nota-decidir-nebula.php", dados);

    travarBotoesNota(false);

    if (!resposta.sucesso) {
        if (resposta.campo === "motivo") {
            ntErroMotivo.textContent = mensagemDoErro(resposta);
            ntErroMotivo.classList.add("visivel");
        } else {
            mostrarMensagemNota(mensagemDoErro(resposta));
        }
        return;
    }

    await carregarNotas();

    if (resposta.email_enviado === false) {
        // A decisão foi salva, mas o e-mail falhou: avisa e mantém o modal aberto
        notaAberta = notasVestibular.find(n => n.id === notaAberta.id) || notaAberta;
        fecharAreaMotivoNota();
        preencherModalNota();
        mostrarMensagemNota("Decisão salva, mas o e-mail NÃO pôde ser enviado. Avise o candidato por outro contato.");
        return;
    }

    fecharModalNota();
}

document.getElementById("ntAprovar")?.addEventListener("click", () => decidirNota("aprovar"));

document.getElementById("ntRecusar")?.addEventListener("click", () => {
    mostrarMensagemNota("");
    ntAreaObservacao.classList.add("visivel");
    ntCampoMotivo.focus();
});

document.getElementById("ntCancelarRecusa")?.addEventListener("click", fecharAreaMotivoNota);

document.getElementById("ntConfirmarRecusa")?.addEventListener("click", () => {
    const motivo = ntCampoMotivo.value.trim();

    if (motivo.length < 5) {
        ntErroMotivo.textContent = "Escreva o motivo da recusa (mínimo de 5 caracteres).";
        ntErroMotivo.classList.add("visivel");
        return;
    }

    ntErroMotivo.classList.remove("visivel");
    decidirNota("recusar", motivo);
});

// -----------------------------
// INICIALIZAÇÃO
// -----------------------------

carregarAlunos();
carregarIsencoes();
carregarNotas();
carregarMatriculas();
renderizarFrequencia(frequenciasTurma);
renderizarNotas(historicoNotas);
renderizarDocumentos(documentosEnviados);
atualizarEstatisticasGerais();