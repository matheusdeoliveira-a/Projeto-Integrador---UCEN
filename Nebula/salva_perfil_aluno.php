<?php
// ==========================================================
// POST salva_perfil_aluno.php  (multipart/form-data)
// Salva contato, endereço e foto do ALUNO LOGADO (só o dele).
// Campos: celular, telRecado, emailSecundario, cep, logradouro, numero,
//         complemento, bairro, cidade, uf, foto (arquivo), remover_foto (1)
// ==========================================================
require_once __DIR__ . '/iniciar_sessao.php';
iniciarSessao('aluno');

header("Content-Type: application/json; charset=utf-8");
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

include_once(__DIR__ . "/connect_nebula.php");
mysqli_set_charset($link, "utf8mb4");

function responder($sucesso, $mensagem, array $extra = []) {
    echo json_encode(array_merge(["sucesso" => $sucesso, "mensagem" => $mensagem], $extra));
    exit;
}

if (empty($_SESSION['logado']) || ($_SESSION['tipo'] ?? '') !== 'aluno' || empty($_SESSION['id_usuarios'])) {
    responder(false, "Sessão expirada. Faça login novamente.");
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    responder(false, "Método inválido.");
}

$idUsuario = (int) $_SESSION['id_usuarios'];

function campo($nome, $max) {
    $v = $_POST[$nome] ?? '';
    return is_string($v) ? mb_substr(trim($v), 0, $max) : '';
}

$celular         = campo('celular', 20);
$telRecado       = campo('telRecado', 20);
$emailSecundario = campo('emailSecundario', 120);
$cep             = campo('cep', 9);
$logradouro      = campo('logradouro', 150);
$numero          = campo('numero', 10);
$complemento     = campo('complemento', 100);
$bairro          = campo('bairro', 80);
$cidade          = campo('cidade', 80);
$uf              = strtoupper(campo('uf', 2));

if ($emailSecundario !== '' && !filter_var($emailSecundario, FILTER_VALIDATE_EMAIL)) {
    responder(false, "Informe um e-mail secundário válido.");
}
if ($uf !== '' && !preg_match('/^[A-Z]{2}$/', $uf)) {
    responder(false, "UF inválida.");
}

try {

    $stmt = mysqli_prepare($link, "SELECT foto FROM aluno_perfil WHERE id_usuarios = ?");
    mysqli_stmt_bind_param($stmt, "i", $idUsuario);
    mysqli_stmt_execute($stmt);
    $atual = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

    $foto = $atual['foto'] ?? null;

    // Apaga do disco uma foto antiga (só se estiver mesmo na pasta de fotos dos alunos)
    $pastaFotos = __DIR__ . '/uploads/alunos';
    $apagarFoto = function ($caminhoRelativo) use ($pastaFotos) {
        if (!$caminhoRelativo) return;
        $arquivo = $pastaFotos . '/' . basename($caminhoRelativo);
        if (is_file($arquivo)) @unlink($arquivo);
    };

    // ----- Foto removida na tela -----
    if (($_POST['remover_foto'] ?? '') === '1' && empty($_FILES['foto']['name'])) {
        $apagarFoto($foto);
        $foto = null;
    }

    // ----- Foto nova -----
    if (isset($_FILES['foto']) && $_FILES['foto']['error'] !== UPLOAD_ERR_NO_FILE) {

        $f = $_FILES['foto'];

        if ($f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) {
            responder(false, "Não foi possível enviar a foto (máx. 5 MB).");
        }
        if ($f['size'] > 5 * 1024 * 1024) {
            responder(false, "A foto pode ter no máximo 5 MB.");
        }

        $mimes = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
        $mime  = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);

        if (!isset($mimes[$mime])) {
            responder(false, "Formato de imagem não suportado. Use JPG, PNG, WEBP ou GIF.");
        }

        if (!is_dir($pastaFotos) && !mkdir($pastaFotos, 0755, true)) {
            error_log("salva_perfil_aluno: não foi possível criar $pastaFotos");
            responder(false, "Não foi possível guardar a foto no servidor.");
        }

        $nomeArquivo = "aluno_" . $idUsuario . "_" . time() . "." . $mimes[$mime];

        if (!move_uploaded_file($f['tmp_name'], $pastaFotos . '/' . $nomeArquivo)) {
            responder(false, "Falha ao enviar a foto.");
        }

        $apagarFoto($foto);                         // a foto antiga sai do disco
        $foto = "uploads/alunos/" . $nomeArquivo;   // caminho relativo à raiz do site
    }

    // ----- Grava (cria a linha na primeira vez, atualiza nas outras) -----
    $stmt = mysqli_prepare($link,
        "INSERT INTO aluno_perfil
            (id_usuarios, foto, celular, tel_recado, email_secundario, cep, logradouro, numero, complemento, bairro, cidade, uf)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            foto = VALUES(foto), celular = VALUES(celular), tel_recado = VALUES(tel_recado),
            email_secundario = VALUES(email_secundario), cep = VALUES(cep), logradouro = VALUES(logradouro),
            numero = VALUES(numero), complemento = VALUES(complemento), bairro = VALUES(bairro),
            cidade = VALUES(cidade), uf = VALUES(uf)");
    mysqli_stmt_bind_param($stmt, "isssssssssss",
        $idUsuario, $foto, $celular, $telRecado, $emailSecundario,
        $cep, $logradouro, $numero, $complemento, $bairro, $cidade, $uf);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

} catch (mysqli_sql_exception $e) {

    error_log("salva_perfil_aluno: " . $e->getMessage());
    http_response_code(500);
    responder(false, "Não foi possível salvar o perfil. Tente novamente.");

}

responder(true, "Perfil atualizado com sucesso!", ["foto" => $foto]);
