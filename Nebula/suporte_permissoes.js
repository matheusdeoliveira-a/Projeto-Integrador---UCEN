// ==========================================================
// suporte_permissoes.js
// Incluir em TODAS as páginas suporte_*.html (antes do </body>):
//   <script src="suporte_permissoes.js" defer></script>
//
// Funcionamento (a tela começa FECHADA e o servidor abre o que é permitido):
//  1) assim que a página carrega, esconde todos os links de menus (menu lateral,
//     cards da home...). Nada de menu aparece "por engano" enquanto espera o servidor.
//  2) pergunta ao servidor quais menus o operador pode usar e reexibe só esses
//  3) se ele abrir pela URL uma página que não é dele, volta para o Início
// ATENÇÃO: isto só melhora a tela. A proteção de verdade está nos PHP
// (exigirPermissao), que precisam ser chamados em cada página.
// ==========================================================
(async function () {

    const PAGINAS = {
        "suporte_academico.html":      "academico",
        "suporte_professores.html":    "professores",
        "suporte_financeiro.html":     "financeiro",
        "suporte_atendimento.html":    "atendimento",
       /* "suporte_salas.html":          "salas", */
        "suporte_relatorios.html":     "relatorios",
        "suporte_configuracoes.html":  "configuracoes"
    };

    function nomeDaPagina(url) {
        try {
            return new URL(url, location.href).pathname.split("/").pop();
        } catch (_) {
            return "";
        }
    }

    // Links que levam a um menu controlado (a logo e o avatar do topo ficam como estão)
    const linksControlados = [...document.querySelectorAll("a[href]")].filter(a =>
        !a.closest(".logo, .perfil") && PAGINAS[nomeDaPagina(a.getAttribute("href"))] !== undefined
    );

    // 1) Começa tudo escondido
    linksControlados.forEach(a => { a.style.display = "none"; });

    try {
        const resp = await fetch("suporte_conf_crud/suporte_minhas_permissoes.php");

        // Sem sessão de suporte (ou conta desativada): volta para o login
        if (resp.status === 401 || resp.status === 403) {
            location.replace("login.html");
            return;
        }

        const json = await resp.json();
        if (!json.sucesso) return;   // fica tudo escondido (falha segura)

        const liberados = new Set(json.menus);
        const permitido = (url) => {
            const chave = PAGINAS[nomeDaPagina(url)];
            return chave === undefined || liberados.has(chave);
        };

        // 3) Esta página não é permitida: vai para o Início
        if (!permitido(location.href)) {
            location.replace("suporte_inicio.html");
            return;
        }

        // 2) Reexibe só o que o operador pode usar
        linksControlados.forEach(a => {
            if (permitido(a.getAttribute("href"))) a.style.display = "";
        });

        // Lista da pesquisa do topo
        document.querySelectorAll("#lista-header li[data-url]").forEach(li => {
            if (!permitido(li.dataset.url)) li.remove();
        });

    } catch (erro) {
        console.error("Não foi possível carregar as permissões:", erro);
    }
})();
