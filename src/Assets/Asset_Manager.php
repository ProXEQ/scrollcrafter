<?php

namespace ScrollCrafter\Assets;

use ScrollCrafter\Support\Config;

class Asset_Manager
{
	public function hooks(): void
	{
		add_action( 'wp_enqueue_scripts', [ $this, 'register_frontend_assets' ], 5 );
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_frontend_assets' ], 20 );
	}

	public function register_frontend_assets(): void
	{
		$config = Config::instance();

		// GSAP.
		if ( 'cdn' === $config->get_gsap_source() ) {
			wp_register_script(
				'scrollcrafter-gsap',
				$config->get_gsap_cdn_url(),
				[],
				SCROLLCRAFTER_VERSION,
				true
			);

			wp_register_script(
				'scrollcrafter-gsap-scrolltrigger',
				$config->get_scrolltrigger_cdn_url(),
				[ 'scrollcrafter-gsap' ],
				SCROLLCRAFTER_VERSION,
				true
			);
		} else {
			wp_register_script(
				'scrollcrafter-gsap',
				SCROLLCRAFTER_URL . 'assets/vendor/gsap/gsap.min.js',
				[],
				SCROLLCRAFTER_VERSION,
				true
			);

			wp_register_script(
				'scrollcrafter-gsap-scrolltrigger',
				SCROLLCRAFTER_URL . 'assets/vendor/gsap/ScrollTrigger.min.js',
				[ 'scrollcrafter-gsap' ],
				SCROLLCRAFTER_VERSION,
				true
			);
		}

		// Frontend bundle.
		wp_register_script(
			'scrollcrafter-frontend',
			SCROLLCRAFTER_URL . 'assets/js/frontend.bundle.js',
			[ 'scrollcrafter-gsap-scrolltrigger' ],
			SCROLLCRAFTER_VERSION,
			true
		);

		// Przykład globalnego configu (debug mode).
		wp_localize_script(
			'scrollcrafter-frontend',
			'ScrollCrafterConfig',
			[
				'debug' => $config->is_debug(),
			]
		);
	}

	/**
	 * Enqueue frontowych assetów tylko, jeśli na stronie są widżety ScrollCrafter.
	 *
	 * W wersji podstawowej: zawsze enqueue na front, a w kolejnych iteracjach można
	 * zawęzić to na podstawie globalnego flagowania (np. metadane posta lub filtr).
	 */
	public function enqueue_frontend_assets(): void
	{
		if ( is_admin() ) {
			return;
		}

		// TODO: w przyszłości można dodać logikę wykrywania użycia widżetów.
		wp_enqueue_script( 'scrollcrafter-gsap' );
		wp_enqueue_script( 'scrollcrafter-gsap-scrolltrigger' );
		wp_enqueue_script( 'scrollcrafter-frontend' );
	}
}
