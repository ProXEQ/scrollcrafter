<?php

namespace ScrollCrafter\Assets;

use ScrollCrafter\Support\Config;
use ScrollCrafter\Support\Logger;

class Asset_Manager
{
	private const GSAP_VERSION = '3.13.0';

    public function hooks(): void
    {
        add_action( 'wp_enqueue_scripts', [ $this, 'register_frontend_assets' ], 5 );
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_frontend_assets' ], 20 );
		
		add_action( 'elementor/editor/before_enqueue_scripts', [ $this, 'register_frontend_assets' ], 5 );
		add_action( 'elementor/editor/after_enqueue_scripts', [ $this, 'enqueue_editor_assets' ] );
		
		Logger::log( 'Asset_Manager hooks registered', 'assets' );
	}

    /**
     * Helper: Pobiera i sortuje breakpointy Elementora.
     * Używamy tego w obu metodach (frontend i editor), żeby uniknąć duplikacji kodu.
     */
    private function get_sorted_breakpoints(): array {
        if ( ! did_action( 'elementor/loaded' ) ) {
            return [];
        }

        $elementor_breakpoints = \Elementor\Plugin::$instance->breakpoints->get_active_breakpoints();
        $sorted_breakpoints = [];
        
        foreach ($elementor_breakpoints as $bp_key => $bp_instance) {
            $sorted_breakpoints[] = [
                'key' => $bp_key,
                'value' => $bp_instance->get_value(),
            ];
        }

        usort($sorted_breakpoints, function($a, $b) {
            return $a['value'] - $b['value'];
        });

        return $sorted_breakpoints;
    }

    public function register_frontend_assets(): void
    {
		if ( wp_script_is( 'scrollcrafter-gsap', 'registered' ) ) {
			return;
		}

		Logger::log( 'Registering ScrollCrafter frontend assets', 'assets' );

        $config = Config::instance();
        $mode   = $config->get_gsap_mode();

        if ( 'cdn_gsap_docs' === $mode ) {
            wp_register_script('scrollcrafter-gsap', 'https://cdn.jsdelivr.net/npm/gsap@' . self::GSAP_VERSION . '/dist/gsap.min.js', [], null, true);
            wp_register_script('scrollcrafter-gsap-scrolltrigger', 'https://cdn.jsdelivr.net/npm/gsap@' . self::GSAP_VERSION . '/dist/ScrollTrigger.min.js', ['scrollcrafter-gsap'], null, true);
        } elseif ( 'cdn_custom' === $mode ) {
            wp_register_script('scrollcrafter-gsap', $config->get_gsap_cdn_url(), [], SCROLLCRAFTER_VERSION, true);
            wp_register_script('scrollcrafter-gsap-scrolltrigger', $config->get_scrolltrigger_cdn_url(), ['scrollcrafter-gsap'], SCROLLCRAFTER_VERSION, true);
        } else {
            wp_register_script('scrollcrafter-gsap', SCROLLCRAFTER_URL . 'assets/vendor/gsap/gsap.min.js', [], SCROLLCRAFTER_VERSION, true);
            wp_register_script('scrollcrafter-gsap-scrolltrigger', SCROLLCRAFTER_URL . 'assets/vendor/gsap/ScrollTrigger.min.js', ['scrollcrafter-gsap'], SCROLLCRAFTER_VERSION, true);
        }

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
                'debug'       => $config->is_debug(),
                'breakpoints' => $this->get_sorted_breakpoints()
            ]
        );
    }

    public function enqueue_frontend_assets(): void
    {
        if ( is_admin() ) {
            return;
        }
        wp_enqueue_script( 'scrollcrafter-gsap' );
        wp_enqueue_script( 'scrollcrafter-gsap-scrolltrigger' );
        wp_enqueue_script( 'scrollcrafter-frontend' );
    }

	public function enqueue_editor_assets(): void
	{
		wp_enqueue_script( 'scrollcrafter-gsap' );
		wp_enqueue_script( 'scrollcrafter-gsap-scrolltrigger' );
		wp_enqueue_script( 'scrollcrafter-frontend' );

		wp_enqueue_script(
			'scrollcrafter-editor',
			SCROLLCRAFTER_URL . 'assets/js/scrollcrafter-editor.js',
			[ 'jquery', 'elementor-editor' ],
			SCROLLCRAFTER_VERSION,
			true
		);

        $config = Config::instance();
        wp_localize_script(
            'scrollcrafter-editor',
            'ScrollCrafterConfig',
            [
                'debug'       => $config->is_debug(),
                'breakpoints' => $this->get_sorted_breakpoints(),
            ]
        );

		wp_enqueue_style(
			'scrollcrafter-editor',
			SCROLLCRAFTER_URL . 'assets/src/editor/scrollcrafter-editor.css',
			[],
			SCROLLCRAFTER_VERSION
		);
	}
}
