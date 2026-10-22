<?php
// ==========================================================
// mailer.php
// Função única de envio de e-mail, reaproveitada por qualquer
// PHP do sistema que precise mandar algo (código de login,
// resultado do vestibular, etc.). Usa o PHPMailer que você já tem.
// ==========================================================

require_once __DIR__ . '/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/SMTP.php';
require_once __DIR__ . '/PHPMailer/Exception.php';
require_once __DIR__ . '/config_email.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Devolve true/false, nunca lança a exceção pra fora. Quem chama decide
// o que mostrar ao visitante, sem vazar detalhe técnico do SMTP.
// $anexos (opcional): lista de ['caminho' => arquivo no servidor, 'nome' => nome que o destinatário vê].
// Quem não passa anexos continua funcionando exatamente como antes.
function enviarEmail($destinatarioEmail, $destinatarioNome, $assunto, $corpoHtml, $corpoTexto = null, array $anexos = []) {

    $mail = new PHPMailer(true);

    try {

        $mail->isSMTP();
        $mail->Host       = EMAIL_SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = EMAIL_SMTP_USER;
        $mail->Password   = EMAIL_SMTP_PASS;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = EMAIL_SMTP_PORT;
        $mail->CharSet    = 'UTF-8';

        $mail->setFrom(EMAIL_SMTP_USER, EMAIL_REMETENTE_NOME);
        $mail->addAddress($destinatarioEmail, $destinatarioNome);

        $mail->isHTML(true);
        $mail->Subject = $assunto;
        $mail->Body    = $corpoHtml;
        $mail->AltBody = $corpoTexto ?? strip_tags(str_replace('<br>', "\n", $corpoHtml));

        foreach ($anexos as $anexo) {
            $mail->addAttachment($anexo['caminho'], $anexo['nome']);
        }

        $mail->send();
        return true;

    } catch (Exception $e) {

        error_log("Erro ao enviar e-mail: " . $mail->ErrorInfo);
        return false;

    }

}
