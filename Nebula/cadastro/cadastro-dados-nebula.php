<?php
// GET cadastro-dados-nebula.php?t=<token_cadastro>
// Confere se o link do e-mail ainda vale e devolve só o nome do aluno (para preencher o formulário).
header("Content-type: application/json;charset=utf-8");

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

include_once(__DIR__ . "/../connect_nebula.php");
mysqli_set_charset($link, "utf8mb4");

function responderErro($mensagem) {
    echo json_encode(["sucesso" => false, "erro" => $mensagem]);
    exit;
}

$token = $_GET['t'] ?? '';

if (!is_string($token) || !preg_match('/^[a-f0-9]{32}$/', $token)) {
    responderErro("Link de cadastro inválido. Use o botão do e-mail de matrícula.");
}

try {

    $stmt = mysqli_prepare($link,
        "SELECT nome_completo, id_usuarios FROM matriculas WHERE token_cadastro = ?");
    mysqli_stmt_bind_param($stmt, "s", $token);
    mysqli_stmt_execute($stmt);
    $m = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

} catch (mysqli_sql_exception $e) {

    error_log("cadastro dados: " . $e->getMessage());
    http_response_code(500);
    responderErro("Não foi possível abrir o cadastro. Tente novamente.");

}

if (!$m || $m['id_usuarios'] !== null) {
    responderErro("Este link de cadastro é inválido ou já foi utilizado. Se já criou seu acesso, entre pelo login.");
}

echo json_encode(["sucesso" => true, "nome" => $m['nome_completo']]);
