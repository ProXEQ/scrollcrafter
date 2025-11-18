<?php

namespace ScrollCrafter\Elementor;

use Elementor\Widgets_Manager;
use ScrollCrafter\Support\Logger;

class Plugin_Integration
{
	public function hooks(): void
	{
		add_action( 'elementor/widgets/register', [ $this, 'register_widgets' ] );
		add_action( 'elementor/frontend/after_enqueue_scripts', [ $this, 'enqueue_elementor_assets' ] );
	}

	public function register_widgets( Widgets_Manager $widgets_manager ): void
	{
		$widgets = apply_filters(
			'scrollcrafter/widgets',
			[]
		);
		Logger::log( 'Registering Elementor widgets: ' . implode( ', ', $widgets ), 'elementor' );

		foreach ( $widgets as $widget_class ) {
			if ( class_exists( $widget_class ) ) {
				$widgets_manager->register( new $widget_class() );
			}
		}
		Logger::log( 'Elementor widgets registered', 'elementor' );
	}

	public function enqueue_elementor_assets(): void
	{
		// W razie potrzeby: skrypty tylko dla edytora (panel).
	}
}
