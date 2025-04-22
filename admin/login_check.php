<?php
session_start();

// Check if the user is logged in, otherwise redirect to login page
if (!isset($_SESSION["user_id"])) {
    header("Location: /admin/login");
    exit();
} else {
    try {
        include("../../gitignore/config.php");
    } catch (Exception $e) {
        try {
            include("../gitignore/config.php");
        } catch (Exception $e) {
            include("config.php");
        }
    }
}

