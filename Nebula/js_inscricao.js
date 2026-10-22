/*==================================================
        FORMULÁRIO DE INSCRIÇÃO NEBULA
==================================================*/

// ===== VLibras: botão e barra roxos, combinando com o menu de acessibilidade =====
(function () {
    var ROXO = 'hue-rotate(65deg) saturate(1.15)';

    var CSS =
        '#vlibras-button { border-radius: 12px !important; overflow: hidden !important; outline: 2px solid rgba(231,182,230,.6) !important; box-shadow: 0 0 16px rgba(162,60,196,.5) !important; background: #5b2a86 !important; }' +
        '#vlibras-button img { filter: ' + ROXO + ' !important; }' +
        '#vlibras-popup { filter: ' + ROXO + ' !important; border-radius: 20px !important; }';


    var tentativas = 0;
    var timer = setInterval(function () {
        var host = document.getElementById('vlibras-access-wrapper');
        if (host && host.shadowRoot) {
            var s = document.createElement('style');
            s.textContent = CSS;
            host.shadowRoot.appendChild(s);
            clearInterval(timer);
        } else if (++tentativas > 50) {
            clearInterval(timer);
        }
    }, 200);
})();

/*
====================================
ELEMENTOS
====================================
*/

const formulario = document.getElementById("formulario-nebula");


/*
====================================
VALIDAÇÃO DAS ETAPAS
====================================
*/

function validarEtapa(numeroEtapa) {

    const etapa = document.getElementById(`etapa-${numeroEtapa}`);

    let valido = true;

    etapa.querySelectorAll(".campo-erro").forEach(elemento => {
        elemento.classList.remove("campo-erro");
    });

    limparMensagensErro(etapa);

    const radiosVerificados = [];

    const campos = etapa.querySelectorAll("input[required]");

    campos.forEach(campo => {

        if (campo.type === "radio") {

            if (radiosVerificados.includes(campo.name))
                return;

            radiosVerificados.push(campo.name);

            const marcado = etapa.querySelector(`input[name="${campo.name}"]:checked`);

            if (!marcado) {

                valido = false;

                const lista = campo.closest(".lista-opcoes");

                if (lista) {

                    lista.classList.add("campo-erro");

                    etapa
                        .querySelectorAll(`input[name="${campo.name}"]`)
                        .forEach(radio => {

                            radio.addEventListener("change", function removerErro() {

                                lista.classList.remove("campo-erro");

                                etapa
                                    .querySelectorAll(`input[name="${campo.name}"]`)
                                    .forEach(r => {

                                        r.removeEventListener("change", removerErro);

                                    });

                            });

                        });

                }

            }

        }

        else if (campo.type === "file") {

            if (campo.files.length === 0) {

                valido = false;

                campo.parentElement.classList.add("campo-erro");

            }

        }

        else {

            if (campo.value.trim() === "") {

                valido = false;

                campo.classList.add("campo-erro");

                campo.addEventListener("input", function limparErro() {

                    campo.classList.remove("campo-erro");

                    campo.removeEventListener("input", limparErro);

                });

            }

        }

    });

    return valido;

}


/*
====================================
PRÓXIMA ETAPA
====================================
*/

let salvandoEtapa = false;

// ---------- Mensagens de erro em vermelho (no lugar do alert) ----------

function limparMensagensErro(etapa) {

    etapa.querySelectorAll(".mensagem-erro-campo").forEach(aviso => aviso.remove());

}

function criarAviso(mensagem) {

    const aviso = document.createElement("small");

    aviso.className = "mensagem-erro-campo";
    aviso.setAttribute("role", "alert");
    aviso.textContent = mensagem;   // textContent: nunca interpreta HTML

    return aviso;

}

// Mostra a mensagem logo abaixo do campo (caixa de texto ou grupo de opções)
function mostrarErroCampo(etapa, alvo, mensagem) {

    limparMensagensErro(etapa);

    const ehRadio = alvo.type === "radio";
    const caixa = ehRadio ? alvo.closest(".lista-opcoes") : alvo;
    const linha = ehRadio ? caixa : alvo.closest(".campo-formulario");

    caixa.classList.add("campo-erro");

    const aviso = criarAviso(mensagem);
    linha.insertAdjacentElement("afterend", aviso);

    // Alinha o texto com o início da caixa
    aviso.style.paddingLeft = ehRadio
        ? getComputedStyle(caixa).paddingLeft
        : (caixa.getBoundingClientRect().left - linha.getBoundingClientRect().left) + "px";

    // Some assim que o candidato mexer no campo
    const remover = () => {
        aviso.remove();
        caixa.classList.remove("campo-erro");
    };

    if (ehRadio) {

        etapa
            .querySelectorAll(`input[name="${alvo.name}"]`)
            .forEach(radio => radio.addEventListener("change", remover, { once: true }));

    } else {

        alvo.addEventListener("input", remover, { once: true });

    }

    alvo.focus();
    aviso.scrollIntoView({ behavior: "smooth", block: "nearest" });

}

