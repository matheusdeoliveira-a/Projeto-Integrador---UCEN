<?php
// ==========================================================
// POST arquivos_upload.php  (multipart/form-data)
// Campos: nome, tipo, id_turma, pasta_pai (vazio = raiz da turma), arquivo (file)
// ==========================================================

header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('professor');

if (!isset($_SESSION['logado']) || $_SESSION['logado'] !== true) {
    http_response_code(401);
    echo json_encode(["sucesso" => false, "mensagem" => "Não autenticado"]);
    exit;
}
if (($_SESSION['tipo'] ?? '') !== 'professor' || empty($_SESSION['id_prof'])) {
    http_response_code(403);
    echo json_encode(["sucesso" => false, "mensagem" => "Sem permissão"]);
    exit;
}

include_once __DIR__ . '/../connect_nebula.php';
require_once __DIR__ . '/arquivos_helpers.php';

$idProf  = (int) $_SESSION['id_prof'];
$idTurma = (int) ($_POST["id_turma"] ?? 0);

$turma = turmaDoProfessor($link, $idProf, $idTurma);
if (!$turma) {
    http_response_code(403);
    echo json_encode(["sucesso" => false, "mensagem" => "Turma não pertence a este professor"]);
    exit;
}

$nome     = trim($_POST["nome"] ?? "");
$tipo     = $_POST["tipo"] ?? "arquivo";
$pastaPai = (isset($_POST["pasta_pai"]) && $_POST["pasta_pai"] !== "") ? (int) $_POST["pasta_pai"] : null;

// Só os tipos que o formulário oferece
if (!in_array($tipo, ["pdf", "slide", "atividade", "arquivo"], true)) {
    $tipo = "arquivo";
}

if (!isset($_FILES["arquivo"]) || $_FILES["arquivo"]["error"] !== UPLOAD_ERR_OK) {
    echo json_encode(["sucesso" => false, "mensagem" => "Nenhum arquivo válido foi enviado."]);
    exit;
}

// A pasta de destino tem que ser da MESMA turma (checa antes de gravar qualquer coisa no disco)
if ($pastaPai && !pastaDaTurma($link, $pastaPai, $idTurma)) {
    echo json_encode(["sucesso" => false, "mensagem" => "A pasta escolhida não pertence a esta turma."]);
    exit;
}

// Pasta física onde os uploads ficam salvos no servidor
$pastaDestino = __DIR__ . "/uploads/professor_arquivos/";
if (!is_dir($pastaDestino)) {
    mkdir($pastaDestino, 0755, true);
}

// Extensões aceitas - ajuste essa lista conforme a necessidade
$extensoesAceitas = ["pdf", "ppt", "pptx", "doc", "docx", "xls", "xlsx", "zip", "png", "jpg", "jpeg"];
$extensao = strtolower(pathinfo($_FILES["arquivo"]["name"], PATHINFO_EXTENSION));

if (!in_array($extensao, $extensoesAceitas)) {
    echo json_encode(["sucesso" => false, "mensagem" => "Tipo de arquivo não permitido (.$extensao)."]);
    exit;
}

if ($nome === "") {
    $nome = $_FILES["arquivo"]["name"];
}

// Nome físico único no servidor, pra não sobrescrever arquivos com nomes repetidos
$nomeFisico    = uniqid("arq_") . "." . $extensao;
$caminhoFisico = $pastaDestino . $nomeFisico;
$caminhoSalvo  = "uploads/professor_arquivos/" . $nomeFisico; // caminho relativo salvo no banco

if (move_uploaded_file($_FILES["arquivo"]["tmp_name"], $caminhoFisico)) {

    // A coluna antiga "turma" (texto) continua sendo preenchida só por compatibilidade
    $rotulo = rotuloTurma($turma);

    $stmt = mysqli_prepare($link,
        "INSERT INTO arquivos_professor (tipo, nome, caminho, turma, id_turma, pasta_pai)
         VALUES (?, ?, ?, ?, ?, ?)");
    mysqli_stmt_bind_param($stmt, "ssssii", $tipo, $nome, $caminhoSalvo, $rotulo, $idTurma, $pastaPai);

    if (mysqli_stmt_execute($stmt)) {
        echo json_encode(["sucesso" => true, "id" => mysqli_insert_id($link), "caminho" => $caminhoSalvo]);
    } else {
        // Se a linha não foi salva no banco, não faz sentido deixar o arquivo órfão no servidor
        unlink($caminhoFisico);
        echo json_encode(["sucesso" => false, "mensagem" => mysqli_error($link)]);
    }

} else {
    echo json_encode(["sucesso" => false, "mensagem" => "Falha ao mover o arquivo enviado."]);
}
