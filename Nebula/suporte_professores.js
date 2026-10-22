// PORTAL DO SUPORTE - PROFESSORES

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

// Escapa texto antes de colocar em innerHTML (evita XSS com dados digitados no formulário)
function esc(valor){
    return String(valor).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

let professores = [];   // preenchido por carregarProfessores() com os dados reais do banco

// ===== DISCIPLINAS (aba): montada a partir dos professores reais do banco =====
// Não existe mais lista fixa de teste. Cada disciplina de cada professor (tabela
// prof_disciplinas) vira uma linha: disciplina + departamento + professor responsável.
let disciplinas = [];

function montarDisciplinas(){
    disciplinas = professores
        .flatMap(p => (p.disciplinas || []).map(nome => ({
            nome,
            departamento: p.departamento,
            professor: p.nome,
            status: p.status
        })))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
// ===== FIM DISCIPLINAS (aba) ================================================

// ===== PAGINAÇÃO (1/4): configuração =====================================
// POR_PAGINA = quantos professores aparecem por página (mude aqui para alterar).
// paginaAtual = página que está sendo exibida. "paginacao" = a div do HTML.
const POR_PAGINA = 8;
let paginaAtual = 1;
const paginacao = document.getElementById("paginacaoProfessores");
// Aba Disciplinas: mesma lógica, com página e container próprios (cada aba lembra a sua página)
let paginaAtualDisc = 1;
const paginacaoDisc = document.getElementById("paginacaoDisciplinas");
// ===== FIM PAGINAÇÃO (1/4) ================================================

const corpoProf = document.getElementById("corpoTabelaProfessores");
const corpoDisc = document.getElementById("corpoTabelaDisciplinas");

// Gera a célula "Ação" (visualizar, editar, excluir) de cada linha.
// Editar e excluir funcionam na tabela de professores (o id vai em data-id); o olho ainda é só visual.
// O parâmetro "item" só serve para compor o aria-label (acessibilidade).
// EDITAR (1/4): o botão lápis (btn-editar) guarda o id_prof em data-id; renderProf passa o id.
function celulaAcoes(item, id = "", comOlho = true){
    return `<td><div class="acoes-tabela">${comOlho ? `<button type="button" class="btn-tabela" title="Visualizar" aria-label="Visualizar ${item}"><i class="fa-solid fa-eye"></i></button>` : ""}<button type="button" class="btn-tabela btn-editar" data-id="${id}" title="Editar" aria-label="Editar ${item}"><i class="fa-solid fa-pencil"></i></button><button type="button" class="btn-tabela btn-excluir" data-id="${id}" title="Excluir" aria-label="Excluir ${item}"><i class="fa-solid fa-trash"></i></button></div></td>`;
}
function statusLabel(s){return {ativo:"Ativo",inativo:"Inativo"}[s]||s;}
// ===== DISCIPLINAS (1/4): coluna "Disciplinas" da tabela de professores =====
// Mostra cada disciplina do professor como uma etiqueta (chip). Sem disciplina: "—".
function chipsDisciplinas(lista){
    if(!Array.isArray(lista)||!lista.length) return "—";
    return `<div class="chips-disciplinas">${lista.map(d=>`<span class="chip-disciplina">${esc(d)}</span>`).join("")}</div>`;
}
// ===== FIM DISCIPLINAS (1/4) ==============================================

// ===== TURMAS (1/3): coluna "Turmas" da tabela de professores (ex.: "Sala 05 · Matutino") =====
function chipsTurmas(lista){
    if(!Array.isArray(lista)||!lista.length) return "—";
    return `<div class="chips-disciplinas">${lista.map(t=>`<span class="chip-disciplina">${esc(t.nome)}</span>`).join("")}</div>`;
}

function renderProf(lista){
    corpoProf.innerHTML = lista.length ? "" : `<tr><td colspan="8" class="vazio">Nenhum professor encontrado.</td></tr>`;
    lista.forEach(p=>{
        const tr=document.createElement("tr");
        tr.innerHTML=`<td>${esc(p.nome)}<small>${esc(p.email)}</small></td><td>${esc(p.matricula)}</td><td>${esc(p.departamento)}</td><td>${esc(p.titulacao)}</td><td>${chipsDisciplinas(p.disciplinas)}</td><td>${chipsTurmas(p.turmas)}</td><td><span class="badge ${p.status}">${statusLabel(p.status)}</span></td>${celulaAcoes("professor", p.id, false)}`;
        corpoProf.appendChild(tr);
    });
}
// Aba Disciplinas: colunas Disciplina | Departamento | Professor responsável | Status | Ação
function renderDisc(lista){
    corpoDisc.innerHTML=lista.length?"":`<tr><td colspan="5" class="vazio">Nenhuma disciplina encontrada.</td></tr>`;
    lista.forEach(d=>{
        const tr=document.createElement("tr");
        tr.innerHTML=`<td>${esc(d.nome)}</td><td>${esc(d.departamento)}</td><td>${esc(d.professor)}</td><td><span class="badge ${d.status}">${statusLabel(d.status)}</span></td>${celulaAcoes("disciplina")}`;
        corpoDisc.appendChild(tr);
    });
}
function atualizarStats(){
    statProfessores.textContent=professores.length;
    statAtivos.textContent=professores.filter(p=>p.status==="ativo").length;
    statDisciplinas.textContent=disciplinas.length;
    statInativos.textContent=professores.filter(p=>p.status==="inativo").length;
}
// ===== PAGINAÇÃO (2/4): filtro + corte da lista em páginas ================
// filtrarProf() filtra, calcula o total de páginas e mostra só os 8 da página atual.
// renderPaginacao() desenha os botões. O listener no fim trata o clique neles.
function filtrarProf(voltarPrimeira = false){
    const termo=normalizarTexto(document.getElementById("buscaProfessores").value);
    const status=document.getElementById("filtroStatus").value;
    const filtrados=professores.filter(p=>(status==="todos"||p.status===status)&&[p.nome,p.matricula,p.departamento].some(v=>normalizarTexto(v).includes(termo)));

    const totalPaginas=Math.max(1,Math.ceil(filtrados.length/POR_PAGINA));
    if(voltarPrimeira===true) paginaAtual=1;            // buscou/filtrou: volta para a página 1
    if(paginaAtual>totalPaginas) paginaAtual=totalPaginas;

    const inicio=(paginaAtual-1)*POR_PAGINA;
    renderProf(filtrados.slice(inicio,inicio+POR_PAGINA));
    renderPaginacao(paginacao,totalPaginas,paginaAtual);
}

// Desenha os botões: Anterior | 1 2 ... 7 | Próxima (só aparece com mais de 1 página)
// Serve para as duas abas: recebe a div onde desenhar, o total de páginas e a página atual.
function renderPaginacao(container,total,atual){
    if(!container) return;
    if(total<=1){ container.innerHTML=""; return; }

    const itens=[];
    for(let i=1;i<=total;i++){
        if(i===1||i===total||Math.abs(i-atual)<=1) itens.push(i);
        else if(itens[itens.length-1]!=="...") itens.push("...");
    }

    let html=`<button type="button" data-pagina="${atual-1}" ${atual===1?"disabled":""}><i class="fa-solid fa-chevron-left"></i> Anterior</button>`;
    itens.forEach(n=>{
        html+= n==="..."
            ? `<span class="reticencias">…</span>`
            : `<button type="button" data-pagina="${n}" class="${n===atual?"ativo":""}">${n}</button>`;
    });
    html+=`<button type="button" data-pagina="${atual+1}" ${atual===total?"disabled":""}>Próxima <i class="fa-solid fa-chevron-right"></i></button>`;
    container.innerHTML=html;
}

paginacao?.addEventListener("click",e=>{
    const btn=e.target.closest("button[data-pagina]");
    if(!btn||btn.disabled) return;
    paginaAtual=Number(btn.dataset.pagina);
    filtrarProf();
});
// ===== FIM PAGINAÇÃO (2/4) ================================================

// Aba Disciplinas: filtra pela busca, corta em páginas de POR_PAGINA e desenha os botões
function filtrarDisc(voltarPrimeira = false){
    const termo=normalizarTexto(document.getElementById("buscaDisciplinas").value);
    const filtradas=disciplinas.filter(d=>[d.nome,d.professor,d.departamento].some(v=>normalizarTexto(v).includes(termo)));

    const totalPaginas=Math.max(1,Math.ceil(filtradas.length/POR_PAGINA));
    if(voltarPrimeira===true) paginaAtualDisc=1;        // buscou: volta para a página 1
    if(paginaAtualDisc>totalPaginas) paginaAtualDisc=totalPaginas;

    const inicio=(paginaAtualDisc-1)*POR_PAGINA;
    renderDisc(filtradas.slice(inicio,inicio+POR_PAGINA));
    renderPaginacao(paginacaoDisc,totalPaginas,paginaAtualDisc);
}

paginacaoDisc?.addEventListener("click",e=>{
    const btn=e.target.closest("button[data-pagina]");
    if(!btn||btn.disabled) return;
    paginaAtualDisc=Number(btn.dataset.pagina);
    filtrarDisc();
});
// PAGINAÇÃO (3/4): ao buscar ou filtrar, filtrarProf(true) volta para a página 1
document.getElementById("buscaProfessores")?.addEventListener("input",()=>filtrarProf(true));
document.getElementById("filtroStatus")?.addEventListener("change",()=>filtrarProf(true));
document.getElementById("buscaDisciplinas")?.addEventListener("input",()=>filtrarDisc(true));

document.querySelectorAll("[data-aba-professores]").forEach(btn=>btn.addEventListener("click",()=>{
    const alvo=btn.dataset.abaProfessores;
    document.querySelectorAll("[data-aba-professores]").forEach(b=>b.classList.remove("ativo")); btn.classList.add("ativo");
    document.querySelectorAll("[data-conteudo-professores]").forEach(c=>c.classList.remove("ativo"));
    document.querySelector(`[data-conteudo-professores="${alvo}"]`).classList.add("ativo");
}));

const modal=document.getElementById("modalProfessor");
document.getElementById("btnNovoProfessor")?.addEventListener("click",()=>abrirModalProfessor(null));
document.getElementById("fecharModal")?.addEventListener("click",()=>modal.classList.remove("ativo"));
document.getElementById("cancelarModal")?.addEventListener("click",()=>modal.classList.remove("ativo"));
modal?.addEventListener("click",e=>{if(e.target===modal)modal.classList.remove("ativo")});

// ===== DISCIPLINAS (2/4): campo "Disciplinas" do modal (várias por professor) =====
// disciplinasForm guarda as disciplinas adicionadas; cada uma vira um chip com "×".
// Enter no campo (ou botão Adicionar) inclui a disciplina; o "×" remove.
const MAX_DISCIPLINAS = 10;
let disciplinasForm = [];
const inputDisciplina = document.getElementById("disciplinaProfessor");
const chipsForm = document.getElementById("chipsDisciplinas");

function renderChipsForm(){
    chipsForm.innerHTML = disciplinasForm.map((d,i)=>`<span class="chip-disciplina">${esc(d)}<button type="button" data-remover="${i}" aria-label="Remover ${esc(d)}">&times;</button></span>`).join("");
}
function adicionarDisciplinaForm(){
    const nome = inputDisciplina.value.trim();
    if(!nome) return;
    if(disciplinasForm.some(d=>normalizarTexto(d)===normalizarTexto(nome))){ mostrarToast("Essa disciplina já foi adicionada.", true); return; }
    if(disciplinasForm.length>=MAX_DISCIPLINAS){ mostrarToast("Máximo de "+MAX_DISCIPLINAS+" disciplinas por professor.", true); return; }
    disciplinasForm.push(nome);
    inputDisciplina.value = "";
    renderChipsForm();
    inputDisciplina.focus();
}
document.getElementById("btnAddDisciplina")?.addEventListener("click", adicionarDisciplinaForm);
inputDisciplina?.addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); adicionarDisciplinaForm(); } });
chipsForm?.addEventListener("click", e=>{
    const b = e.target.closest("button[data-remover]");
    if(!b) return;
    disciplinasForm.splice(Number(b.dataset.remover),1);
    renderChipsForm();
});
// ===== FIM DISCIPLINAS (2/4) ==============================================

