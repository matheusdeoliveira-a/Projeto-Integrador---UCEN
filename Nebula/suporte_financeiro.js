// PORTAL DO SUPORTE - FINANCEIRO

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

let mensalidades = [
    {aluno:"Ana Beatriz Souza",matricula:"2026001",competencia:"Setembro/2026",vencimento:"10/09/2026",valor:1280,status:"pago"},
    {aluno:"Bruno Carvalho Lima",matricula:"2026002",competencia:"Setembro/2026",vencimento:"10/09/2026",valor:1280,status:"pendente"},
    {aluno:"Camila Rocha Dias",matricula:"2025014",competencia:"Setembro/2026",vencimento:"10/09/2026",valor:980,status:"pago"},
    {aluno:"Diego Fernandes Costa",matricula:"2025015",competencia:"Agosto/2026",vencimento:"10/08/2026",valor:980,status:"atrasado"},
    {aluno:"Isabela Martins Rocha",matricula:"2026030",competencia:"Setembro/2026",vencimento:"10/09/2026",valor:1420,status:"pago"},
    {aluno:"João Pedro Alves",matricula:"2026031",competencia:"Setembro/2026",vencimento:"10/09/2026",valor:1420,status:"pendente"},
    {aluno:"Lucas Fernandes Prado",matricula:"2025040",competencia:"Julho/2026",vencimento:"10/07/2026",valor:1420,status:"atrasado"}
];

let pagamentos = [
    {aluno:"Ana Beatriz Souza",data:"05/09/2026",competencia:"Setembro/2026",forma:"PIX",valor:1280,comprovante:"REC-260901"},
    {aluno:"Camila Rocha Dias",data:"06/09/2026",competencia:"Setembro/2026",forma:"Cartão",valor:980,comprovante:"REC-260902"},
    {aluno:"Isabela Martins Rocha",data:"07/09/2026",competencia:"Setembro/2026",forma:"Boleto",valor:1420,comprovante:"REC-260903"},
    {aluno:"Ana Beatriz Souza",data:"08/08/2026",competencia:"Agosto/2026",forma:"PIX",valor:1280,comprovante:"REC-260801"}
];

let inadimplencia = [
    {aluno:"Diego Fernandes Costa",matricula:"2025015",parcelas:1,dias:29,valor:980},
    {aluno:"Lucas Fernandes Prado",matricula:"2025040",parcelas:2,dias:58,valor:2840},
    {aluno:"Bruno Carvalho Lima",matricula:"2026002",parcelas:1,dias:2,valor:1280},
    {aluno:"João Pedro Alves",matricula:"2026031",parcelas:1,dias:1,valor:1420}
];

const corpoMensalidades = document.getElementById("corpoMensalidades");
const corpoPagamentos = document.getElementById("corpoPagamentos");
const corpoInadimplencia = document.getElementById("corpoInadimplencia");

