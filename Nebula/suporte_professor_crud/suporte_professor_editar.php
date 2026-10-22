<?php
// ==========================================================
// POST suporte_professor_editar.php
// Campos: id, nome, matricula, departamento, titulacao, email,
//         ativo (1/0), disciplinas (JSON opcional)
// Atualiza o professor em prof_login e troca as disciplinas dele
// em prof_disciplinas (tudo numa transação).
// Colocar na mesma pasta do suporte_professor_criar.php.
// ==========================================================

header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../iniciar_sessao.php';
header("Content-Type: application/json; charset=utf-8");
iniciarSessao('suporte');

include_once __DIR__ . '/../connect_nebula.php';
require_once __DIR__ . '/../suporte_permissoes.php';
exigirPermissao($link, 'professores');

$id           = (int) ($_POST["id"] ?? 0);
$nome         = trim($_POST["nome"] ?? "");
$matricula    = strtoupper(trim($_POST["matricula"] ?? ""));
$departamento = trim($_POST["departamento"] ?? "");
$titulacao    = trim($_POST["titulacao"] ?? "");
$email        = strtolower(trim($_POST["email"] ?? ""));
$ativo        = (($_POST["ativo"] ?? "1") === "1") ? 1 : 0;

$titulacoesValidas = ["Mestre", "Doutor", "Pós-doutor", "Especialista"];

if ($id <= 0) {
    echo json_encode(["sucesso" => false, "mensagem" => "Professor inválido."]);
    exit;
}

if ($nome === "" || $matricula === "" || $departamento === "" || $email === "") {
    echo json_encode(["sucesso" => false, "mensagem" => "Preencha todos os campos."]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["sucesso" => false, "mensagem" => "E-mail inválido."]);
    exit;
}

if (!in_array($titulacao, $titulacoesValidas, true)) {
    echo json_encode(["sucesso" => false, "mensagem" => "Titulação inválida."]);
    exit;
}

// ----------------------------------------------------------
// Disciplinas: chegam como JSON ["Banco de Dados","Programação"].
// Remove vazias e repetidas (mesmo tratamento do criar).
// ----------------------------------------------------------
$disciplinas = json_decode($_POST["disciplinas"] ?? "[]", true);
if (!is_array($disciplinas)) {
    $disciplinas = [];
}
$unicas = [];
foreach ($disciplinas as $d) {
    if (!is_string($d)) continue;
    $d = trim($d);
    if ($d === "") continue;
    if (mb_strlen($d) > 100) {
        echo json_encode(["sucesso" => false, "mensagem" => "Nome de disciplina muito longo (máx. 100 caracteres)."]);
        exit;
    }
    $unicas[mb_strtolower($d)] = $d;
}
$disciplinas = array_values($unicas);
if (count($disciplinas) > 10) {
    echo json_encode(["sucesso" => false, "mensagem" => "Máximo de 10 disciplinas por professor."]);
    exit;
}

// ===== TURMAS: salas/turnos que o professor vai lecionar (ids da tabela turmas) =====
$turmasIds = json_decode($_POST["turmas"] ?? "[]", true);
if (!is_array($turmasIds)) {
    $turmasIds = [];
}
$turmasIds = array_values(array_unique(array_filter(array_map('intval', $turmasIds), fn($v) => $v > 0)));
if (count($turmasIds) > 30) {
    echo json_encode(["sucesso" => false, "mensagem" => "Turmas demais selecionadas."]);
    exit;
}
if ($turmasIds) {
    $marcas = implode(',', array_fill(0, count($turmasIds), '?'));
    $stmt = mysqli_prepare($link, "SELECT COUNT(*) AS total FROM turmas WHERE id_turma IN ($marcas)");
    mysqli_stmt_bind_param($stmt, str_repeat('i', count($turmasIds)), ...$turmasIds);
    mysqli_stmt_execute($stmt);
    $conferidas = (int) mysqli_fetch_assoc(mysqli_stmt_get_result($stmt))["total"];
    mysqli_stmt_close($stmt);

    if ($conferidas !== count($turmasIds)) {
        echo json_encode(["sucesso" => false, "mensagem" => "Turma inválida."]);
        exit;
    }
}
// ===== FIM TURMAS =====

