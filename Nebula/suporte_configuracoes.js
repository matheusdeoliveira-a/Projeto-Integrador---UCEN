// ==========================================================
// PORTAL DO SUPORTE - CONFIGURAÇÕES
// Menu, pesquisa expansível, foto, form e salvamento de regras
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

// UPLOAD DE FOTO DO OPERADOR
const inputUploadFoto = document.getElementById("upload-foto");
const imgPerfil = document.getElementById("foto-perfil-img");
const avatarPlaceholder = document.getElementById("avatar-placeholder");
const btnRemoverFoto = document.getElementById("btn-remover-foto");

inputUploadFoto?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        imgPerfil.src = event.target.result;
        imgPerfil.style.display = "block";
        avatarPlaceholder.style.display = "none";
        if (btnRemoverFoto) btnRemoverFoto.style.display = "flex";
    };
    reader.readAsDataURL(file);
});

// REMOVER FOTO DO OPERADOR (VOLTA AO ÍCONE PADRÃO)
btnRemoverFoto?.addEventListener("click", () => {
    imgPerfil.src = "";
    imgPerfil.style.display = "none";
    avatarPlaceholder.style.display = "flex";
    inputUploadFoto.value = "";
    btnRemoverFoto.style.display = "none";
});

// FORMULÁRIO DE DADOS DE ATENDIMENTO (salvo no banco: tabela suporte_dados)
// Os dados valem para todo o suporte. Os campos começam vazios e são preenchidos
// com o que está no banco; o botão só libera depois que o carregamento der certo,
// para ninguém gravar campos em branco por cima dos dados reais sem querer.
const formSuporte = document.getElementById("form-suporte-dados");
const btnSalvarDados = formSuporte?.querySelector(".btn-principal");

const CAMPOS_ATENDIMENTO = {
    nome_equipe: "nome-operador",
    email:       "email-oficial",
    telefone:    "telefone-suporte",
    whatsapp:    "whatsapp-suporte",
    horario:     "horario-atendimento"
};

async function carregarDadosAtendimento() {
    if (!formSuporte) return;
    if (btnSalvarDados) btnSalvarDados.disabled = true;

    try {
        const resp = await fetch("suporte_conf_crud/suporte_dados_obter.php");
        const json = await lerJson(resp);

        if (!json.sucesso) {
            mostrarToast(json.mensagem || "Não foi possível carregar os dados de atendimento.", true);
            return;
        }

        Object.entries(CAMPOS_ATENDIMENTO).forEach(([campo, idInput]) => {
            document.getElementById(idInput).value = json.dados[campo] ?? "";
        });
        if (btnSalvarDados) btnSalvarDados.disabled = false;

    } catch (erro) {
        mostrarToast("Erro ao carregar os dados de atendimento. Veja o console (F12).", true);
    }
}

formSuporte?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (btnSalvarDados) btnSalvarDados.disabled = true;

    const dados = {};
    Object.entries(CAMPOS_ATENDIMENTO).forEach(([campo, idInput]) => {
        dados[campo] = document.getElementById(idInput).value.trim();
    });

    try {
        const resp = await fetch("suporte_conf_crud/suporte_dados_salvar.php", {
            method: "POST",
            body: new URLSearchParams(dados)
        });
        const json = await lerJson(resp);

        if (!json.sucesso) {
            mostrarToast(json.mensagem || "Não foi possível salvar os dados.", true);
            return;
        }
        mostrarToast("Dados de atendimento salvos com sucesso!");

    } catch (erro) {
        mostrarToast("Erro de conexão com o servidor.", true);
    } finally {
        if (btnSalvarDados) btnSalvarDados.disabled = false;
    }
});

carregarDadosAtendimento();

// TOGGLES DE REGRAS (AUTO-SAVE)
const togglesConfiguracao = document.querySelectorAll('.lista-configuracoes input[type="checkbox"][data-campo]');

togglesConfiguracao.forEach(toggle => {
    toggle.addEventListener("change", () => {
        const campo = toggle.getAttribute("data-campo");
        const status = toggle.checked ? "ativada" : "desativada";
        console.log(`Preferencia [${campo}] ${status}.`);
    });
});

// MODAL DE ZOOM NA FOTO (PRESS AND HOLD)
const avatarWrapper = document.getElementById("avatar-container");
const modalFoto = document.getElementById("modal-foto-perfil");
const imgModalZoom = document.getElementById("img-modal-zoom");

let pressTimer = null;

function abrirModalFoto() {
    if (imgPerfil.src && imgPerfil.style.display !== "none") {
        imgModalZoom.src = imgPerfil.src;
        modalFoto.classList.add("active");
    }
}

