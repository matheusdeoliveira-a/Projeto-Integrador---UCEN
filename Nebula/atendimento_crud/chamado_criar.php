<?php
// ==========================================================
// POST atendimento_crud/chamado_criar.php
// Abre um chamado na Central de Atendimento (tabela chamados).
//
// Quem chama
//   - home_ajuda.html      -> origem = "home"          (visitante, sem login)
//   - aluno_documentos.js  -> origem = "portal_aluno"  (aluno logado, aba Requisições)
//
// Campos: origem, nome, email, mensagem
// Resposta: { sucesso: true, protocolo: "#CH-0001" }  ou  { sucesso: false, erro: "..." }
//
// O chamado nasce "Pendente" e com responsável "Suporte"; a equipe responde
// pela Central de Atendimento (chamado_responder.php).
// ==========================================================
header("Content-Type: application/json; charset=utf-8");
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/../iniciar_sessao.php';
include_once __DIR__ . '/../connect_nebula.php';
mysqli_set_charset($link, "utf8mb4");

// ---------- Limites ----------
const NOME_MAX      = 120;
const EMAIL_MAX     = 120;
const MENSAGEM_MAX  = 10000;   // o mesmo limite do contador das duas telas
const ASSUNTO_MAX   = 100;     // o assunto da lista é um resumo do começo da mensagem
const LIMITE_HORA   = 5;       // chamados por e-mail na última hora (freia spam)

function saida(array $dados, int $codigo = 200): void {
    http_response_code($codigo);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

function falha(string $mensagem, int $codigo = 200): void {
    saida(["sucesso" => false, "erro" => $mensagem], $codigo);
}

function campo(string $nome): string {
    $v = $_POST[$nome] ?? '';
    return is_string($v) ? trim($v) : '';
}

// Erro inesperado (ex.: tabela chamados ainda não criada) vira JSON, nunca tela em branco
set_exception_handler(function (Throwable $e) {
    error_log("chamado_criar: " . $e->getMessage());
    falha("Não foi possível registrar sua mensagem agora. Tente novamente em instantes.", 500);
});

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    falha("Método inválido.", 405);
}

// ---------- Origem ----------
// "suporte" fica de fora de propósito: chamados do suporte não nascem por este endpoint público.
$origem = campo('origem');
if (!in_array($origem, ['home', 'portal_aluno'], true)) {
    $origem = 'home';
}

// Requisição do portal só vale com o aluno logado (impede forjar a origem)
if ($origem === 'portal_aluno') {
    iniciarSessao('aluno');
    if (empty($_SESSION['logado']) || ($_SESSION['tipo'] ?? '') !== 'aluno' || empty($_SESSION['id_usuarios'])) {
        falha("Sessão expirada. Faça login novamente para enviar a requisição.", 401);
    }
}

// ---------- Dados ----------
$nome     = preg_replace('/\s+/u', ' ', campo('nome'));
$email    = campo('email');
$mensagem = campo('mensagem');

if ($nome === '' || $email === '' || $mensagem === '') {
    falha("Preencha nome, e-mail e a mensagem.");
}
if (mb_strlen($nome) > NOME_MAX) {
    falha("O nome pode ter no máximo " . NOME_MAX . " caracteres.");
}
if (mb_strlen($email) > EMAIL_MAX || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    falha("Informe um e-mail válido.");
}
if (mb_strlen($mensagem) > MENSAGEM_MAX) {
    falha("A mensagem pode ter no máximo " . number_format(MENSAGEM_MAX, 0, ',', '.') . " caracteres.");
}

// ---------- Assunto e categoria ----------
// As telas só têm um campo de texto, então o assunto é o começo da mensagem
// (primeira linha, resumida) e a categoria é deduzida por palavras-chave.
$primeiraLinha = trim(preg_split('/\R/u', $mensagem)[0] ?? '');
$primeiraLinha = preg_replace('/\s+/u', ' ', $primeiraLinha);
$assunto = mb_strlen($primeiraLinha) > ASSUNTO_MAX
    ? rtrim(mb_substr($primeiraLinha, 0, ASSUNTO_MAX - 1)) . '…'
    : $primeiraLinha;
if ($assunto === '') {
    $assunto = 'Sem assunto';
}

function deduzirCategoria(string $texto, string $origem): string {
    $t = mb_strtolower($texto, 'UTF-8');
    $t = strtr($t, ['á'=>'a','à'=>'a','â'=>'a','ã'=>'a','é'=>'e','ê'=>'e','í'=>'i','ó'=>'o','ô'=>'o','õ'=>'o','ú'=>'u','ç'=>'c']);

    $regras = [
        'Financeiro'   => ['boleto', 'mensalidade', 'pagamento', 'pix', 'parcela', 'desconto', 'bolsa', 'financeiro', 'reembolso', 'cobranca', 'taxa'],
        'Acesso'       => ['senha', 'login', 'acesso', 'entrar', 'codigo', 'e-mail de acesso', 'nao consigo logar', 'conta bloqueada'],
        'Documentação' => ['documento', 'historico', 'declaracao', 'diploma', 'certificado', 'atestado', 'comprovante', 'requerimento', 'requisicao', 'segunda via'],
        'Acadêmico'    => ['nota', 'disciplina', 'materia', 'aula', 'professor', 'turma', 'matricula', 'frequencia', 'falta', 'prova', 'trancamento', 'grade'],
    ];
    foreach ($regras as $categoria => $palavras) {
        foreach ($palavras as $p) {
            if (str_contains($t, $p)) {
                return $categoria;
            }
        }
    }
    // Sem palavra-chave: requisição do portal costuma ser de documento; Ajuda da home vira "Outros"
    return $origem === 'portal_aluno' ? 'Documentação' : 'Outros';
}
$categoria = deduzirCategoria($assunto . ' ' . $mensagem, $origem);

// ---------- Freio contra spam (por e-mail) ----------
$stmt = mysqli_prepare($link,
    "SELECT COUNT(*) FROM chamados WHERE email = ? AND criado_em >= (NOW() - INTERVAL 1 HOUR)");
mysqli_stmt_bind_param($stmt, "s", $email);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $recentes);
mysqli_stmt_fetch($stmt);
mysqli_stmt_close($stmt);

if ((int) $recentes >= LIMITE_HORA) {
    falha("Você já enviou várias mensagens na última hora. Aguarde um pouco ou espere nossa resposta por e-mail.", 429);
}

// ---------- Grava ----------
$status      = 'Pendente';
$responsavel = 'Suporte';

$stmt = mysqli_prepare($link,
    "INSERT INTO chamados (nome, email, categoria, assunto, mensagem, origem, responsavel, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
mysqli_stmt_bind_param($stmt, "ssssssss", $nome, $email, $categoria, $assunto, $mensagem, $origem, $responsavel, $status);
mysqli_stmt_execute($stmt);
$idChamado = (int) mysqli_insert_id($link);
mysqli_stmt_close($stmt);

saida([
    "sucesso"   => true,
    "protocolo" => "#CH-" . str_pad((string) $idChamado, 4, '0', STR_PAD_LEFT),
    "mensagem"  => "Chamado registrado."
]);
