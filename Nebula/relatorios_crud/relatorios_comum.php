<?php
// ==========================================================
// relatorios_comum.php
// Começo comum dos endpoints do menu "Relatórios" do suporte:
// sessão do suporte, banco, permissão "relatorios" e funções de apoio.
//
// Quem entrega arquivo (relatorio_abrir.php) faz
//     define('RELATORIOS_BINARIO', true);
// ANTES do require, para este arquivo não fixar o Content-Type como JSON.
// ==========================================================
if (!defined('RELATORIOS_BINARIO')) {
    header("Content-Type: application/json; charset=utf-8");
}
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('suporte');

include_once __DIR__ . '/../connect_nebula.php';
mysqli_set_charset($link, "utf8mb4");
require_once __DIR__ . '/../suporte_permissoes.php';

// Erro inesperado (ex.: tabela ainda não criada) vira JSON
set_exception_handler(function (Throwable $e) {
    error_log("relatorios: " . $e->getMessage());
    if (!headers_sent()) {
        header("Content-Type: application/json; charset=utf-8");
    }
    http_response_code(500);
    echo json_encode(["sucesso" => false, "erro" => "Erro no servidor. Confira se o relatorios.sql foi executado."]);
});

$eu = exigirPermissao($link, 'relatorios');   // id, nome, total, menus

const CATEGORIAS_RELATORIO = ['Chamados', 'Desempenho da equipe', 'Satisfação dos usuários', 'Outro'];
const SITUACOES_EQUIPE     = ['disponivel', 'atendimento', 'ausente'];

// Pasta física dos PDFs (o .htaccess criado lá dentro bloqueia o acesso direto pela URL)
const PASTA_RELATORIOS = __DIR__ . '/uploads/relatorios';

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
}

function campo(string $nome): string {
    $v = $_POST[$nome] ?? '';
    return is_string($v) ? trim($v) : '';
}

// Número inteiro vindo do formulário; devolve null se não for um inteiro válido
function inteiro(string $nome): ?int {
    $v = campo($nome);
    return preg_match('/^\d{1,9}$/', $v) ? (int) $v : null;
}
