<?php
// ==========================================================
// POST arquivos_nova_pasta.php
// Campos: nome, id_turma, pasta_pai (vazio = cria na raiz da turma)
// ==========================================================

header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('professor');

if (!isset($_SESSION['logado']) || $_SESSION['logado'] !== true) {
    http_response_code(401);
    echo json_encode(["sucesso" => false, "mensagem" => "Não autenticado"]);
    exit;
}
if (($_SESSION['tipo'] ?? '') !== 'professor' || empty($_SESSION['id_prof'])) {
    http_response_code(403);
    echo json_encode(["sucesso" => false, "mensagem" => "Sem permissão"]);
    exit;
}

include_once __DIR__ . '/../connect_nebula.php';
require_once __DIR__ . '/arquivos_helpers.php';

$idProf  = (int) $_SESSION['id_prof'];
$idTurma = (int) ($_POST["id_turma"] ?? 0);

$turma = turmaDoProfessor($link, $idProf, $idTurma);
if (!$turma) {
    http_response_code(403);
    echo json_encode(["sucesso" => false, "mensagem" => "Turma não pertence a este professor"]);
    exit;
}

$nome     = trim($_POST["nome"] ?? "");
$pastaPai = (isset($_POST["pasta_pai"]) && $_POST["pasta_pai"] !== "") ? (int) $_POST["pasta_pai"] : null;

if ($nome === "") {
    echo json_encode(["sucesso" => false, "mensagem" => "Informe um nome para a pasta."]);
    exit;
}

// A pasta-mãe tem que ser da MESMA turma
if ($pastaPai && !pastaDaTurma($link, $pastaPai, $idTurma)) {
    echo json_encode(["sucesso" => false, "mensagem" => "A pasta escolhida não pertence a esta turma."]);
    exit;
}

// A coluna antiga "turma" (texto) continua sendo preenchida só por compatibilidade
$rotulo = rotuloTurma($turma);

$stmt = mysqli_prepare($link,
    "INSERT INTO arquivos_professor (tipo, nome, turma, id_turma, pasta_pai)
     VALUES ('pasta', ?, ?, ?, ?)");
mysqli_stmt_bind_param($stmt, "ssii", $nome, $rotulo, $idTurma, $pastaPai);

if (mysqli_stmt_execute($stmt)) {
    echo json_encode(["sucesso" => true, "id" => mysqli_insert_id($link)]);
} else {
    echo json_encode(["sucesso" => false, "mensagem" => mysqli_error($link)]);
}
