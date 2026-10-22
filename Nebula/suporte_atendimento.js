/* ==========================================================================
   CENTRAL DE ATENDIMENTO - suporte_atendimento.js
   Índice:
   1. Menu lateral (abrir/fechar)
   2. Pesquisa do cabeçalho (overlay + filtro da lista de páginas)
   3. Dados (vêm do servidor) e comunicação com o PHP
   4. Funções auxiliares (escape de HTML, badge de status, aviso na tela)
   5. Renderização das tabelas e dos cards de estatística
   6. Abas (Chamados / E-mails enviados)
   7. Filtros e buscas das tabelas
   8. Modais (abrir/fechar)
   9. Chamado: abrir, mudar status e responder por e-mail
   10. E-mail avulso (botão "Enviar e-mail")
   11. Inicialização
   ========================================================================== */


/* ==========================================================================
   1. MENU LATERAL
   - O botão de hambúrguer alterna a classe "aberto" (expande/recolhe o menu).
   - Clicar fora do menu, quando ele está aberto, também o fecha.
   ========================================================================== */
const menu = document.getElementById("menu");

// "?." evita erro caso o botão não exista na página
document.getElementById("botaoMenuFechar")?.addEventListener("click", () => menu.classList.toggle("aberto"));

// Fecha o menu ao clicar em qualquer lugar fora dele
document.addEventListener("click", e => {
    if (menu?.classList.contains("aberto") && !menu.contains(e.target)) menu.classList.remove("aberto");
});


/* ==========================================================================
   2. PESQUISA DO CABEÇALHO
   A caixa do topo é só um "gatilho" (readonly): ao clicar, abre um overlay
   com a barra de pesquisa real e uma lista de páginas do portal.
   ========================================================================== */
const caixaPesquisa = document.getElementById("caixaPesquisa");
const overlay = document.getElementById("overlayPesquisa");
const fecharPesquisa = document.getElementById("fecharPesquisa");
const inputHeader = document.getElementById("pesquisa-header");
const listaHeader = document.querySelectorAll("#lista-header li");
const mensagemHeader = document.getElementById("mensagem-header");
const resultadoPesquisa = document.querySelector(".resultado-pesquisa");

// Abre o overlay: trava o scroll da página, limpa o campo, esconde resultados
// antigos e foca no input (setTimeout dá tempo da animação de abertura).
caixaPesquisa?.addEventListener("click", () => {
    overlay.classList.add("ativo"); document.body.style.overflow = "hidden";
    inputHeader.value = ""; resultadoPesquisa.style.display = "none";
    listaHeader.forEach(i => i.style.display = "none"); mensagemHeader.style.display = "none";
    setTimeout(() => inputHeader.focus(), 50);
});

// Fecha o overlay pelo botão X e devolve o scroll da página
fecharPesquisa?.addEventListener("click", () => { overlay.classList.remove("ativo"); document.body.style.overflow = "auto"; });

// Fecha o overlay ao clicar no fundo escuro (e não dentro do painel)
overlay?.addEventListener("click", e => { if (e.target === overlay) { overlay.classList.remove("ativo"); document.body.style.overflow = "auto"; } });

// Filtra a lista de páginas conforme o usuário digita.
// O texto digitado é normalizado (minúsculo e sem acentos).
inputHeader?.addEventListener("input", () => {
    const texto = inputHeader.value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Campo vazio: esconde tudo
    if (!texto) { resultadoPesquisa.style.display = "none"; listaHeader.forEach(i => i.style.display = "none"); mensagemHeader.style.display = "none"; return; }

    resultadoPesquisa.style.display = "block";
    let encontrados = 0;
    listaHeader.forEach(item => {
        // OBS: aqui o texto do item NÃO é normalizado, então digitar "academico"
        // (sem acento) não encontra "Acadêmico". Se quiser corrigir, aplique o
        // mesmo .normalize("NFD").replace(...) em item.textContent.
        const ok = item.textContent.toLowerCase().includes(texto);
        item.style.display = ok ? "block" : "none";
        if (ok) encontrados++;
    });

    // Mostra "Nenhum resultado encontrado." se nada bateu
    mensagemHeader.style.display = encontrados ? "none" : "block";
});

