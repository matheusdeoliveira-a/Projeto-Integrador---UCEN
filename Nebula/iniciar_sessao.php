<?php
// ==========================================================
// iniciar_sessao.php  (colocar na RAIZ, ao lado do connect_nebula.php)
// Cada portal (aluno, professor, suporte) usa um cookie de sessão
// com nome próprio, para um não derrubar a sessão do outro.
// Uso: iniciarSessao('aluno');   no lugar de   session_start();
// ==========================================================

const NOMES_SESSAO = [
    "aluno"     => "SESSAO_ALUNO",
    "professor" => "SESSAO_PROFESSOR",
    "suporte"   => "SESSAO_SUPORTE",
];

function iniciarSessao(string $portal): void {
    if (!isset(NOMES_SESSAO[$portal])) {
        throw new InvalidArgumentException("Portal inválido: " . $portal);
    }
    if (session_status() === PHP_SESSION_NONE) {
        // Cookie da sessão mais protegido (precisa vir ANTES do session_start)
        session_set_cookie_params([
            'lifetime' => 0,
            'path'     => '/',
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        session_name(NOMES_SESSAO[$portal]);
        session_start();
    }
}

// Encerra só a sessão do portal informado (as dos outros portais continuam)
function encerrarSessao(string $portal): void {
    iniciarSessao($portal);
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $p = session_get_cookie_params();
        setcookie(session_name(), "", time() - 42000, $p["path"], $p["domain"], $p["secure"], $p["httponly"]);
    }
    session_destroy();
}
