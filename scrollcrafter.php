<?php
/**
 * Plugin Name:       ScrollCrafter for Elementor
 * Plugin URI:        https://pixelmobs.com/scrollcrafter
 * Description:       Dodaje widżety scroll/GSAP dla Elementora (ScrollReveal i inne efekty).
 * Version:           0.1.0
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

// Minimalne wymagania.
const SCROLLCRAFTER_MIN_WP_VERSION  = '5.8';
const SCROLLCRAFTER_MIN_PHP_VERSION = '7.4';
const SCROLLCRAFTER_MIN_ELEMENTOR   = '3.33.0';

if ( version_compare( PHP_VERSION, SCROLLCRAFTER_MIN_PHP_VERSION, '<' ) ) {
	add_action(
		'admin_notices',
		static function () {
			echo '<div class="notice notice-error"><p>';
			echo esc_html__(
				'ScrollCrafter wymaga PHP w wersji co najmniej 7.4.',
				'scrollcrafter'
			);
			echo '</p></div>';
		}
	);

	return;
}

add_action(
	'plugins_loaded',
	static function () {
		// Sprawdzenie wersji WordPress.
		global $wp_version;

		if ( version_compare( $wp_version, SCROLLCRAFTER_MIN_WP_VERSION, '<' ) ) {
			add_action(
				'admin_notices',
				static function () {
					echo '<div class="notice notice-error"><p>';
					echo esc_html__(
						'ScrollCrafter wymaga WordPress w wersji co najmniej 5.8.',
						'scrollcrafter'
					);
					echo '</p></div>';
				}
			);

			return;
		}

		// Sprawdzenie Elementora.
		if ( ! did_action( 'elementor/loaded' ) ) {
			add_action(
				'admin_notices',
				static function () {
					echo '<div class="notice notice-error"><p>';
					echo esc_html__(
						'ScrollCrafter wymaga aktywnego Elementora.',
						'scrollcrafter'
					);
					echo '</p></div>';
				}
			);

			return;
		}

		if ( ! defined( 'ELEMENTOR_VERSION' ) || version_compare( ELEMENTOR_VERSION, SCROLLCRAFTER_MIN_ELEMENTOR, '<' ) ) {
			add_action(
				'admin_notices',
				static function () {
					echo '<div class="notice notice-error"><p>';
					echo esc_html__(
						'ScrollCrafter wymaga Elementora w wersji co najmniej 3.33.0.',
						'scrollcrafter'
					);
					echo '</p></div>';
				}
			);

			return;
		}

		// Stałe pluginu.
		define( 'SCROLLCRAFTER_FILE', __FILE__ );
		define( 'SCROLLCRAFTER_PATH', plugin_dir_path( __FILE__ ) );
		define( 'SCROLLCRAFTER_URL', plugin_dir_url( __FILE__ ) );
		define( 'SCROLLCRAFTER_VERSION', '0.1.0' );

		// Autoload z Composera (opcjonalnie).
		if ( file_exists( SCROLLCRAFTER_PATH . 'vendor/autoload.php' ) ) {
			require SCROLLCRAFTER_PATH . 'vendor/autoload.php';
		}

		// Fallback prostego autoloadera PSR-4, jeśli nie używasz Composera.
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

		// Bootstrap pluginu.
		ScrollCrafter\Plugin::instance()->boot();
	}
);
