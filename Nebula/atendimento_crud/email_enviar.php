<?php
// ==========================================================
// POST atendimento_crud/email_enviar.php   (botão "Enviar e-mail", sem chamado)
// Campos: destinatario, assunto, mensagem, anexos[] (opcional, arquivos)
// Envia de verdade e registra em emails_enviados.
// ==========================================================
require_once __DIR__ . '/atendimento_comum.php';
include_once __DIR__ . '/../mailer.php';
exigirPost();

$dest     = strtolower(campo('destinatario'));
$assunto  = limparLinha(campo('assunto'));
$mensagem = campo('mensagem');

if ($dest === '' || $assunto === '' || $mensagem === '') {
    falha("Preencha destinatário, assunto e mensagem.");
}
if (!filter_var($dest, FILTER_VALIDATE_EMAIL)) {
    falha("E-mail do destinatário inválido.");
}
if (mb_strlen($assunto) > 200 || mb_strlen($mensagem) > 5000) {
    falha("Assunto (máx. 200) ou mensagem (máx. 5000) muito longos.");
}

[$html, $texto] = montarCorpoEmail('', $mensagem, $eu['nome'], null);

$anexos = receberAnexos();   // opcional; valida tipo e tamanho

$enviado = enviarEmail($dest, '', $assunto, $html, $texto, $anexos);

registrarEmail($link, null, $dest, null, $assunto, $mensagem . textoAnexosRegistro($anexos), $eu['nome'], $eu['id'], $enviado ? 'Enviado' : 'Falhou');

if (!$enviado) {
    falha("Não foi possível enviar o e-mail. A tentativa ficou registrada como \"Falhou\".");
}
saida(["sucesso" => true, "mensagem" => "E-mail enviado."]);
