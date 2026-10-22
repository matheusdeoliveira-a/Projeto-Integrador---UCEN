<?php
// ==========================================================
// Webhook do Mercado Pago: só aqui a inscrição paga entra em "inscricoes".
// Nunca confiamos no que chega na requisição: consultamos o pagamento
// direto na API do Mercado Pago com o nosso token.
// ==========================================================

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
ini_set('display_errors', '0');

function sair(int $codigo): void {
    http_response_code($codigo);
    exit;
}

// ---------- Descobre qual pagamento foi notificado ----------
$corpo = json_decode(file_get_contents('php://input') ?: '', true) ?: [];

$tipo = $_GET['topic'] ?? $_GET['type'] ?? ($corpo['type'] ?? '');
$idPagamento = $_GET['id'] ?? $_GET['data_id'] ?? ($corpo['data']['id'] ?? '');

if ($tipo !== 'payment' || !ctype_digit((string) $idPagamento)) {
    sair(200); // outro tipo de aviso: ignorar
}

// ---------- Configuração e SDK ----------
$config = is_file(__DIR__ . '/config_mercadopago.php') ? require __DIR__ . '/config_mercadopago.php' : null;
$token  = is_array($config) ? trim((string) ($config['access_token'] ?? '')) : '';

if ($token === '' || !is_file(__DIR__ . '/../vendor/autoload.php')) {
    error_log("webhook_mercadopago: configuração incompleta");
    sair(500);
}

require_once __DIR__ . '/../vendor/autoload.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    MercadoPago\SDK::setAccessToken($token);
    $pagamento = MercadoPago\Payment::find_by_id($idPagamento);

    if (!$pagamento || $pagamento->status !== 'approved') {
        sair(200); // ainda não aprovado (pendente/recusado): o MP avisa de novo se mudar
    }

    // A taxa é de R$ 90,00: confere o valor pago
    if (abs((float) $pagamento->transaction_amount - 90.00) > 0.001) {
        error_log("webhook_mercadopago: valor inesperado no pagamento $idPagamento");
        sair(200);
    }

    $idPendente = (int) $pagamento->external_reference;
    if ($idPendente <= 0) {
        sair(200);
    }

    include_once(__DIR__ . "/../connect_nebula.php");
    mysqli_set_charset($link, "utf8mb4");

    mysqli_begin_transaction($link);

    // FOR UPDATE: se o MP mandar o aviso duas vezes ao mesmo tempo, só um processa
    $stmt = mysqli_prepare($link, "SELECT dados FROM inscricoes_pendentes WHERE id = ? FOR UPDATE");
    mysqli_stmt_bind_param($stmt, "i", $idPendente);
    mysqli_stmt_execute($stmt);
    $linha = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

    if (!$linha) {
        mysqli_rollback($link);
        sair(200); // já processado antes
    }

    $r = json_decode($linha['dados'], true);
    $p = $r['pessoais'];
    $j = $r['jornada'];

    try {
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
        mysqli_stmt_close($stmt);
    } catch (mysqli_sql_exception $e) {
        if ($e->getCode() !== 1062) {
            throw $e;
        }
        // CPF/e-mail/telefone já inscritos (outra tentativa foi paga antes): não duplica
        error_log("webhook_mercadopago: inscrição duplicada, pagamento $idPagamento (conferir/estornar)");
    }

    $stmt = mysqli_prepare($link, "DELETE FROM inscricoes_pendentes WHERE id = ?");
    mysqli_stmt_bind_param($stmt, "i", $idPendente);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    mysqli_commit($link);
    sair(200);

} catch (Throwable $e) {
    if (isset($link)) { @mysqli_rollback($link); }
    error_log("webhook_mercadopago: " . $e->getMessage());
    sair(500); // erro nosso: o Mercado Pago tenta de novo mais tarde
}