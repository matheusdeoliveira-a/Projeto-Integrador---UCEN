<?php
// ==========================================================
// POST atendimento_crud/chamado_responder.php
// Campos: id (número do chamado), mensagem, status_apos (Respondido | Em andamento), anexos[] (opcional, arquivos)
// Envia a resposta POR E-MAIL para o e-mail do chamado e registra em emails_enviados
// (aba "E-mails enviados"). O status do chamado só muda se o e-mail realmente saiu.
// ==========================================================
require_once __DIR__ . '/atendimento_comum.php';
include_once __DIR__ . '/../mailer.php';   // enviarEmail(), a mesma do login por código
exigirPost();

$id         = (int) campo('id');
$mensagem   = campo('mensagem');
$statusApos = campo('status_apos');

if (!in_array($statusApos, ['Respondido', 'Em andamento'], true)) {
    $statusApos = 'Respondido';
}
if ($id <= 0)                      falha("Chamado inválido.");
if ($mensagem === '')              falha("Escreva a resposta antes de enviar.");
if (mb_strlen($mensagem) > 5000)   falha("Resposta muito longa (máx. 5000 caracteres).");

$ch = buscarChamado($link, $id);
if (!$ch) {
    falha("Chamado não encontrado.");
}
$emailAluno = trim((string) ($ch['email'] ?? ''));
if (!filter_var($emailAluno, FILTER_VALIDATE_EMAIL)) {
    falha("Este chamado não tem um e-mail válido para responder.");
}

$codigo  = codigoChamado($id);
$assunto = mb_substr(limparLinha("Re: " . $ch['assunto']), 0, 170) . " [" . $codigo . "]";
[$html, $texto] = montarCorpoEmail($ch['nome'], $mensagem, $eu['nome'], $codigo);

$anexos = receberAnexos();   // opcional; valida tipo e tamanho

$enviado = enviarEmail($emailAluno, $ch['nome'], $assunto, $html, $texto, $anexos);

registrarEmail($link, $id, $emailAluno, $ch['nome'], $assunto, $mensagem . textoAnexosRegistro($anexos),
               $eu['nome'], $eu['id'], $enviado ? 'Enviado' : 'Falhou');

if (!$enviado) {
    falha("Não foi possível enviar o e-mail. A tentativa ficou registrada como \"Falhou\" e o status do chamado não mudou.");
}

$stmt = mysqli_prepare($link, "UPDATE chamados SET status = ?, responsavel = ? WHERE id_chamado = ?");
mysqli_stmt_bind_param($stmt, "ssi", $statusApos, $eu['nome'], $id);
mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

saida(["sucesso" => true, "mensagem" => "Resposta enviada por e-mail."]);
