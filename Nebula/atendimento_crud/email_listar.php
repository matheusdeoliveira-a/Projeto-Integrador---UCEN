<?php
// ==========================================================
// GET atendimento_crud/email_listar.php
// Lista os e-mails enviados (respostas de chamados e e-mails avulsos), mais novos primeiro.
// ==========================================================
require_once __DIR__ . '/atendimento_comum.php';

$res = mysqli_query($link,
    "SELECT id_email, id_chamado, destinatario, assunto, mensagem, enviado_por, status, enviado_em
       FROM emails_enviados
      ORDER BY id_email DESC
      LIMIT 500");

$emails = [];
while ($e = mysqli_fetch_assoc($res)) {
    $emails[] = [
        "chamado_num" => $e['id_chamado'] !== null ? (int) $e['id_chamado'] : null,
        "chamado"     => $e['id_chamado'] !== null ? codigoChamado((int) $e['id_chamado']) : null,
        "dest"        => $e['destinatario'],
        "assunto"     => $e['assunto'],
        "mensagem"    => $e['mensagem'],
        "resp"        => $e['enviado_por'],
        "status"      => $e['status'],
        "data"        => date('d/m/Y H:i', strtotime($e['enviado_em'])),
    ];
}

saida(["sucesso" => true, "emails" => $emails]);
