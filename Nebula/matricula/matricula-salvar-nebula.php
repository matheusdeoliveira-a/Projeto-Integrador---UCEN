<?php
// Salva a matrícula inteira (dados + 5 documentos). Quem manda é o servidor:
// - o candidato é identificado pelo token do e-mail (CPF, curso, turno e modalidade vêm do banco);
// - a isenção da taxa vem do vestibular, não do que o navegador envia.
header("Content-type: application/json;charset=utf-8");

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

include_once(__DIR__ . "/../connect_nebula.php");
require_once __DIR__ . '/../vagas_nebula.php';
mysqli_set_charset($link, "utf8mb4");

const VALOR_TAXA      = '130.00';
const VENCIMENTO_TAXA = '20/02/2027';
const URL_CADASTRO    = 'https://nebula-ucen.duckdns.org/Nebula/Nebula/cadastro.html';
const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI',
             'RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

function responderErro($mensagem, $campo = null) {
    echo json_encode(["sucesso" => false, "erro" => $mensagem, "campo" => $campo]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    responderErro("Método inválido");
}

// Se o envio passar do post_max_size do PHP, o $_POST chega vazio
if (empty($_POST) && empty($_FILES) && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    responderErro("Os arquivos juntos passam do limite de envio do servidor. Envie arquivos menores.");
}

// ---------- Funções de apoio ----------
function campoPost($nome) {
    $v = $_POST[$nome] ?? '';
    return is_string($v) ? trim($v) : '';
}

function soDigitos($v) {
    return preg_replace('/\D/', '', $v);
}

function texto($nome, $rotulo, $min, $max) {
    $v = campoPost($nome);
    $n = mb_strlen($v);
    if ($n < $min || $n > $max) {
        responderErro("Confira o campo \"$rotulo\".", $nome);
    }
    return $v;
}

function escolha($nome, $rotulo, array $permitidos) {
    $v = campoPost($nome);
    if (!in_array($v, $permitidos, true)) {
        responderErro("Confira o campo \"$rotulo\".", $nome);
    }
    return $v;
}

function dinheiro($nome, $rotulo) {
    $v = str_replace(',', '.', campoPost($nome));
    if (!preg_match('/^\d{1,8}(\.\d{1,2})?$/', $v)) {
        responderErro("Confira o campo \"$rotulo\".", $nome);
    }
    return $v;
}

// ---------- Token do e-mail ----------
$token = campoPost('token');

if (!preg_match('/^[a-f0-9]{32}$/', $token)) {
    responderErro("Link de matrícula inválido. Use o botão do e-mail de aprovação.");
}

try {

    $stmt = mysqli_prepare($link,
        "SELECT i.id_inscricoes, i.cpf, i.id_turma, s.curso AS curso_turma, t.turno AS turno_turma,
                i.modalidade, i.status_isencao, i.status_vestibular
           FROM inscricoes i
           LEFT JOIN turmas t ON t.id_turma = i.id_turma
           LEFT JOIN salas  s ON s.id_sala  = t.id_sala
          WHERE i.token_matricula = ?");
    mysqli_stmt_bind_param($stmt, "s", $token);
    mysqli_stmt_execute($stmt);
    $insc = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

} catch (mysqli_sql_exception $e) {

    error_log("matricula salvar (token): " . $e->getMessage());
    http_response_code(500);
    responderErro("Não foi possível salvar a matrícula. Tente novamente.");

}

if (!$insc) {
    responderErro("Link de matrícula inválido. Use o botão do e-mail de aprovação.");
}
if ($insc['status_vestibular'] !== 'aprovado') {
    responderErro("A matrícula ainda não está liberada para esta inscrição.");
}
if ($insc['id_turma'] === null) {
    responderErro("Sua vaga ainda não foi definida. Procure o suporte da universidade.");
}
if (prazoReservaEncerrado()) {
    responderErro("O prazo para a matrícula terminou em " . VAGAS_PRAZO_TEXTO . " e a vaga foi liberada.");
}

// ---------- Etapa 1: dados pessoais ----------
$nome            = texto('nome-completo', 'Nome completo', 3, 120);
$rg              = soDigitos(campoPost('rg'));
if (strlen($rg) < 5 || strlen($rg) > 20) {
    responderErro("Confira o campo \"RG\".", 'rg');
}
$orgao           = texto('orgao-expedidor', 'Órgão expedidor', 2, 20);
$ufRg            = escolha('uf-rg', 'UF do RG', UFS);

$nascimento      = campoPost('data-nascimento');
$dataNasc        = DateTime::createFromFormat('Y-m-d', $nascimento);
if (!$dataNasc || $dataNasc->format('Y-m-d') !== $nascimento
    || $nascimento < '1900-01-01' || $nascimento > date('Y-m-d')) {
    responderErro("Confira o campo \"Data de nascimento\".", 'data-nascimento');
}

$nomeMae         = texto('nome-mae', 'Nome da mãe', 3, 120);
$nomePai         = campoPost('nome-pai');
if (mb_strlen($nomePai) > 120) {
    responderErro("Confira o campo \"Nome do pai\".", 'nome-pai');
}
$nomePai         = $nomePai !== '' ? $nomePai : null;

$email           = campoPost('email');
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 120) {
    responderErro("Confira o campo \"E-mail\".", 'email');
}

$telefone        = soDigitos(campoPost('telefone'));
if (strlen($telefone) < 10 || strlen($telefone) > 11) {
    responderErro("Confira o campo \"Telefone\".", 'telefone');
}
$reserva         = soDigitos(campoPost('telefone-reserva'));
if ($reserva !== '' && (strlen($reserva) < 10 || strlen($reserva) > 11)) {
    responderErro("Confira o campo \"Telefone reserva\".", 'telefone-reserva');
}
$reserva         = $reserva !== '' ? $reserva : null;

// ---------- Etapa 2: endereço ----------
$cep             = soDigitos(campoPost('cep'));
if (strlen($cep) !== 8) {
    responderErro("Confira o campo \"CEP\".", 'cep');
}
$logradouro      = texto('logradouro', 'Logradouro', 1, 150);
$numero          = texto('numero', 'Número', 1, 10);
$complemento     = campoPost('complemento');
if (mb_strlen($complemento) > 100) {
    responderErro("Confira o campo \"Complemento\".", 'complemento');
}
$complemento     = $complemento !== '' ? $complemento : null;
$bairro          = texto('bairro', 'Bairro', 1, 80);
$cidade          = texto('cidade', 'Cidade', 1, 80);
$ufEndereco      = escolha('uf-endereco', 'UF do endereço', UFS);

// ---------- Etapa 3: perfil socioeconômico e vínculos ----------
$estadoCivil     = escolha('estado-civil', 'Estado civil', ['solteiro','casado','divorciado','viuvo','uniao-estavel']);
$nacionalidade   = escolha('nacionalidade', 'Nacionalidade', ['brasileiro','naturalizado','estrangeiro']);
$cidadeNasc      = texto('cidade-nascimento', 'Cidade de nascimento', 1, 80);
$ufNasc          = escolha('uf-nascimento', 'UF de nascimento', UFS);

$acessibilidade  = escolha('acessibilidade', 'Acessibilidade', ['sim','nao']) === 'sim' ? 1 : 0;
$necessidade     = null;
if ($acessibilidade === 1) {
    $necessidade = texto('necessidade-acessibilidade', 'Necessidade de acessibilidade', 5, 500);
}

$situacao        = escolha('situacao-profissional', 'Situação profissional',
                           ['empregado','desempregado','autonomo','estudante','outro']);

$moraSozinho     = escolha('mora-sozinho', 'Mora sozinho', ['sim','nao']) === 'sim' ? 1 : 0;
$rendaIndividual = null;
$moradores       = null;
$rendaFamiliar   = null;
if ($moraSozinho === 1) {
    $rendaIndividual = dinheiro('renda-individual', 'Renda individual');
} else {
    $moradores = filter_var(campoPost('quantidade-moradores'), FILTER_VALIDATE_INT,
                            ['options' => ['min_range' => 2, 'max_range' => 99]]);
    if ($moradores === false) {
        responderErro("Confira o campo \"Quantidade de moradores\".", 'quantidade-moradores');
    }
    $rendaFamiliar = dinheiro('renda-familiar', 'Renda familiar');
}

$graduacaoAnt    = escolha('graduacao-anterior', 'Graduação anterior', ['sim','nao']) === 'sim' ? 1 : 0;
$outroVinculo    = escolha('outro-vinculo', 'Outro vínculo', ['sim','nao']) === 'sim' ? 1 : 0;

// ---------- Etapa 4: taxa (a isenção do vestibular vale automaticamente) ----------
$isento = ($insc['status_isencao'] === 'aprovada');

if ($isento) {
    $formaPagamento  = 'Isencao';
    $valorTaxa       = '0.00';
    $statusTaxa      = 'isenta';
    $statusMatricula = 'confirmada';
} else {
    $formaPagamento  = escolha('pagamento', 'Forma de pagamento', ['PIX']);
    $valorTaxa       = VALOR_TAXA;
    $statusTaxa      = 'pendente';
    $statusMatricula = 'aguardando_pagamento';
}

// ---------- Declaração ----------
if (campoPost('confirmacao-matricula') === '') {
    responderErro("Confirme a declaração para concluir a matrícula.", 'confirmacao-matricula');
}

// ---------- Etapa 5: os 5 documentos ----------
$docsPermitidos = [
    'doc-identificacao'            => ['pdf', 'png', 'jpg', 'jpeg'],
    'doc-certidao'                 => ['pdf', 'png', 'jpg', 'jpeg'],
    'doc-residencia'               => ['pdf', 'png', 'jpg', 'jpeg'],
    'doc-certificado-ensino-medio' => ['pdf', 'png', 'jpg', 'jpeg'],
    'doc-foto'                     => ['png', 'jpg', 'jpeg'],   // a foto não aceita PDF
];
$mimePorExt = [
    'pdf'  => 'application/pdf',
    'png'  => 'image/png',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg'
];
$tamanhoMax = 5 * 1024 * 1024; // 5 MB por arquivo

$finfo    = new finfo(FILEINFO_MIME_TYPE);
$arquivos = [];

foreach ($docsPermitidos as $campo => $extensoes) {

    $f = $_FILES[$campo] ?? null;

    if ($f && ($f['error'] === UPLOAD_ERR_INI_SIZE || $f['error'] === UPLOAD_ERR_FORM_SIZE)) {
        responderErro("Cada arquivo pode ter no máximo 5 MB.");
    }
    if (!$f || $f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) {
        responderErro("Envie todos os documentos obrigatórios (máx. 5 MB cada).");
    }
    if ($f['size'] > $tamanhoMax) {
        responderErro("Cada arquivo pode ter no máximo 5 MB.");
    }

    $ext  = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
    $mime = $finfo->file($f['tmp_name']);

    if (!in_array($ext, $extensoes, true) || $mimePorExt[$ext] !== $mime) {
        responderErro($campo === 'doc-foto'
            ? "A foto deve ser PNG ou JPG."
            : "Formato inválido. Envie PDF, PNG ou JPG.");
    }

    $arquivos[$campo] = [
        'tmp'      => $f['tmp_name'],
        'ext'      => $ext,
        'original' => mb_substr(preg_replace('/[^\p{L}\p{N}._ -]/u', '', basename($f['name'])), 0, 150)
    ];
}

// ---------- Grava no banco e guarda os arquivos ----------
// coluna => [tipo do bind, valor]
$tokenCadastro = bin2hex(random_bytes(16));   // 32 caracteres hex, só serve para UM cadastro

$linha = [
    'id_inscricoes'              => ['i', (int) $insc['id_inscricoes']],
    'nome_completo'              => ['s', $nome],
    'cpf'                        => ['s', $insc['cpf']],            // o CPF vem do vestibular
    'rg'                         => ['s', $rg],
    'orgao_expedidor'            => ['s', $orgao],
    'uf_rg'                      => ['s', $ufRg],
    'data_nascimento'            => ['s', $nascimento],
    'nome_mae'                   => ['s', $nomeMae],
    'nome_pai'                   => ['s', $nomePai],
    'email'                      => ['s', $email],
    'telefone'                   => ['s', $telefone],
    'telefone_reserva'           => ['s', $reserva],
    'cep'                        => ['s', $cep],
    'logradouro'                 => ['s', $logradouro],
    'numero'                     => ['s', $numero],
    'complemento'                => ['s', $complemento],
    'bairro'                     => ['s', $bairro],
    'cidade'                     => ['s', $cidade],
    'uf_endereco'                => ['s', $ufEndereco],
    'estado_civil'               => ['s', $estadoCivil],
    'nacionalidade'              => ['s', $nacionalidade],
    'cidade_nascimento'          => ['s', $cidadeNasc],
    'uf_nascimento'              => ['s', $ufNasc],
    'acessibilidade'             => ['i', $acessibilidade],
    'necessidade_acessibilidade' => ['s', $necessidade],
    'situacao_profissional'      => ['s', $situacao],
    'mora_sozinho'               => ['i', $moraSozinho],
    'renda_individual'           => ['s', $rendaIndividual],
    'quantidade_moradores'       => ['i', $moradores],
    'renda_familiar'             => ['s', $rendaFamiliar],
    'graduacao_anterior'         => ['i', $graduacaoAnt],
    'outro_vinculo'              => ['i', $outroVinculo],
    'forma_pagamento'            => ['s', $formaPagamento],
    'valor_taxa'                 => ['s', $valorTaxa],
    'status_taxa'                => ['s', $statusTaxa],
    'status_matricula'           => ['s', $statusMatricula],
    'id_turma'                   => ['i', (int) $insc['id_turma']], // turma reservada na aprovação
    'curso'                      => ['s', $insc['curso_turma']],    // curso e turno vêm da turma reservada
    'turno'                      => ['s', $insc['turno_turma']],    // (modalidade vem do vestibular)
    'modalidade'                 => ['s', $insc['modalidade']],
    'declaracao_aceita'          => ['i', 1],
    'token_cadastro'             => ['s', $tokenCadastro],          // link do botão do e-mail
];

$colunas   = implode(', ', array_keys($linha));
$marcas    = implode(', ', array_fill(0, count($linha), '?'));
$tipos     = implode('', array_column($linha, 0));
$valores   = array_column($linha, 1);

$pasta    = null;
$gravados = [];

try {

    mysqli_begin_transaction($link);

    $stmt = mysqli_prepare($link, "INSERT INTO matriculas ($colunas) VALUES ($marcas)");
    mysqli_stmt_bind_param($stmt, $tipos, ...$valores);
    mysqli_stmt_execute($stmt);
    $idMatricula = mysqli_insert_id($link);
    mysqli_stmt_close($stmt);

    // Pasta privada: fora de acesso direto pelo navegador
    $base  = __DIR__ . '/../uploads_matricula';
    $pasta = $base . '/' . $idMatricula;

    if (!is_dir($pasta) && !mkdir($pasta, 0750, true)) {
        throw new RuntimeException("Não foi possível criar a pasta de documentos.");
    }
    if (!file_exists($base . '/.htaccess')) {
        file_put_contents($base . '/.htaccess', "Require all denied\n");
    }

    $stmtDoc = mysqli_prepare($link,
        "INSERT INTO matricula_documentos (id_matricula, tipo, arquivo, nome_original) VALUES (?, ?, ?, ?)");

    foreach ($arquivos as $campo => $a) {
        $nomeArquivo = $campo . '-' . bin2hex(random_bytes(8)) . '.' . $a['ext'];
        $destino     = $pasta . '/' . $nomeArquivo;

        if (!move_uploaded_file($a['tmp'], $destino)) {
            throw new RuntimeException("Falha ao salvar o arquivo $campo.");
        }
        $gravados[] = $destino;

        $original = $a['original'] !== '' ? $a['original'] : $campo . '.' . $a['ext'];
        mysqli_stmt_bind_param($stmtDoc, "isss", $idMatricula, $campo, $nomeArquivo, $original);
        mysqli_stmt_execute($stmtDoc);
    }
    mysqli_stmt_close($stmtDoc);

    mysqli_commit($link);

} catch (Throwable $e) {

    mysqli_rollback($link);

    foreach ($gravados as $arq) {
        @unlink($arq);
    }
    if ($pasta && is_dir($pasta)) {
        @rmdir($pasta);
    }

    // id_inscricoes é UNIQUE: segunda matrícula da mesma inscrição
    if ($e instanceof mysqli_sql_exception && $e->getCode() === 1062) {
        responderErro("A matrícula desta inscrição já foi realizada.");
    }

    error_log("matricula salvar: " . $e->getMessage());
    http_response_code(500);
    responderErro("Não foi possível concluir sua matrícula. Tente novamente.");
}

// ---------- E-mail (depois de gravar, para um problema no SMTP não desfazer a matrícula) ----------
require_once __DIR__ . '/../mailer.php';

$nomeHtml  = htmlspecialchars($nome, ENT_QUOTES, 'UTF-8');
$cursoHtml = htmlspecialchars((string) $insc['curso_turma'], ENT_QUOTES, 'UTF-8');

// Botão que leva ao cadastro (o token identifica a matrícula e só vale uma vez)
$linkCadastro = URL_CADASTRO . '?t=' . urlencode($tokenCadastro);
$botao = '<p style="margin:28px 0;text-align:center;">'
       . '<a href="' . htmlspecialchars($linkCadastro, ENT_QUOTES, 'UTF-8') . '" '
       . 'style="background:#7b2fbf;color:#ffffff;text-decoration:none;padding:14px 28px;'
       . 'border-radius:8px;font-weight:bold;display:inline-block;">Criar meu acesso</a></p>'
       . '<p style="font-size:12px;color:#666;">Se o botão não abrir, copie este endereço no navegador:<br>'
       . htmlspecialchars($linkCadastro, ENT_QUOTES, 'UTF-8') . '</p>';

if ($isento) {

    $assunto = "Matrícula confirmada - Nebula";
    $corpo   = "<p>Olá, <strong>$nomeHtml</strong>!</p>"
             . "<p>Você foi inscrito no curso de <strong>$cursoHtml</strong>: sua matrícula foi <strong>confirmada</strong> "
             . "e a taxa está isenta, conforme a isenção concedida no vestibular.</p>"
             . "<p>Agora você já tem acesso ao cadastro. Clique no botão abaixo e crie seu acesso "
             . "com o e-mail e a senha que preferir.</p>"
             . $botao
             . "<p>Atenciosamente,<br>Equipe Nebula</p>";

} else {

    $assunto = "Matrícula recebida - Nebula";
    $corpo   = "<p>Olá, <strong>$nomeHtml</strong>!</p>"
             . "<p>Você foi inscrito no curso de <strong>$cursoHtml</strong>. Sua matrícula será confirmada "
             . "após o pagamento da taxa de matrícula "
             . "(<strong>R$ 130,00</strong>, vencimento em " . VENCIMENTO_TAXA . ").</p>"
             . "<p>Enquanto isso, você já pode criar seu acesso: clique no botão abaixo e cadastre "
             . "o e-mail e a senha que preferir.</p>"
             . $botao
             . "<p>Atenciosamente,<br>Equipe Nebula</p>";
}

$enviado = enviarEmail($email, $nome, $assunto, $corpo);

echo json_encode([
    "sucesso"          => true,
    "status_matricula" => $statusMatricula,
    "email_enviado"    => $enviado
]);
