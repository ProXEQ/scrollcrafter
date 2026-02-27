<?php
/**
 * Plugin Name:       ScrollCrafter for Elementor
 * Plugin URI:        https://pixelmobs.com/scrollcrafter
 * Description:       Create advanced scroll-based animations visually with Elementor and GSAP.
 * Version:           1.2.2
 * Requires at least: 6.0
 * Requires PHP:      8.1
 * Author:            PixelMobs, ProXEQ
 * Author URI:        https://pixelmobs.com
 * Text Domain:       scrollcrafter
 * Domain Path:       /languages
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'SCROLLCRAFTER_FILE', __FILE__ );
define( 'SCROLLCRAFTER_PATH', plugin_dir_path( __FILE__ ) );
define( 'SCROLLCRAFTER_URL', plugin_dir_url( __FILE__ ) );
define( 'SCROLLCRAFTER_VERSION', '1.2.1' );
define( 'SCROLLCRAFTER_MIN_WP_VERSION', '6.0' );
define( 'SCROLLCRAFTER_MIN_PHP_VERSION', '8.1' );
define( 'SCROLLCRAFTER_MIN_ELEMENTOR', '3.30.0' );
/**
 * Helper to check if the user is on a Pro plan.
 * Always returns true as we are now fully open-source.
 */
if ( ! function_exists( 'sc_is_pro' ) ) {
    function sc_is_pro() {
        return true;
    }
}

/**
 * Funkcja do ładowania pluginu i obsługi zależności.
 */
function scrollcrafter_load_plugin() {

    if ( ! scrollcrafter_check_dependencies() ) {
        return;
    }

    if ( file_exists( SCROLLCRAFTER_PATH . 'vendor/autoload.php' ) ) {
        require SCROLLCRAFTER_PATH . 'vendor/autoload.php';
    }

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

    if ( class_exists( 'ScrollCrafter\Plugin' ) ) {
        ScrollCrafter\Plugin::instance()->boot();
    }
}
add_action( 'plugins_loaded', 'scrollcrafter_load_plugin', 20 );

function scrollcrafter_activate() {
    if ( version_compare( PHP_VERSION, SCROLLCRAFTER_MIN_PHP_VERSION, '<' ) ) {
         wp_die( 
             sprintf(
                 /* translators: %s: Minimum PHP version. */
                 esc_html__( 'ScrollCrafter requires PHP in version at least %s.', 'scrollcrafter' ),
                 SCROLLCRAFTER_MIN_PHP_VERSION
             )
         );
    }
}
register_activation_hook( __FILE__, 'scrollcrafter_activate' );

function scrollcrafter_check_dependencies() {
    if ( version_compare( PHP_VERSION, SCROLLCRAFTER_MIN_PHP_VERSION, '<' ) ) {
        add_action( 'admin_notices', 'scrollcrafter_php_version_notice' );
        return false;
    }

    if ( version_compare( get_bloginfo( 'version' ), SCROLLCRAFTER_MIN_WP_VERSION, '<' ) ) {
        add_action( 'admin_notices', 'scrollcrafter_wp_version_notice' );
        return false;
    }
    
    if ( ! did_action( 'elementor/loaded' ) ) {
        add_action( 'admin_notices', 'scrollcrafter_elementor_missing_notice' );
        return false;
    }

    if ( defined( 'ELEMENTOR_VERSION' ) && version_compare( ELEMENTOR_VERSION, SCROLLCRAFTER_MIN_ELEMENTOR, '<' ) ) {
        add_action( 'admin_notices', 'scrollcrafter_elementor_version_notice' );
        return false;
    }

    return true;
}

function scrollcrafter_php_version_notice() {
    $message = sprintf(
        /* translators: %s: Minimum PHP version. */
        esc_html__( 'ScrollCrafter requires PHP in version at least %s.', 'scrollcrafter' ),
        SCROLLCRAFTER_MIN_PHP_VERSION
    );
    echo '<div class="notice notice-error"><p>' . $message . '</p></div>';
}

function scrollcrafter_wp_version_notice() {
    $message = sprintf(
        /* translators: %s: Minimum WordPress version. */
        esc_html__( 'ScrollCrafter requires WordPress in version at least %s.', 'scrollcrafter' ),
        SCROLLCRAFTER_MIN_WP_VERSION
    );
    echo '<div class="notice notice-error"><p>' . $message . '</p></div>';
}

function scrollcrafter_elementor_missing_notice() {
    echo '<div class="notice notice-error"><p>' . esc_html__( 'ScrollCrafter requires an active Elementor plugin.', 'scrollcrafter' ) . '</p></div>';
}

function scrollcrafter_elementor_version_notice() {
    $message = sprintf(
        /* translators: %s: Minimum Elementor version. */
        esc_html__( 'ScrollCrafter requires Elementor in version at least %s.', 'scrollcrafter' ),
        SCROLLCRAFTER_MIN_ELEMENTOR
    );
    echo '<div class="notice notice-error"><p>' . $message . '</p></div>';
}
