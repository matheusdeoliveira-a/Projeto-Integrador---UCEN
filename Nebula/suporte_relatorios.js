// PORTAL DO SUPORTE - RELATÓRIOS

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
const resultadoPesquisa = document.querySelector(".resultado-pesquisa");
const mensagemHeader = document.getElementById("mensagem-header");

caixaPesquisa?.addEventListener("click", () => {
    overlay.classList.add("ativo"); document.body.style.overflow = "hidden";
    inputHeader.value = ""; resultadoPesquisa.style.display = "none";
    listaHeader.forEach(i => i.style.display = "none"); mensagemHeader.style.display = "none";
    setTimeout(() => inputHeader.focus(), 50);
});
fecharPesquisa?.addEventListener("click", fecharBusca);
overlay?.addEventListener("click", e => { if (e.target === overlay) fecharBusca(); });
function fecharBusca(){ overlay.classList.remove("ativo"); document.body.style.overflow = "auto"; }

inputHeader?.addEventListener("input", () => {
    const texto = normalizarTexto(inputHeader.value);
    if (!texto) { resultadoPesquisa.style.display="none"; listaHeader.forEach(i=>i.style.display="none"); mensagemHeader.style.display="none"; return; }
    resultadoPesquisa.style.display="block"; let encontrados=0;
    listaHeader.forEach(item => { const ok=normalizarTexto(item.textContent).includes(texto); item.style.display=ok?"block":"none"; if(ok) encontrados++; });
    mensagemHeader.style.display=encontrados?"none":"block";
});
listaHeader.forEach(item => item.addEventListener("click",()=>{const url=item.dataset.url;if(url)location.href=url;}));

