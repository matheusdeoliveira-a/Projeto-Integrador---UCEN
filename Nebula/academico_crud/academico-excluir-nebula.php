<?php
include_once(__DIR__ . "/academico-base-nebula.php");
exigirMetodo('POST');

// Exclui a matrícula do aluno (tabela `matriculas`) e os documentos dela.
// A conta em `usuarios` NÃO é apagada.

$id = filter_var($_POST['id'] ?? '', FILTER_VALIDATE_INT);

if (!$id) {
    responderErro("Aluno inválido.");
}

try {

    mysqli_begin_transaction($link);

    // 1) Documentos no banco (filhos primeiro)
    $stmt = mysqli_prepare($link, "DELETE FROM matricula_documentos WHERE id_matricula = ?");
    mysqli_stmt_bind_param($stmt, "i", $id);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    // 2) A matrícula
    $stmt = mysqli_prepare($link, "DELETE FROM matriculas WHERE id_matricula = ?");
    mysqli_stmt_bind_param($stmt, "i", $id);
    mysqli_stmt_execute($stmt);
    $apagados = mysqli_stmt_affected_rows($stmt);
    mysqli_stmt_close($stmt);

    if ($apagados === 0) {
        mysqli_rollback($link);
        responderErro("Aluno não encontrado. Ele pode já ter sido excluído.");
    }

    mysqli_commit($link);

    // 3) Arquivos em disco (depois do commit: se falhar aqui, o banco já está certo)
    $pasta = __DIR__ . '/../uploads_matricula/' . $id;
    if (is_dir($pasta)) {
        foreach (glob($pasta . '/*') ?: [] as $arquivo) {
            if (is_file($arquivo)) {
                @unlink($arquivo);
            }
        }
        @rmdir($pasta);
    }

    echo json_encode(["sucesso" => true]);

} catch (mysqli_sql_exception $e) {

    mysqli_rollback($link);

    // 1451 = ainda existe registro de outra tabela ligado a esta matrícula (chave estrangeira)
    if ($e->getCode() === 1451) {
        responderErro("Este aluno tem registros vinculados (notas, frequência...) e não pode ser excluído. Altere o status para Cancelado.");
    }

    error_log("excluir aluno: " . $e->getMessage());
    http_response_code(500);
    responderErro("Não foi possível excluir o aluno.");

}