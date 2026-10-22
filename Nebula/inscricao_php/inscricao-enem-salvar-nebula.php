<?php
// Inscrição via ENEM.
//   etapa=1     -> só confere os dados pessoais e se CPF / e-mail / telefone já estão inscritos (nada é gravado)
//   etapa=final -> confere tudo de novo e grava a inscrição + o PDF do boletim do ENEM (e o laudo PcD, se houver)
//
// A inscrição do ENEM entra na MESMA tabela `inscricoes` do vestibular (ingresso = 'enem'), então o resto
// do caminho é o que já existe: suporte decide em nota-decidir -> e-mail com o link -> matrícula -> cadastro.
// Só os dados exclusivos do ENEM (RG, cidade, ano do ENEM, PcD...) vão para `inscricoes_enem_dados`.
// Os PDFs usam a tabela e a pasta do vestibular (inscricao_documentos / uploads_isencao).
header("Content-type: application/json;charset=utf-8");

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

include_once(__DIR__ . "/../connect_nebula.php");
require_once __DIR__ . '/../vestibular_nota_nebula.php';
mysqli_set_charset($link, "utf8mb4");

// Tamanho máximo de cada PDF
const TAMANHO_MAX_PDF = 5 * 1024 * 1024; // 5 MB

// Em qual etapa do formulário cada campo está (para o JS voltar até ele quando der erro)
const ETAPA_DO_CAMPO = [
    'nome-completo' => 1, 'cpf' => 1, 'rg' => 1, 'data-nascimento' => 1, 'email-principal' => 1,
    'email-secundario' => 1, 'telefone-principal' => 1, 'telefone-reserva' => 1, 'cidade' => 1, 'estado' => 1,
    'ano-enem' => 2, 'curso-opcao1' => 2, 'curso-opcao2' => 2, 'turno-opcao1' => 2, 'turno-opcao2' => 2,
    'modalidade' => 2,
    'ensino-medio' => 3, 'ppi' => 3, 'pcd' => 3, 'nome-social' => 3,
    'boletim-enem' => 4, 'laudo-pcd' => 4
];

function responderErro($mensagem, $campo = null) {
    echo json_encode([
        "sucesso" => false,
        "erro"    => $mensagem,
        "campo"   => $campo,
        "etapa"   => $campo !== null ? (ETAPA_DO_CAMPO[$campo] ?? null) : null
    ]);
    exit;
}

// Pega um campo do POST sempre como texto (evita erro se vier um array)
function campoPost($nome) {
    $valor = $_POST[$nome] ?? '';
    return is_string($valor) ? trim($valor) : '';
}

// Valida os dígitos verificadores do CPF
function cpfValido($cpf) {
    if (strlen($cpf) !== 11 || preg_match('/^(\d)\1{10}$/', $cpf)) {
        return false;
    }
    for ($t = 9; $t < 11; $t++) {
        $soma = 0;
        for ($i = 0; $i < $t; $i++) {
            $soma += $cpf[$i] * (($t + 1) - $i);
        }
        if ((int)$cpf[$t] !== ((10 * $soma) % 11) % 10) {
            return false;
        }
    }
    return true;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    responderErro("Método inválido");
}

// Se o arquivo passa do post_max_size do PHP, o PHP descarta o POST inteiro
if (empty($_POST) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    responderErro("O arquivo enviado é grande demais. Envie um PDF de até 5 MB.", 'boletim-enem');
}

// Opções aceitas (têm que ser iguais aos value dos radios / selects do HTML)
$cursosValidos = [
    'Astronomia', 'Geofísica', 'Astrofísica', 'Ciências Atmosféricas',
    'Engenharia Aeroespacial', 'Engenharia Elétrica', 'Física', 'Matemática',
    'Ciências da Computação', 'Engenharia de Telecomunicações'
];
$turnosValidos  = ['Matutino', 'Vespertino', 'Noturno'];
$modalidadesValidas = ['Presencial', 'Online'];
$anosValidos    = ['2024', '2025', '2026'];
$ensinosValidos = ['Publica', 'Bolsa', 'Privada'];
$ppiValidos     = ['Nao', 'Preta', 'Parda', 'Indigena'];
$estadosValidos = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI',
                   'RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

