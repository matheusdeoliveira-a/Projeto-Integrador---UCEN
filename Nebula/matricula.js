/*==================================================
        FORMULÁRIO DE MATRÍCULA NEBULA
==================================================*/


/*
====================================
ELEMENTOS
====================================
*/

const formulario = document.getElementById("formulario-nebula");

/*
====================================
LINK DO E-MAIL (TOKEN) E DADOS DO VESTIBULAR
====================================
*/

const tokenMatricula = new URLSearchParams(window.location.search).get("t") || "";

let dadosMatricula = null;   // curso, turno, modalidade e isenção (vêm do banco)

// Aviso no canto da tela (no lugar do alert)
function mostrarAviso(texto) {

    const aviso = document.createElement("div");
    aviso.className = "aviso-matricula";
    aviso.setAttribute("role", "alert");
    aviso.textContent = texto;
    document.body.appendChild(aviso);

    setTimeout(() => aviso.remove(), 6000);

}

// Cobre a página quando o link é inválido ou a matrícula não está liberada
function bloquearMatricula(texto) {

    const bloqueio = document.createElement("div");
    bloqueio.className = "bloqueio-matricula";
    bloqueio.innerHTML = `
        <div class="bloqueio-matricula-caixa">
            <h3>Matrícula indisponível</h3>
            <p></p>
            <a href="Home.php">Voltar para Home</a>
        </div>
    `;
    bloqueio.querySelector("p").textContent = texto;
    document.body.appendChild(bloqueio);

}

function formatarCPFValor(valor) {

    return String(valor).replace(/\D/g, "").substring(0, 11)
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

}

function formatarTelefoneValor(valor) {

    const d = String(valor || "").replace(/\D/g, "").substring(0, 11);

    if (d.length <= 10)
        return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");

    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");

}

