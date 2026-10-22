<?php
// ==========================================================
// GET arquivos_baixar_aluno.php?id=ID
// Para o ALUNO baixar:
//  - um arquivo: baixa o próprio arquivo;
//  - uma pasta: baixa um .zip com tudo que está dentro dela
//    (subpastas e arquivos, mantendo a estrutura).
// Somente leitura: não altera nada no banco nem nos arquivos.
// ==========================================================

require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('aluno');

function responderErro($codigo, $mensagem) {
    http_response_code($codigo);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode(["sucesso" => false, "mensagem" => $mensagem]);
    exit;
}

if (!isset($_SESSION['logado']) || $_SESSION['logado'] !== true) {
    responderErro(401, "Não autenticado");
}

// Só aluno usa este endpoint
if (($_SESSION['tipo'] ?? '') !== 'aluno') {
    responderErro(403, "Sem permissão");
}

include_once __DIR__ . '/../connect_nebula.php';

$id = isset($_GET["id"]) ? (int) $_GET["id"] : 0;

if (!$id) {
    responderErro(400, "Item inválido.");
}

// ----------------------------------------------------------
// Funções auxiliares
// ----------------------------------------------------------

// Tira do nome os caracteres que o Windows/zip não aceitam
function limparNome($nome) {
    $limpo = preg_replace('/[\\\\\/:*?"<>|\x00-\x1F]/u', '_', (string) $nome);
    $limpo = trim($limpo, ". ");
    return $limpo !== '' ? $limpo : 'arquivo';
}

// Garante a extensão do arquivo físico no nome (o professor pode ter digitado só "Aula 1")
function nomeComExtensao($nome, $caminho) {
    $limpo = limparNome($nome);
    $ext = strtolower(pathinfo((string) $caminho, PATHINFO_EXTENSION));

    if ($ext !== '' && strtolower(pathinfo($limpo, PATHINFO_EXTENSION)) !== $ext) {
        $limpo .= '.' . $ext;
    }

    return $limpo;
}

// Evita dois itens com o mesmo nome dentro da mesma pasta do zip
function nomeUnico($nome, array &$usados) {
    $base = pathinfo($nome, PATHINFO_FILENAME);
    $ext  = pathinfo($nome, PATHINFO_EXTENSION);
    $final = $nome;
    $n = 2;

    while (in_array(strtolower($final), $usados, true)) {
        $final = $base . " ($n)" . ($ext !== '' ? ".$ext" : "");
        $n++;
    }

    $usados[] = strtolower($final);
    return $final;
}

// O "caminho" do banco (ex.: uploads/professor_arquivos/arq_x.png) é relativo à
// raiz do site. Por segurança, só aceita arquivos que estejam mesmo dentro de
// uploads/professor_arquivos (tenta a raiz do site e, depois, esta pasta).
function localizarArquivoFisico($caminho) {

    if (!$caminho) return null;

    $bases = [realpath(__DIR__ . '/..'), realpath(__DIR__)];

    foreach ($bases as $base) {

        if (!$base) continue;

        $permitida = realpath($base . '/uploads/professor_arquivos');
        $completo  = realpath($base . '/' . $caminho);

        if ($permitida && $completo && is_file($completo)
            && strpos($completo, $permitida . DIRECTORY_SEPARATOR) === 0) {
            return $completo;
        }

    }

    return null;
}

// Adiciona ao zip o conteúdo de uma pasta, descendo pelas subpastas
function adicionarPastaAoZip($link, ZipArchive $zip, $idPasta, $prefixo, &$adicionados, $nivel = 0) {

    if ($nivel > 20) return; // trava de segurança contra pastas encadeadas demais

    $stmt = mysqli_prepare($link, "SELECT id_arq_prof AS id, tipo, nome, caminho
                                   FROM arquivos_professor
                                   WHERE pasta_pai = ?
                                   ORDER BY id_arq_prof");
    mysqli_stmt_bind_param($stmt, "i", $idPasta);
    mysqli_stmt_execute($stmt);
    $itens = mysqli_fetch_all(mysqli_stmt_get_result($stmt), MYSQLI_ASSOC);
    mysqli_stmt_close($stmt);

    $usados = [];

    foreach ($itens as $item) {

        if ($item["tipo"] === "pasta") {

            $nomePasta = nomeUnico(limparNome($item["nome"]), $usados);
            $zip->addEmptyDir($prefixo . $nomePasta);
            adicionarPastaAoZip($link, $zip, (int) $item["id"], $prefixo . $nomePasta . "/", $adicionados, $nivel + 1);

        } else {

            $fisico = localizarArquivoFisico($item["caminho"]);
            if (!$fisico) continue; // arquivo sumiu do disco: pula sem quebrar o zip

            $nomeArquivo = nomeUnico(nomeComExtensao($item["nome"], $item["caminho"]), $usados);
            $zip->addFile($fisico, $prefixo . $nomeArquivo);
            $adicionados++;

        }

    }

}

// Envia o arquivo para o navegador como download
function enviarDownload($caminhoFisico, $nomeDownload, $mime) {

    while (ob_get_level()) ob_end_clean();

    $nomeAscii = preg_replace('/[^A-Za-z0-9._ -]/', '_', $nomeDownload);

    header("Content-Type: $mime");
    header('Content-Disposition: attachment; filename="' . $nomeAscii . '"; filename*=UTF-8\'\'' . rawurlencode($nomeDownload));
    header("Content-Length: " . filesize($caminhoFisico));
    header("Cache-Control: private, no-transform");

    readfile($caminhoFisico);

}

// ----------------------------------------------------------
// Busca o item pedido
// ----------------------------------------------------------

$stmt = mysqli_prepare($link, "SELECT tipo, nome, caminho FROM arquivos_professor WHERE id_arq_prof = ?");
mysqli_stmt_bind_param($stmt, "i", $id);
mysqli_stmt_execute($stmt);
$item = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
mysqli_stmt_close($stmt);

if (!$item) {
    responderErro(404, "Item não encontrado.");
}

// ----------------------------------------------------------
// ARQUIVO: baixa o próprio arquivo
// ----------------------------------------------------------

if ($item["tipo"] !== "pasta") {

    $fisico = localizarArquivoFisico($item["caminho"]);

    if (!$fisico) {
        responderErro(404, "Arquivo não encontrado no servidor.");
    }

    enviarDownload($fisico, nomeComExtensao($item["nome"], $item["caminho"]), "application/octet-stream");
    exit;

}

// ----------------------------------------------------------
// PASTA: monta um .zip temporário e envia
// ----------------------------------------------------------

if (!class_exists("ZipArchive")) {
    responderErro(500, "O servidor não tem a extensão zip do PHP ativada.");
}

set_time_limit(120);
ignore_user_abort(true);

$tmp = tempnam(sys_get_temp_dir(), "pasta_");
$zip = new ZipArchive();

if ($zip->open($tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
    @unlink($tmp);
    responderErro(500, "Não foi possível criar o arquivo zip.");
}

$nomeRaiz = limparNome($item["nome"]);
$adicionados = 0;

$zip->addEmptyDir($nomeRaiz); // garante o zip mesmo se a pasta estiver vazia
adicionarPastaAoZip($link, $zip, $id, $nomeRaiz . "/", $adicionados);

$zip->close();

enviarDownload($tmp, $nomeRaiz . ".zip", "application/zip");

@unlink($tmp);