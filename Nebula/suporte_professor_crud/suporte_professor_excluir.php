<?php
// ==========================================================
// POST suporte_professor_excluir.php
// Campo: id (id_prof do professor)
// Apaga o professor de prof_login e tudo que é ligado a ele
// (disciplinas, agenda e calendário), tudo numa transação.
// Colocar na mesma pasta do suporte_professor_criar.php.
// ==========================================================

header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../iniciar_sessao.php';
header("Content-Type: application/json; charset=utf-8");
iniciarSessao('suporte');

include_once __DIR__ . '/../connect_nebula.php';
require_once __DIR__ . '/../suporte_permissoes.php';
exigirPermissao($link, 'professores');

$id = (int) ($_POST["id"] ?? 0);

if ($id <= 0) {
    echo json_encode(["sucesso" => false, "mensagem" => "Professor inválido."]);
    exit;
}

try {

    // O professor existe?
    $stmt = mysqli_prepare($link, "SELECT id_prof FROM prof_login WHERE id_prof = ? LIMIT 1");
    mysqli_stmt_bind_param($stmt, "i", $id);
    mysqli_stmt_execute($stmt);
    $existe = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

    if (!$existe) {
        http_response_code(404);
        echo json_encode(["sucesso" => false, "mensagem" => "Professor não encontrado."]);
        exit;
    }

    // Transação: ou apaga o professor e tudo que é dele, ou não apaga nada.
    // Ordem: primeiro as tabelas filhas, por último o professor.
    mysqli_begin_transaction($link);

    $tabelasFilhas = [
        "DELETE FROM prof_disciplinas  WHERE id_prof = ?",
        "DELETE FROM prof_turmas       WHERE id_prof = ?",
        "DELETE FROM agenda_professor  WHERE professor_id = ?",
        "DELETE FROM eventos_calendario WHERE professor_id = ?",
        "DELETE FROM prof_login        WHERE id_prof = ?",
    ];

    foreach ($tabelasFilhas as $sql) {
        $stmt = mysqli_prepare($link, $sql);
        mysqli_stmt_bind_param($stmt, "i", $id);
        if (!mysqli_stmt_execute($stmt)) {
            throw new Exception("Falha em: " . $sql);
        }
        mysqli_stmt_close($stmt);
    }

    mysqli_commit($link);

    echo json_encode(["sucesso" => true]);

} catch (Throwable $erro) {
    mysqli_rollback($link);
    error_log("Erro ao excluir professor: " . $erro->getMessage());
    http_response_code(500);
    echo json_encode(["sucesso" => false, "mensagem" => "Erro ao excluir o professor."]);
}