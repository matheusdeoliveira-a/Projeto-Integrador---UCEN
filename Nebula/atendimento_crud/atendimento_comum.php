<?php
// ==========================================================
// atendimento_comum.php
// Começo comum dos endpoints de resposta da Central de Atendimento
// (chamado_status, chamado_responder, email_listar, email_enviar):
// sessão do suporte, banco, permissão "atendimento" e funções de apoio.
// ==========================================================
header("Content-Type: application/json; charset=utf-8");
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('suporte');

include_once __DIR__ . '/../connect_nebula.php';
mysqli_set_charset($link, "utf8mb4");
require_once __DIR__ . '/../suporte_permissoes.php';

// Erro inesperado (ex.: tabela emails_enviados ainda não criada) vira JSON
set_exception_handler(function (Throwable $e) {
    error_log("atendimento: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["sucesso" => false, "erro" => "Erro no servidor. Confira se o atendimento.sql foi executado."]);
});

$eu = exigirPermissao($link, 'atendimento');   // id, nome, total, menus

const STATUS_CHAMADO = ['Pendente', 'Em andamento', 'Respondido'];

function saida(array $dados): void {
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

function falha(string $mensagem, int $codigo = 200): void {
    http_response_code($codigo);
    saida(["sucesso" => false, "erro" => $mensagem]);
}

function exigirPost(): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        falha("Método inválido", 405);
    }
    // Quando o envio passa do post_max_size do PHP, $_POST e $_FILES chegam vazios.
    // Sem esta checagem o erro apareceria como "escreva a resposta", que confunde.
    if (empty($_POST) && empty($_FILES) && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
        falha("Os anexos passam do limite de envio do servidor (post_max_size). Envie arquivos menores.");
    }
}

function campo(string $nome): string {
    $v = $_POST[$nome] ?? '';
    return is_string($v) ? trim($v) : '';
}

function codigoChamado(int $id): string {
    return "#CH-" . str_pad((string) $id, 4, '0', STR_PAD_LEFT);
}

// Tira quebras de linha (assunto de e-mail: evita injeção de cabeçalho)
function limparLinha(string $texto): string {
    return trim(preg_replace('/\s+/u', ' ', $texto));
}

function buscarChamado(mysqli $link, int $id): ?array {
    $stmt = mysqli_prepare($link,
        "SELECT id_chamado, nome, email, assunto, status FROM chamados WHERE id_chamado = ? LIMIT 1");
    mysqli_stmt_bind_param($stmt, "i", $id);
    mysqli_stmt_execute($stmt);
    $linha = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);
    return $linha ?: null;
}

