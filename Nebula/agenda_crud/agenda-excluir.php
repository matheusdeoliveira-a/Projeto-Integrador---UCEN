<?php
header("Content-type: application/json; charset=utf-8");
require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('professor');

if (!isset($_SESSION['logado']) || $_SESSION['logado'] !== true) {
    http_response_code(401);
    echo json_encode(["erro" => "Não autenticado"]);
    exit;
}

// NOVO: a agenda é só do professor. Aluno e suporte também têm sessão "logado",
// mas não podem ler nem alterar a agenda (403 = logado, porém sem permissão).
if (($_SESSION['tipo'] ?? '') !== 'professor') {
    http_response_code(403);
    echo json_encode(["erro" => "Sem permissão"]);
    exit;
}

include_once __DIR__ . '/../connect_nebula.php';

// NOVO: o professor agora tem id próprio na sessão (vem da tabela prof_login).
// Antes era $_SESSION['id_usuarios'], que agora só existe para alunos.
$professor_id = $_SESSION['id_prof'];
$id_agenda    = intval($_POST['id_agenda'] ?? 0);
$id_turma     = intval($_POST['id_turma']  ?? 0);

// NOVO: só apaga o compromisso se ele for DESTA turma (e deste professor).
// Apaga exatamente 1 linha: a mesma data/hora em outra turma é outra linha e fica intacta.
$sql = "DELETE FROM agenda_professor WHERE id_agenda = ? AND professor_id = ? AND id_turma = ? LIMIT 1";
$stmt = mysqli_prepare($link, $sql);
mysqli_stmt_bind_param($stmt, "iii", $id_agenda, $professor_id, $id_turma);

if (mysqli_stmt_execute($stmt)) {
    echo json_encode(["sucesso" => mysqli_stmt_affected_rows($stmt) === 1]);
} else {
    http_response_code(500);
    echo json_encode(["erro" => "Erro ao excluir: " . mysqli_error($link)]);
}
?>