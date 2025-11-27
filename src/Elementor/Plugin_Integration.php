<?php

namespace ScrollCrafter\Elementor;

use Elementor\Widgets_Manager;
use ScrollCrafter\Support\Logger;

/**
 * Odpowiada za rejestrację niestandardowych widgetów ScrollCrafter w Elementorze.
 * Obecnie plugin działa głównie w oparciu o Animation_Injector (rozszerzanie istniejących widgetów),
 * ale ta klasa pozostaje jako fundament pod przyszłe dedykowane moduły.
 */
class Plugin_Integration
{
	public function hooks(): void
	{
		// Rejestracja widgetów (jeśli jakieś zostaną dodane w przyszłości).
		add_action( 'elementor/widgets/register', [ $this, 'register_widgets' ] );
		
		// Assety specyficzne dla widgetów Elementora.
		add_action( 'elementor/frontend/after_enqueue_scripts', [ $this, 'enqueue_elementor_assets' ] );
	}

	public function register_widgets( Widgets_Manager $widgets_manager ): void
	{
		// Lista klas widgetów do zarejestrowania.
		// W przyszłości tutaj dodamy np. new Widgets\Three_Canvas().
		$widgets = apply_filters( 'scrollcrafter/widgets', [] );

		if ( empty( $widgets ) ) {
			return;
		}

		Logger::log( 'Registering custom Elementor widgets...', 'elementor' );

		foreach ( $widgets as $widget_class ) {
			if ( class_exists( $widget_class ) ) {
				$widgets_manager->register( new $widget_class() );
				Logger::log( "Registered widget: {$widget_class}", 'elementor' );
			}
		}
	}

	public function enqueue_elementor_assets(): void
	{
		// Miejsce na ładowanie skryptów, które są potrzebne TYLKO jeśli nasze dedykowane widgety są na stronie.
		// Obecnie logika assetów jest obsługiwana globalnie przez Asset_Manager.
	}
}
