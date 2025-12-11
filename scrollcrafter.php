<?php
/**
 * Plugin Name:       ScrollCrafter for Elementor
 * Plugin URI:        https://pixelmobs.com/scrollcrafter
 * Description:       Dodaje widżety scroll/GSAP dla Elementora (ScrollReveal i inne efekty).
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            PixelMobs
 * Author URI:        https://pixelmobs.com
 * Text Domain:       scrollcrafter
 * Domain Path:       /languages
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Stałe pluginu.
define( 'SCROLLCRAFTER_FILE', __FILE__ );
define( 'SCROLLCRAFTER_PATH', plugin_dir_path( __FILE__ ) );
define( 'SCROLLCRAFTER_URL', plugin_dir_url( __FILE__ ) );
define( 'SCROLLCRAFTER_VERSION', '0.1.0' );
define( 'SCROLLCRAFTER_MIN_WP_VERSION', '5.8' );
define( 'SCROLLCRAFTER_MIN_PHP_VERSION', '7.4' );
define( 'SCROLLCRAFTER_MIN_ELEMENTOR', '3.33.0' ); // Zakładam, że ta wersja jest prawidłowa

/**
 * Funkcja do ładowania pluginu i obsługi zależności.
 */
function scrollcrafter_load_plugin() {
    // Sprawdzenie zależności. Jeśli nie są spełnione, zatrzymaj ładowanie.
    if ( ! scrollcrafter_check_dependencies() ) {
        return;
    }

    // Autoload z Composera.
    if ( file_exists( SCROLLCRAFTER_PATH . 'vendor/autoload.php' ) ) {
        require SCROLLCRAFTER_PATH . 'vendor/autoload.php';
    }

    // Fallback prostego autoloadera PSR-4.
    spl_autoload_register(
        static function ( $class ) {
            if ( 0 !== strpos( $class, 'ScrollCrafter\\' ) ) {
                return;
            }

            $relative = substr( $class, strlen( 'ScrollCrafter\\' ) );
            $relative = str_replace( '\\', DIRECTORY_SEPARATOR, $relative );
            $file     = SCROLLCRAFTER_PATH . 'src/' . $relative . '.php';

            if ( file_exists( $file ) ) {
                require $file;
            }
        }
    );

    // Załaduj tłumaczenia.
    load_plugin_textdomain( 'scrollcrafter', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );

    // Bootstrap pluginu.
    ScrollCrafter\Plugin::instance()->boot();
}
add_action( 'plugins_loaded', 'scrollcrafter_load_plugin' );


/**
 * Sprawdza zależności przy aktywacji.
 */
function scrollcrafter_activate() {
    if ( ! scrollcrafter_check_dependencies() ) {
        // Zdezaktywuj plugin, jeśli zależności nie są spełnione.
        deactivate_plugins( plugin_basename( __FILE__ ) );
        // Opcjonalnie: Przekieruj z komunikatem
        // wp_die( 'Komunikat błędu...' );
    }
}
register_activation_hook( __FILE__, 'scrollcrafter_activate' );


/**
 * Centralna funkcja do sprawdzania zależności i wyświetlania błędów.
 *
 * @return bool True jeśli zależności są spełnione, false w przeciwnym razie.
 */
function scrollcrafter_check_dependencies() {
    // Sprawdzenie wersji PHP.
    if ( version_compare( PHP_VERSION, SCROLLCRAFTER_MIN_PHP_VERSION, '<' ) ) {
        add_action( 'admin_notices', 'scrollcrafter_php_version_notice' );
        return false;
    }

    // Sprawdzenie wersji WordPress.
    if ( version_compare( get_bloginfo( 'version' ), SCROLLCRAFTER_MIN_WP_VERSION, '<' ) ) {
        add_action( 'admin_notices', 'scrollcrafter_wp_version_notice' );
        return false;
    }
    
    // Sprawdzenie, czy Elementor jest załadowany.
    if ( ! did_action( 'elementor/loaded' ) ) {
        add_action( 'admin_notices', 'scrollcrafter_elementor_missing_notice' );
        return false;
    }

    // Sprawdzenie wersji Elementora.
    if ( ! defined( 'ELEMENTOR_VERSION' ) || version_compare( ELEMENTOR_VERSION, SCROLLCRAFTER_MIN_ELEMENTOR, '<' ) ) {
        add_action( 'admin_notices', 'scrollcrafter_elementor_version_notice' );
        return false;
    }

    return true;
}

// Funkcje do wyświetlania komunikatów (dla czystości kodu)
function scrollcrafter_php_version_notice() {
    echo '<div class="notice notice-error"><p>' . esc_html__( 'ScrollCrafter wymaga PHP w wersji co najmniej ' . SCROLLCRAFTER_MIN_PHP_VERSION, 'scrollcrafter' ) . '</p></div>';
}
function scrollcrafter_wp_version_notice() {
    echo '<div class="notice notice-error"><p>' . esc_html__( 'ScrollCrafter wymaga WordPress w wersji co najmniej ' . SCROLLCRAFTER_MIN_WP_VERSION, 'scrollcrafter' ) . '</p></div>';
}
function scrollcrafter_elementor_missing_notice() {
    echo '<div class="notice notice-error"><p>' . esc_html__( 'ScrollCrafter wymaga aktywnego pluginu Elementor.', 'scrollcrafter' ) . '</p></div>';
}
function scrollcrafter_elementor_version_notice() {
    echo '<div class="notice notice-error"><p>' . esc_html__( 'ScrollCrafter wymaga Elementora w wersji co najmniej ' . SCROLLCRAFTER_MIN_ELEMENTOR, 'scrollcrafter' ) . '</p></div>';
}
