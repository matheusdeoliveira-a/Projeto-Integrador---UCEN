<?php
// ==========================================================
// POST relatorios_crud/desempenho_excluir.php
// Campo: id
// ==========================================================
require_once __DIR__ . '/relatorios_comum.php';
exigirPost();

$id = inteiro('id');
if (!$id) falha("Técnico inválido.");

$stmt = mysqli_prepare($link, "DELETE FROM equipe_desempenho WHERE id_desempenho = ?");
mysqli_stmt_bind_param($stmt, "i", $id);
mysqli_stmt_execute($stmt);
$apagou = mysqli_stmt_affected_rows($stmt);
mysqli_stmt_close($stmt);

if ($apagou < 1) falha("Técnico não encontrado.");

saida(["sucesso" => true, "mensagem" => "Técnico removido."]);
