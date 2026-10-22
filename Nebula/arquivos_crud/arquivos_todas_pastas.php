<?php
// ==========================================================
// GET arquivos_todas_pastas.php?id_turma=ID
// Retorna, em JSON, as pastas JÁ CRIADAS NA TURMA escolhida (id, nome e
// pasta_pai). Usado nos modais "Nova pasta" e "Adicionar arquivo"
// para o professor escolher onde salvar sem precisar entrar na pasta.
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
$idTurma = (int) ($_GET["id_turma"] ?? 0);

if (!turmaDoProfessor($link, $idProf, $idTurma)) {
    http_response_code(403);
    echo json_encode(["sucesso" => false, "mensagem" => "Turma não pertence a este professor"]);
    exit;
}

$stmt = mysqli_prepare($link,
    "SELECT id_arq_prof AS id, nome, pasta_pai
       FROM arquivos_professor
      WHERE tipo = 'pasta' AND id_turma = ?
      ORDER BY nome ASC");
mysqli_stmt_bind_param($stmt, "i", $idTurma);
mysqli_stmt_execute($stmt);
$resultado = mysqli_stmt_get_result($stmt);

$pastas = [];
while ($linha = mysqli_fetch_assoc($resultado)) {
    $pastas[] = [
        "id"        => (int) $linha["id"],
        "nome"      => $linha["nome"],
        "pasta_pai" => $linha["pasta_pai"] !== null ? (int) $linha["pasta_pai"] : null
    ];
}
mysqli_stmt_close($stmt);

echo json_encode(["sucesso" => true, "pastas" => $pastas]);
