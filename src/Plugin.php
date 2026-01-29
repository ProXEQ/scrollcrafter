<?php

namespace ScrollCrafter;

if ( ! defined( "ABSPATH" ) ) {
    exit;
}
use ScrollCrafter\Assets\Asset_Manager;
use ScrollCrafter\Elementor\Plugin_Integration;
use ScrollCrafter\Elementor\Controls\Animation_Injector;
use ScrollCrafter\Elementor\Frontend\Animation_Render;
use ScrollCrafter\Admin\Validation_Controller;
use ScrollCrafter\Admin\Settings_Page;
use ScrollCrafter\Premium\License_Manager;

final class Plugin
{
	private static ?Plugin $instance = null;

	private Asset_Manager $assets;

	private Plugin_Integration $elementor;

	private Animation_Injector $animation_injector;

	private Animation_Render $animation_render;

	private Validation_Controller $validation;

	private Settings_Page $settings;

    private License_Manager $license_manager;

	private function __construct()
	{
		$this->assets = new Asset_Manager();
		$this->elementor = new Plugin_Integration();
		$this->animation_injector = new Animation_Injector();
		$this->animation_render = new Animation_Render();
		$this->validation = new Validation_Controller();
		$this->settings = new Settings_Page();
        $this->license_manager = License_Manager::instance();
	}

	public static function instance(): Plugin
	{
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

    public function premium(): License_Manager {
        return $this->license_manager;
    }

	public function boot(): void
	{
		add_action( 'init', [ $this, 'load_textdomain' ] );

		add_filter( 
			'plugin_action_links_' . plugin_basename( SCROLLCRAFTER_FILE ), 
			[ $this, 'add_settings_link' ] 
		);

		$this->assets->hooks();

		$this->elementor->hooks();

		$this->validation->hooks();

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

		array_unshift( $links, $settings_link );

		return $links;
	}
}
