<?php

namespace ScrollCrafter\Elementor;

use Elementor\Widget_Base as Elementor_Widget_Base;

abstract class Widget_Base extends Elementor_Widget_Base
{
	public function get_categories(): array
	{
		// Możesz dodać własną kategorię Elementora, tutaj użyjemy general.
		return [ 'general' ];
	}

	public function get_script_depends(): array
	{
		$deps = [ 'scrollcrafter-frontend' ];

		/**
		 * Filtr pozwalający rozszerzyć zależności JS dla konkretnego widżetu.
		 *
		 * @param string[]    $deps
		 * @param Widget_Base $widget
		 */
		return (array) apply_filters( 'scrollcrafter/widget_script_depends', $deps, $this );
	}

	/**
	 * Zwraca konfigurację widżetu (dla JS).
	 *
	 * Uwaga: NAZWA INNA NIŻ get_config(), bo get_config()
	 * w Controls_Stack/Widget_Base Elementora jest final.
	 *
	 * @return array<string,mixed>
	 */
	abstract protected function get_widget_config_array(): array;

	/**
	 * Główne renderowanie widżetu.
	 */
	protected function render(): void
	{
		$config = $this->get_widget_config_array();

		// Bezpieczne kodowanie JSON.
		$json = wp_json_encode( $config );

		if ( ! is_string( $json ) ) {
			// Prosty fallback: nie renderuj JS-config, wyświetl content.
			$this->render_inner_content();
			return;
		}

		$json_attr = esc_attr( $json );

		echo '<div class="scrollcrafter-widget-wrapper" data-scrollcrafter-config="' . $json_attr . '">';
		$this->render_inner_content();
		echo '</div>';
	}

	/**
	 * Render treści wewnętrznej (HTML) – widżety mogą nadpisywać.
	 */
	protected function render_inner_content(): void
	{
	}
}
