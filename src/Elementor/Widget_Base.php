<?php

namespace ScrollCrafter\Elementor;

use Elementor\Widget_Base as Elementor_Widget_Base;

abstract class Widget_Base extends Elementor_Widget_Base
{
	public function get_categories(): array
	{
		// Możesz dodać własną kategorię Elementora, tutaj użyjemy common.
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
	 * @return array<string,mixed>
	 */
	abstract protected function get_config(): array;

	/**
	 * Główne renderowanie widżetu.
	 */
	protected function render(): void
	{
		$config = $this->get_config();

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
