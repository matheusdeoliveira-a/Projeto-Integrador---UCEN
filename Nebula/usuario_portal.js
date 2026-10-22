// ==========================================================
// usuario_portal.js
// Preenche as páginas do portal do ALUNO e do PROFESSOR com os dados de
// quem está logado (nome no "Olá", letra do avatar, dados do perfil).
//
// Como usar nas páginas:
//   <span data-eu="primeiro_nome"></span>        -> troca o texto
//   <input data-eu="email" readonly>             -> troca o valor do campo
//   <div data-eu-lista="disciplinas"></div>      -> monta etiquetas (professor)
// Campo que o banco não tem aparece como "—".
// O portal é escolhido pelo nome da página: aluno_*.html ou professor_*.html.
// ==========================================================
(function () {

    const arquivo = (window.location.pathname.split("/").pop() || "").toLowerCase();

    let portal = null;
    if (arquivo.startsWith("aluno_")) portal = "aluno";
    else if (arquivo.startsWith("professor_")) portal = "professor";
    if (!portal) return;

    function vazio(valor) {
        return valor === null || valor === undefined || String(valor).trim() === "";
    }

    function preencher(eu) {

        document.querySelectorAll("[data-eu]").forEach(el => {
            const valor = eu[el.dataset.eu];
            const texto = vazio(valor) ? "—" : String(valor);

            if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") el.value = texto;
            else el.textContent = texto;
        });

        document.querySelectorAll("[data-eu-lista]").forEach(el => {
            const lista = eu[el.dataset.euLista];
            el.innerHTML = "";

            if (!Array.isArray(lista) || lista.length === 0) {
                const vazioMsg = document.createElement("span");
                vazioMsg.className = "tag-disciplina";
                vazioMsg.textContent = "Nenhuma cadastrada";
                el.appendChild(vazioMsg);
                return;
            }

            lista.forEach(item => {
                const tag = document.createElement("span");
                tag.className = "tag-disciplina";
                tag.textContent = item;   // textContent: nada do banco vira HTML
                el.appendChild(tag);
            });
        });

        // Letra do avatar no cabeçalho (o círculo do perfil mantém o ícone)
        if (!vazio(eu.inicial)) {
            document.querySelectorAll(".perfil").forEach(el => {
                if (!el.querySelector("img")) el.textContent = eu.inicial;
            });
        }
    }

    async function carregar() {
        try {
            const resposta = await fetch(portal + "_eu.php", { credentials: "same-origin", cache: "no-store" });

            // Sem sessão válida neste portal: não mostra a página com dados de outra pessoa
            if (resposta.status === 401) {
                window.location.href = "login.html";
                return;
            }

            const dados = await resposta.json();
            if (dados && dados.sucesso && dados.eu) preencher(dados.eu);
        } catch (erro) {
            console.error("Não foi possível carregar os dados do usuário:", erro);
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", carregar);
    else carregar();

})();
