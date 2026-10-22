<?php
// ==========================================================
// POST suporte_operador_editar.php
// Campos: id, nome, email, cargo, ativo (1/0), acesso_total (1/0), permissoes (JSON)
// Regras de segurança:
//  - ninguém desativa a si mesmo nem tira o próprio acesso às Configurações
//  - quem não é administrador não mexe em administradores, não cria administradores
//    e só libera menus que ele mesmo tem
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

$id    = (int) ($_POST["id"] ?? 0);
$nome  = trim($_POST["nome"] ?? "");
$email = strtolower(trim($_POST["email"] ?? ""));
$cargo = trim($_POST["cargo"] ?? "");
$ativo = (($_POST["ativo"] ?? "1") === "1") ? 1 : 0;

$acessoTotal = (($_POST["acesso_total"] ?? "0") === "1");
$permissoes  = limparPermissoes($_POST["permissoes"] ?? "[]");

if ($id <= 0) {
    responderJsonErro(200, "Operador inválido.");
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

try {

    // O operador existe?
    $stmt = mysqli_prepare($link, "SELECT acesso_total FROM suporte_login WHERE id_suporte = ? LIMIT 1");
    mysqli_stmt_bind_param($stmt, "i", $id);
    mysqli_stmt_execute($stmt);
    $alvo = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

    if (!$alvo) {
        responderJsonErro(404, "Operador não encontrado.");
    }

    $ehEu = ($id === $eu["id"]);

    if (!$eu["total"]) {
        if ((int) $alvo["acesso_total"] === 1) {
            responderJsonErro(403, "Só um administrador pode alterar outro administrador.");
        }
        $acessoTotal = false;
        $permissoes  = array_values(array_intersect($permissoes, $eu["menus"]));
    }

    if ($ehEu) {
        $ativo = 1;   // não desativa a si mesmo
        if (!$acessoTotal && !in_array("configuracoes", $permissoes, true)) {
            responderJsonErro(200, "Você não pode remover o seu próprio acesso às Configurações.");
        }
    }

    if (emailEmUso($link, $email, $id)) {
        responderJsonErro(200, "Esse e-mail já está em uso no sistema.");
    }

    $permissoesJson = json_encode($permissoes);
    $totalInt       = $acessoTotal ? 1 : 0;

    $stmt = mysqli_prepare($link, "UPDATE suporte_login
                                   SET nome = ?, email = ?, cargo = ?, ativo = ?, acesso_total = ?, permissoes = ?
                                   WHERE id_suporte = ?");
    mysqli_stmt_bind_param($stmt, "sssiisi", $nome, $email, $cargo, $ativo, $totalInt, $permissoesJson, $id);
    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception("Falha ao atualizar o operador");
    }
    mysqli_stmt_close($stmt);

    echo json_encode(["sucesso" => true]);

} catch (Throwable $erro) {
    error_log("Erro ao editar operador: " . $erro->getMessage());
    responderJsonErro(500, "Erro ao salvar as alterações.");
}
