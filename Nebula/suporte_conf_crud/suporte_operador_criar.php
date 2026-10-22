<?php
// ==========================================================
// POST suporte_operador_criar.php
// Campos: nome, email, cargo, acesso_total (1/0), permissoes (JSON ["professores","salas"])
// Cria o operador em suporte_login com uma senha provisória ALEATÓRIA
// (diferente para cada pessoa) e manda o acesso por e-mail.
// ==========================================================

header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('suporte');

include_once __DIR__ . '/../connect_nebula.php';
require_once __DIR__ . '/../suporte_permissoes.php';
include_once __DIR__ . '/../mailer.php';   // mesma função enviarEmail() do cadastro de professor

$eu = exigirPermissao($link, 'configuracoes');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responderJsonErro(405, "Método inválido");
}

// Link da tela de login que vai no e-mail
const URL_LOGIN = "https://nebula-ucen.duckdns.org/Nebula/Nebula/";

function gerarSenhaProvisoria(int $tamanho = 10): string {
    $alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";   // sem letras que se confundem (O/0, l/1)
    $senha = "";
    for ($i = 0; $i < $tamanho; $i++) {
        $senha .= $alfabeto[random_int(0, strlen($alfabeto) - 1)];
    }
    return $senha;
}

$nome  = trim($_POST["nome"] ?? "");
$email = strtolower(trim($_POST["email"] ?? ""));
$cargo = trim($_POST["cargo"] ?? "");

$acessoTotal = (($_POST["acesso_total"] ?? "0") === "1");
$permissoes  = limparPermissoes($_POST["permissoes"] ?? "[]");

// Quem não é administrador só pode liberar o que ele mesmo tem e não cria administradores
if (!$eu["total"]) {
    $acessoTotal = false;
    $permissoes  = array_values(array_intersect($permissoes, $eu["menus"]));
}

if ($nome === "" || $email === "") {
    responderJsonErro(200, "Preencha o nome e o e-mail.");
}
if (mb_strlen($nome) > 150 || mb_strlen($cargo) > 60) {
    responderJsonErro(200, "Nome ou nível de acesso muito longo.");
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    responderJsonErro(200, "E-mail inválido.");
}
if (emailEmUso($link, $email)) {
    responderJsonErro(200, "Esse e-mail já está em uso no sistema.");
}

$senhaProvisoria = gerarSenhaProvisoria();
$senhaHash       = password_hash($senhaProvisoria, PASSWORD_DEFAULT);
$permissoesJson  = json_encode($permissoes);
$totalInt        = $acessoTotal ? 1 : 0;
$criadoPor       = $eu["id"];

try {
    $stmt = mysqli_prepare($link, "INSERT INTO suporte_login (nome, email, senha, cargo, acesso_total, permissoes, criado_por)
                                   VALUES (?, ?, ?, ?, ?, ?, ?)");
    mysqli_stmt_bind_param($stmt, "ssssisi", $nome, $email, $senhaHash, $cargo, $totalInt, $permissoesJson, $criadoPor);
    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception("Falha ao inserir o operador");
    }
    $idNovo = mysqli_insert_id($link);
    mysqli_stmt_close($stmt);
} catch (Throwable $erro) {
    error_log("Erro ao cadastrar operador: " . $erro->getMessage());
    responderJsonErro(500, "Erro ao cadastrar o operador.");
}

// ----------------------------------------------------------
// E-mail de boas-vindas. Se falhar, o operador continua cadastrado e a senha
// provisória volta na resposta (só para quem tem acesso às Configurações),
// para ser repassada manualmente.
// ----------------------------------------------------------
$nomeSeguro  = htmlspecialchars($nome);
$emailSeguro = htmlspecialchars($email);
$senhaSegura = htmlspecialchars($senhaProvisoria);
$linkSeguro  = htmlspecialchars(URL_LOGIN);

$corpo = "
<div style='font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #333;'>
    <div style='background:#050912; padding:22px; text-align:center;'>
        <h1 style='color:#E7B6E6; margin:0; font-size:20px; font-family: Arial, sans-serif;'>UCEN</h1>
    </div>
    <div style='padding:26px; border:1px solid #e0e0e0; border-top:none;'>
        <p>Olá, <strong>{$nomeSeguro}</strong>,</p>
        <p>Seu acesso ao Portal do Suporte foi criado.</p>
        <p>Entre com os dados abaixo:</p>
        <p style='background:#f4f4f6; padding:14px; border-radius:6px;'>
            <strong>E-mail:</strong> {$emailSeguro}<br>
            <strong>Senha provisória:</strong> {$senhaSegura}
        </p>
        <p><strong>Por segurança, troque essa senha no seu primeiro acesso.</strong></p>
        <p style='text-align:center; margin:26px 0;'>
            <a href='{$linkSeguro}' style='background:#5b2a86; color:#fff; padding:12px 22px; border-radius:6px; text-decoration:none; font-weight:bold;'>Acessar o portal</a>
        </p>
        <p style='font-size:12px; color:#888;'>Se você não esperava este e-mail, ignore-o e avise o suporte.</p>
    </div>
</div>";

$emailEnviado = false;
try {
    $retorno = enviarEmail($email, $nome, "Seu acesso ao Portal do Suporte - UCEN", $corpo);
    $emailEnviado = ($retorno !== false);
} catch (Throwable $erro) {
    $emailEnviado = false;
}

$resposta = ["sucesso" => true, "id" => $idNovo, "email_enviado" => $emailEnviado];
if (!$emailEnviado) {
    $resposta["senha_provisoria"] = $senhaProvisoria;
}
echo json_encode($resposta);
