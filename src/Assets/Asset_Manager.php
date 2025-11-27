<?php

namespace ScrollCrafter\Assets;

use ScrollCrafter\Support\Config;
use ScrollCrafter\Support\Logger;

class Asset_Manager
{
	// Wersja bibliotek GSAP używana w pluginie (do łatwej aktualizacji).
	private const GSAP_VERSION = '3.13.0';

    public function hooks(): void
    {
        add_action( 'wp_enqueue_scripts', [ $this, 'register_frontend_assets' ], 5 );
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_frontend_assets' ], 20 );
		
		// Używamy 'elementor/editor/before_enqueue_scripts', aby GSAP był dostępny jak najwcześniej
		add_action( 'elementor/editor/before_enqueue_scripts', [ $this, 'register_frontend_assets' ], 5 );
		add_action( 'elementor/editor/after_enqueue_scripts', [ $this, 'enqueue_editor_assets' ] );
		
		Logger::log( 'Asset_Manager hooks registered', 'assets' );
	}

    public function register_frontend_assets(): void
    {
		// Zapobiegaj podwójnej rejestracji
		if ( wp_script_is( 'scrollcrafter-gsap', 'registered' ) ) {
			return;
		}

		Logger::log( 'Registering ScrollCrafter frontend assets', 'assets' );

        $config = Config::instance();
        $mode   = $config->get_gsap_mode(); // 'local' | 'cdn_custom' | 'cdn_gsap_docs'

        if ( 'cdn_gsap_docs' === $mode ) {
            wp_register_script(
                'scrollcrafter-gsap',
                'https://cdn.jsdelivr.net/npm/gsap@' . self::GSAP_VERSION . '/dist/gsap.min.js',
                [],
                null,
                true
            );

            wp_register_script(
                'scrollcrafter-gsap-scrolltrigger',
                'https://cdn.jsdelivr.net/npm/gsap@' . self::GSAP_VERSION . '/dist/ScrollTrigger.min.js',
                [ 'scrollcrafter-gsap' ],
                null,
                true
            );
        } elseif ( 'cdn_custom' === $mode ) {
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
            // Tryb domyślny: lokalnie.
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

        // Frontend bundle – zawsze zależny od GSAP + ScrollTrigger.
        wp_register_script(
            'scrollcrafter-frontend',
            SCROLLCRAFTER_URL . 'assets/js/frontend.bundle.js',
            [ 'scrollcrafter-gsap-scrolltrigger' ],
            SCROLLCRAFTER_VERSION,
            true
        );

        wp_localize_script(
            'scrollcrafter-frontend',
            'ScrollCrafterConfig',
            [
                'debug' => $config->is_debug(),
            ]
        );
    }

    public function enqueue_frontend_assets(): void
    {
        if ( is_admin() ) {
            return;
        }

        // TODO: w przyszłości dodać 'Asset Deduction' (sprawdzanie czy widgety są na stronie)
        wp_enqueue_script( 'scrollcrafter-gsap' );
        wp_enqueue_script( 'scrollcrafter-gsap-scrolltrigger' );
        wp_enqueue_script( 'scrollcrafter-frontend' );
		
		Logger::log( 'Enqueued ScrollCrafter frontend assets', 'assets' );
    }

	public function enqueue_editor_assets(): void
	{
		wp_enqueue_script( 'scrollcrafter-gsap' );
		wp_enqueue_script( 'scrollcrafter-gsap-scrolltrigger' );
		wp_enqueue_script( 'scrollcrafter-frontend' );

		// Skrypty i style samego edytora (CodeMirror/Modal)
		wp_enqueue_script(
			'scrollcrafter-editor',
			SCROLLCRAFTER_URL . 'assets/js/scrollcrafter-editor.js',
			[ 'jquery', 'elementor-editor' ], // Zależności edytora
			SCROLLCRAFTER_VERSION,
			true
		);

		wp_enqueue_style(
			'scrollcrafter-editor',
			SCROLLCRAFTER_URL . 'assets/src/editor/scrollcrafter-editor.css', // TODO: Przenieść do assets/css po buildzie
			[],
			SCROLLCRAFTER_VERSION
		);
		
		Logger::log( 'Enqueued ScrollCrafter editor assets', 'assets' );
	}
}
