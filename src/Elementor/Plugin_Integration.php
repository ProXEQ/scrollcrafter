<?php

namespace ScrollCrafter\Elementor;

use Elementor\Widgets_Manager;

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
			[
				Widgets\Scroll_Reveal::class,
				// Load more widget classes here...
			]
		);

		foreach ( $widgets as $widget_class ) {
			if ( class_exists( $widget_class ) ) {
				$widgets_manager->register( new $widget_class() );
			}
		}
	}

	public function enqueue_elementor_assets(): void
	{
		// W razie potrzeby: skrypty tylko dla edytora (panel).
	}
}
