<?php
// config.sample.php — скопируйте в config.php и отредактируйте
return [
    'recipient'      => 'info@raznamebel.ru', // email получателя заявок
    'subject_prefix' => 'Заявка с сайта Мебель-Проект',
    'rate_limit'     => 5,   // макс. заявок за час на IP
    'max_files'      => 3,   // макс. файлов в заявке
    'max_file_size'  => 5 * 1024 * 1024, // 5 МБ на файл
    'allowed_mime'   => ['image/jpeg','image/png','image/webp','application/pdf'],
];