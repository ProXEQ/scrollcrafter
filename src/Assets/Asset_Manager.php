<?php

namespace ScrollCrafter\Assets;

use ScrollCrafter\Support\Config;
use ScrollCrafter\Support\Logger;

class Asset_Manager
{
    private const GSAP_VERSION = '3.14.1';

    public function hooks(): void
    {
        add_action( 'wp_enqueue_scripts', [ $this, 'register_frontend_assets' ], 5 );
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_frontend_assets' ], 20 );
        
        add_action( 'elementor/editor/before_enqueue_scripts', [ $this, 'register_frontend_assets' ], 5 );
        add_action( 'elementor/editor/after_enqueue_scripts', [ $this, 'enqueue_editor_assets' ] );
    
        add_filter( 'load_script_translation_file', [ $this, 'fix_loco_js_translation_path' ], 10, 3 );
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
            Logger::log( 'Registering ScrollCrafter frontend assets from GSAP CDN', 'assets' );
            wp_register_script('scrollcrafter-gsap', 'https://cdn.jsdelivr.net/npm/gsap@' . self::GSAP_VERSION . '/dist/gsap.min.js', [], null, true);
            wp_register_script('scrollcrafter-gsap-scrolltrigger', 'https://cdn.jsdelivr.net/npm/gsap@' . self::GSAP_VERSION . '/dist/ScrollTrigger.min.js', ['scrollcrafter-gsap'], null, true);
            wp_register_script('scrollcrafter-gsap-text', 'https://cdn.jsdelivr.net/npm/gsap@' . self::GSAP_VERSION . '/dist/TextPlugin.min.js', ['scrollcrafter-gsap'], null, true);
            wp_register_script('scrollcrafter-gsap-splittext', 'https://cdn.jsdelivr.net/npm/gsap@' . self::GSAP_VERSION . '/dist/SplitText.min.js', ['scrollcrafter-gsap'], null, true);
        } elseif ( 'cdn_custom' === $mode ) {
            Logger::log( 'Registering ScrollCrafter frontend assets from custom CDN', 'assets' );   
            wp_register_script('scrollcrafter-gsap', $config->get_gsap_cdn_url(), [], SCROLLCRAFTER_VERSION, true);
            wp_register_script('scrollcrafter-gsap-scrolltrigger', $config->get_scrolltrigger_cdn_url(), ['scrollcrafter-gsap'], SCROLLCRAFTER_VERSION, true);
            wp_register_script('scrollcrafter-gsap-text', $config->get_textplugin_cdn_url(), ['scrollcrafter-gsap'], SCROLLCRAFTER_VERSION, true);
            wp_register_script('scrollcrafter-gsap-splittext', $config->get_splittext_cdn_url(), ['scrollcrafter-gsap'], SCROLLCRAFTER_VERSION, true);
        } else {
            Logger::log( 'Registering ScrollCrafter frontend assets from local files', 'assets' );   
            wp_register_script('scrollcrafter-gsap', SCROLLCRAFTER_URL . 'assets/vendor/gsap/gsap.min.js', [], SCROLLCRAFTER_VERSION, true);
            wp_register_script('scrollcrafter-gsap-scrolltrigger', SCROLLCRAFTER_URL . 'assets/vendor/gsap/ScrollTrigger.min.js', ['scrollcrafter-gsap'], SCROLLCRAFTER_VERSION, true);
            wp_register_script('scrollcrafter-gsap-text', SCROLLCRAFTER_URL . 'assets/vendor/gsap/TextPlugin.min.js', ['scrollcrafter-gsap'], SCROLLCRAFTER_VERSION, true);
            wp_register_script('scrollcrafter-gsap-splittext', SCROLLCRAFTER_URL . 'assets/vendor/gsap/SplitText.min.js', ['scrollcrafter-gsap'], SCROLLCRAFTER_VERSION, true);
        }

        wp_register_script(
            'scrollcrafter-frontend',
            SCROLLCRAFTER_URL . 'assets/js/frontend.bundle.js',
            [ 'scrollcrafter-gsap-scrolltrigger', 'scrollcrafter-gsap-text', 'scrollcrafter-gsap-splittext', 'wp-i18n' ],
            SCROLLCRAFTER_VERSION,
            true
        );

        wp_set_script_translations( 'scrollcrafter-frontend', 'scrollcrafter', SCROLLCRAFTER_PATH . 'languages' );

        wp_localize_script(
            'scrollcrafter-frontend',
            'ScrollCrafterConfig',
            [   
                'debug'       => $config->is_debug(),
                'breakpoints' => $config->get_frontend_breakpoints()
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
        wp_enqueue_script( 'scrollcrafter-gsap-text' );
        wp_enqueue_script( 'scrollcrafter-gsap-splittext' );
        wp_enqueue_script( 'scrollcrafter-frontend' );
    }

    public function enqueue_editor_assets(): void
    {
        wp_enqueue_script( 'scrollcrafter-gsap' );
        wp_enqueue_script( 'scrollcrafter-gsap-scrolltrigger' );
        wp_enqueue_script( 'scrollcrafter-gsap-text' );
        wp_enqueue_script( 'scrollcrafter-gsap-splittext' );
        wp_enqueue_script( 'scrollcrafter-frontend' );

        wp_enqueue_script(
            'scrollcrafter-editor',
            SCROLLCRAFTER_URL . 'assets/js/scrollcrafter-editor.js',
            [ 'jquery', 'elementor-editor', 'wp-i18n' ], // Editor doesn't necessarily need animation plugins loaded, but good for preview if we add it later
            SCROLLCRAFTER_VERSION,
            true
        );

        wp_set_script_translations( 'scrollcrafter-editor', 'scrollcrafter', SCROLLCRAFTER_PATH . 'languages' );

        $config = Config::instance();
        wp_localize_script(
            'scrollcrafter-editor',
            'ScrollCrafterConfig',
            [
                'debug'       => $config->is_debug(),
                'breakpoints' => $config->get_frontend_breakpoints(),
            ]
        );
        
        wp_enqueue_style(
            'scrollcrafter-editor',
            SCROLLCRAFTER_URL . 'assets/src/editor/scrollcrafter-editor.css',
            [],
            SCROLLCRAFTER_VERSION
        );
    }

public function fix_loco_js_translation_path( $file, $handle, $domain ) {
    if ( 'scrollcrafter' !== $domain ) {
        return $file;
    }

    $loco_hashes = [
        'scrollcrafter-editor'   => '44e56044136a777a11967584b560f0c9',
        'scrollcrafter-frontend' => 'da52f95facaeb3dd920c163934b32653',
    ];

    if ( isset( $loco_hashes[ $handle ] ) ) {
        $locale = determine_locale();
        $new_path = SCROLLCRAFTER_PATH . "languages/scrollcrafter-{$locale}-{$loco_hashes[$handle]}.json";
        
        if ( file_exists( $new_path ) ) {
            return $new_path;
        }
    }

    return $file;
}

}
