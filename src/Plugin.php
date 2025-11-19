<?php

namespace ScrollCrafter;

use ScrollCrafter\Assets\Asset_Manager;
use ScrollCrafter\Elementor\Plugin_Integration;
use ScrollCrafter\Elementor\Controls\Animation_Injector;
use ScrollCrafter\Elementor\Frontend\Animation_Render;
use ScrollCrafter\Admin\Validation_Controller;

final class Plugin
{
	private static ?Plugin $instance = null;

	private Asset_Manager $assets;

	private Plugin_Integration $elementor;

	private Animation_Injector $animation_injector;

	private Animation_Render $animation_render;

	private Validation_Controller $validation_controller;

	private function __construct()
	{
		$this->assets = new Asset_Manager();
		$this->elementor = new Plugin_Integration();
		$this->animation_injector = new Animation_Injector();
		$this->animation_render = new Animation_Render();
		$this->validation_controller = new Validation_Controller();
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

		// Hooki dla assets.
		$this->assets->hooks();

		// Integracja z Elementorem.
		$this->elementor->hooks();

		// Kontroler walidacji skryptu (REST API).
		$this->validation_controller->hooks();

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
}
