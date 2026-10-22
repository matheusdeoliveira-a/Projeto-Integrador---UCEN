/*==================================================
        FORMULÁRIO DE INSCRIÇÃO NEBULA (ENEM)
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
ELEMENTOS PRINCIPAIS
====================================

Aqui ficam os elementos que serão
utilizados durante todo o formulário.
*/

//Etapa 01

const formulario = document.getElementById("formulario-nebula");


/*
====================================
VALIDAÇÃO DAS ETAPAS
====================================

Esta função verifica se todos os
campos obrigatórios da etapa atual
foram preenchidos corretamente.
*/

function validarEtapa(numeroEtapa) {

    // Localiza a etapa atual
    const etapa = document.getElementById(`etapa-${numeroEtapa}`);

    let valido = true;

    /*
    Remove qualquer marcação de erro
    deixada anteriormente.
    */
    etapa.querySelectorAll(".campo-erro").forEach(elemento => {

        elemento.classList.remove("campo-erro");

    });

    /*
    Evita validar o mesmo grupo de
    radio várias vezes.
    */
    const radiosVerificados = [];

    /*
    Busca todos os campos obrigatórios
    da etapa atual.
    */
    const campos = etapa.querySelectorAll("input[required], select[required]");



    campos.forEach(campo => {

        /*
        ==============================
        CAMPOS RADIO
        ==============================
        */
        if (campo.type === "radio") {

            if (radiosVerificados.includes(campo.name))
                return;

            radiosVerificados.push(campo.name);

            const marcado = etapa.querySelector(
                `input[name="${campo.name}"]:checked`
            );

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

        /*
        ==============================
        CAMPOS DE ARQUIVO
        ==============================
        */
        else if (campo.type === "file") {

            if (campo.files.length === 0) {

                valido = false;

                campo.parentElement.classList.add("campo-erro");

            }

        }

        /*
        ==============================
        INPUTS E SELECTS
        ==============================
        */
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

Valida a etapa atual.

Se estiver correta, esconde a etapa
atual e mostra a próxima.
*/

async function proximaEtapa(atual, proxima) {

    if (!validarEtapa(atual))
        return;

    const etapa = document.getElementById(`etapa-${atual}`);

    // Etapa 2: a 2ª opção precisa ser diferente da 1ª (curso e turno)
    if (atual === 2 && !conferirOpcoesDiferentes(etapa))
        return;

    // Etapa 1: o servidor confere os dados e avisa se CPF / e-mail / telefone já estão inscritos
    if (atual === 1 && !(await conferirEtapa1(etapa)))
        return;

    irParaEtapa(atual, proxima);

}

function irParaEtapa(atual, destino) {

    document
        .getElementById(`etapa-${atual}`)
        .classList
        .add("etapa-escondida");

    document
        .getElementById(`etapa-${destino}`)
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

Oculta a etapa atual e volta para
a etapa anterior.
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

//Etapa 02

/*
====================================
MÁSCARA DE CPF
====================================

Aplica automaticamente a máscara
000.000.000-00 enquanto o usuário digita.
*/

const campoCPF = document.getElementById("cpf");

if (campoCPF) {

    campoCPF.addEventListener("input", function () {

        let valor = this.value.replace(/\D/g, "");

        // CPF possui 11 números
        valor = valor.substring(0, 11);

        valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
        valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
        valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");

        this.value = valor;

    });

}


/*
====================================
MÁSCARA DE RG
====================================

Aplica automaticamente a máscara

00.000.000-0
*/

const campoRG = document.getElementById("rg");

if (campoRG) {

    campoRG.addEventListener("input", function () {

        let valor = this.value.replace(/\D/g, "");

        // RG utilizado pelo formulário
        valor = valor.substring(0, 9);

        valor = valor.replace(/(\d{2})(\d)/, "$1.$2");
        valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
        valor = valor.replace(/(\d{3})(\d{1})$/, "$1-$2");

        this.value = valor;

    });

}


/*
====================================
MÁSCARA DE TELEFONE
====================================

Aplica automaticamente a máscara

(11) 99999-9999

ou

(11) 9999-9999
*/

[
    "telefone-principal",
    "telefone-reserva"
].forEach(id => {

    const campo = document.getElementById(id);

    if (!campo)
        return;

    campo.addEventListener("input", function () {

        let valor = this.value.replace(/\D/g, "");

        // Telefones brasileiros possuem no máximo 11 números
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


//Etapa 03
/*
====================================
MODALIDADE DE CONCORRÊNCIA
====================================

Exibe ou oculta o bloco das cotas.
*/

function toggleCotas(exibir) {

    const bloco = document.getElementById("bloco-cotas");

    if (!bloco)
        return;

    if (exibir) {

        bloco.classList.remove("etapa-escondida");

    }

    else {

        bloco.classList.add("etapa-escondida");

        /*
        Ao voltar para Ampla Concorrência,
        limpa todas as opções internas.
        */

        bloco
            .querySelectorAll('input[type="radio"]')
            .forEach(radio => {

                radio.checked = false;

            });

        /*
        Também garante que o upload PcD
        desapareça caso estivesse aberto.
        */

        toggleLaudo(false);

    }

}


/*
====================================
PESSOA COM DEFICIÊNCIA (PcD)
====================================

Mostra ou oculta o envio do laudo.
*/

function toggleLaudo(exibir) {

    const bloco = document.getElementById("upload-laudo-pcd");

    const campo = document.getElementById("laudo-pcd");

    if (!bloco || !campo)
        return;

    if (exibir) {

        bloco.classList.remove("etapa-escondida");

        campo.required = true;

    }

    else {

        bloco.classList.add("etapa-escondida");

        campo.required = false;

        campo.value = "";

        campo.classList.remove("campo-erro");

        /*
        Volta o status do upload
        para "Pendente".
        */

        atualizarStatusArquivo(campo, "status-laudo-pcd");

    }

}


/*
====================================
NOME SOCIAL
====================================

Exibe ou oculta o campo de
Nome Social.
*/

function toggleNomeSocial(exibir) {

    const bloco = document.getElementById("campo-nome-social");

    const campo = document.getElementById("nome-social");

    if (!bloco || !campo)
        return;

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


/*
====================================
INICIALIZAÇÃO
====================================

Configura os eventos automáticos
quando a página termina de carregar.
*/

document.addEventListener("DOMContentLoaded", function () {

    /*
    ================================
    NOME SOCIAL
    ================================
    */

    const radiosNomeSocial = document.querySelectorAll(
        'input[name="utiliza-nome-social"]'
    );

    radiosNomeSocial.forEach(radio => {

        radio.addEventListener("change", function () {

            toggleNomeSocial(this.value === "sim");

        });

    });

    /*
    Mantém o formulário sincronizado
    caso a página carregue com alguma
    opção já marcada.
    */

    const nomeSocialSelecionado = document.querySelector(
        'input[name="utiliza-nome-social"]:checked'
    );

    if (nomeSocialSelecionado) {

        toggleNomeSocial(nomeSocialSelecionado.value === "sim");

    }

});

// Etapa 04
/*
====================================
STATUS DOS ARQUIVOS
====================================

Atualiza a barra de status logo abaixo
da área de upload.
*/

function atualizarStatusArquivo(input, idStatus) {

    const status = document.getElementById(idStatus);

    if (!status)
        return;

    /*
    ================================
    NENHUM ARQUIVO
    ================================
    */

    if (input.files.length === 0) {

        status.className = "status-upload status-pendente";

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

    /*
    ================================
    ARQUIVO SELECIONADO
    ================================
    */

    const arquivo = input.files[0];

    status.className = "status-upload status-selecionado";

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
MENSAGENS DE ERRO EM VERMELHO
====================================

Aparecem logo abaixo do campo com
problema (no lugar do alert).
*/

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

// Mostra a mensagem logo abaixo do campo (caixa de texto, grupo de opções ou upload)
function mostrarErroCampo(etapa, alvo, mensagem) {

    limparMensagensErro(etapa);

    const ehRadio   = alvo.type === "radio";
    const ehArquivo = alvo.type === "file";

    const caixa = ehRadio
        ? alvo.closest(".lista-opcoes")
        : ehArquivo
            ? alvo.closest(".grupo-upload-moderno")
            : alvo;

    const linha = (ehRadio || ehArquivo) ? caixa : alvo.closest(".campo-formulario");

    caixa.classList.add("campo-erro");

    const aviso = criarAviso(mensagem);
    linha.insertAdjacentElement("afterend", aviso);

    // Alinha o texto com o início da caixa
    if (!ehArquivo) {
        aviso.style.paddingLeft = ehRadio
            ? getComputedStyle(caixa).paddingLeft
            : (caixa.getBoundingClientRect().left - linha.getBoundingClientRect().left) + "px";
    }

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

        alvo.addEventListener(ehArquivo ? "change" : "input", remover, { once: true });

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

// Mostra o erro que o PHP devolveu (retorno.campo = name do input com problema)
function mostrarErroDoServidor(etapa, retorno) {

    const alvo = retorno.campo
        ? etapa.querySelector(`[name="${retorno.campo}"]`)
        : null;

    if (alvo)
        mostrarErroCampo(etapa, alvo, retorno.erro);
    else
        mostrarErroEtapa(etapa, retorno.erro);

}


/*
====================================
1ª E 2ª OPÇÃO NÃO PODEM SER IGUAIS (CURSO E TURNO)
====================================

Mesmo comportamento do vestibular: ao escolher
algo na 1ª opção, essa mesma escolha fica apagada
e bloqueada na 2ª (e vice-versa). O PHP confere
de novo.
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
REGRAS DA ETAPA 2
====================================

A 2ª opção precisa ser diferente da
1ª, tanto no curso quanto no turno.
(O PHP confere de novo.)
*/

function conferirOpcoesDiferentes(etapa) {

    const valor = nome => {
        const marcado = etapa.querySelector(`input[name="${nome}"]:checked`);
        return marcado ? marcado.value : "";
    };

    if (valor("curso-opcao1") === valor("curso-opcao2")) {

        mostrarErroCampo(
            etapa,
            etapa.querySelector('input[name="curso-opcao2"]'),
            "O curso da 2ª opção deve ser diferente do curso da 1ª opção."
        );

        return false;

    }

    if (valor("turno-opcao1") === valor("turno-opcao2")) {

        mostrarErroCampo(
            etapa,
            etapa.querySelector('input[name="turno-opcao2"]'),
            "O turno da 2ª opção deve ser diferente do turno da 1ª opção."
        );

        return false;

    }

    return true;

}


/*
====================================
ETAPA 1: CONFERÊNCIA NO SERVIDOR
====================================

Nada é gravado aqui. O PHP só avisa
se CPF, e-mail ou telefone já estão
inscritos.
*/

let conferindoEtapa1 = false;

async function conferirEtapa1(etapa) {

    if (conferindoEtapa1)
        return false;

    conferindoEtapa1 = true;

    const dados = new FormData();
    dados.append("etapa", "1");

    etapa.querySelectorAll("input, select").forEach(campo => {

        if (campo.name)
            dados.append(campo.name, campo.value);

    });

    limparMensagensErro(etapa);

    let liberado = false;

    try {

        const resposta = await fetch("inscricao_php/inscricao-enem-salvar-nebula.php", {
            method: "POST",
            body: dados
        });

        const retorno = await resposta.json();

        if (retorno.sucesso)
            liberado = true;
        else
            mostrarErroDoServidor(etapa, retorno);

    } catch (erro) {

        mostrarErroEtapa(etapa, "Não foi possível conectar ao servidor. Tente novamente.");

    }

    conferindoEtapa1 = false;

    return liberado;

}


/*
====================================
FINALIZAÇÃO DO FORMULÁRIO
====================================

Valida a última etapa e envia TODOS
os dados da inscrição, junto com o
PDF do boletim do ENEM, para o PHP
gravar no banco.
*/

let finalizando = false;

formulario.addEventListener("submit", async function (event) {

    event.preventDefault();

    if (finalizando)
        return;

    // Valida somente a etapa 4 (as outras já foram validadas ao avançar)
    if (!validarEtapa(4))
        return;

    const etapa4 = document.getElementById("etapa-4");
    const botao  = formulario.querySelector('button[type="submit"]');

    // FormData(formulario) já leva todos os campos preenchidos + os arquivos
    const dados = new FormData(formulario);
    dados.append("etapa", "final");

    finalizando = true;
    botao.disabled = true;
    botao.textContent = "Enviando...";

    limparMensagensErro(etapa4);

    try {

        const resposta = await fetch("inscricao_php/inscricao-enem-salvar-nebula.php", {
            method: "POST",
            body: dados
        });

        const retorno = await resposta.json();

        if (retorno.sucesso) {
            window.location.href = "tela-de-carregamento.html";
            return;
        }

        // Se o problema está em outra etapa, volta até ela e mostra o erro lá
        const numero = retorno.etapa && retorno.etapa !== 4 ? retorno.etapa : 4;

        if (numero !== 4)
            irParaEtapa(4, numero);

        mostrarErroDoServidor(document.getElementById(`etapa-${numero}`), retorno);

    } catch (erro) {

        mostrarErroEtapa(etapa4, "Não foi possível enviar sua inscrição. Verifique o tamanho do PDF e tente novamente.");

    }

    finalizando = false;
    botao.disabled = false;
    botao.textContent = "Enviar Inscrição";

});