try {

    // O professor existe?
    $stmt = mysqli_prepare($link, "SELECT id_prof FROM prof_login WHERE id_prof = ? LIMIT 1");
    mysqli_stmt_bind_param($stmt, "i", $id);
    mysqli_stmt_execute($stmt);
    $existe = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

    if (!$existe) {
        http_response_code(404);
        echo json_encode(["sucesso" => false, "mensagem" => "Professor não encontrado."]);
        exit;
    }

    // Matrícula e e-mail não podem repetir em OUTRO professor (o próprio pode manter os seus)
    $stmt = mysqli_prepare($link, "SELECT matricula, email FROM prof_login
                                   WHERE (matricula = ? OR email = ?) AND id_prof <> ? LIMIT 1");
    mysqli_stmt_bind_param($stmt, "ssi", $matricula, $email, $id);
    mysqli_stmt_execute($stmt);
    $repetido = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

    if ($repetido) {
        $campo = ($repetido["email"] === $email) ? "e-mail" : "matrícula";
        echo json_encode(["sucesso" => false, "mensagem" => "Já existe outro professor com essa $campo."]);
        exit;
    }

    // Transação: atualiza o professor e troca as disciplinas, ou não muda nada
    mysqli_begin_transaction($link);

    $stmt = mysqli_prepare($link, "UPDATE prof_login
                                   SET nome = ?, email = ?, matricula = ?, departamento = ?, titulacao = ?, ativo = ?
                                   WHERE id_prof = ?");
    mysqli_stmt_bind_param($stmt, "sssssii", $nome, $email, $matricula, $departamento, $titulacao, $ativo, $id);
    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception("Falha ao atualizar o professor");
    }
    mysqli_stmt_close($stmt);

    // Apaga as disciplinas antigas e grava a lista nova
    $stmt = mysqli_prepare($link, "DELETE FROM prof_disciplinas WHERE id_prof = ?");
    mysqli_stmt_bind_param($stmt, "i", $id);
    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception("Falha ao limpar as disciplinas");
    }
    mysqli_stmt_close($stmt);

    if ($disciplinas) {
        $stmtDisc = mysqli_prepare($link, "INSERT INTO prof_disciplinas (id_prof, nome) VALUES (?, ?)");
        foreach ($disciplinas as $nomeDisc) {
            mysqli_stmt_bind_param($stmtDisc, "is", $id, $nomeDisc);
            if (!mysqli_stmt_execute($stmtDisc)) {
                throw new Exception("Falha ao inserir a disciplina");
            }
        }
        mysqli_stmt_close($stmtDisc);
    }

    // Troca as turmas do professor pela lista nova
    $stmt = mysqli_prepare($link, "DELETE FROM prof_turmas WHERE id_prof = ?");
    mysqli_stmt_bind_param($stmt, "i", $id);
    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception("Falha ao limpar as turmas");
    }
    mysqli_stmt_close($stmt);

    if ($turmasIds) {
        $stmtTurma = mysqli_prepare($link, "INSERT INTO prof_turmas (id_prof, id_turma) VALUES (?, ?)");
        foreach ($turmasIds as $idTurma) {
            mysqli_stmt_bind_param($stmtTurma, "ii", $id, $idTurma);
            if (!mysqli_stmt_execute($stmtTurma)) {
                throw new Exception("Falha ao inserir a turma");
            }
        }
        mysqli_stmt_close($stmtTurma);
    }

    mysqli_commit($link);

    echo json_encode(["sucesso" => true]);

} catch (Throwable $erro) {
    mysqli_rollback($link);
    error_log("Erro ao editar professor: " . $erro->getMessage());
    http_response_code(500);
    echo json_encode(["sucesso" => false, "mensagem" => "Erro ao salvar as alterações."]);
}