// Grava na tabela (aparece na aba "E-mails enviados"), tenha saído ou não
function registrarEmail(mysqli $link, ?int $idChamado, string $dest, ?string $nomeDest,
                        string $assunto, string $mensagem, string $enviadoPor, int $idSuporte, string $status): void {
    $stmt = mysqli_prepare($link,
        "INSERT INTO emails_enviados (id_chamado, destinatario, destinatario_nome, assunto, mensagem, enviado_por, id_suporte, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    mysqli_stmt_bind_param($stmt, "isssssis", $idChamado, $dest, $nomeDest, $assunto, $mensagem, $enviadoPor, $idSuporte, $status);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);
}

// Corpo do e-mail em HTML e em texto simples. O texto digitado é escapado.
function montarCorpoEmail(string $nomeDestino, string $mensagem, string $assinante, ?string $codigo): array {
    $esc = fn(string $t): string => htmlspecialchars($t, ENT_QUOTES, 'UTF-8');

    $saudacao = $nomeDestino !== '' ? "Olá, " . $esc($nomeDestino) . "!" : "Olá!";
    $ref      = $codigo ? "<p style=\"color:#777;font-size:13px\">Referente ao chamado " . $esc($codigo) . ".</p>" : "";

    $html = "<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#222;line-height:1.6\">"
          . "<p>" . $saudacao . "</p>"
          . "<p>" . nl2br($esc($mensagem)) . "</p>"
          . "<p>Atenciosamente,<br>" . $esc($assinante) . "<br>Suporte UCEN - Universidade de Ciências Exatas Nebula</p>"
          . $ref
          . "</div>";

    $texto = ($nomeDestino !== '' ? "Olá, " . $nomeDestino . "!" : "Olá!") . "\n\n"
           . $mensagem . "\n\n"
           . "Atenciosamente,\n" . $assinante . "\nSuporte UCEN - Universidade de Ciências Exatas Nebula"
           . ($codigo ? "\n\nReferente ao chamado " . $codigo . "." : "");

    return [$html, $texto];
}

// ----------------------------------------------------------
// Anexos do e-mail (campo de arquivos "anexos[]", opcional)
// Limites: até 5 arquivos, 10 MB cada, 15 MB no total
// (o e-mail aumenta ~33% ao anexar, e a maioria dos provedores aceita até 25 MB).
// Os arquivos NÃO ficam guardados no servidor: vão direto do upload temporário para o e-mail.
// Devolve [['caminho' => ..., 'nome' => ...], ...]; em caso de problema responde o erro e encerra.
// ----------------------------------------------------------
const ANEXO_MAX_ARQUIVOS = 5;
const ANEXO_MAX_CADA     = 10 * 1024 * 1024;
const ANEXO_MAX_TOTAL    = 15 * 1024 * 1024;
const ANEXO_EXTENSOES    = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'png', 'jpg', 'jpeg', 'zip'];

function receberAnexos(): array {
    if (!isset($_FILES['anexos']) || !is_array($_FILES['anexos']['name'])) {
        return [];
    }

    $f = $_FILES['anexos'];
    $anexos = [];
    $total  = 0;

    foreach ($f['name'] as $i => $nomeOriginal) {
        $erro = $f['error'][$i];
        if ($erro === UPLOAD_ERR_NO_FILE) {
            continue;   // campo de arquivo vazio
        }
        if ($erro === UPLOAD_ERR_INI_SIZE || $erro === UPLOAD_ERR_FORM_SIZE) {
            falha("O anexo \"" . basename($nomeOriginal) . "\" passa do limite de envio do servidor.");
        }
        if ($erro !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'][$i])) {
            falha("Não foi possível receber o anexo \"" . basename($nomeOriginal) . "\". Tente de novo.");
        }

        // Nome seguro (sem barras nem caracteres de controle)
        $nome = trim(preg_replace('/[\\\\\/:*?"<>|\x00-\x1F]/u', '_', basename($nomeOriginal)), '. ');
        $ext  = strtolower(pathinfo($nome, PATHINFO_EXTENSION));
        if ($nome === '' || !in_array($ext, ANEXO_EXTENSOES, true)) {
            falha("Tipo de arquivo não permitido: \"" . basename($nomeOriginal) . "\". Aceitos: " . implode(', ', ANEXO_EXTENSOES) . ".");
        }

        $tamanho = (int) $f['size'][$i];
        if ($tamanho > ANEXO_MAX_CADA) {
            falha("O anexo \"" . $nome . "\" passa de 10 MB.");
        }
        $total += $tamanho;

        $anexos[] = ['caminho' => $f['tmp_name'][$i], 'nome' => $nome];
    }

    if (count($anexos) > ANEXO_MAX_ARQUIVOS) {
        falha("Envie no máximo " . ANEXO_MAX_ARQUIVOS . " anexos por e-mail.");
    }
    if ($total > ANEXO_MAX_TOTAL) {
        falha("Os anexos passam de 15 MB no total.");
    }

    return $anexos;
}

// Texto que fica gravado junto da mensagem no histórico (aba "E-mails enviados" e respostas do chamado)
function textoAnexosRegistro(array $anexos): string {
    if (!$anexos) {
        return '';
    }
    return "\n\n[Anexos: " . implode(', ', array_column($anexos, 'nome')) . "]";
}