// Erro que não pertence a um campo (ex.: servidor fora do ar): aparece acima dos botões
function mostrarErroEtapa(etapa, mensagem) {

    limparMensagensErro(etapa);

    etapa
        .querySelector(".container-botoes-form")
        .insertAdjacentElement("beforebegin", criarAviso(mensagem));

}

// Envia ao PHP os campos da etapa. Devolve true se salvou.
async function salvarEtapa(numeroEtapa) {

    const etapa = document.getElementById(`etapa-${numeroEtapa}`);

    const dados = new FormData();
    dados.append("etapa", numeroEtapa);

    etapa.querySelectorAll("input:not([type=file])").forEach(campo => {

        if (campo.type === "radio" && !campo.checked)
            return;

        dados.append(campo.name, campo.value);

    });

    limparMensagensErro(etapa);

    try {

        const resposta = await fetch("inscricao_php/inscricao-salvar-nebula.php", {
            method: "POST",
            body: dados
        });

        const retorno = await resposta.json();

        if (retorno.sucesso)
            return true;

        // O PHP aponta o campo com problema (retorno.campo = name do input)
        const alvo = retorno.campo
            ? etapa.querySelector(`[name="${retorno.campo}"]`)
            : null;

        if (alvo)
            mostrarErroCampo(etapa, alvo, retorno.erro);
        else
            mostrarErroEtapa(etapa, retorno.erro);

    } catch (erro) {

        mostrarErroEtapa(etapa, "Não foi possível conectar ao servidor. Tente novamente.");

    }

    return false;

}

