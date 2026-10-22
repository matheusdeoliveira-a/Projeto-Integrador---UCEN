<?php
// ==========================================================
// POST redefinir_senha.php
// Campos: email, codigo, senha, confirmar
// Confere o código recebido por e-mail e, se estiver certo, troca a senha
// em todas as contas ATIVAS (aluno / professor / suporte) com esse e-mail.
// ==========================================================

header("Content-type: application/json;charset=utf-8");

include_once(__DIR__ . "/../connect_nebula.php");

const CODIGO_MAX_TENTATIVAS = 5;
const SENHA_MINIMA          = 6;    // mesma regra do cadastro
const SENHA_MAXIMA          = 72;   // limite do bcrypt
const SENHA_PADRAO_PROF     = "SuaSenha123";   // a provisória dos professores: não pode ser reutilizada

function responderErro($mensagem, $campo = null) {
    echo json_encode(["sucesso" => false, "erro" => $mensagem, "campo" => $campo]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    responderErro("Método inválido");
}

$email     = strtolower(trim($_POST['email'] ?? ''));
$codigo    = trim($_POST['codigo'] ?? '');
$senha     = $_POST['senha'] ?? '';
$confirmar = $_POST['confirmar'] ?? '';

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    responderErro("E-mail inválido.", "email");
}
if ($codigo === '') {
    responderErro("Digite o código recebido por e-mail.", "codigo");
}

// Valida a senha ANTES de olhar o código (erro de digitação na senha não gasta tentativa)
if (strlen($senha) < SENHA_MINIMA) {
    responderErro("A senha precisa ter pelo menos " . SENHA_MINIMA . " caracteres.", "senha");
}
if (strlen($senha) > SENHA_MAXIMA) {
    responderErro("A senha pode ter no máximo " . SENHA_MAXIMA . " caracteres.", "senha");
}
if ($senha === SENHA_PADRAO_PROF) {
    responderErro("Escolha uma senha diferente da senha provisória.", "senha");
}
if ($senha !== $confirmar) {
    responderErro("As senhas não conferem.", "confirmar");
}

$TABELAS = [
    ['tabela' => 'usuarios',      'tem_ativo' => false],
    ['tabela' => 'prof_login',    'tem_ativo' => true],
    ['tabela' => 'suporte_login', 'tem_ativo' => true],
];

try {

    // Último código pedido para este e-mail que ainda não foi usado
    $stmt = mysqli_prepare($link, "
        SELECT id, codigo_hash, tentativas, expira_em
        FROM recuperacao_senha
        WHERE email = ? AND usado = 0
        ORDER BY criado_em DESC
        LIMIT 1
    ");
    mysqli_stmt_bind_param($stmt, "s", $email);
    mysqli_stmt_execute($stmt);
    $registro = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

    if (!$registro) {
        responderErro("Nenhum código pendente. Peça um novo.", "codigo");
    }
    if (strtotime($registro['expira_em']) < time()) {
        responderErro("Esse código expirou. Peça um novo.", "codigo");
    }
    if ($registro['tentativas'] >= CODIGO_MAX_TENTATIVAS) {
        responderErro("Muitas tentativas com esse código. Peça um novo.", "codigo");
    }

    if (!password_verify($codigo, $registro['codigo_hash'])) {
        $stmt = mysqli_prepare($link, "UPDATE recuperacao_senha SET tentativas = tentativas + 1 WHERE id = ?");
        mysqli_stmt_bind_param($stmt, "i", $registro['id']);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);

        responderErro("Código incorreto.", "codigo");
    }

    // Código certo: troca a senha (tudo ou nada)
    $novoHash   = password_hash($senha, PASSWORD_DEFAULT);
    $atualizadas = 0;

    mysqli_begin_transaction($link);

    // Gasta o código (e qualquer outro pendente deste e-mail)
    $stmt = mysqli_prepare($link, "UPDATE recuperacao_senha SET usado = 1 WHERE email = ? AND usado = 0");
    mysqli_stmt_bind_param($stmt, "s", $email);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    foreach ($TABELAS as $t) {
        $filtro = $t['tem_ativo'] ? " AND ativo = 1" : "";
        $stmt = mysqli_prepare($link, "UPDATE {$t['tabela']} SET senha = ? WHERE email = ?{$filtro}");
        mysqli_stmt_bind_param($stmt, "ss", $novoHash, $email);
        mysqli_stmt_execute($stmt);
        $atualizadas += mysqli_stmt_affected_rows($stmt);
        mysqli_stmt_close($stmt);
    }

    if ($atualizadas === 0) {
        mysqli_rollback($link);
        responderErro("Não foi possível redefinir a senha desta conta.", "email");
    }

    mysqli_commit($link);

    echo json_encode(["sucesso" => true, "mensagem" => "Senha alterada com sucesso!"]);

} catch (Throwable $erro) {
    @mysqli_rollback($link);
    error_log("Erro em redefinir_senha: " . $erro->getMessage());
    http_response_code(500);
    responderErro("Erro no servidor. Tente novamente em instantes.");
}
