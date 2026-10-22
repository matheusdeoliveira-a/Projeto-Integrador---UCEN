<?php
header("Content-type: application/json; charset=utf-8");
header("Cache-Control: no-store");
require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('aluno');

if (empty($_SESSION['logado']) || ($_SESSION['tipo'] ?? '') !== 'aluno') {
    http_response_code(401);
    echo json_encode(["erro" => "Não autenticado"]);
    exit;
}

include_once __DIR__ . '/../connect_nebula.php';

$id_usuario = (int) $_SESSION['id_usuarios'];

// Turma do aluno = turma da matrícula mais recente (mesmo vínculo usado em aluno_eu.php)
$stmtM = mysqli_prepare($link,
    "SELECT id_turma FROM matriculas WHERE id_usuarios = ? ORDER BY id_matricula DESC LIMIT 1");
mysqli_stmt_bind_param($stmtM, "i", $id_usuario);
mysqli_stmt_execute($stmtM);
$m = mysqli_fetch_assoc(mysqli_stmt_get_result($stmtM));
mysqli_stmt_close($stmtM);

if (!$m || $m['id_turma'] === null) {
    echo json_encode([]);   // aluno sem turma: agenda vazia
    exit;
}
$id_turma = (int) $m['id_turma'];

$inicio = $_GET['inicio'] ?? date('Y-m-d', strtotime('monday this week'));
$fim    = $_GET['fim']    ?? date('Y-m-d', strtotime('friday this week'));

$stmt = mysqli_prepare($link,
    "SELECT id_agenda, data, hora, titulo, horario, local, cor
       FROM agenda_professor
      WHERE id_turma = ? AND data BETWEEN ? AND ?
      ORDER BY data, hora");
mysqli_stmt_bind_param($stmt, "iss", $id_turma, $inicio, $fim);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);

$eventos = [];
while ($linha = mysqli_fetch_assoc($result)) {
    $eventos[] = $linha;
}
echo json_encode($eventos);
