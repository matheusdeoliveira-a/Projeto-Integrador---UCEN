<?php
// ==========================================================
// POST suporte_dados_salvar.php
// Campos: nome_equipe, email, telefone, whatsapp, horario
// Grava na tabela suporte_dados (linha id = 1). Só quem tem o menu Configurações.
// ==========================================================

header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('suporte');

include_once __DIR__ . '/../connect_nebula.php';
require_once __DIR__ . '/../suporte_permissoes.php';

$eu = exigirPermissao($link, 'configuracoes');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responderJsonErro(405, "Método inválido");
}

$nomeEquipe = trim($_POST["nome_equipe"] ?? "");
$email      = strtolower(trim($_POST["email"] ?? ""));
$telefone   = trim($_POST["telefone"] ?? "");
$whatsapp   = trim($_POST["whatsapp"] ?? "");
$horario    = trim($_POST["horario"] ?? "");

if ($nomeEquipe === "" || mb_strlen($nomeEquipe) > 150) {
    responderJsonErro(200, "Informe o nome da equipe (até 150 caracteres).");
}
if ($email === "" || mb_strlen($email) > 150 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    responderJsonErro(200, "Informe um e-mail de suporte válido.");
}
// Telefone e WhatsApp: só números, espaço, parênteses, + e hífen (pode ficar vazio)
if (!preg_match('/^[0-9()+\-\s]{0,30}$/', $telefone)) {
    responderJsonErro(200, "Telefone inválido. Use apenas números, parênteses, espaço e hífen.");
}
if (!preg_match('/^[0-9()+\-\s]{0,30}$/', $whatsapp)) {
    responderJsonErro(200, "WhatsApp inválido. Use apenas números, parênteses, espaço e hífen.");
}
if (mb_strlen($horario) > 100) {
    responderJsonErro(200, "Horário de atendimento muito longo (até 100 caracteres).");
}

try {
    // Se a linha 1 ainda não existir, cria; se existir, atualiza
    $stmt = mysqli_prepare($link, "INSERT INTO suporte_dados (id, nome_equipe, email, telefone, whatsapp, horario, atualizado_por)
                                   VALUES (1, ?, ?, ?, ?, ?, ?)
                                   ON DUPLICATE KEY UPDATE
                                       nome_equipe = VALUES(nome_equipe),
                                       email = VALUES(email),
                                       telefone = VALUES(telefone),
                                       whatsapp = VALUES(whatsapp),
                                       horario = VALUES(horario),
                                       atualizado_por = VALUES(atualizado_por)");
    mysqli_stmt_bind_param($stmt, "sssssi", $nomeEquipe, $email, $telefone, $whatsapp, $horario, $eu["id"]);
    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception("Falha ao salvar os dados de atendimento");
    }
    mysqli_stmt_close($stmt);

    echo json_encode(["sucesso" => true]);

} catch (Throwable $erro) {
    error_log("Erro ao salvar dados de atendimento: " . $erro->getMessage());
    responderJsonErro(500, "Erro ao salvar os dados.");
}