// Clicar em um item da lista navega para a URL guardada em data-url
listaHeader.forEach(item => item.addEventListener("click", () => { const url = item.dataset.url; if (url) location.href = url; }));


/* ==========================================================================
   3. DADOS E COMUNICAÇÃO COM O PHP
   Chamados: tabela `chamados` (atendimento_crud/chamado_listar.php).
   E-mails: tabela `emails_enviados` (atendimento_crud/email_listar.php).
   Depois de qualquer alteração (status, resposta, e-mail) os dados são pedidos
   de novo ao servidor, então a tela sempre mostra o que está salvo.
   ========================================================================== */
const chamados = [];
const emails = [];
let chamadoAberto = null;   // número (id) do chamado aberto no modal

// Chama um PHP. Com "dados" vira POST. Sempre devolve um objeto { sucesso, ... }.
// Sem sessão de suporte (401/403), volta para o login.
async function chamarPHP(url, dados) {
    try {
        // FormData (com anexos) vai como está; objeto simples vira formulário comum
        const opcoes = dados ? { method: "POST", body: dados instanceof FormData ? dados : new URLSearchParams(dados) } : {};
        const resposta = await fetch(url, opcoes);
        if (resposta.status === 401 || resposta.status === 403) {
            location.replace("login.html");
            return { sucesso: false, erro: "Sessão expirada." };
        }
        return await resposta.json();
    } catch (erro) {
        return { sucesso: false, erro: "Não foi possível conectar ao servidor." };
    }
}

async function carregarChamados() {
    const resposta = await chamarPHP("atendimento_crud/chamado_listar.php");
    if (!resposta.sucesso) {
        document.getElementById("tabelaChamados").innerHTML =
            `<tr><td colspan="7" class="vazio">${esc(resposta.erro || resposta.mensagem || "Não foi possível carregar os chamados.")}</td></tr>`;
        return;
    }
    chamados.splice(0, chamados.length, ...resposta.chamados);
}

async function carregarEmails() {
    const resposta = await chamarPHP("atendimento_crud/email_listar.php");
    if (!resposta.sucesso) {
        document.getElementById("tabelaEmails").innerHTML =
            `<tr><td colspan="5" class="vazio">${esc(resposta.erro || resposta.mensagem || "Não foi possível carregar os e-mails.")}</td></tr>`;
        return;
    }
    emails.splice(0, emails.length, ...resposta.emails);
}

// Recarrega tudo, redesenha a tela e, se o modal de um chamado está aberto, atualiza ele também
async function atualizarTudo() {
    await Promise.all([carregarChamados(), carregarEmails()]);
    renderChamados(); renderEmails(); atualizarStats();
    if (chamadoAberto !== null) preencherChamado(chamadoAberto);
}


/* ==========================================================================
   4. FUNÇÕES AUXILIARES
   ========================================================================== */

// Escapa HTML: os chamados vêm de visitantes e alunos, então NUNCA vão direto para o innerHTML.
function esc(texto) {
    return String(texto ?? "")
        .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

// Etiqueta colorida de status. A classe CSS vem do texto: "Em andamento" -> "em-andamento".
function badge(status) {
    const classe = String(status).toLowerCase().replaceAll(" ", "-");
    return `<span class="badge ${esc(classe)}">${esc(status)}</span>`;
}

// Mensagem rápida no canto da tela (tipo: "ok" ou "erro")
function avisar(texto, tipo = "ok") {
    const el = document.createElement("div");
    el.className = `toast ${tipo}`;
    el.setAttribute("role", "status");
    el.textContent = texto;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4500);
}


/* ==========================================================================
   5. RENDERIZAÇÃO
   ========================================================================== */