// ===== TURMAS (2/3): caixas de seleção de sala + turno no modal =====
// O catálogo (as 30 turmas) vem de suporte_turmas_listar.php. Cada sala mostra seus 3 turnos.
let turmasCatalogo = [];
const caixaTurmas = document.getElementById("turmasForm");
const ROTULO_TURNO = { Matutino: "Manhã", Vespertino: "Tarde", Noturno: "Noite" };

function renderTurmasForm(selecionadas = []){
    if(!caixaTurmas) return;
    if(!turmasCatalogo.length){
        caixaTurmas.innerHTML = '<p class="turmas-vazio">Nenhuma turma encontrada.</p>';
        return;
    }
    const salas = new Map();
    turmasCatalogo.forEach(t => {
        if(!salas.has(t.sala)) salas.set(t.sala, { curso: t.curso, turmas: [] });
        salas.get(t.sala).turmas.push(t);
    });
    caixaTurmas.innerHTML = [...salas.entries()].map(([sala, info]) => `
        <div class="turmas-sala">
            <span class="turmas-sala-nome">${esc(sala)} · ${esc(info.curso)}</span>
            <span class="turmas-sala-turnos">${info.turmas.map(t => `<label class="turma-check"><input type="checkbox" value="${t.id}" ${selecionadas.includes(t.id) ? "checked" : ""}> ${esc(ROTULO_TURNO[t.turno] || t.turno)}</label>`).join("")}</span>
        </div>`).join("");
}