function normalizarTexto(texto){return texto.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");}

// ==========================================================
// DADOS: tudo vem do servidor (relatorios_crud/*.php)
// ==========================================================
const API = "relatorios_crud/";

let tecnicos = [];
let exportacoes = [];

const corpoTecnicos = document.getElementById("corpoTecnicos");
const corpoExportacoes = document.getElementById("corpoExportacoes");

// ---------- utilitários ----------
function esc(texto){
    return String(texto ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

// Mostra um aviso rápido no canto da tela
function aviso(mensagem, tipo = "ok"){
    let caixa = document.getElementById("avisoRelatorios");
    if (!caixa) {
        caixa = document.createElement("div");
        caixa.id = "avisoRelatorios";
        caixa.setAttribute("role", "status");
        document.body.appendChild(caixa);
    }
    caixa.textContent = mensagem;
    caixa.className = `aviso-relatorios ${tipo} visivel`;
    clearTimeout(aviso.timer);
    aviso.timer = setTimeout(() => caixa.classList.remove("visivel"), 3500);
}

// Chamada ao servidor: sempre devolve o JSON (ou lança um Error com a mensagem para o usuário)
async function chamarApi(arquivo, opcoes = {}){
    let resp;
    try {
        resp = await fetch(API + arquivo, { credentials: "same-origin", ...opcoes });
    } catch (_) {
        throw new Error("Sem conexão com o servidor.");
    }
    if (resp.status === 401 || resp.status === 403) {
        location.replace("login.html");
        throw new Error("Sessão expirada.");
    }
    let json;
    try { json = await resp.json(); }
    catch (_) { throw new Error("Resposta inesperada do servidor."); }
    if (!json.sucesso) throw new Error(json.erro || json.mensagem || "Não foi possível concluir a operação.");
    return json;
}

function postar(arquivo, dados){
    return chamarApi(arquivo, { method: "POST", body: dados instanceof FormData ? dados : new URLSearchParams(dados) });
}

function formatarTempo(min){
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    if (h === 0) return `${m}min`;
    return `${h}h ${String(m).padStart(2, "0")}min`;
}

function formatarTamanho(bytes){
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

function abrirModal(el){ el.classList.add("ativo"); }
function fecharModal(el){ el.classList.remove("ativo"); }

// ---------- cards do topo ----------
const statChamadosMes = document.getElementById("statChamadosMes");
const statResolvidos = document.getElementById("statResolvidos");
const statAbertos = document.getElementById("statAbertos");
const statTempoMedio = document.getElementById("statTempoMedio");

// silencioso = true nas atualizações automáticas: se falhar, mantém o que já está na tela, sem aviso
async function carregarChamados(silencioso = false){
    try {
        const r = await chamarApi("chamados_resumo.php");
        statChamadosMes.textContent = r.no_mes;
        statResolvidos.textContent = r.resolvidos;
        statAbertos.textContent = r.abertos;
    } catch (e) { if (!silencioso) aviso(e.message, "erro"); }
}

// O tempo médio vem da própria equipe (média ponderada pelos chamados atendidos)
function atualizarTempoMedio(){
    const r = calcularResumo(tecnicos);
    statTempoMedio.textContent = r.total ? formatarTempo(r.tempoMedio) : "--";
}

// ==========================================================
// DESEMPENHO DA EQUIPE
// ==========================================================
function situacaoLabel(s){return {disponivel:"Disponível",atendimento:"Em atendimento",ausente:"Ausente"}[s]||s;}
function situacaoClasse(s){return {disponivel:"ativo",atendimento:"pendente",ausente:"atrasado"}[s]||"";}
function pctPrazo(t){ return t.atendidos ? Math.round(t.noPrazo / t.atendidos * 100) : 0; }

function renderTecnicos(lista){
    corpoTecnicos.innerHTML = lista.length ? "" :
        `<tr><td colspan="7" class="vazio">${tecnicos.length ? "Nenhum técnico encontrado." : "Nenhum técnico cadastrado ainda. Use o botão “Adicionar técnico”."}</td></tr>`;
    lista.forEach(t => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${esc(t.nome)}</td><td>${t.atendidos}</td><td>${t.noPrazo} <small class="pct">(${pctPrazo(t)}%)</small></td><td>${formatarTempo(t.tempoMin)}</td><td>${t.satisfacao}%</td>
            <td><span class="badge ${situacaoClasse(t.situacao)}">${situacaoLabel(t.situacao)}</span></td>
            <td><div class="acoes-tabela">
                <button type="button" class="btn-tabela" data-editar="${t.id}" title="Editar" aria-label="Editar ${esc(t.nome)}"><i class="fa-solid fa-pen"></i></button>
                <button type="button" class="btn-tabela btn-excluir" data-excluir="${t.id}" title="Excluir" aria-label="Excluir ${esc(t.nome)}"><i class="fa-solid fa-trash"></i></button>
            </div></td>`;
        corpoTecnicos.appendChild(tr);
    });
}

function filtrarTecnicos(){
    const termo = normalizarTexto(document.getElementById("buscaTecnicos").value);
    renderTecnicos(tecnicos.filter(t => normalizarTexto(t.nome).includes(termo)));
}
document.getElementById("buscaTecnicos")?.addEventListener("input", filtrarTecnicos);

// ---------- resumo automático da equipe ----------
// Regras do "nível" (ajuste os números aqui se a faculdade usar outras metas):
//   Excelente: >= 90% no prazo E satisfação média >= 90%
//   Estável:   >= 75% no prazo E satisfação média >= 80%
//   Atenção:   qualquer valor abaixo disso
// Um técnico entra na lista "Atenção" se tiver < 80% no prazo OU satisfação < 85%.
const META = { prazoExcelente: 90, satisExcelente: 90, prazoEstavel: 75, satisEstavel: 80, prazoAlerta: 80, satisAlerta: 85 };

function calcularResumo(lista){
    const total = lista.length;
    const atendidos = lista.reduce((s, t) => s + t.atendidos, 0);
    const noPrazo = lista.reduce((s, t) => s + t.noPrazo, 0);
    const pctGeral = atendidos ? Math.round(noPrazo / atendidos * 100) : 0;
    // média do tempo ponderada pelos atendimentos (se ninguém atendeu, média simples)
    const tempoMedio = atendidos
        ? lista.reduce((s, t) => s + t.tempoMin * t.atendidos, 0) / atendidos
        : (total ? lista.reduce((s, t) => s + t.tempoMin, 0) / total : 0);
    const satisfacao = total ? Math.round(lista.reduce((s, t) => s + t.satisfacao, 0) / total) : 0;
    const situacao = { disponivel: 0, atendimento: 0, ausente: 0 };
    lista.forEach(t => { if (t.situacao in situacao) situacao[t.situacao]++; });

    const destaque = total ? [...lista].sort((a, b) => b.satisfacao - a.satisfacao || pctPrazo(b) - pctPrazo(a))[0] : null;
    const atencao = lista.filter(t => t.atendidos > 0 && (pctPrazo(t) < META.prazoAlerta || t.satisfacao < META.satisAlerta));

    let nivel = "atrasado", nivelTexto = "Atenção";
    if (pctGeral >= META.prazoExcelente && satisfacao >= META.satisExcelente) { nivel = "ativo"; nivelTexto = "Excelente"; }
    else if (pctGeral >= META.prazoEstavel && satisfacao >= META.satisEstavel) { nivel = "pendente"; nivelTexto = "Estável"; }

    return { total, atendidos, noPrazo, pctGeral, tempoMedio, satisfacao, situacao, destaque, atencao, nivel, nivelTexto };
}

function renderResumo(){
    const r = calcularResumo(tecnicos);
    const nivel = document.getElementById("resumoNivel");
    const texto = document.getElementById("resumoTexto");
    const metricas = document.getElementById("resumoMetricas");
    const listas = document.getElementById("resumoListas");

    if (!r.total) {
        nivel.className = "badge"; nivel.textContent = "Sem dados";
        texto.textContent = "Ainda não há técnicos cadastrados. Adicione os técnicos da equipe para ver o resumo do desempenho.";
        metricas.innerHTML = ""; listas.innerHTML = "";
        return;
    }

    nivel.className = `badge ${r.nivel}`;
    nivel.textContent = r.nivelTexto;

    const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
    texto.textContent =
        `A equipe tem ${plural(r.total, "técnico", "técnicos")} (${r.situacao.disponivel} disponível(is), ${r.situacao.atendimento} em atendimento, ${r.situacao.ausente} ausente(s)). ` +
        (r.atendidos
            ? `Foram ${r.atendidos} chamados atendidos, ${r.noPrazo} deles (${r.pctGeral}%) dentro do prazo, com tempo médio de ${formatarTempo(r.tempoMedio)} e satisfação média de ${r.satisfacao}%.`
            : `Nenhum chamado atendido registrado até agora.`);

    const item = (icone, valor, rotulo) => `<div class="resumo-item"><i class="fa-solid ${icone}"></i><strong>${valor}</strong><span>${rotulo}</span></div>`;
    metricas.innerHTML =
        item("fa-user-group", r.total, "Técnicos") +
        item("fa-headset", r.atendidos, "Chamados atendidos") +
        item("fa-clock", `${r.pctGeral}%`, "Resolvidos no prazo") +
        item("fa-hourglass-half", formatarTempo(r.tempoMedio), "Tempo médio") +
        item("fa-face-smile", `${r.satisfacao}%`, "Satisfação média") +
        item("fa-circle-check", `${r.situacao.disponivel}/${r.total}`, "Disponíveis agora");

    let html = "";
    if (r.destaque) {
        html += `<div class="resumo-lista destaque"><h4><i class="fa-solid fa-star"></i> Destaque</h4><p>${esc(r.destaque.nome)} — satisfação ${r.destaque.satisfacao}%, ${pctPrazo(r.destaque)}% no prazo.</p></div>`;
    }
    html += r.atencao.length
        ? `<div class="resumo-lista atencao"><h4><i class="fa-solid fa-triangle-exclamation"></i> Pontos de atenção</h4><ul>${
            r.atencao.map(t => `<li>${esc(t.nome)} — ${pctPrazo(t)}% no prazo, satisfação ${t.satisfacao}%</li>`).join("")
          }</ul></div>`
        : `<div class="resumo-lista"><h4><i class="fa-solid fa-circle-check"></i> Pontos de atenção</h4><p>Nenhum técnico abaixo das metas.</p></div>`;
    listas.innerHTML = html;
}

async function carregarTecnicos(silencioso = false){
    try {
        tecnicos = (await chamarApi("desempenho_listar.php")).tecnicos;
    } catch (e) {
        if (silencioso) return;   // atualização automática falhou: mantém a tela como está
        tecnicos = [];
        aviso(e.message, "erro");
    }
    filtrarTecnicos(); renderResumo(); atualizarTempoMedio();
}

// ---------- modal de técnico (adicionar / editar) ----------
const modalTecnico = document.getElementById("modalTecnico");
const formTecnico = document.getElementById("formTecnico");
const msgTecnico = document.getElementById("msgTecnico");

function abrirFormTecnico(t){
    formTecnico.reset();
    msgTecnico.textContent = "";
    document.getElementById("idTecnico").value = t ? t.id : "";
    document.getElementById("tituloModalTecnico").textContent = t ? "Editar técnico" : "Adicionar técnico";
    if (t) {
        document.getElementById("nomeTecnico").value = t.nome;
        document.getElementById("atendidosTecnico").value = t.atendidos;
        document.getElementById("noPrazoTecnico").value = t.noPrazo;
        document.getElementById("horasTecnico").value = Math.floor(t.tempoMin / 60);
        document.getElementById("minutosTecnico").value = t.tempoMin % 60;
        document.getElementById("satisfacaoTecnico").value = t.satisfacao;
        document.getElementById("situacaoTecnico").value = t.situacao;
    }
    abrirModal(modalTecnico);
    setTimeout(() => document.getElementById("nomeTecnico").focus(), 50);
}

document.getElementById("btnAdicionarTecnico")?.addEventListener("click", () => abrirFormTecnico(null));
document.getElementById("fecharModalTecnico")?.addEventListener("click", () => fecharModal(modalTecnico));
document.getElementById("cancelarModalTecnico")?.addEventListener("click", () => fecharModal(modalTecnico));
modalTecnico?.addEventListener("click", e => { if (e.target === modalTecnico) fecharModal(modalTecnico); });

formTecnico?.addEventListener("submit", async e => {
    e.preventDefault();
    msgTecnico.textContent = "";
    const atendidos = parseInt(document.getElementById("atendidosTecnico").value, 10);
    const noPrazo = parseInt(document.getElementById("noPrazoTecnico").value, 10);
    if (noPrazo > atendidos) { msgTecnico.textContent = "Resolvidos no prazo não pode ser maior que os chamados atendidos."; return; }

    const horas = parseInt(document.getElementById("horasTecnico").value, 10) || 0;
    const minutos = parseInt(document.getElementById("minutosTecnico").value, 10) || 0;
    const botao = document.getElementById("btnSalvarTecnico");
    botao.disabled = true;
    try {
        const r = await postar("desempenho_salvar.php", {
            id: document.getElementById("idTecnico").value,
            nome: document.getElementById("nomeTecnico").value.trim(),
            atendidos, no_prazo: noPrazo,
            tempo_min: horas * 60 + minutos,
            satisfacao: document.getElementById("satisfacaoTecnico").value,
            situacao: document.getElementById("situacaoTecnico").value
        });
        fecharModal(modalTecnico);
        aviso(r.mensagem);
        await carregarTecnicos();
    } catch (err) {
        msgTecnico.textContent = err.message;
    } finally {
        botao.disabled = false;
    }
});

// ==========================================================
// RELATÓRIOS GERADOS (PDFs)
// ==========================================================
function renderExportacoes(lista){
    corpoExportacoes.innerHTML = lista.length ? "" :
        `<tr><td colspan="6" class="vazio">${exportacoes.length ? "Nenhum relatório encontrado." : "Nenhum relatório adicionado ainda. Use o botão “Adicionar relatório”."}</td></tr>`;
    lista.forEach(e => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${esc(e.titulo)}</td><td>${esc(e.categoria)}</td><td>${esc(e.periodo)}</td><td>${esc(e.data)}</td><td>${formatarTamanho(e.tamanho)}</td>
            <td><div class="acoes-tabela">
                <button type="button" class="btn-tabela" data-ver="${e.id}" title="Visualizar" aria-label="Visualizar ${esc(e.titulo)}"><i class="fa-solid fa-eye"></i></button>
                <a class="btn-tabela" href="${API}relatorio_abrir.php?id=${e.id}&baixar=1" title="Baixar" aria-label="Baixar ${esc(e.titulo)}"><i class="fa-solid fa-download"></i></a>
                <button type="button" class="btn-tabela btn-excluir" data-excluir-rel="${e.id}" title="Excluir" aria-label="Excluir ${esc(e.titulo)}"><i class="fa-solid fa-trash"></i></button>
            </div></td>`;
        corpoExportacoes.appendChild(tr);
    });
}

function filtrarRelatorios(){
    const termo = normalizarTexto(document.getElementById("buscaRelatorios").value);
    renderExportacoes(exportacoes.filter(e => normalizarTexto(`${e.titulo} ${e.categoria} ${e.periodo}`).includes(termo)));
}
document.getElementById("buscaRelatorios")?.addEventListener("input", filtrarRelatorios);

async function carregarRelatorios(){
    try {
        exportacoes = (await chamarApi("relatorio_listar.php")).relatorios;
    } catch (e) {
        exportacoes = [];
        aviso(e.message, "erro");
    }
    filtrarRelatorios();
}

// ---------- modal de envio ----------
const modalRelatorio = document.getElementById("modalRelatorio");
const formRelatorio = document.getElementById("formRelatorio");
const msgRelatorio = document.getElementById("msgRelatorio");
const arquivoRelatorio = document.getElementById("arquivoRelatorio");
const TAMANHO_MAX = 20 * 1024 * 1024;

document.getElementById("btnAdicionarRelatorio")?.addEventListener("click", () => {
    formRelatorio.reset(); msgRelatorio.textContent = "";
    abrirModal(modalRelatorio);
    setTimeout(() => document.getElementById("tituloRelatorio").focus(), 50);
});
document.getElementById("fecharModalRelatorio")?.addEventListener("click", () => fecharModal(modalRelatorio));
document.getElementById("cancelarModalRelatorio")?.addEventListener("click", () => fecharModal(modalRelatorio));
modalRelatorio?.addEventListener("click", e => { if (e.target === modalRelatorio) fecharModal(modalRelatorio); });

// Ao escolher o PDF, sugere o título com o nome do arquivo (se o campo ainda estiver vazio)
arquivoRelatorio?.addEventListener("change", () => {
    const titulo = document.getElementById("tituloRelatorio");
    const f = arquivoRelatorio.files[0];
    if (f && !titulo.value.trim()) titulo.value = f.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();
});

formRelatorio?.addEventListener("submit", async e => {
    e.preventDefault();
    msgRelatorio.textContent = "";
    const f = arquivoRelatorio.files[0];
    if (!f) { msgRelatorio.textContent = "Escolha um arquivo PDF."; return; }
    if (!/\.pdf$/i.test(f.name)) { msgRelatorio.textContent = "Só é permitido enviar arquivos .pdf."; return; }
    if (f.size > TAMANHO_MAX) { msgRelatorio.textContent = "O PDF passa de 20 MB."; return; }

    const dados = new FormData();
    dados.append("titulo", document.getElementById("tituloRelatorio").value.trim());
    dados.append("categoria", document.getElementById("categoriaRelatorio").value);
    dados.append("periodo", document.getElementById("periodoRelatorio").value.trim());
    dados.append("arquivo", f);

    const botao = document.getElementById("btnEnviarRelatorio");
    botao.disabled = true; botao.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Enviando...`;
    try {
        const r = await postar("relatorio_upload.php", dados);
        fecharModal(modalRelatorio);
        aviso(r.mensagem);
        await carregarRelatorios();
    } catch (err) {
        msgRelatorio.textContent = err.message;
    } finally {
        botao.disabled = false; botao.innerHTML = `<i class="fa-solid fa-upload"></i> Enviar`;
    }
});

// ---------- visualizar PDF ----------
const modalVisualizar = document.getElementById("modalVisualizar");
const frameVisualizar = document.getElementById("frameVisualizar");

function visualizarRelatorio(id){
    const rel = exportacoes.find(x => x.id === id);
    if (!rel) return;
    const url = `${API}relatorio_abrir.php?id=${id}`;
    document.getElementById("tituloVisualizar").textContent = rel.titulo;
    document.getElementById("linkNovaAba").href = url;
    document.getElementById("linkBaixar").href = url + "&baixar=1";
    frameVisualizar.src = url;
    abrirModal(modalVisualizar);
}
function fecharVisualizar(){ fecharModal(modalVisualizar); frameVisualizar.src = "about:blank"; }
document.getElementById("fecharModalVisualizar")?.addEventListener("click", fecharVisualizar);
modalVisualizar?.addEventListener("click", e => { if (e.target === modalVisualizar) fecharVisualizar(); });

// ==========================================================
// CONFIRMAR EXCLUSÃO (técnicos e relatórios)
// ==========================================================
const modalConfirmar = document.getElementById("modalConfirmar");
let acaoConfirmada = null;

function pedirConfirmacao(texto, acao){
    document.getElementById("textoConfirmar").textContent = texto;
    acaoConfirmada = acao;
    abrirModal(modalConfirmar);
}
function fecharConfirmar(){ fecharModal(modalConfirmar); acaoConfirmada = null; }
document.getElementById("fecharModalConfirmar")?.addEventListener("click", fecharConfirmar);
document.getElementById("cancelarConfirmar")?.addEventListener("click", fecharConfirmar);
modalConfirmar?.addEventListener("click", e => { if (e.target === modalConfirmar) fecharConfirmar(); });
document.getElementById("okConfirmar")?.addEventListener("click", async () => {
    const acao = acaoConfirmada;
    fecharConfirmar();
    if (acao) await acao();
});

// Cliques nos botões das tabelas (delegação: funciona para as linhas criadas depois)
corpoTecnicos?.addEventListener("click", e => {
    const bEditar = e.target.closest("[data-editar]");
    const bExcluir = e.target.closest("[data-excluir]");
    if (bEditar) {
        const t = tecnicos.find(x => x.id === Number(bEditar.dataset.editar));
        if (t) abrirFormTecnico(t);
    } else if (bExcluir) {
        const t = tecnicos.find(x => x.id === Number(bExcluir.dataset.excluir));
        if (!t) return;
        pedirConfirmacao(`Remover "${t.nome}" do desempenho da equipe?`, async () => {
            try { aviso((await postar("desempenho_excluir.php", { id: t.id })).mensagem); await carregarTecnicos(); }
            catch (err) { aviso(err.message, "erro"); }
        });
    }
});

corpoExportacoes?.addEventListener("click", e => {
    const bVer = e.target.closest("[data-ver]");
    const bExcluir = e.target.closest("[data-excluir-rel]");
    if (bVer) {
        visualizarRelatorio(Number(bVer.dataset.ver));
    } else if (bExcluir) {
        const r = exportacoes.find(x => x.id === Number(bExcluir.dataset.excluirRel));
        if (!r) return;
        pedirConfirmacao(`Excluir o relatório "${r.titulo}"? O PDF será apagado do servidor.`, async () => {
            try { aviso((await postar("relatorio_excluir.php", { id: r.id })).mensagem); await carregarRelatorios(); }
            catch (err) { aviso(err.message, "erro"); }
        });
    }
});

// ESC fecha o modal que estiver aberto
document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (modalVisualizar.classList.contains("ativo")) fecharVisualizar();
    else document.querySelectorAll(".modal-overlay.ativo").forEach(m => m.classList.remove("ativo"));
});

// ---------- abas ----------
document.querySelectorAll("[data-aba-relatorio]").forEach(btn => btn.addEventListener("click", () => {
    const alvo = btn.dataset.abaRelatorio;
    document.querySelectorAll("[data-aba-relatorio]").forEach(b => b.classList.remove("ativo")); btn.classList.add("ativo");
    document.querySelectorAll("[data-conteudo-relatorio]").forEach(c => c.classList.remove("ativo"));
    document.querySelector(`[data-conteudo-relatorio="${alvo}"]`).classList.add("ativo");
}));

// ---------- atualização automática ----------
// Os cards do topo e o resumo da equipe se atualizam sozinhos a cada 15 segundos
// (só com a aba visível) e na hora em que você volta para a aba.
const INTERVALO_ATUALIZACAO = 15000;

function atualizarPainel(){
    carregarChamados(true);
    carregarTecnicos(true);
}
setInterval(() => { if (!document.hidden) atualizarPainel(); }, INTERVALO_ATUALIZACAO);
document.addEventListener("visibilitychange", () => { if (!document.hidden) atualizarPainel(); });

// ---------- início ----------
carregarChamados();
carregarTecnicos();
carregarRelatorios();