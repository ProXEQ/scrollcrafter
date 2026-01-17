<?php
/**
 * Plugin Name:       ScrollCrafter for Elementor
 * Plugin URI:        https://pixelmobs.com/scrollcrafter
 * Description:       Create advanced scroll-based animations visually with Elementor and GSAP.
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
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
define( 'SCROLLCRAFTER_VERSION', '1.1.0' );
define( 'SCROLLCRAFTER_MIN_WP_VERSION', '5.8' );
define( 'SCROLLCRAFTER_MIN_PHP_VERSION', '7.4' );
define( 'SCROLLCRAFTER_MIN_ELEMENTOR', '3.10.0' );

/**
 * Create a helper function for easy SDK access.
 */
function scrollcrafter_fs() {
    global $scrollcrafter_fs;

    if ( ! isset( $scrollcrafter_fs ) ) {
        // Include Freemius SDK.
        $fs_path = dirname(__FILE__) . '/freemius/start.php';
        
        // Safety check: only load if SDK exists
        if ( ! file_exists( $fs_path ) ) {
            return null;
        }

        require_once $fs_path;

        $scrollcrafter_fs = fs_dynamic_init( array(
            'id'                  => 'YOUR_PLUGIN_ID',
            'slug'                => 'scrollcrafter',
            'type'                => 'plugin',
            'public_key'          => 'YOUR_PUBLIC_KEY',
            'is_premium'          => true, // Use true for premium version
            'has_addons'          => false,
            'has_paid_plans'      => true,
            'menu'                => array(
                'slug'           => 'scrollcrafter',
                'first-path'     => 'admin.php?page=scrollcrafter',
                'support'        => false,
            ),
        ) );
    }

    return $scrollcrafter_fs;
}

// Init Freemius.
scrollcrafter_fs();

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
