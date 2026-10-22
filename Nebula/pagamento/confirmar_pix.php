<?php
// ==========================================================
// POST pagamento/confirmar_pix.php
// PIX SIMULADO: não cobra nada. Ao clicar em "Avançar!" com o Pix selecionado, a
// inscrição (que até aqui estava só na sessão) é gravada no banco e segue o mesmo
// caminho da isenção aprovada, a partir de "gerar nota":
//   inscrição gravada -> nota gerada (pendente) -> suporte decide a nota (e-mail com o
//   link da matrícula, em academico_crud/nota-decidir-nebula.php).
// Substitui o antigo Mercado Pago (criar_pagamento.php + webhook_mercadopago.php).
// ==========================================================

header('Content-Type: application/json; charset=utf-8');

session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'httponly' => true,
    'samesite' => 'Lax'
]);
session_start();

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

include_once(__DIR__ . "/../connect_nebula.php");
require_once __DIR__ . '/../vestibular_nota_nebula.php';
mysqli_set_charset($link, "utf8mb4");

function responderErro($mensagem) {
    echo json_encode(["sucesso" => false, "erro" => $mensagem]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    responderErro("Método inválido");
}

// ---------- Confere se a inscrição na sessão está completa ----------
$r = $_SESSION['inscricao'] ?? null;

if (empty($r['pessoais']) || empty($r['jornada']) || empty($r['ensino_medio'])) {
    responderErro("Sua sessão expirou. Recarregue a página e comece a inscrição novamente.");
}

$p = $r['pessoais'];
$j = $r['jornada'];

// Se veio de uma isenção recusada, a etapa 1 guardou o id dela na sessão
$idReenvio = (int) ($r['reenvio_id'] ?? 0);

try {

    mysqli_begin_transaction($link);

    if ($idReenvio > 0) {

        // ----- Isenção recusada que agora paga a taxa: atualiza ESTA inscrição -----
        $stmt = mysqli_prepare($link,
            "SELECT status_isencao FROM inscricoes WHERE id_inscricoes = ? FOR UPDATE");
        mysqli_stmt_bind_param($stmt, "i", $idReenvio);
        mysqli_stmt_execute($stmt);
        $atual = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
        mysqli_stmt_close($stmt);

        if (!$atual || $atual['status_isencao'] !== 'recusada') {
            mysqli_rollback($link);
            responderErro("Não é possível concluir esta inscrição.");
        }

        $idInscricao = $idReenvio;

        $stmt = mysqli_prepare($link,
            "UPDATE inscricoes
                SET nome_completo = ?, email = ?, telefone = ?, telefone_reserva = ?,
                    curso_opcao1 = ?, curso_opcao2 = ?, turno_opcao1 = ?, turno_opcao2 = ?,
                    modalidade = ?, ensino_medio = ?, etapa_atual = 4
              WHERE id_inscricoes = ?");
        mysqli_stmt_bind_param($stmt, "ssssssssssi",
            $p['nome'], $p['email'], $p['telefone'], $p['reserva'],
            $j['curso1'], $j['curso2'], $j['turno1'], $j['turno2'], $j['modalidade'],
            $r['ensino_medio'], $idInscricao);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);

    } else {

        // ----- Inscrição nova (mesmo INSERT que o webhook do Mercado Pago fazia) -----
        $stmt = mysqli_prepare($link,
            "INSERT INTO inscricoes
                (nome_completo, cpf, data_nascimento, email, telefone, telefone_reserva,
                 curso_opcao1, curso_opcao2, turno_opcao1, turno_opcao2, modalidade,
                 ensino_medio, etapa_atual)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 4)");
        mysqli_stmt_bind_param($stmt, "ssssssssssss",
            $p['nome'], $p['cpf'], $p['nascimento'], $p['email'], $p['telefone'], $p['reserva'],
            $j['curso1'], $j['curso2'], $j['turno1'], $j['turno2'], $j['modalidade'],
            $r['ensino_medio']);
        mysqli_stmt_execute($stmt);
        $idInscricao = mysqli_insert_id($link);
        mysqli_stmt_close($stmt);
    }

    // A partir daqui é o MESMO caminho da isenção aprovada: gera a nota e deixa pendente
    gerarNotaVestibular($link, $idInscricao);

    mysqli_commit($link);

} catch (Throwable $e) {

    mysqli_rollback($link);

    if ($e instanceof mysqli_sql_exception && $e->getCode() === 1062) {
        responderErro("Já existe uma inscrição com estes dados (CPF, e-mail ou telefone).");
    }

    error_log("confirmar pix: " . $e->getMessage());
    http_response_code(500);
    responderErro("Não foi possível concluir sua inscrição. Tente novamente.");
}

// Pronto: a inscrição existe no banco. Limpa o rascunho da sessão.
unset($_SESSION['inscricao'], $_SESSION['id_pendente']);
$_SESSION['id_inscricao'] = $idInscricao;

echo json_encode(["sucesso" => true]);
