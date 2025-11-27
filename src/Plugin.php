<?php

namespace ScrollCrafter;

use ScrollCrafter\Assets\Asset_Manager;
use ScrollCrafter\Elementor\Plugin_Integration;
use ScrollCrafter\Elementor\Controls\Animation_Injector;
use ScrollCrafter\Elementor\Frontend\Animation_Render;
use ScrollCrafter\Admin\Validation_Controller;
use ScrollCrafter\Admin\Settings_Page;

final class Plugin
{
	private static ?Plugin $instance = null;

	private Asset_Manager $assets;

	private Plugin_Integration $elementor;

	private Animation_Injector $animation_injector;

	private Animation_Render $animation_render;

	private Validation_Controller $validation;

	private Settings_Page $settings;

	private function __construct()
	{
		$this->assets = new Asset_Manager();
		$this->elementor = new Plugin_Integration();
		$this->animation_injector = new Animation_Injector();
		$this->animation_render = new Animation_Render();
		$this->validation = new Validation_Controller();
		$this->settings = new Settings_Page();
	}

	public static function instance(): Plugin
	{
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	public function boot(): void
	{
		add_action( 'init', [ $this, 'load_textdomain' ] );

		// Link "Settings" na liście wtyczek
		add_filter( 
			'plugin_action_links_' . plugin_basename( SCROLLCRAFTER_FILE ), 
			[ $this, 'add_settings_link' ] 
		);

		// Hooki dla assets.
		$this->assets->hooks();

		// Integracja z Elementorem.
		$this->elementor->hooks();

		// Kontroler walidacji skryptu (REST API).
		$this->validation->hooks();

		// Strona ustawień w panelu admina.
		$this->settings->hooks();

		add_action(
			'elementor/init',
			function () {
				$this->animation_injector->hooks();
				$this->animation_render->hooks();
			}
		);
	}

	public function load_textdomain(): void
	{
		load_plugin_textdomain(
			'scrollcrafter',
			false,
			dirname( plugin_basename( SCROLLCRAFTER_FILE ) ) . '/languages'
		);
	}

	/**
	 * Dodaje link do ustawień obok "Deactivate" na liście wtyczek.
	 * 
	 * @param array $links
	 * @return array
	 */
	public function add_settings_link( array $links ): array
	{
		$settings_link = sprintf(
			'<a href="%s">%s</a>',
			esc_url( admin_url( 'options-general.php?page=scrollcrafter' ) ),
			esc_html__( 'Settings', 'scrollcrafter' )
		);

		// Dodajemy na początku tablicy
		array_unshift( $links, $settings_link );

		return $links;
	}
}