function fecharModalFoto() {
    clearTimeout(pressTimer);
    modalFoto.classList.remove("active");
}

function iniciarPressao(e) {
    if (e.target.closest(".btn-alterar-foto") || e.target.closest(".btn-remover-foto")) return;
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
        abrirModalFoto();
    }, 400);
}

if (avatarWrapper) {
    avatarWrapper.addEventListener("mousedown", iniciarPressao);
    avatarWrapper.addEventListener("mouseup", () => clearTimeout(pressTimer));
    avatarWrapper.addEventListener("mouseleave", () => clearTimeout(pressTimer));

    avatarWrapper.addEventListener("touchstart", iniciarPressao);
    avatarWrapper.addEventListener("touchend", () => clearTimeout(pressTimer));
}

modalFoto?.addEventListener("click", (e) => {
    if (e.target === modalFoto) {
        fecharModalFoto();
    }
});

// ==========================================================
// NOVAS INTERAÇÕES (AVISOS, SLA E AUDITORIA)
// ==========================================================

// BANNER DE AVISO GLOBAL
document.getElementById("form-aviso-global")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const textoAviso = document.getElementById("texto-banner-aviso").value;
    if (!textoAviso.trim()) {
        alert("Digite uma mensagem válida para publicar o aviso!");
        return;
    }
    alert(`Aviso Global publicado com sucesso:\n"${textoAviso}"`);
});

// SLA SALVAMENTO
document.getElementById("btn-salvar-sla")?.addEventListener("click", () => {
    const alta = document.getElementById("sla-alta").value;
    const media = document.getElementById("sla-media").value;
    const baixa = document.getElementById("sla-baixa").value;

    alert(`Metas de SLA atualizadas:\nAlta: ${alta}h | Média: ${media}h | Baixa: ${baixa}h`);
});

// ==========================================================
// EQUIPE & PERMISSÕES: cadastrar, editar e excluir operadores do suporte
// (PHP na pasta suporte_conf_crud)
// ==========================================================

// Menus que podem ser liberados. A "chave" é a mesma usada no PHP (MENUS_SUPORTE).
const MENUS_PORTAL = [
    { chave: "academico",     rotulo: "Acadêmico",              icone: "fa-users" },
    { chave: "professores",   rotulo: "Professores",            icone: "fa-briefcase" },
    { chave: "financeiro",    rotulo: "Financeiro",             icone: "fa-wallet" },
    { chave: "atendimento",   rotulo: "Central de Atendimento", icone: "fa-envelope" },
    { chave: "relatorios",    rotulo: "Relatórios",             icone: "fa-chart-simple" },
    { chave: "configuracoes", rotulo: "Configurações",          icone: "fa-gear" }
];

let equipe = [];                                  // operadores vindos do banco
let eu = { id: 0, total: false, menus: [] };      // quem está logado e o que pode liberar
let operadorEditando = null;                      // null = cadastrando
let operadorExcluindo = null;

const corpoEquipe = document.getElementById("corpoTabelaEquipe");
const modalOperador = document.getElementById("modalOperador");
const modalExcluirOperador = document.getElementById("modalExcluirOperador");
const gridPermissoes = document.getElementById("gridPermissoes");
const checkAcessoTotal = document.getElementById("operadorAcessoTotal");