// Tabela de chamados: busca + filtro de status + filtro de categoria.
// A coluna "Ação" tem um único botão: abre o chamado para ver, mudar o status e responder.
function renderChamados() {
    const busca = document.getElementById("buscaChamado").value.toLowerCase();
    const status = document.getElementById("filtroStatus").value;
    const categoria = document.getElementById("filtroCategoria").value;

    const filtrados = chamados.filter(c =>
        (!busca || `${c.id} ${c.aluno} ${c.assunto}`.toLowerCase().includes(busca)) &&
        (!status || c.status === status) &&
        (!categoria || c.categoria === categoria)
    );

    document.getElementById("tabelaChamados").innerHTML = filtrados.map(c => `
        <tr><td><strong>${esc(c.id)}</strong><small>${esc(c.assunto)}</small></td><td>${esc(c.aluno)}</td><td>${esc(c.categoria)}</td>
        <td>${esc(c.data)}</td><td>${esc(c.responsavel)}</td><td>${badge(c.status)}</td>
        <td><div class="acoes-tabela">
            <button type="button" class="btn-tabela" data-ver-chamado="${c.num}" title="Abrir e responder" aria-label="Abrir e responder chamado ${esc(c.id)}"><i class="fa-solid fa-eye"></i></button>
        </div></td></tr>
    `).join("") || `<tr><td colspan="7" class="vazio">Nenhum chamado encontrado.</td></tr>`;
}

// Tabela de e-mails enviados (os que falharam aparecem com etiqueta vermelha)
function renderEmails() {
    const busca = document.getElementById("buscaEmail").value.toLowerCase();
    const filtrados = emails.filter(e => `${e.dest} ${e.assunto} ${e.chamado ?? ""}`.toLowerCase().includes(busca));
    document.getElementById("tabelaEmails").innerHTML = filtrados.map(e =>
        `<tr><td>${esc(e.dest)}</td><td>${esc(e.assunto)}</td><td>${esc(e.data)}</td><td>${esc(e.resp)}</td><td>${badge(e.status)}</td></tr>`
    ).join("") || `<tr><td colspan="5" class="vazio">Nenhum e-mail encontrado.</td></tr>`;
}

// Cards do topo. "Abertos" = Pendente, "Resolvidos" = Respondido, e-mails = só os que saíram.
function atualizarStats() {
    document.getElementById("statAbertos").textContent = chamados.filter(c => c.status === "Pendente").length;
    document.getElementById("statAndamento").textContent = chamados.filter(c => c.status === "Em andamento").length;
    document.getElementById("statResolvidos").textContent = chamados.filter(c => c.status === "Respondido").length;
    document.getElementById("statEmails").textContent = emails.filter(e => e.status === "Enviado").length;
}


/* ==========================================================================
   6. ABAS (CHAMADOS / E-MAILS ENVIADOS)
   ========================================================================== */
document.querySelectorAll("[data-aba-atendimento]").forEach(btn => btn.addEventListener("click", () => {
    const alvo = btn.dataset.abaAtendimento;
    document.querySelectorAll("[data-aba-atendimento]").forEach(b => b.classList.remove("ativo")); btn.classList.add("ativo");
    document.querySelectorAll("[data-conteudo-atendimento]").forEach(c => c.classList.remove("ativo"));
    document.querySelector(`[data-conteudo-atendimento="${alvo}"]`).classList.add("ativo");
}));


/* ==========================================================================
   7. FILTROS E BUSCAS
   ========================================================================== */
document.getElementById("buscaChamado").addEventListener("input", renderChamados);
document.getElementById("filtroStatus").addEventListener("change", renderChamados);
document.getElementById("filtroCategoria").addEventListener("change", renderChamados);
document.getElementById("buscaEmail").addEventListener("input", renderEmails);


/* ==========================================================================
   8. MODAIS
   ========================================================================== */
function abrirModal(id) { document.getElementById(id).classList.add("ativo"); }
function fecharModal(id) {
    document.getElementById(id).classList.remove("ativo");
    if (id === "modalVerChamado") chamadoAberto = null;
}

