<?php
// ==========================================================
// suporte_permissoes.php  (raiz do projeto, ao lado do iniciar_sessao.php)
// Funções compartilhadas pelas páginas do portal do suporte.
//
// Uso nos PHP (depois de iniciarSessao('suporte') e do connect_nebula.php):
//     require_once __DIR__ . '/../suporte_permissoes.php';
//     $eu = exigirPermissao($link, 'professores');
//
// As permissões são lidas do BANCO a cada requisição (não da sessão), então
// uma alteração feita nas Configurações vale na hora, sem precisar logar de novo.
// ==========================================================

// Chaves dos menus que podem ser liberados. "Início" é sempre liberado.
const MENUS_SUPORTE = ['academico', 'professores', 'financeiro', 'atendimento', 'salas', 'relatorios', 'configuracoes'];

function responderJsonErro(int $codigo, string $mensagem): void {
    http_response_code($codigo);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode(["sucesso" => false, "mensagem" => $mensagem]);
    exit;
}

// Recebe um JSON ou um array e devolve só as chaves de menu válidas, sem repetir.
function limparPermissoes($bruto): array {
    if (is_string($bruto)) {
        $bruto = json_decode($bruto, true);
    }
    if (!is_array($bruto)) {
        return [];
    }
    $validas = [];
    foreach ($bruto as $chave) {
        if (is_string($chave) && in_array($chave, MENUS_SUPORTE, true)) {
            $validas[$chave] = $chave;
        }
    }
    return array_values($validas);
}

// Confere a sessão E a conta no banco. Devolve: id, nome, total (bool), menus (array).
function carregarSuporteLogado(mysqli $link): array {
    if (!isset($_SESSION['logado']) || $_SESSION['logado'] !== true) {
        responderJsonErro(401, "Não autenticado");
    }
    if (($_SESSION['tipo'] ?? '') !== 'suporte' || empty($_SESSION['id_suporte'])) {
        responderJsonErro(403, "Sem permissão");
    }

    $id = (int) $_SESSION['id_suporte'];
    $stmt = mysqli_prepare($link, "SELECT nome, ativo, acesso_total, permissoes FROM suporte_login WHERE id_suporte = ? LIMIT 1");
    mysqli_stmt_bind_param($stmt, "i", $id);
    mysqli_stmt_execute($stmt);
    $linha = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

    // Conta apagada ou desativada: a sessão antiga deixa de valer
    if (!$linha || (int) $linha['ativo'] !== 1) {
        responderJsonErro(401, "Conta inativa");
    }

    $total = ((int) $linha['acesso_total'] === 1);
    $menus = $total ? MENUS_SUPORTE : limparPermissoes($linha['permissoes'] ?? '[]');

    return ["id" => $id, "nome" => $linha['nome'], "total" => $total, "menus" => $menus];
}

// Barra a requisição (JSON 401/403) se o operador não tem o menu liberado.
function exigirPermissao(mysqli $link, string $menu): array {
    $eu = carregarSuporteLogado($link);
    if (!in_array($menu, $eu['menus'], true)) {
        responderJsonErro(403, "Você não tem permissão para acessar esta área.");
    }
    return $eu;
}

// O login procura o e-mail em usuarios, prof_login e suporte_login (nessa ordem),
// então o mesmo e-mail não pode existir em duas tabelas.
function emailEmUso(mysqli $link, string $email, int $ignorarSuporte = 0): bool {
    $stmt = mysqli_prepare($link,
        "SELECT 1 FROM usuarios WHERE email = ?
         UNION ALL SELECT 1 FROM prof_login WHERE email = ?
         UNION ALL SELECT 1 FROM suporte_login WHERE email = ? AND id_suporte <> ?
         LIMIT 1");
    mysqli_stmt_bind_param($stmt, "sssi", $email, $email, $email, $ignorarSuporte);
    mysqli_stmt_execute($stmt);
    $achou = mysqli_fetch_row(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);
    return (bool) $achou;
}
