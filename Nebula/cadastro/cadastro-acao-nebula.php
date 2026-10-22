<?php
header("Content-type: application/json;charset=utf-8");

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

include_once(__DIR__ . "/../connect_nebula.php");
mysqli_set_charset($link, "utf8mb4");

// Tamanho mínimo da senha (ajuste se quiser)
const SENHA_MINIMA = 6;

// Sempre inclui "campo" (nome/email/senha/confirmar_Senha) quando o erro é
// de um campo específico. O JS usa isso pra mostrar a mensagem no lugar certo.
function responderErro($mensagem, $campo = null) {
    echo json_encode(["sucesso" => false, "erro" => $mensagem, "campo" => $campo]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    responderErro("Método inválido");
}

$token     = $_POST['token'] ?? '';
$nome      = trim($_POST['nome'] ?? '');
$email     = trim($_POST['email'] ?? '');
$senha     = $_POST['senha'] ?? '';
$confirmar = $_POST['confirmar_Senha'] ?? '';

// ----- O cadastro só abre com o link (token) do e-mail de matrícula -----
if (!is_string($token) || !preg_match('/^[a-f0-9]{32}$/', $token)) {
    responderErro("Link de cadastro inválido. Use o botão do e-mail de matrícula.");
}

// ----- Validações no servidor (o JS do front já valida, mas nunca confie só nele) -----
if ($nome === '' || $email === '' || $senha === '' || $confirmar === '') {
    responderErro("Preencha todos os campos!");
}

if (mb_strlen($nome) > 120) {
    responderErro("Nome muito longo!", "nome");
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 120) {
    responderErro("E-mail inválido!", "email");
}

if (strlen($senha) < SENHA_MINIMA) {
    responderErro("A senha precisa ter pelo menos " . SENHA_MINIMA . " caracteres!", "senha");
}

if ($senha !== $confirmar) {
    responderErro("As senhas não conferem!", "confirmar_Senha");
}

$hash = password_hash($senha, PASSWORD_DEFAULT);

try {

    mysqli_begin_transaction($link);

    // Trava a linha da matrícula: dois cliques/abas ao mesmo tempo não criam duas contas
    $stmt = mysqli_prepare($link,
        "SELECT id_matricula, id_usuarios FROM matriculas WHERE token_cadastro = ? FOR UPDATE");
    mysqli_stmt_bind_param($stmt, "s", $token);
    mysqli_stmt_execute($stmt);
    $m = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

    if (!$m || $m['id_usuarios'] !== null) {
        mysqli_rollback($link);
        responderErro("Este link de cadastro é inválido ou já foi utilizado. Se já criou seu acesso, entre pelo login.");
    }

    // ----- E-mail já cadastrado? (aluno, professor ou suporte) -----
    // A mensagem é a mesma nos três casos, para não revelar quais e-mails pertencem à equipe.
    $stmt = mysqli_prepare($link, "
        SELECT 1 FROM usuarios WHERE email = ?
        UNION
        SELECT 1 FROM prof_login WHERE email = ?
        UNION
        SELECT 1 FROM suporte_login WHERE email = ?
    ");
    mysqli_stmt_bind_param($stmt, "sss", $email, $email, $email);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_store_result($stmt);
    $jaExiste = mysqli_stmt_num_rows($stmt) > 0;
    mysqli_stmt_close($stmt);

    if ($jaExiste) {
        mysqli_rollback($link);
        responderErro("Este e-mail já está cadastrado!", "email");
    }

    // ----- Cria o acesso (senha sempre com hash) -----
    $stmt = mysqli_prepare($link, "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)");
    mysqli_stmt_bind_param($stmt, "sss", $nome, $email, $hash);
    mysqli_stmt_execute($stmt);
    $idUsuario = mysqli_insert_id($link);
    mysqli_stmt_close($stmt);

    // ----- Liga a conta à matrícula e inutiliza o link (uso único) -----
    $stmt = mysqli_prepare($link,
        "UPDATE matriculas
            SET id_usuarios = ?, cadastro_em = NOW(), token_cadastro = NULL
          WHERE id_matricula = ?");
    mysqli_stmt_bind_param($stmt, "ii", $idUsuario, $m['id_matricula']);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    mysqli_commit($link);

    echo json_encode(["sucesso" => true]);

} catch (Throwable $e) {

    mysqli_rollback($link);

    // 1062 = e-mail duplicado (se a tabela usuarios tiver índice único no e-mail)
    if ($e instanceof mysqli_sql_exception && $e->getCode() === 1062) {
        responderErro("Este e-mail já está cadastrado!", "email");
    }

    error_log("Erro ao cadastrar: " . $e->getMessage());
    http_response_code(500);
    responderErro("Erro ao cadastrar. Tente novamente.");
}