document.getElementById("novoEmail").addEventListener("click", () => abrirModal("modalEmail"));

document.querySelectorAll(".fechar-modal, [data-close]").forEach(b => b.addEventListener("click", () => {
    const target = b.dataset.close || b.closest(".modal-overlay")?.id;
    if (target) fecharModal(target);
}));

document.querySelectorAll(".modal-overlay").forEach(m => m.addEventListener("click", e => { if (e.target === m) fecharModal(m.id); }));


/* ==========================================================================
   ANEXOS (usados na resposta do chamado e no e-mail avulso)
   Mesmos limites do PHP (atendimento_comum.php): 5 arquivos, 10 MB cada, 15 MB no total
   ========================================================================== */
const ANEXO_MAX_ARQUIVOS = 5;
const ANEXO_MAX_CADA = 10 * 1024 * 1024;
const ANEXO_MAX_TOTAL = 15 * 1024 * 1024;
const ANEXO_EXTENSOES = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "png", "jpg", "jpeg", "zip"];

// Devolve um texto de erro (ou "" se está tudo certo) para os arquivos escolhidos no campo
function validarAnexos(input) {
    const arquivos = [...input.files];
    if (arquivos.length > ANEXO_MAX_ARQUIVOS) return `Envie no máximo ${ANEXO_MAX_ARQUIVOS} anexos por e-mail.`;
    let total = 0;
    for (const f of arquivos) {
        const ext = f.name.split(".").pop().toLowerCase();
        if (!ANEXO_EXTENSOES.includes(ext)) return `Tipo de arquivo não permitido: "${f.name}".`;
        if (f.size > ANEXO_MAX_CADA) return `O anexo "${f.name}" passa de 10 MB.`;
        total += f.size;
    }
    if (total > ANEXO_MAX_TOTAL) return "Os anexos passam de 15 MB no total.";
    return "";
}

// Monta o formulário de envio com os campos de texto e os arquivos
function montarEnvio(campos, input) {
    const dados = new FormData();
    Object.entries(campos).forEach(([nome, valor]) => dados.append(nome, valor));
    [...input.files].forEach(f => dados.append("anexos[]", f));
    return dados;
}


/* ==========================================================================
   9. CHAMADO: ABRIR, MUDAR STATUS E RESPONDER
   ========================================================================== */
const selectStatus = document.getElementById("statusChamado");
const formResposta = document.getElementById("formResposta");

// Preenche o modal com o chamado e as respostas já enviadas (vêm dos arrays já carregados)
function preencherChamado(num) {
    const c = chamados.find(x => x.num === num);
    if (!c) return;

    // textContent não interpreta HTML: seguro para texto vindo de visitantes
    document.getElementById("verChamadoId").textContent = "Chamado " + c.id;
    document.getElementById("verChamadoAssunto").textContent = c.assunto;
    document.getElementById("verNome").textContent = c.aluno;
    document.getElementById("verEmail").textContent = c.email || "—";
    document.getElementById("verCategoria").textContent = c.categoria;
    document.getElementById("verOrigem").textContent = c.origem;
    document.getElementById("verData").textContent = c.data;
    document.getElementById("verResponsavel").textContent = c.responsavel;
    document.getElementById("verChamadoMensagem").textContent = c.mensagem;
    selectStatus.value = c.status;

    // A lista de e-mails vem do mais novo para o mais antigo; aqui mostramos na ordem da conversa
    const respostas = emails.filter(e => e.chamado_num === num).reverse();
    document.getElementById("verRespostas").innerHTML = respostas.length
        ? respostas.map(r => `
            <div class="resposta">
                <div class="resposta-topo"><strong>${esc(r.resp)}</strong><span>${esc(r.data)}</span>${badge(r.status)}</div>
                <p>${esc(r.mensagem)}</p>
            </div>`).join("")
        : `<p class="sem-respostas">Nenhuma resposta enviada ainda.</p>`;
}

