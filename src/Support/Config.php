<?php

namespace ScrollCrafter\Support;

/**
 * Globalna konfiguracja pluginu ScrollCrafter.
 *
 * Obsługuje opcje:
 *  - gsap_mode / cdn urls
 *  - debug_mode
 *  - breakpoints (custom lub elementor)
 */
class Config
{
    private const OPTION_NAME = 'scrollcrafter_settings';

    /**
     * @var Config|null
     */
    private static ?Config $instance = null;

    /**
     * @var array<string,mixed>
     */
    private array $options = [];

    /**
     * Cache dla breakpointów, aby nie liczyć ich wielokrotnie.
     * @var array|null
     */
    private ?array $breakpoints_cache = null;

    private function __construct()
    {
        $this->load_options();
    }

    public static function instance(): Config
    {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    public function reload(): void
    {
        $this->load_options();
        $this->breakpoints_cache = null;
    }

    private function load_options(): void
    {
        $raw = get_option( self::OPTION_NAME, [] );

        if ( ! is_array( $raw ) ) {
            $raw = [];
        }

        $this->options = wp_parse_args( $raw, $this->get_defaults() );
    }

    private function get_defaults(): array
    {
        return [
            'gsap_mode'          => 'local',
            'gsap_cdn_url'       => 'https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js',
            'scrolltrigger_cdn'  => 'https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js',
            'debug_mode'         => false,
            'custom_breakpoints' => [],
            'enable_editor_animations' => false,
        ];
    }

    /**
     * Zwraca mapę breakpointów gotową do użycia w GSAP matchMedia.
     * Format wyjściowy: [ 'slug' => 'media_query_string' ]
     * np. [ 'mobile' => '(max-width: 767px)', 'desktop' => '(min-width: 1025px)' ]
     */
    public function get_breakpoints(): array
    {
        if ( null !== $this->breakpoints_cache ) {
            return $this->breakpoints_cache;
        }

        $custom = $this->options['custom_breakpoints'] ?? [];
        if ( ! empty( $custom ) && is_array( $custom ) ) {
            $this->breakpoints_cache = $this->format_breakpoints( $custom );
            return $this->breakpoints_cache;
        }

        if ( did_action( 'elementor/loaded' ) ) {
            $e_map = $this->get_elementor_breakpoints();
            if ( ! empty( $e_map ) ) {
                $this->breakpoints_cache = $this->format_breakpoints( $e_map );
                return $this->breakpoints_cache;
            }
        }

        $defaults = [
            'mobile' => 767,
            'tablet' => 1024,
        ];
        
        $this->breakpoints_cache = $this->format_breakpoints( $defaults );
        return $this->breakpoints_cache;
    }

    /**
     * Pobiera breakpointy z managera Elementora.
     */
    private function get_elementor_breakpoints(): array
    {
        try {
            $elementor = \Elementor\Plugin::$instance;
            
            if ( isset( $elementor->breakpoints ) ) {
                $raw = $elementor->breakpoints->get_breakpoints_config();
                $map = [];
                
                foreach ( $raw as $key => $data ) {
                    if ( isset( $data['value'] ) && is_numeric( $data['value'] ) ) {
                        $map[ $key ] = (int) $data['value'];
                    }
                }
                return $map;
            }
        } catch ( \Exception $e ) {
        }

        return [];
    }

    /**
     * Zamienia mapę [ 'slug' => pixel_value ] na query stringi GSAP.
     * Generuje też automatycznie 'desktop' jako resztę.
     */
    private function format_breakpoints( array $raw ): array
    {
        asort( $raw );

        $queries = [];
        $max_val = 0;

        foreach ( $raw as $slug => $val ) {
            $queries[ $slug ] = "(max-width: {$val}px)";
            
            if ( $val > $max_val ) {
                $max_val = $val;
            }
        }

        $desktop_min = $max_val + 1;
        $queries['desktop'] = "(min-width: {$desktop_min}px)";
        
        $queries['all'] = "(min-width: 0px)";

        return $queries;
    }


    public function get_gsap_mode(): string
    {
        $mode = $this->options['gsap_mode'] ?? 'local';
        return in_array( $mode, [ 'local', 'cdn_custom', 'cdn_gsap_docs' ], true ) ? $mode : 'local';
    }

    public function get_gsap_cdn_url(): string
    {
        return esc_url_raw( $this->options['gsap_cdn_url'] ?: 'https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js' );
    }

    public function get_scrolltrigger_cdn_url(): string
    {
        return esc_url_raw( $this->options['scrolltrigger_cdn'] ?: 'https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js' );
    }

    public function get_textplugin_cdn_url(): string
    {
        return esc_url_raw( $this->options['textplugin_cdn'] ?? 'https://cdn.jsdelivr.net/npm/gsap@3/dist/TextPlugin.min.js' );
    }

    public function get_splittext_cdn_url(): string
    {
        // Default empty or placeholder, user must provide for splittext usually, but we have a workaround link
        return esc_url_raw( $this->options['splittext_cdn'] ?? 'https://cdn.jsdelivr.net/npm/gsap@3.14.1/dist/SplitText.min.js' );
    }

    /**
     * Zwraca breakpointy w formacie dla JS: [{key: 'slug', value: 123, strict: bool}]
     */
    public function get_frontend_breakpoints(): array
    {
        // 1. Custom settings
        $custom = $this->options['custom_breakpoints'] ?? [];
        if ( ! empty( $custom ) && is_array( $custom ) ) {
            $list = [];
            foreach($custom as $slug => $data) {
                // Support old format (value only) or new format (array with props)
                if (is_array($data)) {
                    $val = $data['width'] ?? 0;
                    $strict = $data['strict'] ?? false;
                } else {
                    $val = (int)$data;
                    $strict = false;
                }
                $list[] = ['key' => $slug, 'value' => $val, 'strict' => $strict];
            }
            // Sort by value
            usort($list, function($a, $b) { return $a['value'] - $b['value']; });
            return $list;
        }

        // 2. Elementor defaults
        if ( did_action( 'elementor/loaded' ) ) {
            $e_map = $this->get_elementor_breakpoints();
            if ( ! empty( $e_map ) ) {
                $list = [];
                foreach($e_map as $slug => $val) {
                    $list[] = ['key' => $slug, 'value' => $val, 'strict' => false];
                }
                usort($list, function($a, $b) { return $a['value'] - $b['value']; });
                return $list;
            }
        }

        // 3. Defaults
        return [
            ['key' => 'mobile', 'value' => 767, 'strict' => false],
            ['key' => 'tablet', 'value' => 1024, 'strict' => false],
        ];
    }

    public function is_debug(): bool
    {
        return (bool) ( $this->options['debug_mode'] ?? false );
    }

    public function get( string $key, $default = null )
    {
        return $this->options[ $key ] ?? $default;
    }
}