// Gera a célula "Ação" com o botão de visualizar (olho) de cada linha.
// Por enquanto o botão é apenas visual, sem funcionalidade (será usado no CRUD).
// O parâmetro "item" só serve para compor o aria-label (acessibilidade).
function celulaAcoes(item){
    return `<td><div class="acoes-tabela"><button type="button" class="btn-tabela" title="Visualizar" aria-label="Visualizar ${item}"><i class="fa-solid fa-eye"></i></button></div></td>`;
}
function moeda(valor){return valor.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
function statusLabel(s){return {pago:"Pago",pendente:"Pendente",atrasado:"Atrasado"}[s]||s;}

function renderMensalidades(lista){
    corpoMensalidades.innerHTML = lista.length ? "" : `<tr><td colspan="7" class="vazio">Nenhuma mensalidade encontrada.</td></tr>`;
    lista.forEach(m=>{
        const tr=document.createElement("tr");
        tr.innerHTML=`<td>${m.aluno}</td><td>${m.matricula}</td><td>${m.competencia}</td><td>${m.vencimento}</td><td>${moeda(m.valor)}</td><td><span class="badge ${m.status}">${statusLabel(m.status)}</span></td>${celulaAcoes("mensalidade")}`;
        corpoMensalidades.appendChild(tr);
    });
}
function renderPagamentos(lista){
    corpoPagamentos.innerHTML = lista.length ? "" : `<tr><td colspan="7" class="vazio">Nenhum pagamento encontrado.</td></tr>`;
    lista.forEach(p=>{
        const tr=document.createElement("tr");
        tr.innerHTML=`<td>${p.aluno}</td><td>${p.data}</td><td>${p.competencia}</td><td>${p.forma}</td><td>${moeda(p.valor)}</td><td>${p.comprovante}</td>${celulaAcoes("pagamento")}`;
        corpoPagamentos.appendChild(tr);
    });
}
function renderInadimplencia(lista){
    corpoInadimplencia.innerHTML = lista.length ? "" : `<tr><td colspan="7" class="vazio">Nenhum registro encontrado.</td></tr>`;
    lista.forEach(i=>{
        const tr=document.createElement("tr");
        tr.innerHTML=`<td>${i.aluno}</td><td>${i.matricula}</td><td>${i.parcelas}</td><td>${i.dias}</td><td>${moeda(i.valor)}</td><td><span class="badge atrasado">Em atraso</span></td>${celulaAcoes("registro de inadimplência")}`;
        corpoInadimplencia.appendChild(tr);
    });
}

function atualizarStats(){
    const receita = pagamentos.reduce((s,p)=>s+p.valor,0);
    const aberto = mensalidades.filter(m=>m.status!=="pago").reduce((s,m)=>s+m.valor,0);
    statReceita.textContent = moeda(receita);
    statPagamentos.textContent = pagamentos.length;
    statAtrasados.textContent = mensalidades.filter(m=>m.status==="atrasado").length;
    statAberto.textContent = moeda(aberto);
}

function filtrarMensalidades(){
    const termo=normalizarTexto(document.getElementById("buscaMensalidades").value);
    const status=document.getElementById("filtroMensalidade").value;
    renderMensalidades(mensalidades.filter(m=>(status==="todos"||m.status===status)&&[m.aluno,m.matricula].some(v=>normalizarTexto(v).includes(termo))));
}
function filtrarPagamentos(){
    const termo=normalizarTexto(document.getElementById("buscaPagamentos").value);
    renderPagamentos(pagamentos.filter(p=>[p.aluno,p.forma,p.competencia].some(v=>normalizarTexto(v).includes(termo))));
}
function filtrarInadimplencia(){
    const termo=normalizarTexto(document.getElementById("buscaInadimplencia").value);
    renderInadimplencia(inadimplencia.filter(i=>[i.aluno,i.matricula].some(v=>normalizarTexto(v).includes(termo))));
}
document.getElementById("buscaMensalidades")?.addEventListener("input",filtrarMensalidades);
document.getElementById("filtroMensalidade")?.addEventListener("change",filtrarMensalidades);
document.getElementById("buscaPagamentos")?.addEventListener("input",filtrarPagamentos);
document.getElementById("buscaInadimplencia")?.addEventListener("input",filtrarInadimplencia);

document.querySelectorAll("[data-aba-financeiro]").forEach(btn=>btn.addEventListener("click",()=>{
    const alvo=btn.dataset.abaFinanceiro;
    document.querySelectorAll("[data-aba-financeiro]").forEach(b=>b.classList.remove("ativo")); btn.classList.add("ativo");
    document.querySelectorAll("[data-conteudo-financeiro]").forEach(c=>c.classList.remove("ativo"));
    document.querySelector(`[data-conteudo-financeiro="${alvo}"]`).classList.add("ativo");
}));

const modal=document.getElementById("modalLancamento");
document.getElementById("btnNovoLancamento")?.addEventListener("click",()=>modal.classList.add("ativo"));
document.getElementById("fecharModal")?.addEventListener("click",()=>modal.classList.remove("ativo"));
document.getElementById("cancelarModal")?.addEventListener("click",()=>modal.classList.remove("ativo"));
modal?.addEventListener("click",e=>{if(e.target===modal)modal.classList.remove("ativo")});

document.getElementById("formLancamento")?.addEventListener("submit",e=>{
    e.preventDefault();
    mensalidades.push({
        aluno:document.getElementById("nomeAluno").value.trim(),
        matricula:document.getElementById("matriculaAluno").value.trim(),
        competencia:document.getElementById("competencia").value.trim(),
        vencimento:new Date(document.getElementById("vencimento").value+"T00:00:00").toLocaleDateString("pt-BR"),
        valor:Number(document.getElementById("valorLancamento").value),
        status:document.getElementById("statusLancamento").value
    });
    e.target.reset(); modal.classList.remove("ativo"); atualizarStats(); filtrarMensalidades();
});

renderMensalidades(mensalidades); renderPagamentos(pagamentos); renderInadimplencia(inadimplencia); atualizarStats();