async function proximaEtapa(atual, proxima) {

    if (salvandoEtapa)
        return;

    if (!validarEtapa(atual))
        return;

    // Só avança se o banco confirmar que salvou
    salvandoEtapa = true;
    const salvou = await salvarEtapa(atual);
    salvandoEtapa = false;

    if (!salvou)
        return;

    document
        .getElementById(`etapa-${atual}`)
        .classList
        .add("etapa-escondida");

    document
        .getElementById(`etapa-${proxima}`)
        .classList
        .remove("etapa-escondida");

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


/*
====================================
VOLTAR ETAPA
====================================
*/

function voltarEtapa(atual, anterior) {

    document
        .getElementById(`etapa-${atual}`)
        .classList
        .add("etapa-escondida");

    document
        .getElementById(`etapa-${anterior}`)
        .classList
        .remove("etapa-escondida");

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}
/*
====================================
MÁSCARA DE CPF
====================================
*/

const campoCPF = document.getElementById("cpf");

if (campoCPF) {

    campoCPF.addEventListener("input", function () {

        let valor = this.value.replace(/\D/g, "");

        valor = valor.substring(0, 11);

        valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
        valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
        valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");

        this.value = valor;

    });

}


/*
====================================
MÁSCARA DE TELEFONE
====================================
*/

["telefone", "telefone-reserva"].forEach(id => {

    const campo = document.getElementById(id);

    if (!campo) return;

    campo.addEventListener("input", function () {

        let valor = this.value.replace(/\D/g, "");

        valor = valor.substring(0, 11);

        if (valor.length <= 10) {

            valor = valor.replace(/(\d{2})(\d)/, "($1) $2");
            valor = valor.replace(/(\d{4})(\d)/, "$1-$2");

        }

        else {

            valor = valor.replace(/(\d{2})(\d)/, "($1) $2");
            valor = valor.replace(/(\d{5})(\d)/, "$1-$2");

        }

        this.value = valor;

    });

});


/*
====================================
FAMILIAR NA NEBULA
====================================
*/
/*
function toggleFamiliar(exibir) {

    const bloco = document.getElementById("bloco-familiar-input");

    const campo = document.getElementById("documento-familiar");

    if (exibir) {

        bloco.classList.remove("etapa-escondida");

        campo.required = true;

    }

    else {

        bloco.classList.add("etapa-escondida");

        campo.required = false;

        campo.value = "";

        campo.classList.remove("campo-erro");

    }

}
*/

/*
====================================
TRABALHO / SERVIDOR
====================================
*/
/*
function toggleTrabalho(exibir) {

    const bloco = document.getElementById("bloco-orgao-input");

    const campo = document.getElementById("nome-orgao");

    if (exibir) {

        bloco.classList.remove("etapa-escondida");

        campo.required = true;

    }

    else {

        bloco.classList.add("etapa-escondida");

        campo.required = false;

        campo.value = "";

        campo.classList.remove("campo-erro");

    }

    atualizarBeneficios();

}

*/
/*
====================================
DESCONTOS
====================================
*/

let isencaoSelecionada = false;
let pixSelecionado = false;

// "Avançar!" da etapa 4 aparece quando houver uma forma escolhida: Pix OU isenção
function atualizarBotaoAvancarEtapa4() {

    const botaoAvancar = document.getElementById("botao-avancar-etapa4");

    botaoAvancar.classList.toggle("etapa-escondida", !(isencaoSelecionada || pixSelecionado));

}

function definirIsencao(ativa) {

    isencaoSelecionada = ativa;

    const botaoIsencao = document.getElementById("botao-isencao");

    // Isenção e Pix são excludentes: escolher a isenção desmarca o Pix
    if (ativa)
        definirPix(false);

    botaoIsencao.classList.toggle("isencao-ativa", ativa);
    botaoIsencao.textContent = ativa
        ? "✔ Isenção selecionada (clique para desfazer)"
        : "Solicitar Isenção de Taxa";

    atualizarBotaoAvancarEtapa4();

}

function alternarIsencao() {

    definirIsencao(!isencaoSelecionada);

}

function definirPix(ativo) {

    pixSelecionado = ativo;

    const botaoPix = document.getElementById("botao-pix");

    // Escolher o Pix desmarca a isenção
    if (ativo && isencaoSelecionada)
        definirIsencao(false);

    botaoPix.classList.toggle("pix-ativo", ativo);
    botaoPix.textContent = ativo ? "✔ Pix selecionado" : "Pagar com Pix";

    atualizarBotaoAvancarEtapa4();

}

function atualizarBeneficios() {

    const opcaoIsencao = document.getElementById("opcao-isencao");

    const ensino = document.querySelector(
        'input[name="ensino-medio"]:checked'
    );

    const temDireito = !!ensino &&
        (ensino.value === "Publica" || ensino.value === "Privada Bolsa");

    opcaoIsencao.classList.toggle("etapa-escondida", !temDireito);

    // Sem direito à isenção: desfaz a seleção e esconde o "Avançar!"
    if (!temDireito)
        definirIsencao(false);

}


/*
====================================
EVENTOS AUTOMÁTICOS
====================================
*/

document.querySelectorAll('input[name="ensino-medio"]').forEach(radio => {
    radio.addEventListener("change", atualizarBeneficios);
});

/*
====================================
1ª E 2ª OPÇÃO NÃO PODEM SER IGUAIS (CURSO E TURNO)
====================================
*/

function impedirOpcoesIguais(nomeA, nomeB) {

    const radiosA = document.querySelectorAll(`input[name="${nomeA}"]`);
    const radiosB = document.querySelectorAll(`input[name="${nomeB}"]`);

    function bloquear(radio, bloqueado) {

        const rotulo = radio.closest(".opcao-radio");

        radio.disabled = bloqueado;
        rotulo.classList.toggle("opcao-bloqueada", bloqueado);
        rotulo.title = bloqueado ? "Já escolhido na outra opção" : "";

    }

    function atualizar() {

        const escolhidoA = document.querySelector(`input[name="${nomeA}"]:checked`);
        const escolhidoB = document.querySelector(`input[name="${nomeB}"]:checked`);

        radiosA.forEach(r => bloquear(r, !!escolhidoB && r.value === escolhidoB.value));
        radiosB.forEach(r => bloquear(r, !!escolhidoA && r.value === escolhidoA.value));

    }

    [...radiosA, ...radiosB].forEach(r => r.addEventListener("change", atualizar));

    atualizar();

}

impedirOpcoesIguais("curso-opcao1", "curso-opcao2");
impedirOpcoesIguais("turno-opcao1", "turno-opcao2");

/*
====================================
ETAPA 4 -> (isenção: etapa 5) ou (Pix: finaliza)
====================================
*/

function avancarEtapa4() {

    if (isencaoSelecionada)
        return irParaEtapa5();

    if (pixSelecionado)
        return confirmarPix();

}

function irParaEtapa5() {

    if (!isencaoSelecionada)
        return;

    document.getElementById("etapa-4").classList.add("etapa-escondida");
    document.getElementById("etapa-5").classList.remove("etapa-escondida");

    window.scrollTo({ top: 0, behavior: "smooth" });

}


/*
====================================
UPLOAD DA ETAPA 5
====================================
*/

function atualizarStatusArquivo(input, idStatus) {

    const status = document.getElementById(idStatus);

    if (!status)
        return;

    if (input.files.length === 0) {

        status.className = "barra-status-upload status-pendente";

        status.innerHTML = `
            <span class="status-texto-esquerda">
                • Nenhum arquivo selecionado
            </span>

            <span class="status-texto-direita">
                Pendente
            </span>
        `;

        return;

    }

    const arquivo = input.files[0];

    status.className = "barra-status-upload status-selecionado";

    status.innerHTML = `
        <span class="status-texto-esquerda">
            ✔ ${arquivo.name}
        </span>

        <span class="status-texto-direita">
            Selecionado
        </span>
    `;

}


/*
====================================
VALIDAÇÃO DOS UPLOADS
====================================
*/

const IDS_UPLOADS = ["doc-historico", "doc-residencia", "doc-holerite", "doc-extrato"];

function uploadsCompletos() {

    const etapa = document.getElementById("etapa-5");

    limparMensagensErro(etapa);

    let completo = true;

    IDS_UPLOADS.forEach(id => {

        const campo = document.getElementById(id);

        campo.parentElement.classList.remove("campo-erro");

        if (!campo.files.length) {

            completo = false;
            campo.parentElement.classList.add("campo-erro");

        }

    });

    if (!completo)
        mostrarErroEtapa(etapa, "Envie todos os documentos obrigatórios.");

    return completo;

}


/*
====================================
FINALIZAÇÃO (isenção): só aqui a inscrição é gravada no banco
====================================
*/

let finalizando = false;

async function finalizarFormulario() {

    if (finalizando)
        return;

    if (!uploadsCompletos())
        return;

    const etapa = document.getElementById("etapa-5");

    const dados = new FormData();

    IDS_UPLOADS.forEach(id => {
        dados.append(id, document.getElementById(id).files[0]);
    });

    finalizando = true;

    try {

        const resposta = await fetch("inscricao_php/inscricao-finalizar-nebula.php", {
            method: "POST",
            body: dados
        });

        const retorno = await resposta.json();

        if (retorno.sucesso) {
            window.location.href = "carregamento_vestibular.html";
            return;
        }

        mostrarErroEtapa(etapa, retorno.erro);

    } catch (erro) {

        mostrarErroEtapa(etapa, "Não foi possível enviar os documentos. Verifique o tamanho dos arquivos e tente novamente.");

    }

    finalizando = false;

}


/*
====================================
INICIALIZAÇÃO
====================================
*/

document.addEventListener("DOMContentLoaded", () => {

    atualizarBeneficios();

});

/*
====================================
PAGAMENTO PIX (SIMULADO)
====================================
*/

function abrirModalPix() {

    document.getElementById("modal-pix").classList.remove("etapa-escondida");
    document.getElementById("botao-copiar-pix").textContent = "Copiar";

}

function fecharModalPix() {

    document.getElementById("modal-pix").classList.add("etapa-escondida");

}

// "Continuar" no modal: fecha e deixa o Pix selecionado (aparece o "Avançar!")
function selecionarPix() {

    definirPix(true);
    fecharModalPix();

}

async function copiarChavePix() {

    const chave = document.getElementById("chave-pix").textContent;
    const botao = document.getElementById("botao-copiar-pix");

    try {
        await navigator.clipboard.writeText(chave);
        botao.textContent = "Copiado!";
    } catch (erro) {
        botao.textContent = "Selecione e copie";
    }

}

// Fecha o modal clicando fora da caixa ou apertando Esc
document.getElementById("modal-pix").addEventListener("click", evento => {

    if (evento.target.id === "modal-pix")
        fecharModalPix();

});

document.addEventListener("keydown", evento => {

    if (evento.key === "Escape")
        fecharModalPix();

});

// "Avançar!" com o Pix selecionado: grava a inscrição, gera a nota e segue
let confirmandoPix = false;

async function confirmarPix() {

    if (!pixSelecionado || confirmandoPix)
        return;

    const etapa = document.getElementById("etapa-4");
    const botao = document.getElementById("botao-avancar-etapa4");

    limparMensagensErro(etapa);

    confirmandoPix = true;
    botao.disabled = true;
    botao.textContent = "Confirmando pagamento...";

    try {

        const resposta = await fetch("pagamento/confirmar_pix.php", {
            method: "POST"
        });

        const retorno = await resposta.json();

        if (retorno.sucesso) {
            window.location.href = "carregamento_vestibular.html";
            return;
        }

        mostrarErroEtapa(etapa, retorno.erro);

    } catch (erro) {

        mostrarErroEtapa(etapa, "Não foi possível confirmar o pagamento. Tente novamente.");

    }

    confirmandoPix = false;
    botao.disabled = false;
    botao.textContent = "Avançar!";

}