function turmasMarcadas(){
    if(!caixaTurmas) return [];
    return [...caixaTurmas.querySelectorAll('input[type="checkbox"]:checked')].map(c => Number(c.value));
}

async function carregarCatalogoTurmas(){
    try {
        const resp = await fetch("suporte_professor_crud/suporte_turmas_listar.php");
        const json = await resp.json();
        if(json.sucesso) turmasCatalogo = json.turmas;
    } catch (erro) {
        console.error("Erro ao carregar as turmas:", erro);
    }
    renderTurmasForm();
}
carregarCatalogoTurmas();
// ===== FIM TURMAS (2/3) ======================================================

// ===== EDITAR (2/4): o mesmo modal serve para cadastrar e para editar ==========
// professorEditando = null  -> modo cadastrar
// professorEditando = {...} -> modo editar (campos vêm preenchidos)
let professorEditando = null;
const TEXTO_CADASTRAR = "O professor receberá um e-mail com o acesso ao portal e a orientação para trocar a senha provisória.";

function abrirModalProfessor(prof){
    professorEditando = prof;
    const editando = prof !== null;
    const form = document.getElementById("formProfessor");

    document.getElementById("tituloModalProfessor").textContent = editando ? "Editar professor" : "Cadastrar professor";
    document.getElementById("textoModalProfessor").textContent = editando ? "Altere os dados do professor e salve." : TEXTO_CADASTRAR;
    document.getElementById("btnSalvarProfessor").innerHTML = '<i class="fa-solid fa-check"></i> ' + (editando ? "Salvar alterações" : "Cadastrar");
    document.getElementById("grupoStatusProfessor").style.display = editando ? "" : "none";

    form.reset();
    inputDisciplina.value = "";

    if (editando) {
        const vazio = v => (v === "—" ? "" : v);   // professores antigos podem ter "—" (campo nulo no banco)
        document.getElementById("nomeProfessor").value = prof.nome;
        document.getElementById("matriculaProfessor").value = vazio(prof.matricula);
        document.getElementById("departamentoProfessor").value = vazio(prof.departamento);
        document.getElementById("titulacaoProfessor").value = vazio(prof.titulacao);   // sem correspondência fica em branco e o navegador pede para escolher
        document.getElementById("emailProfessor").value = prof.email;
        document.getElementById("statusProfessor").value = prof.status === "inativo" ? "inativo" : "ativo";
        disciplinasForm = [...(prof.disciplinas || [])];
    } else {
        disciplinasForm = [];
    }

    renderChipsForm();
    renderTurmasForm(editando ? (prof.turmas || []).map(t => t.id) : []);   // TURMAS: marca as turmas atuais ao editar
    modal.classList.add("ativo");
}