// ---------- Etapa 1: dados pessoais ----------
function validarPessoais() {
    global $estadosValidos;

    $d = [];
    $d['nome']       = campoPost('nome-completo');
    $d['cpf']        = preg_replace('/\D/', '', campoPost('cpf'));
    $d['rg']         = preg_replace('/\D/', '', campoPost('rg'));
    $d['nascimento'] = campoPost('data-nascimento');
    $d['email']      = campoPost('email-principal');
    $d['email2']     = campoPost('email-secundario');
    $d['telefone']   = preg_replace('/\D/', '', campoPost('telefone-principal'));
    $d['reserva']    = preg_replace('/\D/', '', campoPost('telefone-reserva'));
    $d['cidade']     = campoPost('cidade');
    $d['estado']     = campoPost('estado');

    if ($d['nome'] === '' || mb_strlen($d['nome']) > 120) {
        responderErro("Informe o nome completo (até 120 caracteres).", "nome-completo");
    }
    if (!cpfValido($d['cpf'])) {
        responderErro("CPF inválido.", "cpf");
    }
    if (!preg_match('/^\d{5,9}$/', $d['rg'])) {
        responderErro("RG inválido.", "rg");
    }

    $data = DateTime::createFromFormat('Y-m-d', $d['nascimento']);
    if (!$data || $data->format('Y-m-d') !== $d['nascimento']
        || $data > new DateTime('today') || $data < new DateTime('1900-01-01')) {
        responderErro("Data de nascimento inválida.", "data-nascimento");
    }

    if (!filter_var($d['email'], FILTER_VALIDATE_EMAIL) || mb_strlen($d['email']) > 120) {
        responderErro("Informe um e-mail válido.", "email-principal");
    }

    // E-mail secundário é opcional: vazio vira NULL, preenchido precisa ser válido
    if ($d['email2'] === '') {
        $d['email2'] = null;
    } elseif (!filter_var($d['email2'], FILTER_VALIDATE_EMAIL) || mb_strlen($d['email2']) > 120) {
        responderErro("E-mail secundário inválido.", "email-secundario");
    }

    if (!preg_match('/^\d{10,11}$/', $d['telefone'])) {
        responderErro("Telefone inválido. Informe DDD + número.", "telefone-principal");
    }

    if ($d['reserva'] === '') {
        $d['reserva'] = null;
    } elseif (!preg_match('/^\d{10,11}$/', $d['reserva'])) {
        responderErro("Telefone secundário inválido. Informe DDD + número.", "telefone-reserva");
    }

    if ($d['cidade'] === '' || mb_strlen($d['cidade']) > 80) {
        responderErro("Informe a cidade (até 80 caracteres).", "cidade");
    }
    if (!in_array($d['estado'], $estadosValidos, true)) {
        responderErro("Escolha o estado.", "estado");
    }

    return $d;
}

