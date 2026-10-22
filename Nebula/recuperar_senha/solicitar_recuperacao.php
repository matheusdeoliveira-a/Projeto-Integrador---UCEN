<?php
// ==========================================================
// POST solicitar_recuperacao.php
// Campo: email
// Manda um código de 6 dígitos para o e-mail, SE ele pertencer a um
// aluno, professor ou suporte. A resposta ao visitante é sempre a mesma,
// exista a conta ou não (ninguém descobre quais e-mails estão cadastrados).
// ==========================================================

header("Content-type: application/json;charset=utf-8");

include_once(__DIR__ . "/../connect_nebula.php");
include_once(__DIR__ . "/../mailer.php");

const RECUPERACAO_VALIDADE_MINUTOS   = 15;
const RECUPERACAO_INTERVALO_SEGUNDOS = 60;

function responderErro($mensagem, $campo = null) {
    echo json_encode(["sucesso" => false, "erro" => $mensagem, "campo" => $campo]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    responderErro("Método inválido");
}

$email = strtolower(trim($_POST['email'] ?? ''));

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    responderErro("Digite um e-mail válido.", "email");
}

// Lista FIXA de tabelas (não vem do visitante), por isso é seguro usar no SQL
$TABELAS = [
    ['tabela' => 'usuarios',      'tem_ativo' => false],
    ['tabela' => 'prof_login',    'tem_ativo' => true],
    ['tabela' => 'suporte_login', 'tem_ativo' => true],
];

try {

    // Procura o e-mail nas três tabelas (só contas ativas)
    $nomeDaConta = null;

    foreach ($TABELAS as $t) {
        $filtro = $t['tem_ativo'] ? " AND ativo = 1" : "";
        $stmt = mysqli_prepare($link, "SELECT nome FROM {$t['tabela']} WHERE email = ?{$filtro} LIMIT 1");
        mysqli_stmt_bind_param($stmt, "s", $email);
        mysqli_stmt_execute($stmt);
        $linha = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
        mysqli_stmt_close($stmt);

        if ($linha) { $nomeDaConta = $linha['nome']; break; }
    }

    // Já pediu código há pouco tempo? (vale para qualquer e-mail, exista ou não)
    $stmt = mysqli_prepare($link, "SELECT criado_em FROM recuperacao_senha WHERE email = ? ORDER BY criado_em DESC LIMIT 1");
    mysqli_stmt_bind_param($stmt, "s", $email);
    mysqli_stmt_execute($stmt);
    $ultimo = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

    if ($ultimo) {
        $passou = time() - strtotime($ultimo['criado_em']);
        if ($passou < RECUPERACAO_INTERVALO_SEGUNDOS) {
            responderErro("Aguarde " . (RECUPERACAO_INTERVALO_SEGUNDOS - $passou) . " segundos antes de pedir outro código.");
        }
    }

    // Gera o código. Para e-mail inexistente também grava uma linha (com um
    // código que ninguém conhece), assim o comportamento é idêntico por fora.
    $codigo = strval(random_int(100000, 999999));
    $hash   = password_hash($codigo, PASSWORD_DEFAULT);
    $agora  = date('Y-m-d H:i:s');
    $expira = date('Y-m-d H:i:s', time() + 60 * RECUPERACAO_VALIDADE_MINUTOS);

    $stmt = mysqli_prepare($link, "INSERT INTO recuperacao_senha (email, codigo_hash, criado_em, expira_em) VALUES (?, ?, ?, ?)");
    mysqli_stmt_bind_param($stmt, "ssss", $email, $hash, $agora, $expira);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    // Limpeza: apaga registros com mais de 1 dia
    mysqli_query($link, "DELETE FROM recuperacao_senha WHERE expira_em < (NOW() - INTERVAL 1 DAY)");

} catch (Throwable $erro) {
    error_log("Erro em solicitar_recuperacao: " . $erro->getMessage());
    http_response_code(500);
    responderErro("Erro no servidor. Tente novamente em instantes.");
}

// Responde ao visitante AGORA (e encerra a conexão), e só depois envia o e-mail.
// Assim a tela não demora e o tempo de resposta não revela se a conta existe.
echo json_encode([
    "sucesso"  => true,
    "mensagem" => "Se este e-mail estiver cadastrado, enviamos um código de 6 dígitos."
]);

if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
}

if ($nomeDaConta !== null) {

    $nomeSeguro = htmlspecialchars($nomeDaConta);

    $corpo = "
    <div style='font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #333;'>
        <div style='background:#050912; padding:22px; text-align:center;'>
            <h1 style='color:#E7B6E6; margin:0; font-size:20px; font-family: Arial, sans-serif;'>UCEN</h1>
        </div>
        <div style='padding:26px; border:1px solid #e0e0e0; border-top:none;'>
            <p>Olá, <strong>{$nomeSeguro}</strong>,</p>
            <p>Recebemos um pedido para redefinir a senha da sua conta. Use o código abaixo:</p>
            <p style='font-size:32px; font-weight:bold; letter-spacing:8px; text-align:center; color:#5b2a86;'>{$codigo}</p>
            <p>Ele vale por " . RECUPERACAO_VALIDADE_MINUTOS . " minutos. Se não foi você quem pediu, ignore este e-mail: sua senha continua a mesma.</p>
        </div>
    </div>";

    try {
        enviarEmail($email, $nomeDaConta, "Redefinição de senha - UCEN", $corpo);
    } catch (Throwable $erro) {
        error_log("Erro ao enviar e-mail de recuperação: " . $erro->getMessage());
    }
}
