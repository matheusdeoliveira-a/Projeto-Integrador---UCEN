<?php
// ==========================================================
// POST relatorios_crud/relatorio_excluir.php
// Campo: id
// Apaga a linha do banco e o PDF do disco.
// ==========================================================
require_once __DIR__ . '/relatorios_comum.php';
exigirPost();

$id = inteiro('id');
if (!$id) falha("Relatório inválido.");

$stmt = mysqli_prepare($link, "SELECT caminho FROM relatorios_suporte WHERE id_relatorio = ? LIMIT 1");
mysqli_stmt_bind_param($stmt, "i", $id);
mysqli_stmt_execute($stmt);
$rel = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
mysqli_stmt_close($stmt);

if (!$rel) falha("Relatório não encontrado.");

$stmt = mysqli_prepare($link, "DELETE FROM relatorios_suporte WHERE id_relatorio = ?");
mysqli_stmt_bind_param($stmt, "i", $id);
mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

// Remove o arquivo (só se estiver dentro da pasta de relatórios)
$pasta  = realpath(PASTA_RELATORIOS);
$fisico = realpath(__DIR__ . '/' . $rel['caminho']);
if ($pasta && $fisico && is_file($fisico) && strpos($fisico, $pasta . DIRECTORY_SEPARATOR) === 0) {
    @unlink($fisico);
}

saida(["sucesso" => true, "mensagem" => "Relatório excluído."]);
