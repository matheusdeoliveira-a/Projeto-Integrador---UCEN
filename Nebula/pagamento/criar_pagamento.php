<?php
// ==========================================================
// POST pagamento/criar_pagamento.php
// Cria a cobrança da taxa de inscrição no Mercado Pago e devolve o link do checkout.
// O token e a URL do site ficam em config_mercadopago.php (fora do GitHub).
// ==========================================================

header('Content-Type: application/json; charset=utf-8');

// Aviso/deprecated do PHP no meio da resposta quebraria o JSON: vai para o log, não para a tela
error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
ini_set('display_errors', '0');

function responder(int $codigo, array $corpo): void {
    http_response_code($codigo);
    echo json_encode($corpo);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, ["sucesso" => false, "erro" => "Método inválido"]);
}

// Mesma sessão da inscrição: o id da inscrição só existe no servidor
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'httponly' => true,
    'samesite' => 'Lax'
]);
session_start();

// Os dados da inscrição ainda estão só na sessão (nada foi gravado em "inscricoes")
$r = $_SESSION['inscricao'] ?? null;
if (empty($r['pessoais']) || empty($r['jornada']) || empty($r['ensino_medio'])) {
    responder(401, ["sucesso" => false, "erro" => "Sua sessão expirou. Recarregue a página e refaça a inscrição."]);
}

// Guarda o rascunho em "inscricoes_pendentes". Ele só vira inscrição quando o
// Mercado Pago confirmar o pagamento (webhook_mercadopago.php).
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
try {
    include_once(__DIR__ . "/../connect_nebula.php");
    mysqli_set_charset($link, "utf8mb4");

    $json = json_encode($r, JSON_UNESCAPED_UNICODE);
    $idPendente = $_SESSION['id_pendente'] ?? null;

    if ($idPendente) {
        // Clicou em pagar mais de uma vez / voltou e mudou algo: reaproveita o mesmo rascunho,
        // a não ser que ele já tenha sido processado (apagado) pelo webhook
        $stmt = mysqli_prepare($link, "SELECT 1 FROM inscricoes_pendentes WHERE id = ?");
        mysqli_stmt_bind_param($stmt, "i", $idPendente);
        mysqli_stmt_execute($stmt);
        $existe = mysqli_stmt_get_result($stmt)->num_rows > 0;
        mysqli_stmt_close($stmt);

        if ($existe) {
            $stmt = mysqli_prepare($link, "UPDATE inscricoes_pendentes SET dados = ? WHERE id = ?");
            mysqli_stmt_bind_param($stmt, "si", $json, $idPendente);
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
        } else {
            $idPendente = null;
        }
    }
    if (!$idPendente) {
        $stmt = mysqli_prepare($link, "INSERT INTO inscricoes_pendentes (dados) VALUES (?)");
        mysqli_stmt_bind_param($stmt, "s", $json);
        mysqli_stmt_execute($stmt);
        $idPendente = mysqli_insert_id($link);
        mysqli_stmt_close($stmt);
        $_SESSION['id_pendente'] = $idPendente;
    }
} catch (Throwable $e) {
    error_log("criar_pagamento (pendente): " . $e->getMessage());
    responder(500, ["sucesso" => false, "erro" => "Não foi possível gerar o pagamento. Tente novamente."]);
}

// ---------- Pré-requisitos do servidor ----------
$autoload      = __DIR__ . '/../vendor/autoload.php';
$arquivoConfig = __DIR__ . '/config_mercadopago.php';

if (!is_file($autoload)) {
    error_log("criar_pagamento: vendor/autoload.php não encontrado (falta rodar o composer na pasta do projeto)");
    responder(500, ["sucesso" => false, "erro" => "Pagamento indisponível: configuração incompleta no servidor."]);
}
if (!is_file($arquivoConfig)) {
    error_log("criar_pagamento: config_mercadopago.php não encontrado em " . __DIR__);
    responder(500, ["sucesso" => false, "erro" => "Pagamento indisponível: configuração incompleta no servidor."]);
}

if (!is_readable($arquivoConfig)) {
    $usuario = function_exists('posix_getpwuid') ? (posix_getpwuid(posix_geteuid())['name'] ?? '?') : '?';
    error_log("criar_pagamento: config_mercadopago.php sem permissão de leitura para o usuário '" . $usuario . "'");
    responder(500, ["sucesso" => false, "erro" => "Pagamento indisponível: configuração incompleta no servidor."]);
}

$config = require $arquivoConfig;

if (!is_array($config)) {
    error_log("criar_pagamento: config_mercadopago.php não devolveu um array (veio: " . gettype($config) . ")");
    responder(500, ["sucesso" => false, "erro" => "Pagamento indisponível: configuração incompleta no servidor."]);
}

$token = trim((string) ($config['access_token'] ?? ''));
$base  = rtrim(trim((string) ($config['base_url'] ?? '')), '/');

// O log diz exatamente qual item falhou (nunca grava o token)
if ($token === '') {
    error_log("criar_pagamento: access_token vazio ou ausente no config_mercadopago.php (chaves encontradas: " . implode(',', array_keys($config)) . ")");
    responder(500, ["sucesso" => false, "erro" => "Pagamento indisponível: configuração incompleta no servidor."]);
}
// Confere só o formato (APP_USR-... ou TEST-...); assim este arquivo nunca precisa citar nenhum token
if (!preg_match('/^(APP_USR|TEST)-/', $token)) {
    error_log("criar_pagamento: access_token com formato inesperado (tamanho " . strlen($token) . ", não começa com APP_USR- nem TEST-)");
    responder(500, ["sucesso" => false, "erro" => "Pagamento indisponível: configuração incompleta no servidor."]);
}
if ($base === '') {
    error_log("criar_pagamento: base_url vazia ou ausente no config_mercadopago.php");
    responder(500, ["sucesso" => false, "erro" => "Pagamento indisponível: configuração incompleta no servidor."]);
}

require_once $autoload;

try {
    MercadoPago\SDK::setAccessToken($token);

    $item = new MercadoPago\Item();
    $item->title       = "Taxa de Inscrição - Vestibular Nebula";
    $item->quantity    = 1;
    $item->unit_price  = 90.00;
    $item->currency_id = "BRL";

    $preference = new MercadoPago\Preference();
    $preference->items = [$item];

    $preference->back_urls = [
        "success" => $base . "/carregamento_vestibular.html",
        "failure" => $base . "/inscricao.html",
        "pending" => $base . "/inscricao.html"
    ];
    $preference->auto_return = "approved";

    // Liga o pagamento ao rascunho (o webhook usa isso para saber quem pagou)
    $preference->external_reference = (string) $idPendente;

    // O Mercado Pago avisa este endereço quando o pagamento mudar de status
    $preference->notification_url = $base . "/pagamento/webhook_mercadopago.php";

    $preference->save();

    if (empty($preference->init_point)) {
        error_log("criar_pagamento: o Mercado Pago não devolveu init_point (verifique o token)");
        responder(500, ["sucesso" => false, "erro" => "Não foi possível gerar o pagamento. Tente novamente."]);
    }

    echo json_encode([
        "sucesso"        => true,
        "link_pagamento" => $preference->init_point
    ]);

} catch (Throwable $erro) {
    error_log("criar_pagamento: " . $erro->getMessage());
    responder(500, ["sucesso" => false, "erro" => "Não foi possível gerar o pagamento. Tente novamente."]);
}