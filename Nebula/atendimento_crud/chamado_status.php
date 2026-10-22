<?php
// ==========================================================
// POST atendimento_crud/chamado_status.php
// Campos: id (número do chamado), status (Pendente | Em andamento | Respondido)
// Quem muda o status vira o "Responsável" (voltar para Pendente devolve para "Suporte").
// ==========================================================
require_once __DIR__ . '/atendimento_comum.php';
exigirPost();

$id     = (int) campo('id');
$status = campo('status');

if ($id <= 0 || !in_array($status, STATUS_CHAMADO, true)) {
    falha("Dados inválidos.");
}
if (!buscarChamado($link, $id)) {
    falha("Chamado não encontrado.");
}

$responsavel = ($status === 'Pendente') ? 'Suporte' : $eu['nome'];

$stmt = mysqli_prepare($link, "UPDATE chamados SET status = ?, responsavel = ? WHERE id_chamado = ?");
mysqli_stmt_bind_param($stmt, "ssi", $status, $responsavel, $id);
mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

saida(["sucesso" => true, "mensagem" => "Status atualizado."]);
