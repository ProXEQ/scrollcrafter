<?php

namespace ScrollCrafter\Assets;

if ( ! defined( "ABSPATH" ) ) {
    exit;
}
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
        add_filter( 'script_loader_tag', [ $this, 'add_defer_attribute' ], 10, 2 );
        add_filter( 'wp_resource_hints', [ $this, 'add_resource_hints' ], 10, 2 );
    }

    public function register_frontend_assets(): void
    {
        if ( wp_script_is( 'scrollcrafter-gsap', 'registered' ) ) {
            return;
        }

        $config = Config::instance();
        $mode   = $config->get_gsap_mode();

        if ( 'cdn' === $mode ) {
            wp_register_script('scrollcrafter-gsap', 'https://cdn.jsdelivr.net/npm/gsap@' . self::GSAP_VERSION . '/dist/gsap.min.js', [], null, true);
            wp_register_script('scrollcrafter-gsap-scrolltrigger', 'https://cdn.jsdelivr.net/npm/gsap@' . self::GSAP_VERSION . '/dist/ScrollTrigger.min.js', ['scrollcrafter-gsap'], null, true);
            wp_register_script('scrollcrafter-gsap-text', 'https://cdn.jsdelivr.net/npm/gsap@' . self::GSAP_VERSION . '/dist/TextPlugin.min.js', ['scrollcrafter-gsap'], null, true);
            wp_register_script('scrollcrafter-gsap-splittext', 'https://cdn.jsdelivr.net/npm/gsap@' . self::GSAP_VERSION . '/dist/SplitText.min.js', ['scrollcrafter-gsap'], null, true);
        } else {
            wp_register_script('scrollcrafter-gsap', SCROLLCRAFTER_URL . 'assets/vendor/gsap/gsap.min.js', [], SCROLLCRAFTER_VERSION, true);
            wp_register_script('scrollcrafter-gsap-scrolltrigger', SCROLLCRAFTER_URL . 'assets/vendor/gsap/ScrollTrigger.min.js', ['scrollcrafter-gsap'], SCROLLCRAFTER_VERSION, true);
            wp_register_script('scrollcrafter-gsap-text', SCROLLCRAFTER_URL . 'assets/vendor/gsap/TextPlugin.min.js', ['scrollcrafter-gsap'], SCROLLCRAFTER_VERSION, true);
            wp_register_script('scrollcrafter-gsap-splittext', SCROLLCRAFTER_URL . 'assets/vendor/gsap/SplitText.min.js', ['scrollcrafter-gsap'], SCROLLCRAFTER_VERSION, true);
        }

        // Register Lenis for smooth scrolling (Pro feature)
        wp_register_script(
            'scrollcrafter-lenis',
            SCROLLCRAFTER_URL . 'assets/vendor/lenis/lenis.min.js',
            [],
            '1.1.18',
            true
        );

        wp_register_script(
            'scrollcrafter-frontend',
            SCROLLCRAFTER_URL . 'assets/js/frontend.bundle.js',
            [ 'scrollcrafter-gsap-scrolltrigger', 'wp-i18n' ],
            SCROLLCRAFTER_VERSION,
            true
        );

        wp_set_script_translations( 'scrollcrafter-frontend', 'scrollcrafter', SCROLLCRAFTER_PATH . 'languages' );

        // Build smooth scroll config for Pro users
        $smooth_scroll_config = false;
        if ( sc_is_pro() && $config->get('smooth_scroll') ) {
            $smooth_scroll_config = [
                'enabled' => true,
                'options' => [
                    'lerp' => (float) $config->get('smooth_scroll_lerp', 0.1),
                ]
            ];
        }

        wp_localize_script(
            'scrollcrafter-frontend',
            'ScrollCrafterConfig',
            [   
                'debug'       => $config->is_debug(),
                'breakpoints' => $config->get_frontend_breakpoints(),
                'enableEditorAnimations' => (bool)$config->get('enable_editor_animations'),
                'isPro'       => sc_is_pro(),
                'smoothScroll' => $smooth_scroll_config,
            ]
        );
    }

    public function enqueue_frontend_assets(): void
    {
        if ( is_admin() ) {
            return;
        }

        $analysis = $this->analyze_page_requirements();
        if ( ! $analysis['should_load'] ) {
            return;
        }

        wp_enqueue_script( 'scrollcrafter-gsap' );
        wp_enqueue_script( 'scrollcrafter-gsap-scrolltrigger' );
        
        if ( $analysis['needs_text'] ) {
            wp_enqueue_script( 'scrollcrafter-gsap-text' );
        }
        if ( $analysis['needs_split'] ) {
            wp_enqueue_script( 'scrollcrafter-gsap-splittext' );
        }

        // Load Lenis for Pro users with smooth scroll enabled
        $config = Config::instance();
        if ( sc_is_pro() && $config->get('smooth_scroll') ) {
            wp_enqueue_script( 'scrollcrafter-lenis' );
        }

        wp_enqueue_script( 'scrollcrafter-frontend' );
    }

    private function analyze_page_requirements(): array
    {
        $res = [ 'should_load' => false, 'needs_text' => false, 'needs_split' => false ];

        // 1. Always load in Elementor Editor / Preview
        if ( \Elementor\Plugin::$instance->preview->is_preview_mode() || \Elementor\Plugin::$instance->editor->is_edit_mode() ) {
            $res['should_load'] = true;
            $res['needs_text']  = true;
            $res['needs_split'] = true;
            return $res;
        }

        // 2. Only check on Singular (posts/pages) for now
        if ( ! is_singular() ) {
             return $res; 
        }

        global $post;
        if ( ! $post instanceof \WP_Post ) {
            return $res;
        }

        // 3. Check Elementor Data in Meta (Smart Scanning)
        $elementor_data = get_post_meta( $post->ID, '_elementor_data', true );

        if ( is_string($elementor_data) && (
             false !== strpos( $elementor_data, 'scrollcrafter_enable' ) ||
             false !== strpos( $elementor_data, 'scrollcrafter_script' ) 
           ) ) {
            $res['should_load'] = true;
            $res['needs_split'] = ( false !== strpos( $elementor_data, 'split:' ) || false !== strpos( $elementor_data, 'SplitText' ) );
            $res['needs_text']  = ( false !== strpos( $elementor_data, 'text:' ) || false !== strpos( $elementor_data, 'TextPlugin' ) );
        }

        return $res;
    }

    public function add_defer_attribute( $tag, $handle ) {
        if ( 0 === strpos( $handle, 'scrollcrafter-' ) ) {
            if ( false === strpos( $tag, 'defer' ) ) {
                return str_replace( ' src', ' defer src', $tag );
            }
        }
        return $tag;
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
                'rest_url'    => esc_url_raw( rest_url() ),
                'rest_nonce'  => wp_create_nonce( 'wp_rest' ),
                'breakpoints' => $config->get_frontend_breakpoints(),
                'enableEditorAnimations' => (bool)$config->get('enable_editor_animations'),
                'isPro'       => sc_is_pro(),
            ]
        );
        
        wp_enqueue_style(
            'scrollcrafter-editor',
            SCROLLCRAFTER_URL . 'assets/css/scrollcrafter-editor.css',
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

    public function add_resource_hints( $hints, $relation_type ) {
        if ( 'preload' === $relation_type && ! is_admin() ) {
            $analysis = $this->analyze_page_requirements();
            if ( $analysis['should_load'] ) {
                $config = Config::instance();
                $mode   = $config->get_gsap_mode();
                $url    = '';

                if ( 'cdn' === $mode ) {
                    $url = 'https://cdn.jsdelivr.net/npm/gsap@' . self::GSAP_VERSION . '/dist/gsap.min.js';
                } else {
                    $url = SCROLLCRAFTER_URL . 'assets/vendor/gsap/gsap.min.js';
                }

                if ( $url ) {
                    $hints[] = [
                        'href'        => $url,
                        'as'          => 'script',
                        'crossorigin' => 'anonymous',
                    ];
                }
            }
        }
        return $hints;
    }

}
