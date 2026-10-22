<?php
// ==========================================================
// POST suporte_operador_excluir.php
// Campo: id (id_suporte)
// Ninguém exclui a si mesmo; quem não é administrador não exclui administradores.
// ==========================================================

header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('suporte');

include_once __DIR__ . '/../connect_nebula.php';
require_once __DIR__ . '/../suporte_permissoes.php';

$eu = exigirPermissao($link, 'configuracoes');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responderJsonErro(405, "Método inválido");
}

$id = (int) ($_POST["id"] ?? 0);

if ($id <= 0) {
    responderJsonErro(200, "Operador inválido.");
}
if ($id === $eu["id"]) {
    responderJsonErro(200, "Você não pode excluir a sua própria conta.");
}

try {
    $stmt = mysqli_prepare($link, "SELECT acesso_total FROM suporte_login WHERE id_suporte = ? LIMIT 1");
    mysqli_stmt_bind_param($stmt, "i", $id);
    mysqli_stmt_execute($stmt);
    $alvo = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

    if (!$alvo) {
        responderJsonErro(404, "Operador não encontrado.");
    }
    if (!$eu["total"] && (int) $alvo["acesso_total"] === 1) {
        responderJsonErro(403, "Só um administrador pode excluir outro administrador.");
    }

    $stmt = mysqli_prepare($link, "DELETE FROM suporte_login WHERE id_suporte = ?");
    mysqli_stmt_bind_param($stmt, "i", $id);
    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception("Falha ao excluir o operador");
    }
    mysqli_stmt_close($stmt);

    echo json_encode(["sucesso" => true]);

} catch (Throwable $erro) {
    error_log("Erro ao excluir operador: " . $erro->getMessage());
    responderJsonErro(500, "Erro ao excluir o operador.");
}
