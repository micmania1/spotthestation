<?php

$content = file_get_contents("http://api.open-notify.org/iss-now/v1/");
if($content)
{
	echo json_encode(json_decode($content));
	exit;
}
?>