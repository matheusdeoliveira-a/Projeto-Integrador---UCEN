<?php
header("Content-type: application/json;charset=utf-8");

// Mesmo cookie protegido do login. Precisa vir ANTES do session_start()
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'httponly' => true,
    'samesite' => 'Lax'
]);
session_start();

// Erros do mysqli viram exceção (capturadas no try/catch lá embaixo)
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

include_once(__DIR__ . "/../connect_nebula.php");
mysqli_set_charset($link, "utf8mb4");

function responderErro($mensagem, $campo = null) {
    echo json_encode(["sucesso" => false, "erro" => $mensagem, "campo" => $campo]);
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

// Opções aceitas (têm que ser iguais aos value dos radios do HTML)
$cursosValidos = [
    'Astronomia', 'Geofísica', 'Astrofísica', 'Ciências Atmosféricas',
    'Engenharia Aeroespacial', 'Engenharia Elétrica', 'Física', 'Matemática',
    'Ciências da Computação', 'Engenharia de Telecomunicações'
];
$turnosValidos      = ['Matutino', 'Vespertino', 'Noturno'];
$modalidadesValidas = ['Presencial', 'Online'];
$ensinosValidos     = ['Publica', 'Privada Regular', 'Privada Bolsa'];

$etapa = filter_var($_POST['etapa'] ?? '', FILTER_VALIDATE_INT);

// Os dados da inscrição ficam SÓ na sessão (servidor) até o pagamento / envio da isenção
$rascunho = $_SESSION['inscricao'] ?? null;

try {

    // ==================== ETAPA 1: dados pessoais ====================
    if ($etapa === 1) {

        $nome       = campoPost('nome-completo');
        $cpf        = preg_replace('/\D/', '', campoPost('cpf'));
        $nascimento = campoPost('data-nascimento');
        $email      = campoPost('email');
        $telefone   = preg_replace('/\D/', '', campoPost('telefone'));
        $reserva    = preg_replace('/\D/', '', campoPost('telefone-reserva'));

        if ($nome === '' || mb_strlen($nome) > 120) {
            responderErro("Informe o nome completo (até 120 caracteres).", "nome-completo");
        }
        if (!cpfValido($cpf)) {
            responderErro("CPF inválido.", "cpf");
        }

        $data = DateTime::createFromFormat('Y-m-d', $nascimento);
        if (!$data || $data->format('Y-m-d') !== $nascimento
            || $data > new DateTime('today') || $data < new DateTime('1900-01-01')) {
            responderErro("Data de nascimento inválida.", "data-nascimento");
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 120) {
            responderErro("Informe um e-mail válido.", "email");
        }
        if (!preg_match('/^\d{10,11}$/', $telefone)) {
            responderErro("Telefone inválido. Informe DDD + número.", "telefone");
        }

        // Telefone reserva é opcional: vazio vira NULL, preenchido precisa ser válido
        if ($reserva === '') {
            $reserva = null;
        } elseif (!preg_match('/^\d{10,11}$/', $reserva)) {
            responderErro("Telefone reserva inválido. Informe DDD + número.", "telefone-reserva");
        }

        // Avisa já aqui se CPF / e-mail / telefone já estão inscritos (nada é gravado ainda)
        $stmt = mysqli_prepare($link,
            "SELECT id_inscricoes, status_isencao,
                    cpf = ? AS mesmo_cpf, email = ? AS mesmo_email, telefone = ? AS mesmo_telefone
               FROM inscricoes
              WHERE cpf = ? OR email = ? OR telefone = ?");
        mysqli_stmt_bind_param($stmt, "ssssss", $cpf, $email, $telefone, $cpf, $email, $telefone);
        mysqli_stmt_execute($stmt);
        $res = mysqli_stmt_get_result($stmt);
        $conflitos = mysqli_fetch_all($res, MYSQLI_ASSOC);
        mysqli_stmt_close($stmt);

        // Cada passagem pela etapa 1 recalcula se é uma nova tentativa de isenção
        unset($_SESSION['inscricao']['reenvio_id']);

        if (count($conflitos) === 1 && $conflitos[0]['mesmo_cpf'] && $conflitos[0]['status_isencao'] === 'recusada') {

            // Mesma pessoa, isenção recusada: deixa seguir. Se ainda tiver tentativas, o
            // finalizar atualiza ESTA inscrição; se acabaram, só consegue pagar a taxa.
            $_SESSION['inscricao']['reenvio_id'] = (int) $conflitos[0]['id_inscricoes'];

        } else {

            foreach ($conflitos as $linha) {
                if ($linha['mesmo_cpf']) {
                    if ($linha['status_isencao'] === 'em_analise') {
                        responderErro("Sua isenção já está em análise pelo suporte. Você receberá o resultado por e-mail.", "cpf");
                    }
                    if ($linha['status_isencao'] === 'aprovada') {
                        responderErro("Sua isenção já foi aprovada e sua inscrição está confirmada.", "cpf");
                    }
                    responderErro("Já existe uma inscrição com este CPF.", "cpf");
                }
                if ($linha['mesmo_email'])    { responderErro("Já existe uma inscrição com este e-mail.", "email"); }
                if ($linha['mesmo_telefone']) { responderErro("Já existe uma inscrição com este telefone.", "telefone"); }
            }
        }

        // Só guarda na SESSÃO. O banco só recebe depois do pagamento / envio da isenção
        $_SESSION['inscricao']['pessoais'] = [
            'nome' => $nome, 'cpf' => $cpf, 'nascimento' => $nascimento,
            'email' => $email, 'telefone' => $telefone, 'reserva' => $reserva
        ];

        echo json_encode(["sucesso" => true]);
        exit;
    }

    // As etapas 2 e 3 só fazem sentido depois da etapa 1
    if (($etapa === 2 || $etapa === 3) && empty($rascunho['pessoais'])) {
        responderErro("Sua sessão expirou. Recarregue a página e comece a inscrição novamente.");
    }

    // ==================== ETAPA 2: curso, turno e modalidade ====================
    if ($etapa === 2) {

        $curso1     = campoPost('curso-opcao1');
        $curso2     = campoPost('curso-opcao2');
        $turno1     = campoPost('turno-opcao1');
        $turno2     = campoPost('turno-opcao2');
        $modalidade = campoPost('modalidade');

        if (!in_array($curso1, $cursosValidos, true))        responderErro("Escolha o curso da 1ª opção.", "curso-opcao1");
        if (!in_array($curso2, $cursosValidos, true))        responderErro("Escolha o curso da 2ª opção.", "curso-opcao2");
        if (!in_array($turno1, $turnosValidos, true))        responderErro("Escolha o turno da 1ª opção.", "turno-opcao1");
        if (!in_array($turno2, $turnosValidos, true))        responderErro("Escolha o turno da 2ª opção.", "turno-opcao2");
        if (!in_array($modalidade, $modalidadesValidas, true)) responderErro("Escolha a modalidade.", "modalidade");

        // A 2ª opção precisa ser diferente da 1ª (a tela já bloqueia, mas aqui é a proteção de verdade)
        if ($curso1 === $curso2) responderErro("O curso da 2ª opção deve ser diferente do curso da 1ª opção.", "curso-opcao2");
        if ($turno1 === $turno2) responderErro("O turno da 2ª opção deve ser diferente do turno da 1ª opção.", "turno-opcao2");

        $_SESSION['inscricao']['jornada'] = [
            'curso1' => $curso1, 'curso2' => $curso2,
            'turno1' => $turno1, 'turno2' => $turno2,
            'modalidade' => $modalidade
        ];

        echo json_encode(["sucesso" => true]);
        exit;
    }

    // ==================== ETAPA 3: ensino médio ====================
    if ($etapa === 3) {

        $ensino = campoPost('ensino-medio');

        if (!in_array($ensino, $ensinosValidos, true)) {
            responderErro("Escolha o tipo de instituição do Ensino Médio.", "ensino-medio");
        }

        if (empty($rascunho['jornada'])) {
            responderErro("Sua sessão expirou. Recarregue a página e comece a inscrição novamente.");
        }

        $_SESSION['inscricao']['ensino_medio'] = $ensino;

        echo json_encode(["sucesso" => true]);
        exit;
    }

    responderErro("Etapa inválida.");

} catch (mysqli_sql_exception $e) {

    error_log("salvar inscricao: " . $e->getMessage());
    http_response_code(500);
    responderErro("Não foi possível processar sua inscrição. Tente novamente.");

}