<?php

namespace ScrollCrafter\Assets;

use ScrollCrafter\Support\Config;
use ScrollCrafter\Support\Logger;


class Asset_Manager
{
    public function hooks(): void
    {
        add_action( 'wp_enqueue_scripts', [ $this, 'register_frontend_assets' ], 5 );
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_frontend_assets' ], 20 );
		Logger::log( 'Asset_Manager hooks registered', 'assets' );
	}

    public function register_frontend_assets(): void
    {
        $config = Config::instance();

        $mode = $config->get_gsap_mode(); // 'local' | 'cdn_custom' | 'cdn_gsap_docs'

        if ( 'cdn_gsap_docs' === $mode ) {
            // Tryb „jak w docs GSAP” – jsDelivr, nazwy zbliżone do przykładu.
            wp_register_script(
                'scrollcrafter-gsap',
                'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js',
                [],
                null,
                true
            );
			Logger::log( 'Registered GSAP from jsDelivr CDN', 'assets' );

            wp_register_script(
                'scrollcrafter-gsap-scrolltrigger',
                'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js',
                [ 'scrollcrafter-gsap' ],
                null,
                true
            );
			Logger::log( 'Registered ScrollTrigger from jsDelivr CDN', 'assets' );
        } elseif ( 'cdn_custom' === $mode ) {
            // Niestandardowy CDN z ustawień pluginu.
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
			Logger::log( 'Registered GSAP and ScrollTrigger from custom CDN', 'assets' );
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
			Logger::log( 'Registered local GSAP and ScrollTrigger', 'assets' );
        }

        // Frontend bundle – zawsze zależny od GSAP + ScrollTrigger.
        wp_register_script(
            'scrollcrafter-frontend',
            SCROLLCRAFTER_URL . 'assets/js/frontend.bundle.js',
            [ 'scrollcrafter-gsap-scrolltrigger' ],
            SCROLLCRAFTER_VERSION,
            true
        );
		Logger::log( 'Registered ScrollCrafter frontend bundle', 'assets' );

        wp_localize_script(
            'scrollcrafter-frontend',
            'ScrollCrafterConfig',
            [
                'debug' => $config->is_debug(),
            ]
        );
		Logger::log( 'Localized ScrollCrafterConfig for frontend', 'assets' );
    }

    public function enqueue_frontend_assets(): void
    {
        if ( is_admin() ) {
			Logger::log( 'Not enqueueing frontend assets in admin area', 'assets' );
            return;
        }

        // TODO: w następnej iteracji uzależnić to od obecności widżetów na stronie.
        wp_enqueue_script( 'scrollcrafter-gsap' );
        wp_enqueue_script( 'scrollcrafter-gsap-scrolltrigger' );
        wp_enqueue_script( 'scrollcrafter-frontend' );
		Logger::log( 'Enqueued ScrollCrafter frontend assets', 'assets' );
    }
}
