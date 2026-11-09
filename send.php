<?php
/**
 * send.php — приём заявок с форм лендинга «Мебель-Проект».
 * PHP ≥8.0. Без зависимостей, только mail().
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Метод не разрешён']);
    exit;
}

// ---- Загрузка конфига ----
$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Конфиг не найден']);
    exit;
}
$config = require $configFile;

// ---- Honeypot ----
if (!empty($_POST['website'] ?? '')) {
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'OK']);
    exit;
}

// ---- Лимит частоты (5 заявок/час на IP) ----
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = sys_get_temp_dir() . '/mebel_rate_' . md5($ip) . '.json';
$now = time();
$window = 3600;
$limit = $config['rate_limit'] ?? 5;

$history = [];
if (file_exists($rateFile)) {
    $data = json_decode(file_get_contents($rateFile), true) ?? [];
    foreach ($data as $ts) {
        if ($now - $ts < $window) {
            $history[] = (int)$ts;
        }
    }
}
$history[] = $now;
file_put_contents($rateFile, json_encode($history));

if (count($history) > $limit) {
    http_response_code(429);
    echo json_encode(['success' => false, 'message' => 'Слишком много заявок. Попробуйте позже.']);
    exit;
}

// ---- Сбор полей ----
$name    = trim($_POST['name']    ?? '');
$phone   = trim($_POST['phone']   ?? '');
$source  = trim($_POST['source']  ?? '');
$message = trim($_POST['message'] ?? '');

// Валидация телефона (10 цифр после +7)
$digits = preg_replace('/\D/', '', $phone);
if (!preg_match('/^7\d{10}$/', $digits)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Неверный формат телефона']);
    exit;
}

// ---- Файлы ----
$uploadDir = sys_get_temp_dir() . '/mebel_uploads_' . uniqid('', true);
$attachments = [];
$maxFiles  = $config['max_files'] ?? 3;
$maxSize   = $config['max_file_size'] ?? 5 * 1024 * 1024;
$allowed   = $config['allowed_mime'] ?? [];

if (!empty($_FILES['photos']['name'][0])) {
    $files = $_FILES['photos'];
    $count = count($files['name']);
    if ($count > $maxFiles) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Максимум ' . $maxFiles . ' файла']);
        exit;
    }
    foreach ($files['name'] as $i => $name) {
        $tmp   = $files['tmp_name'][$i];
        $size  = $files['size'][$i];
        $error = $files['error'][$i];
        if ($error !== UPLOAD_ERR_OK) continue;
        if ($size > $maxSize) continue;

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime  = $finfo->file($tmp);
        if (!in_array($mime, $allowed, true)) continue;

        $dest = $uploadDir . '/' . basename($name);
        if (move_uploaded_file($tmp, $dest)) {
            $attachments[] = $dest;
        }
    }
    if (!is_dir($uploadDir) && count($attachments) === 0 && $count > 0) {
        // все файлы отвергнуты — не ошибка, просто без вложений
    }
}

// ---- Тема письма ----
$subjectMap = [
    'offer'    => 'Источник: Спецпредложение (скидка 10% на первый заказ)',
    'measurer' => 'Источник: Замер / расчёт',
    'widget'   => 'Источник: Обратный звонок',
    'hero'     => 'Источник: Главная страница',
];
$subject = $config['subject_prefix'] . ' — ' . ($subjectMap[$source] ?? $source);

// ---- Тело письма ----
$body = "Имя: $name\nТелефон: $phone\nИсточник: $source\n";
if ($message) $body .= "\nСообщение: $message\n";

// ---- Заголовки (защита от header injection) ----
$headers = [];
$headers[] = 'From: ' . $config['recipient'];
$headers[] = 'Reply-To: ' . $config['recipient'];
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-Type: text/plain; charset=utf-8';
$headers[] = 'X-Mailer: PHP/' . phpversion();

// Простое экранирование заголовков
foreach ($headers as $i => $h) {
    $headers[$i] = str_replace(["\r", "\n"], '', $h);
}

// ---- Отправка ----
$ok = mail($config['recipient'], $subject, $body, implode("\r\n", $headers));

// Очистка вложений
foreach ($attachments as $f) { @unlink($f); }
@rmdir($uploadDir);

if ($ok) {
    echo json_encode(['success' => true, 'message' => 'Заявка принята']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Ошибка сервера']);
}