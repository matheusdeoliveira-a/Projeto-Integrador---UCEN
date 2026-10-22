<?php
// ==========================================================
// POST suporte_professor_criar.php
// Campos: nome, matricula, departamento, titulacao, email, disciplinas (JSON opcional)
// Cria o professor em prof_login com a senha padrão (hash).
// Requer as colunas matricula, departamento e titulacao em prof_login.
// ==========================================================

header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../iniciar_sessao.php';
header("Content-Type: application/json; charset=utf-8");
iniciarSessao('suporte');

include_once __DIR__ . '/../connect_nebula.php';
require_once __DIR__ . '/../suporte_permissoes.php';
exigirPermissao($link, 'professores');
include_once __DIR__ . '/../mailer.php';   // mesma função enviarEmail() usada no solicitar_codigo.php

const SENHA_PADRAO = "SuaSenha123";

// Link da tela de login que vai no e-mail (troque pelo endereço real quando for pro ar)
const URL_LOGIN = "https://nebula-ucen.duckdns.org/Nebula/Nebula/";

$nome         = trim($_POST["nome"] ?? "");
$matricula    = strtoupper(trim($_POST["matricula"] ?? ""));
$departamento = trim($_POST["departamento"] ?? "");
$titulacao    = trim($_POST["titulacao"] ?? "");
$email        = strtolower(trim($_POST["email"] ?? ""));

// ===== DISCIPLINAS (PHP 1/2): lê e valida a lista enviada pelo JS ==========
// Chega como JSON: ["Banco de Dados","Programação"]. Remove vazias e repetidas.
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
// ===== FIM DISCIPLINAS (PHP 1/2) ===========================================

// Quem está criando (coluna criado_por)
$criadoPor = isset($_SESSION['id_suporte']) ? (int) $_SESSION['id_suporte'] : null;

$titulacoesValidas = ["Mestre", "Doutor", "Pós-doutor", "Especialista"];

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

// Matrícula e e-mail não podem repetir
$stmt = mysqli_prepare($link, "SELECT matricula, email FROM prof_login WHERE matricula = ? OR email = ? LIMIT 1");
mysqli_stmt_bind_param($stmt, "ss", $matricula, $email);
mysqli_stmt_execute($stmt);
$existente = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
mysqli_stmt_close($stmt);

if ($existente) {
    $campo = ($existente["email"] === $email) ? "e-mail" : "matrícula";
    echo json_encode(["sucesso" => false, "mensagem" => "Já existe um professor com essa $campo."]);
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

$senhaHash = password_hash(SENHA_PADRAO, PASSWORD_DEFAULT);

// ativo (padrão 1) e criado_em (current_timestamp) o banco preenche sozinho
// ===== DISCIPLINAS (PHP 2/2): grava professor + disciplinas juntos ==========
// Transação: ou grava o professor E todas as disciplinas, ou não grava nada.
// Requer a tabela prof_disciplinas (ver disciplinas_professor.sql).
try {
    mysqli_begin_transaction($link);

    $stmt = mysqli_prepare($link, "INSERT INTO prof_login (nome, email, senha, matricula, departamento, titulacao, criado_por)
                                   VALUES (?, ?, ?, ?, ?, ?, ?)");
    mysqli_stmt_bind_param($stmt, "ssssssi", $nome, $email, $senhaHash, $matricula, $departamento, $titulacao, $criadoPor);

    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception("Falha ao inserir o professor");
    }

    $idNovo = mysqli_insert_id($link);
    mysqli_stmt_close($stmt);

    if ($disciplinas) {
        $stmtDisc = mysqli_prepare($link, "INSERT INTO prof_disciplinas (id_prof, nome) VALUES (?, ?)");
        foreach ($disciplinas as $nomeDisc) {
            mysqli_stmt_bind_param($stmtDisc, "is", $idNovo, $nomeDisc);
            if (!mysqli_stmt_execute($stmtDisc)) {
                throw new Exception("Falha ao inserir a disciplina");
            }
        }
        mysqli_stmt_close($stmtDisc);
    }

    // Turmas do professor (definidas pelo suporte)
    if ($turmasIds) {
        $stmtTurma = mysqli_prepare($link, "INSERT INTO prof_turmas (id_prof, id_turma) VALUES (?, ?)");
        foreach ($turmasIds as $idTurma) {
            mysqli_stmt_bind_param($stmtTurma, "ii", $idNovo, $idTurma);
            if (!mysqli_stmt_execute($stmtTurma)) {
                throw new Exception("Falha ao inserir a turma");
            }
        }
        mysqli_stmt_close($stmtTurma);
    }

    mysqli_commit($link);
} catch (Throwable $erro) {
    mysqli_rollback($link);
    error_log("Erro ao cadastrar professor: " . $erro->getMessage());
    http_response_code(500);
    echo json_encode(["sucesso" => false, "mensagem" => "Erro ao cadastrar o professor."]);
    exit;
}
// ===== FIM DISCIPLINAS (PHP 2/2) ===========================================

// ----------------------------------------------------------
// E-mail de boas-vindas pedindo a troca da senha.
// Se o envio falhar, o professor continua cadastrado: só avisamos o suporte.
// ----------------------------------------------------------
$nomeSeguro      = htmlspecialchars($nome);
$emailSeguro     = htmlspecialchars($email);
$matriculaSegura = htmlspecialchars($matricula);
$senhaSegura     = htmlspecialchars(SENHA_PADRAO);
$linkSeguro      = htmlspecialchars(URL_LOGIN);

$corpo = "
<div style='font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #333;'>
    <div style='background:#050912; padding:22px; text-align:center;'>
        <h1 style='color:#E7B6E6; margin:0; font-size:20px; font-family: Arial, sans-serif;'>UCEN</h1>
    </div>
    <div style='padding:26px; border:1px solid #e0e0e0; border-top:none;'>
        <p>Olá, <strong>{$nomeSeguro}</strong>,</p>
        <p>Seu acesso ao Portal do Professor foi criado (matrícula <strong>{$matriculaSegura}</strong>).</p>
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
    $retorno = enviarEmail($email, $nome, "Seu acesso ao Portal do Professor - UCEN", $corpo);
    $emailEnviado = ($retorno !== false);
} catch (Throwable $erro) {
    $emailEnviado = false;
}

echo json_encode(["sucesso" => true, "id" => $idNovo, "email_enviado" => $emailEnviado]);