// Avisa se CPF / e-mail / telefone já estão inscritos (vestibular ou ENEM: é a mesma tabela)
function conferirDuplicados($link, $d) {

    $stmt = mysqli_prepare($link,
        "SELECT cpf = ? AS mesmo_cpf, email = ? AS mesmo_email, telefone = ? AS mesmo_telefone
           FROM inscricoes
          WHERE cpf = ? OR email = ? OR telefone = ?");
    mysqli_stmt_bind_param($stmt, "ssssss", $d['cpf'], $d['email'], $d['telefone'], $d['cpf'], $d['email'], $d['telefone']);
    mysqli_stmt_execute($stmt);
    $conflitos = mysqli_fetch_all(mysqli_stmt_get_result($stmt), MYSQLI_ASSOC);
    mysqli_stmt_close($stmt);

    foreach ($conflitos as $linha) {
        if ($linha['mesmo_cpf'])      { responderErro("Já existe uma inscrição com este CPF.", "cpf"); }
        if ($linha['mesmo_email'])    { responderErro("Já existe uma inscrição com este e-mail.", "email-principal"); }
        if ($linha['mesmo_telefone']) { responderErro("Já existe uma inscrição com este telefone.", "telefone-principal"); }
    }
}

// ---------- Confere um PDF enviado. Devolve os dados do arquivo ----------
function validarPdf($campo, $obrigatorio, $mensagemFaltando) {

    $f = $_FILES[$campo] ?? null;

    if (!$f || $f['error'] === UPLOAD_ERR_NO_FILE) {
        if ($obrigatorio) { responderErro($mensagemFaltando, $campo); }
        return null;
    }
    if ($f['error'] === UPLOAD_ERR_INI_SIZE || $f['error'] === UPLOAD_ERR_FORM_SIZE) {
        responderErro("O PDF é grande demais. Envie um arquivo de até 5 MB.", $campo);
    }
    if ($f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) {
        responderErro("Não foi possível receber o arquivo. Tente enviar novamente.", $campo);
    }
    if ($f['size'] <= 0 || $f['size'] > TAMANHO_MAX_PDF) {
        responderErro("O PDF deve ter no máximo 5 MB.", $campo);
    }

    // Confere a extensão, o tipo real do arquivo e a assinatura "%PDF-" (não confia só no nome)
    $ext  = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
    $cabecalho = file_get_contents($f['tmp_name'], false, null, 0, 5);

    if ($ext !== 'pdf' || $mime !== 'application/pdf' || $cabecalho !== '%PDF-') {
        responderErro("Formato inválido. Envie um arquivo PDF.", $campo);
    }

    return [
        'tmp'      => $f['tmp_name'],
        'tamanho'  => (int) $f['size'],
        // nome que a pessoa deu ao arquivo (só para o suporte reconhecer; limpo e curto)
        'original' => mb_substr(preg_replace('/[^\p{L}\p{N}._ -]/u', '', basename($f['name'])), 0, 150)
    ];
}

$etapa = campoPost('etapa');

try {

    // ==================== ETAPA 1: só confere ====================
    if ($etapa === '1') {

        $d = validarPessoais();
        conferirDuplicados($link, $d);

        echo json_encode(["sucesso" => true]);
        exit;
    }

    // ==================== FINAL: confere tudo e grava ====================
    if ($etapa !== 'final') {
        responderErro("Etapa inválida.");
    }

    $d = validarPessoais();

    // ----- Etapa 2: ENEM, cursos e turnos -----
    $ano    = campoPost('ano-enem');
    $curso1 = campoPost('curso-opcao1');
    $curso2 = campoPost('curso-opcao2');
    $turno1 = campoPost('turno-opcao1');
    $turno2 = campoPost('turno-opcao2');
    $modalidade = campoPost('modalidade');

    if (!in_array($ano, $anosValidos, true))       responderErro("Escolha o ano de realização do ENEM.", "ano-enem");
    if (!in_array($curso1, $cursosValidos, true))  responderErro("Escolha o curso da 1ª opção.", "curso-opcao1");
    if (!in_array($curso2, $cursosValidos, true))  responderErro("Escolha o curso da 2ª opção.", "curso-opcao2");
    if (!in_array($turno1, $turnosValidos, true))  responderErro("Escolha o turno da 1ª opção.", "turno-opcao1");
    if (!in_array($turno2, $turnosValidos, true))  responderErro("Escolha o turno da 2ª opção.", "turno-opcao2");
    if (!in_array($modalidade, $modalidadesValidas, true)) responderErro("Escolha a modalidade.", "modalidade");

    // A 2ª opção precisa ser diferente da 1ª (mesma regra do vestibular)
    if ($curso1 === $curso2) responderErro("O curso da 2ª opção deve ser diferente do curso da 1ª opção.", "curso-opcao2");
    if ($turno1 === $turno2) responderErro("O turno da 2ª opção deve ser diferente do turno da 1ª opção.", "turno-opcao2");

    // ----- Etapa 3: nome social e ações afirmativas (todos opcionais) -----
    $nomeSocial = null;
    if (campoPost('utiliza-nome-social') === 'sim') {
        $nomeSocial = campoPost('nome-social');
        if ($nomeSocial === '' || mb_strlen($nomeSocial) > 120) {
            responderErro("Informe o nome social (até 120 caracteres).", "nome-social");
        }
    }

    $ensino = campoPost('ensino-medio');
    $ppi    = campoPost('ppi');
    $pcd    = campoPost('pcd');

    if ($ensino === '') { $ensino = null; } elseif (!in_array($ensino, $ensinosValidos, true)) { responderErro("Opção de Ensino Médio inválida.", "ensino-medio"); }
    if ($ppi === '')    { $ppi = null; }    elseif (!in_array($ppi, $ppiValidos, true))        { responderErro("Opção de autodeclaração inválida.", "ppi"); }
    if ($pcd === '')    { $pcd = null; }    elseif (!in_array($pcd, ['Sim', 'Nao'], true))     { responderErro("Opção PcD inválida.", "pcd"); }

    // ----- Etapa 4: PDFs -----
    $boletim = validarPdf('boletim-enem', true, "Anexe o Boletim de Desempenho Individual do ENEM (PDF).");
    $laudo   = validarPdf('laudo-pcd', $pcd === 'Sim', "Anexe o laudo médico (PDF) para concorrer pelas vagas PcD.");
    if ($pcd !== 'Sim') { $laudo = null; }

    $arquivos = ['boletim-enem' => $boletim];
    if ($laudo) { $arquivos['laudo-pcd'] = $laudo; }

    conferirDuplicados($link, $d);

    $pasta    = null;
    $gravados = [];

    try {

        mysqli_begin_transaction($link);

        // ----- 1) Inscrição principal (mesma tabela e mesmas colunas do vestibular) -----
        // O ensino médio do ENEM usa outros nomes; converte para os do vestibular
        $ensinoPadrao = ['Publica' => 'Publica', 'Bolsa' => 'Privada Bolsa', 'Privada' => 'Privada Regular'];
        $ensinoInsc   = $ensino !== null ? $ensinoPadrao[$ensino] : null;

        $stmt = mysqli_prepare($link,
            "INSERT INTO inscricoes
                (nome_completo, cpf, data_nascimento, email, telefone, telefone_reserva,
                 curso_opcao1, curso_opcao2, turno_opcao1, turno_opcao2, modalidade,
                 ensino_medio, ingresso, etapa_atual)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'enem', 4)");
        mysqli_stmt_bind_param($stmt, "ssssssssssss",
            $d['nome'], $d['cpf'], $d['nascimento'], $d['email'], $d['telefone'], $d['reserva'],
            $curso1, $curso2, $turno1, $turno2, $modalidade,
            $ensinoInsc);
        mysqli_stmt_execute($stmt);
        $idInscricao = mysqli_insert_id($link);
        mysqli_stmt_close($stmt);

        // ----- 2) Dados que só existem no ENEM -----
        $stmt = mysqli_prepare($link,
            "INSERT INTO inscricoes_enem_dados
                (id_inscricoes, rg, email_secundario, cidade, estado, ano_enem, nome_social, ppi, pcd)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $anoInt = (int) $ano;
        mysqli_stmt_bind_param($stmt, "issssisss",
            $idInscricao, $d['rg'], $d['email2'], $d['cidade'], $d['estado'], $anoInt,
            $nomeSocial, $ppi, $pcd);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);

        // ----- 3) PDFs: mesma pasta privada e mesma tabela dos documentos do vestibular -----
        // (o suporte abre pelo mesmo isencao-documento-nebula.php)
        $base  = __DIR__ . '/../uploads_isencao';
        $pasta = $base . '/' . $idInscricao;

        if (!is_dir($pasta) && !mkdir($pasta, 0750, true)) {
            throw new RuntimeException("Não foi possível criar a pasta dos documentos.");
        }
        if (!file_exists($base . '/.htaccess')) {
            file_put_contents($base . '/.htaccess', "Require all denied\n");
        }

        $stmtDoc = mysqli_prepare($link,
            "INSERT INTO inscricao_documentos (id_inscricoes, tipo, arquivo, nome_original, tentativa)
             VALUES (?, ?, ?, ?, 1)");

        foreach ($arquivos as $tipo => $a) {
            $nomeArquivo = $tipo . '-' . bin2hex(random_bytes(8)) . '.pdf';
            $destino     = $pasta . '/' . $nomeArquivo;

            if (!move_uploaded_file($a['tmp'], $destino)) {
                throw new RuntimeException("Falha ao salvar o arquivo $tipo.");
            }
            $gravados[] = $destino;

            $original = $a['original'] !== '' ? $a['original'] : $tipo . '.pdf';
            mysqli_stmt_bind_param($stmtDoc, "isss", $idInscricao, $tipo, $nomeArquivo, $original);
            mysqli_stmt_execute($stmtDoc);
        }
        mysqli_stmt_close($stmtDoc);

        // ----- 4) Mesmo caminho da isenção/Pix: deixa "pendente" para o suporte decidir -----
        // $sortearNota = false: a nota do ENEM está dentro do PDF
        gerarNotaVestibular($link, $idInscricao, false);

        mysqli_commit($link);

    } catch (Throwable $e) {

        mysqli_rollback($link);

        // Apaga os arquivos que chegaram a ser gravados
        foreach ($gravados as $arq) {
            @unlink($arq);
        }
        if ($pasta && is_dir($pasta)) {
            @rmdir($pasta);
        }

        if ($e instanceof mysqli_sql_exception && (int) $e->getCode() === 1062) {
            responderErro("Já existe uma inscrição com estes dados (CPF, e-mail ou telefone).");
        }

        throw $e;
    }

    echo json_encode(["sucesso" => true]);

} catch (Throwable $e) {

    error_log("inscricao enem: " . $e->getMessage());
    http_response_code(500);
    responderErro("Não foi possível concluir sua inscrição. Tente novamente.");

}