// Clique no lápis de uma linha da tabela de professores
corpoProf.addEventListener("click", e => {
    const btn = e.target.closest(".btn-editar");
    if (!btn) return;
    const prof = professores.find(p => String(p.id) === btn.dataset.id);
    if (prof) abrirModalProfessor(prof);
});
// ===== FIM EDITAR (2/4) =======================================================

function mostrarToast(mensagem, erro = false){
    const toast = document.createElement("div");
    toast.className = "toast" + (erro ? " erro" : "");
    toast.textContent = mensagem;
    document.getElementById("toastArea").appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// Lê a resposta como JSON; se o PHP devolver HTML/erro, registra o texto no console (F12)
async function lerJson(resp){
    const texto = await resp.text();
    try {
        return JSON.parse(texto);
    } catch (_) {
        console.error("Resposta não é JSON (status " + resp.status + "):", texto);
        throw new Error("Resposta inválida do servidor");
    }
}

// Busca os professores reais no banco (prof_login + prof_disciplinas)
async function carregarProfessores(){
    try {
        const resp = await fetch("suporte_professor_crud/suporte_professor_listar.php");
        const json = await lerJson(resp);
        if (!json.sucesso) {
            mostrarToast(json.mensagem || "Não foi possível carregar os professores.", true);
        } else {
            professores = json.professores;
        }
    } catch (erro) {
        mostrarToast("Erro ao carregar os professores. Veja o console (F12).", true);
    }
    montarDisciplinas();   // DISCIPLINAS (aba): remonta a lista de disciplinas com os dados atuais do banco
    atualizarStats();
    filtrarProf();   // PAGINAÇÃO (4/4): redesenha a tabela e os botões mantendo a página atual
    filtrarDisc();   // redesenha a aba Disciplinas respeitando a busca digitada
}

// Cadastra o professor no banco (tabela prof_login) com a senha padrão definida no PHP
document.getElementById("formProfessor")?.addEventListener("submit", async e => {
    e.preventDefault();

    const form = e.target;
    const botao = form.querySelector('button[type="submit"]');

    adicionarDisciplinaForm();   // DISCIPLINAS (3/4): se sobrou texto digitado no campo, inclui antes de enviar
    const editando = professorEditando !== null;   // EDITAR (3/4): true = salvar alterações, false = cadastrar

    const dados = {
        nome: document.getElementById("nomeProfessor").value.trim(),
        matricula: document.getElementById("matriculaProfessor").value.trim().toUpperCase(),
        departamento: document.getElementById("departamentoProfessor").value.trim(),
        titulacao: document.getElementById("titulacaoProfessor").value,
        email: document.getElementById("emailProfessor").value.trim().toLowerCase(),
        disciplinas: JSON.stringify(disciplinasForm),   // DISCIPLINAS (3/4): vai como JSON, ex.: ["Banco de Dados","Programação"]
        turmas: JSON.stringify(turmasMarcadas()),   // TURMAS (3/3): ids das turmas escolhidas, ex.: [3,7]
        // EDITAR (3/4): ao editar, envia também o id e o status (1 = ativo, 0 = inativo)
        ...(editando ? { id: professorEditando.id, ativo: document.getElementById("statusProfessor").value === "ativo" ? 1 : 0 } : {})
    };

    botao.disabled = true;

    try {
        const resp = await fetch(editando ? "suporte_professor_crud/suporte_professor_editar.php" : "suporte_professor_crud/suporte_professor_criar.php", {
            method: "POST",
            body: new URLSearchParams(dados)
        });
        const json = await lerJson(resp);

        if (!json.sucesso) {
            mostrarToast(json.mensagem || "Não foi possível salvar.", true);
            return;
        }

        form.reset();
        disciplinasForm = []; renderChipsForm(); renderTurmasForm();   // DISCIPLINAS (4/4): limpa os chips depois de cadastrar
        modal.classList.remove("ativo");
        professorEditando = null;
        await carregarProfessores();
        if (editando) {                       // EDITAR (4/4): ao editar não há e-mail, só confirma
            mostrarToast("Professor atualizado com sucesso!");
        } else if (json.email_enviado) {
            mostrarToast("Professor cadastrado! E-mail de acesso enviado para " + dados.email + ".");
        } else {
            mostrarToast("Professor cadastrado, mas o e-mail de acesso não pôde ser enviado. Avise o professor manualmente.", true);
        }

    } catch (erro) {
        mostrarToast("Erro de conexão com o servidor.", true);
    } finally {
        botao.disabled = false;
    }
});

// ===== EXCLUIR: modal de confirmação + chamada ao PHP =====
const modalExcluir = document.getElementById("modalExcluir");
const btnConfirmarExcluir = document.getElementById("confirmarExcluir");
let professorExcluindo = null;

function fecharModalExcluir(){
    modalExcluir.classList.remove("ativo");
    professorExcluindo = null;
}

// Clique na lixeira de uma linha da tabela de professores
corpoProf.addEventListener("click", e => {
    const btn = e.target.closest(".btn-excluir");
    if (!btn) return;
    const prof = professores.find(p => String(p.id) === btn.dataset.id);
    if (!prof) return;
    professorExcluindo = prof;
    document.getElementById("textoModalExcluir").innerHTML =
        "Tem certeza que deseja excluir <strong>" + esc(prof.nome) + "</strong>? " +
        "Isso também apaga as disciplinas, a agenda e os eventos de calendário dele. Essa ação não pode ser desfeita.";
    modalExcluir.classList.add("ativo");
});

document.getElementById("cancelarExcluir")?.addEventListener("click", fecharModalExcluir);
modalExcluir?.addEventListener("click", e => { if (e.target === modalExcluir) fecharModalExcluir(); });

btnConfirmarExcluir?.addEventListener("click", async () => {
    if (!professorExcluindo) return;
    btnConfirmarExcluir.disabled = true;
    try {
        const resp = await fetch("suporte_professor_crud/suporte_professor_excluir.php", {
            method: "POST",
            body: new URLSearchParams({ id: professorExcluindo.id })
        });
        const json = await lerJson(resp);
        if (!json.sucesso) {
            mostrarToast(json.mensagem || "Não foi possível excluir.", true);
            return;
        }
        fecharModalExcluir();
        await carregarProfessores();
        mostrarToast("Professor excluído com sucesso!");
    } catch (erro) {
        mostrarToast("Erro de conexão com o servidor.", true);
    } finally {
        btnConfirmarExcluir.disabled = false;
    }
});
// ===== FIM EXCLUIR =====

carregarProfessores();