// Escapa texto antes de colocar em innerHTML (evita XSS com dados digitados)
function esc(valor) {
    return String(valor).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function mostrarToast(mensagem, erro = false, duracao = 4000) {
    const toast = document.createElement("div");
    toast.className = "toast" + (erro ? " erro" : "");
    toast.textContent = mensagem;
    document.getElementById("toastArea").appendChild(toast);
    setTimeout(() => toast.remove(), duracao);
}

// Lê a resposta como JSON; se o PHP devolver HTML/erro, registra o texto no console (F12)
async function lerJson(resp) {
    const texto = await resp.text();
    try {
        return JSON.parse(texto);
    } catch (_) {
        console.error("Resposta não é JSON (status " + resp.status + "):", texto);
        throw new Error("Resposta inválida do servidor");
    }
}

// ---------- Tabela ----------
function renderEquipe() {
    if (!equipe.length) {
        corpoEquipe.innerHTML = '<tr><td colspan="5" class="vazio">Nenhum operador encontrado.</td></tr>';
        return;
    }

    corpoEquipe.innerHTML = equipe.map(op => {
        const rotulo = op.cargo || (op.acesso_total ? "Administrador" : "Operador");
        const classe = op.acesso_total ? "admin" : "nivel1";
        const souEu = op.id === eu.id;
        const protegido = !eu.total && op.acesso_total;   // só administrador mexe em administrador

        let acoes = "—";
        if (!protegido) {
            acoes = '<div class="acoes-tabela">' +
                '<button type="button" class="btn-tabela btn-editar-op" data-id="' + op.id + '" title="Editar" aria-label="Editar ' + esc(op.nome) + '"><i class="fa-solid fa-pen-to-square"></i></button>' +
                (souEu ? "" : '<button type="button" class="btn-tabela btn-excluir" data-id="' + op.id + '" title="Excluir" aria-label="Excluir ' + esc(op.nome) + '"><i class="fa-solid fa-trash"></i></button>') +
                '</div>';
        }

        return "<tr>" +
            "<td>" + esc(op.nome) + (souEu ? " <small>(você)</small>" : "") + "</td>" +
            "<td>" + esc(op.email) + "</td>" +
            '<td><span class="tag-acesso ' + classe + '">' + esc(rotulo) + "</span></td>" +
            '<td><span class="badge ' + (op.status === "ativo" ? "ok" : "inativo") + '">' + (op.status === "ativo" ? "Ativo" : "Inativo") + "</span></td>" +
            "<td>" + acoes + "</td>" +
            "</tr>";
    }).join("");
}

async function carregarEquipe() {
    try {
        const resp = await fetch("suporte_conf_crud/suporte_operador_listar.php");
        const json = await lerJson(resp);
        if (!json.sucesso) {
            mostrarToast(json.mensagem || "Não foi possível carregar a equipe.", true);
            return;
        }
        equipe = json.operadores;
        eu = json.eu;
        renderEquipe();
    } catch (erro) {
        mostrarToast("Erro ao carregar a equipe. Veja o console (F12).", true);
    }
}

// ---------- Grade de menus liberados ----------
function renderGridPermissoes(selecionadas) {
    gridPermissoes.innerHTML =
        '<label class="check-linha fixo"><input type="checkbox" checked disabled><i class="fa-solid fa-house"></i> Início (sempre liberado)</label>' +
        MENUS_PORTAL.map(m => {
            const permitido = eu.total || eu.menus.includes(m.chave);   // não administrador só libera o que tem
            return '<label class="check-linha' + (permitido ? "" : " desabilitado") + '">' +
                '<input type="checkbox" value="' + m.chave + '" data-permitido="' + (permitido ? "1" : "0") + '"' +
                (selecionadas.includes(m.chave) ? " checked" : "") + (permitido ? "" : " disabled") + '>' +
                '<i class="fa-solid ' + m.icone + '"></i> ' + m.rotulo + "</label>";
        }).join("");
    aplicarAcessoTotal();
}

// Acesso total marcado: todos os menus ficam marcados e travados
function aplicarAcessoTotal() {
    gridPermissoes.querySelectorAll("input[value]").forEach(c => {
        if (checkAcessoTotal.checked) {
            c.checked = true;
            c.disabled = true;
        } else {
            c.disabled = c.dataset.permitido !== "1";
        }
    });
}
checkAcessoTotal?.addEventListener("change", aplicarAcessoTotal);

// ---------- Modal de cadastro / edição ----------
function abrirModalOperador(op) {
    operadorEditando = op;
    const editando = op !== null;
    const souEu = editando && op.id === eu.id;

    document.getElementById("tituloModalOperador").textContent = editando ? "Editar operador" : "Novo operador";
    document.getElementById("textoModalOperador").textContent = editando
        ? "Altere os dados e os menus liberados deste operador."
        : "O operador receberá um e-mail com o acesso e uma senha provisória. Ele só verá os menus que você marcar abaixo.";
    document.getElementById("btnSalvarOperador").innerHTML = '<i class="fa-solid fa-check"></i> ' + (editando ? "Salvar alterações" : "Cadastrar");
    document.getElementById("grupoStatusOperador").style.display = editando ? "" : "none";

    document.getElementById("formOperador").reset();

    document.getElementById("nomeOperadorNovo").value = editando ? op.nome : "";
    document.getElementById("emailOperador").value = editando ? op.email : "";
    document.getElementById("cargoOperador").value = editando ? op.cargo : "";
    document.getElementById("statusOperador").value = editando && op.status === "inativo" ? "inativo" : "ativo";
    document.getElementById("statusOperador").disabled = souEu;   // ninguém desativa a si mesmo

    checkAcessoTotal.checked = editando ? op.acesso_total : false;
    checkAcessoTotal.disabled = !eu.total;                        // só administrador cria administrador
    renderGridPermissoes(editando ? op.permissoes : []);

    modalOperador.classList.add("ativo");
}

function fecharModalOperador() {
    modalOperador.classList.remove("ativo");
    operadorEditando = null;
}

document.getElementById("btn-add-operador")?.addEventListener("click", () => abrirModalOperador(null));
document.getElementById("fecharModalOperador")?.addEventListener("click", fecharModalOperador);
document.getElementById("cancelarModalOperador")?.addEventListener("click", fecharModalOperador);
modalOperador?.addEventListener("click", e => { if (e.target === modalOperador) fecharModalOperador(); });

// Salvar (cadastrar ou editar)
document.getElementById("formOperador")?.addEventListener("submit", async e => {
    e.preventDefault();

    const botao = document.getElementById("btnSalvarOperador");
    const editando = operadorEditando !== null;

    const marcados = [...gridPermissoes.querySelectorAll("input[value]:checked")].map(c => c.value);

    const dados = {
        nome: document.getElementById("nomeOperadorNovo").value.trim(),
        email: document.getElementById("emailOperador").value.trim().toLowerCase(),
        cargo: document.getElementById("cargoOperador").value.trim(),
        acesso_total: checkAcessoTotal.checked ? 1 : 0,
        permissoes: JSON.stringify(marcados),
        ...(editando ? { id: operadorEditando.id, ativo: document.getElementById("statusOperador").value === "ativo" ? 1 : 0 } : {})
    };

    botao.disabled = true;

    try {
        const resp = await fetch(editando ? "suporte_conf_crud/suporte_operador_editar.php" : "suporte_conf_crud/suporte_operador_criar.php", {
            method: "POST",
            body: new URLSearchParams(dados)
        });
        const json = await lerJson(resp);

        if (!json.sucesso) {
            mostrarToast(json.mensagem || "Não foi possível salvar.", true);
            return;
        }

        fecharModalOperador();
        await carregarEquipe();

        if (editando) {
            mostrarToast("Operador atualizado com sucesso!");
        } else if (json.email_enviado) {
            mostrarToast("Operador cadastrado! E-mail de acesso enviado para " + dados.email + ".");
        } else {
            // O e-mail falhou: mostra a senha por mais tempo para o administrador repassar
            mostrarToast("Operador cadastrado, mas o e-mail não pôde ser enviado. Senha provisória: " + json.senha_provisoria + " (anote e repasse ao operador).", true, 30000);
        }

    } catch (erro) {
        mostrarToast("Erro de conexão com o servidor.", true);
    } finally {
        botao.disabled = false;
    }
});

// ---------- Editar / excluir pela tabela ----------
corpoEquipe?.addEventListener("click", e => {
    const btnEditar = e.target.closest(".btn-editar-op");
    if (btnEditar) {
        const op = equipe.find(o => String(o.id) === btnEditar.dataset.id);
        if (op) abrirModalOperador(op);
        return;
    }

    const btnExcluir = e.target.closest(".btn-excluir");
    if (btnExcluir) {
        const op = equipe.find(o => String(o.id) === btnExcluir.dataset.id);
        if (!op) return;
        operadorExcluindo = op;
        document.getElementById("textoModalExcluirOperador").innerHTML =
            "Tem certeza que deseja excluir <strong>" + esc(op.nome) + "</strong>? Ele perde o acesso ao portal do suporte. Essa ação não pode ser desfeita.";
        modalExcluirOperador.classList.add("ativo");
    }
});

function fecharModalExcluirOperador() {
    modalExcluirOperador.classList.remove("ativo");
    operadorExcluindo = null;
}
document.getElementById("cancelarExcluirOperador")?.addEventListener("click", fecharModalExcluirOperador);
modalExcluirOperador?.addEventListener("click", e => { if (e.target === modalExcluirOperador) fecharModalExcluirOperador(); });

document.getElementById("confirmarExcluirOperador")?.addEventListener("click", async () => {
    if (!operadorExcluindo) return;
    const botao = document.getElementById("confirmarExcluirOperador");
    botao.disabled = true;

    try {
        const resp = await fetch("suporte_conf_crud/suporte_operador_excluir.php", {
            method: "POST",
            body: new URLSearchParams({ id: operadorExcluindo.id })
        });
        const json = await lerJson(resp);

        if (!json.sucesso) {
            mostrarToast(json.mensagem || "Não foi possível excluir.", true);
            return;
        }

        fecharModalExcluirOperador();
        await carregarEquipe();
        mostrarToast("Operador excluído com sucesso!");

    } catch (erro) {
        mostrarToast("Erro de conexão com o servidor.", true);
    } finally {
        botao.disabled = false;
    }
});

carregarEquipe();