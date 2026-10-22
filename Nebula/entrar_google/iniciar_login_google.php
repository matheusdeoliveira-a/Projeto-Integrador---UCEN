<?php
// ==========================================================
// iniciar_login_google.php
// Chamado quando o visitante clica em "Continuar com Google".
// Só monta a URL de autorização do Google e redireciona pra lá.
// ==========================================================

// Sessão do portal do aluno (SESSAO_ALUNO). O cookie protegido (httponly/samesite)
// já é configurado dentro de iniciarSessao().
require_once __DIR__ . "/../iniciar_sessao.php";
iniciarSessao('aluno');

include_once(__DIR__ . "/config_google.php");

// Token aleatório contra CSRF: o Google devolve esse mesmo valor no
// callback, e só aceitamos a resposta se ele bater com o que guardamos aqui
$estado = bin2hex(random_bytes(16));
$_SESSION['estado_google'] = $estado;

$parametros = http_build_query([
    'client_id'     => GOOGLE_CLIENT_ID,
    'redirect_uri'  => GOOGLE_REDIRECT_URI,
    'response_type' => 'code',
    'scope'         => 'openid email profile',
    'state'         => $estado,
    'prompt'        => 'select_account'
]);

header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . $parametros);
exit;