// Botão do olho da tabela: abre o chamado
document.getElementById("tabelaChamados").addEventListener("click", e => {
    const botao = e.target.closest("[data-ver-chamado]");
    if (!botao) return;
    const num = Number(botao.dataset.verChamado);
    if (!chamados.some(c => c.num === num)) return;

    chamadoAberto = num;
    formResposta.reset();
    preencherChamado(num);
    abrirModal("modalVerChamado");
});

// Mudar o status salva na hora. Quem muda passa a ser o responsável.
selectStatus.addEventListener("change", async () => {
    if (chamadoAberto === null) return;
    const resposta = await chamarPHP("atendimento_crud/chamado_status.php", {
        id: chamadoAberto,
        status: selectStatus.value
    });
    avisar(resposta.sucesso ? (resposta.mensagem || "Status atualizado.") : (resposta.erro || "Não foi possível alterar o status."),
           resposta.sucesso ? "ok" : "erro");
    await atualizarTudo();   // mostra o valor realmente salvo (e desfaz a troca se deu erro)
});

// Responder: o PHP envia o e-mail de verdade. Se der certo, o chamado muda de status
// e a resposta aparece no histórico do chamado e na aba "E-mails enviados".
formResposta.addEventListener("submit", async e => {
    e.preventDefault();
    const mensagem = document.getElementById("mensagemResposta").value.trim();
    if (!mensagem || chamadoAberto === null) return;

    const inputAnexos = document.getElementById("anexosResposta");
    const erroAnexo = validarAnexos(inputAnexos);
    if (erroAnexo) { avisar(erroAnexo, "erro"); return; }

    const botao = document.getElementById("btnEnviarResposta");
    const textoOriginal = botao.innerHTML;
    botao.disabled = true; botao.textContent = "Enviando...";   // evita enviar duas vezes

    const resposta = await chamarPHP("atendimento_crud/chamado_responder.php", montarEnvio({
        id: chamadoAberto,
        mensagem: mensagem,
        status_apos: document.getElementById("statusApos").value
    }, inputAnexos));

    botao.disabled = false; botao.innerHTML = textoOriginal;

    if (resposta.sucesso) {
        avisar(resposta.mensagem || "Resposta enviada por e-mail.", "ok");
        formResposta.reset();
    } else {
        avisar(resposta.erro || "Não foi possível enviar a resposta.", "erro");   // o texto digitado fica, para tentar de novo
    }
    await atualizarTudo();
});


/* ==========================================================================
   10. E-MAIL AVULSO (botão "Enviar e-mail", sem chamado)
   ========================================================================== */
document.getElementById("formEmail").addEventListener("submit", async e => {
    e.preventDefault();
    const inputAnexos = document.getElementById("anexosEmail");
    const erroAnexo = validarAnexos(inputAnexos);
    if (erroAnexo) { avisar(erroAnexo, "erro"); return; }

    const botao = document.getElementById("btnEnviarEmail");
    const textoOriginal = botao.innerHTML;
    botao.disabled = true; botao.textContent = "Enviando...";

    const resposta = await chamarPHP("atendimento_crud/email_enviar.php", montarEnvio({
        destinatario: document.getElementById("destinatarioEmail").value,
        assunto: document.getElementById("assuntoEmail").value,
        mensagem: document.getElementById("mensagemEmail").value
    }, inputAnexos));

    botao.disabled = false; botao.innerHTML = textoOriginal;

    if (resposta.sucesso) {
        avisar(resposta.mensagem || "E-mail enviado.", "ok");
        e.target.reset(); fecharModal("modalEmail");
    } else {
        avisar(resposta.erro || "Não foi possível enviar o e-mail.", "erro");
    }
    await atualizarTudo();
});


/* ==========================================================================
   11. INICIALIZAÇÃO
   Ao carregar a página, busca chamados e e-mails no servidor.
   ========================================================================== */
atualizarTudo();
