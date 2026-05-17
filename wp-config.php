<?php
/**
 * CloudPress WordPress 설정 (자동 생성)
 * DB: GitHub 레포 내 _db/wordpress.db (SQLite)
 */

// ── SQLite 연동 (sqlite-database-integration 플러그인) ──
define( 'DB_NAME',     'wordpress' );
define( 'DB_USER',     'root' );
define( 'DB_PASSWORD', '' );
define( 'DB_HOST',     'localhost' );
define( 'DB_CHARSET',  'utf8mb4' );
define( 'DB_COLLATE',  '' );
define( 'table_prefix', 'wp_' );

// SQLite 플러그인 설정
define( 'SQLITE_DB_DIR',  __DIR__ . '/_db/' );
define( 'SQLITE_DB_FILE', 'wordpress.db' );

// ── 인증 키/솔트 ──
define( 'AUTH_KEY',         'c7vjpgdckbjr4p6585bcyp2w4rkbt09j3z3lwnwgtacls3zwmfg0f6mvvofb03rs' );
define( 'SECURE_AUTH_KEY',  'ita03yjkmxufqutag52xlz64v8swpn76bma17amdnv8nngr11tebqobmjq19bk9e' );
define( 'LOGGED_IN_KEY',    '2bridm2az7iavjotburzrw3v7fb55b9epeqnipmr0za2v5i0cmnualaln4ot17et' );
define( 'NONCE_KEY',        '4lwz1x9c6xw9aj5s58lnofqgwx5ptlk2qof1om7m538wljnbk5bobw2knv89qo3l' );
define( 'AUTH_SALT',        '3ksbgnagi6k9c1bup00ms230k9vhay8gm3e0wvy99c5olr3g4ay6y35rrocp2c08' );
define( 'SECURE_AUTH_SALT', 'yrm6bwuxb6q7z4aqeliue5ug01eqzg5r0nbsm5e9jr96k14er2rgjczv5kvzbxwj' );
define( 'LOGGED_IN_SALT',   'o151in0eqckwa59f0fgill35mhccy7799q8undfe41j7shcqtrxetucp2pzngci5' );
define( 'NONCE_SALT',       'uc6rhv0zh2pz8bceo21p5q9ql50msb33i8qhsgedsdw5zw0ph5yovx638tigkb8h' );

// ── URL 설정 ──
define( 'WP_HOME',    'https://cp-e9fb2779-wp.workers.dev' );
define( 'WP_SITEURL', 'https://cp-e9fb2779-wp.workers.dev' );

// ── 기타 ──
define( 'WP_DEBUG',        false );
define( 'WP_CACHE',        true  );
define( 'WP_AUTO_UPDATE_CORE', false );
define( 'DISALLOW_FILE_EDIT',  false );

if ( ! defined( 'ABSPATH' ) ) {
  define( 'ABSPATH', __DIR__ . '/' );
}
require_once ABSPATH . 'wp-settings.php';
