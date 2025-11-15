<?php

namespace ScrollCrafter;

use ScrollCrafter\Assets\Asset_Manager;
use ScrollCrafter\Elementor\Plugin_Integration;

final class Plugin
{
	private static ?Plugin $instance = null;

	private Asset_Manager $assets;

	private Plugin_Integration $elementor;

	private function __construct()
	{
		$this->assets    = new Asset_Manager();
		$this->elementor = new Plugin_Integration();
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
