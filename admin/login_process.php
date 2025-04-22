<?php
include '../gitignore/config.php';

session_start();
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $sql = 'SELECT id, password FROM User WHERE username = :username';
    $username = test_input($_POST["username"]);
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':username', $username, PDO::PARAM_STR);

    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        $hashedPass = $row["password"];
        $password = $_POST["password"];
        if(password_verify($password, $hashedPass)) {
            $_SESSION['user_id'] = $row['id'];
            $_SESSION['username'] = $username;
            header("Location: /admin");
        }
    }
}

function test_input($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}
$pdo = null;