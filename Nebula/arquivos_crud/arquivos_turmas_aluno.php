<?php
// ==========================================================
// GET arquivos_turmas_aluno.php
// Lista as turmas/disciplinas distintas usadas em arquivos_professor,
// para montar os botões de filtro na página de arquivos do aluno.
// ==========================================================

header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('aluno');

if (!isset($_SESSION['logado']) || $_SESSION['logado'] !== true) {
    http_response_code(401);
    echo json_encode(["sucesso" => false, "mensagem" => "Não autenticado"]);
    exit;
}

if (($_SESSION['tipo'] ?? '') !== 'aluno') {
    http_response_code(403);
    echo json_encode(["sucesso" => false, "mensagem" => "Sem permissão"]);
    exit;
}

include_once __DIR__ . '/../connect_nebula.php';

$sql = "SELECT DISTINCT turma FROM arquivos_professor WHERE turma <> '' ORDER BY turma ASC";
$resultado = mysqli_query($link, $sql);

if (!$resultado) {
    http_response_code(500);
    echo json_encode(["sucesso" => false, "mensagem" => "Erro ao listar turmas"]);
    exit;
}

$turmas = [];
while ($linha = mysqli_fetch_assoc($resultado)) {
    $turmas[] = $linha["turma"];
}

echo json_encode(["sucesso" => true, "turmas" => $turmas]);