async function carregarDadosMatricula() {

    if (!/^[a-f0-9]{32}$/.test(tokenMatricula)) {
        bloquearMatricula("Link de matrícula inválido. Use o botão do e-mail de aprovação.");
        return;
    }

    let resposta;

    try {
        const requisicao = await fetch(
            "matricula/matricula-dados-nebula.php?t=" + tokenMatricula
        );
        resposta = await requisicao.json();
    }
    catch (erro) {
        bloquearMatricula("Não foi possível conectar ao servidor. Tente novamente em instantes.");
        return;
    }

    if (!resposta.sucesso) {
        bloquearMatricula(resposta.erro || "Não foi possível abrir a matrícula.");
        return;
    }

    dadosMatricula = resposta.dados;

    // Pré-preenche o que o candidato já informou na inscrição
    const preencher = (id, valor) => {
        const campo = document.getElementById(id);
        if (campo && valor) campo.value = valor;
    };

    preencher("nome-completo", dadosMatricula.nome);
    preencher("cpf", formatarCPFValor(dadosMatricula.cpf));
    preencher("data-nascimento", dadosMatricula.nascimento);
    preencher("email-principal", dadosMatricula.email);
    preencher("telefone", formatarTelefoneValor(dadosMatricula.telefone));
    preencher("telefone-reserva", formatarTelefoneValor(dadosMatricula.reserva));

    // O CPF identifica a inscrição: não pode ser alterado aqui
    const campoCpfBloqueado = document.getElementById("cpf");
    if (campoCpfBloqueado) campoCpfBloqueado.readOnly = true;

    // Isenção concedida no vestibular: a taxa de matrícula já é isenta
    if (dadosMatricula.isento) {

        const lista = document.querySelector("#etapa-4 .lista-opcoes");

        if (lista) {
            lista.innerHTML = `
                <label id="opcao-isencao" class="opcao-radio">
                    <input type="radio" name="pagamento" value="Isencao" required checked>
                    <span>
                        Isenção da Taxa: você possui direito à isenção
                        concedida no processo seletivo.
                    </span>
                </label>
            `;
        }

    }

}


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

    const radiosVerificados = [];

    const campos = etapa.querySelectorAll("input[required], select[required], textarea[required]");

    campos.forEach(campo => {

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

                                radio.removeEventListener(
                                    "change",
                                    removerErro
                                );

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

        else if (campo.type === "checkbox") {

            if (!campo.checked) {

                valido = false;

                campo.classList.add("campo-erro");

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

function proximaEtapa(atual, proxima) {

    if (!validarEtapa(atual))
        return;

    document
        .getElementById(`etapa-${atual}`)
        .classList
        .add("etapa-escondida");

    document
        .getElementById(`etapa-${proxima}`)
        .classList
        .remove("etapa-escondida");

    if (proxima === 6)
        preencherResumo();

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
MÁSCARA DE RG
====================================
*/

const campoRG = document.getElementById("rg");

if (campoRG) {

    campoRG.addEventListener("input", function () {

        let valor = this.value.replace(/\D/g, "");

        valor = valor.substring(0, 9);

        valor = valor.replace(/(\d{2})(\d)/, "$1.$2");
        valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
        valor = valor.replace(/(\d{3})(\d{1})$/, "$1-$2");

        this.value = valor;

    });

}


/*
====================================
MÁSCARA DE CEP
====================================
*/

const campoCEP = document.getElementById("cep");

if (campoCEP) {

    campoCEP.addEventListener("input", function () {

        let valor = this.value.replace(/\D/g, "");

        valor = valor.substring(0, 8);

        valor = valor.replace(/(\d{5})(\d)/, "$1-$2");

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

    if (!campo)
        return;

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
CEP — CONSULTA DE ENDEREÇO
====================================
*/

if (campoCEP) {

    campoCEP.addEventListener("blur", consultarCEP);

}


async function consultarCEP() {

    const cep = campoCEP.value.replace(/\D/g, "");

    if (cep.length !== 8)
        return;

    try {

        const resposta = await fetch(
            `https://viacep.com.br/ws/${cep}/json/`
        );

        const dados = await resposta.json();

        if (dados.erro) {

            mostrarAviso("CEP não encontrado.");

            return;

        }

        const logradouro = document.getElementById("logradouro");
        const bairro = document.getElementById("bairro");
        const cidade = document.getElementById("cidade");
        const uf = document.getElementById("uf-endereco");

        logradouro.value = dados.logradouro || "";
        bairro.value = dados.bairro || "";
        cidade.value = dados.localidade || "";
        uf.value = dados.uf || "";

    }

    catch (erro) {

        console.error("Erro ao consultar o CEP:", erro);

    }

}


/*
====================================
ACESSIBILIDADE
====================================
*/

document
    .querySelectorAll('input[name="acessibilidade"]')
    .forEach(radio => {

        radio.addEventListener("change", function () {

            const campo = document.getElementById("campo-acessibilidade");

            const textarea = document.getElementById(
                "necessidade-acessibilidade"
            );

            if (this.value === "sim") {

                campo.classList.remove("etapa-escondida");

                textarea.required = true;

            }

            else {

                campo.classList.add("etapa-escondida");

                textarea.required = false;

                textarea.value = "";

                textarea.classList.remove("campo-erro");

            }

        });

    });


/*
====================================
MORADIA
====================================
*/

document
    .querySelectorAll('input[name="mora-sozinho"]')
    .forEach(radio => {

        radio.addEventListener("change", function () {

            const rendaIndividual = document.getElementById(
                "campo-renda-individual"
            );

            const campoRendaIndividual = document.getElementById(
                "renda-individual"
            );

            const grupoFamiliar = document.getElementById(
                "grupo-familiar"
            );

            const quantidadeMoradores = document.getElementById(
                "quantidade-moradores"
            );

            const rendaFamiliar = document.getElementById(
                "renda-familiar"
            );


            if (this.value === "sim") {

                rendaIndividual.classList.remove("etapa-escondida");

                campoRendaIndividual.required = true;

                grupoFamiliar.classList.add("etapa-escondida");

                quantidadeMoradores.required = false;
                rendaFamiliar.required = false;

                quantidadeMoradores.value = "";
                rendaFamiliar.value = "";

            }

            else {

                rendaIndividual.classList.add("etapa-escondida");

                campoRendaIndividual.required = false;

                campoRendaIndividual.value = "";

                grupoFamiliar.classList.remove("etapa-escondida");

                quantidadeMoradores.required = true;
                rendaFamiliar.required = true;

            }

        });

    });


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

        status.className =
            "barra-status-upload status-pendente";

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

    status.className =
        "barra-status-upload status-selecionado";

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

function uploadsCompletos() {

    const uploads = [

        "doc-identificacao",
        "doc-certidao",
        "doc-residencia",
        "doc-certificado-ensino-medio",
        "doc-foto"

    ];

    for (const id of uploads) {

        const arquivo = document.getElementById(id);

        if (!arquivo || !arquivo.files.length) {

            mostrarAviso("Envie todos os documentos obrigatórios.");

            return false;

        }

    }

    return true;

}


/*
====================================
VERIFICAÇÃO DA ETAPA 4
====================================
*/

function verificarDestinoEtapa4() {

    if (!validarEtapa(4))
        return;

    const pagamento = document.querySelector(
        'input[name="pagamento"]:checked'
    );

    if (!pagamento)
        return;

    fecharModalPix();

    proximaEtapa(4, 5);

}


/*
====================================
MODAL PIX
====================================
*/

const modalPix = document.getElementById(
    "modalPixMatricula"
);

const btnFecharPix = document.getElementById(
    "btnFecharPixMatricula"
);


function abrirModalPix() {

    if (!modalPix)
        return;

    modalPix.classList.add("ativo");

}


function fecharModalPix() {

    if (!modalPix)
        return;

    modalPix.classList.remove("ativo");

}


if (btnFecharPix) {

    btnFecharPix.addEventListener(
        "click",
        fecharModalPix
    );

}


if (modalPix) {

    modalPix.addEventListener("click", function (evento) {

        if (evento.target === modalPix)
            fecharModalPix();

    });

}


/*
====================================
COPIAR PIX
====================================
*/

const btnCopiarPix = document.getElementById(
    "btnCopiarPixMatricula"
);

const chavePix = document.getElementById(
    "chavePixMatricula"
);


if (btnCopiarPix && chavePix) {

    btnCopiarPix.addEventListener("click", async function () {

        try {

            await navigator.clipboard.writeText(
                chavePix.value
            );

            this.textContent = "Código Pix copiado!";

            setTimeout(() => {

                this.textContent = "Copiar código Pix";

            }, 2000);

        }

        catch (erro) {

            chavePix.select();

            document.execCommand("copy");

            this.textContent = "Código Pix copiado!";

            setTimeout(() => {

                this.textContent = "Copiar código Pix";

            }, 2000);

        }

    });

}
/*
====================================
ABRIR MODAL AO SELECIONAR PIX
====================================
*/

document
    .querySelectorAll('input[name="pagamento"]')
    .forEach(radio => {

        radio.addEventListener("change", function () {

            if (this.value === "PIX")
                abrirModalPix();

        });

    });


/*
====================================
RESUMO DA MATRÍCULA
====================================
*/

function preencherResumoVestibular() {

    if (!dadosMatricula)
        return;

    const valores = {
        "resumo-curso": dadosMatricula.curso,
        "resumo-sala": dadosMatricula.sala,
        "resumo-turno": dadosMatricula.turno,
        "resumo-modalidade": dadosMatricula.modalidade
    };

    Object.entries(valores).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = valor || "—";
    });

    const taxa = document.getElementById("resumo-valor-taxa");
    if (taxa && dadosMatricula.isento)
        taxa.textContent = "Isenta (R$ 0,00)";

}

function preencherResumo() {

    preencherResumoVestibular();


    const campos = {

        "resumo-nome": "nome-completo",
        "resumo-cpf": "cpf",
        "resumo-rg": "rg",
        "resumo-orgao-expedidor": "orgao-expedidor",
        "resumo-uf-rg": "uf-rg",
        "resumo-data-nascimento": "data-nascimento",
        "resumo-nome-mae": "nome-mae",
        "resumo-nome-pai": "nome-pai",
        "resumo-email": "email-principal",
        "resumo-telefone": "telefone",
        "resumo-telefone-reserva": "telefone-reserva",

        "resumo-cep": "cep",
        "resumo-logradouro": "logradouro",
        "resumo-numero": "numero",
        "resumo-complemento": "complemento",
        "resumo-bairro": "bairro",
        "resumo-cidade": "cidade",
        "resumo-uf-endereco": "uf-endereco",

        "resumo-nacionalidade": "nacionalidade",
        "resumo-cidade-nascimento": "cidade-nascimento",
        "resumo-uf-nascimento": "uf-nascimento"

    };


    Object.entries(campos).forEach(([resumo, campo]) => {

        const elementoResumo =
            document.getElementById(resumo);

        const elementoCampo =
            document.getElementById(campo);

        if (!elementoResumo || !elementoCampo)
            return;

        if (elementoCampo.tagName === "SELECT") {

            const opcao =
                elementoCampo.options[elementoCampo.selectedIndex];

            elementoResumo.textContent =
                opcao ? opcao.textContent : "—";

        }

        else {

            elementoResumo.textContent =
                elementoCampo.value.trim() || "—";

        }

    });


    const pagamento = document.querySelector(
        'input[name="pagamento"]:checked'
    );

    const resumoPagamento =
        document.getElementById("resumo-forma-pagamento");

    if (resumoPagamento) {

        resumoPagamento.textContent =
            pagamento ? (pagamento.value === "Isencao" ? "Isenção" : pagamento.value) : "—";

    }

}


/*
====================================
CONFIRMAÇÃO DA MATRÍCULA
====================================
*/

let enviandoMatricula = false;

formulario.addEventListener("submit", async function (evento) {

    evento.preventDefault();

    if (enviandoMatricula)
        return;

    if (!validarEtapa(6))
        return;

    if (!uploadsCompletos())
        return;

    preencherResumo();

    const botao = document.getElementById("btn-confirmar-matricula");

    enviandoMatricula = true;
    botao.disabled = true;
    botao.textContent = "Enviando...";

    // Todos os campos e os 5 arquivos vão juntos; o PHP valida tudo de novo
    const dados = new FormData(formulario);
    dados.set("token", tokenMatricula);

    try {

        const requisicao = await fetch(
            "matricula/matricula-salvar-nebula.php",
            { method: "POST", body: dados }
        );
        const resposta = await requisicao.json();

        if (resposta.sucesso) {
            window.location.href = "carregamento_matricula.html";
            return;
        }

        mostrarAviso(resposta.erro || "Não foi possível concluir a matrícula.");

    }
    catch (erro) {

        mostrarAviso("Não foi possível conectar ao servidor. Tente novamente.");

    }

    enviandoMatricula = false;
    botao.disabled = false;
    botao.textContent = "Confirmar Matrícula";

});


/*
====================================
INICIALIZAÇÃO
====================================
*/

carregarDadosMatricula();