<?php

namespace ScrollCrafter\Elementor\Frontend;

if ( ! defined( "ABSPATH" ) ) {
    exit;
}
use Elementor\Element_Base;
use ScrollCrafter\Animation\Script_Parser;
use ScrollCrafter\Animation\Tween_Config_Builder;
use ScrollCrafter\Animation\Timeline_Config_Builder;
use ScrollCrafter\Support\Logger;
use ScrollCrafter\Support\Config;

class Animation_Render
{
    private Script_Parser $parser;
    private Tween_Config_Builder $tweenBuilder;
    private Timeline_Config_Builder $timelineBuilder;

    /** @var array<string, array> In-memory cache per request to avoid redundant parsing */
    private array $config_cache = [];

    private const TRANSIENT_PREFIX = 'sc_cfg_v5_';
    private const TRANSIENT_TTL   = DAY_IN_SECONDS;

    public function __construct()
    {
        $this->parser         = new Script_Parser();
        $this->tweenBuilder   = new Tween_Config_Builder();
        $this->timelineBuilder = new Timeline_Config_Builder();
    }

    public function hooks(): void
    {
        add_action( 'elementor/frontend/before_render', [ $this, 'add_animation_attributes' ] );
        add_action( 'elementor/editor/after_save', [ $this, 'invalidate_cache' ], 10, 2 );
    }

    public function add_animation_attributes( $element ): void
    {
        if ( ! $element instanceof Element_Base ) {
            return;
        }

        $settings = $element->get_settings_for_display();

        if ( empty( $settings['scrollcrafter_enable'] ) || 'yes' !== $settings['scrollcrafter_enable'] ) {
            return;
        }

        $script = (string) ( $settings['scrollcrafter_script'] ?? '' );
        if ( '' === trim( $script ) ) {
            return;
        }

        $widget_id = $element->get_id();
        $cache_key = md5( $script . '|' . $widget_id );

        // 1. Check in-memory cache (same request, e.g. multiple renders)
        if ( isset( $this->config_cache[ $cache_key ] ) ) {
            $config = $this->config_cache[ $cache_key ];
            $element->add_render_attribute( '_wrapper', 'data-scrollcrafter-config', esc_attr( wp_json_encode( $config ) ) );
            return;
        }

        // 2. Check transient cache (cross-request persistence)
        $cached = get_transient( self::TRANSIENT_PREFIX . $cache_key );
        if ( false !== $cached && is_array( $cached ) ) {
            // Refresh markers check (user login state can change)
            $cached = $this->apply_runtime_overrides( $cached );
            $this->config_cache[ $cache_key ] = $cached;
            $element->add_render_attribute( '_wrapper', 'data-scrollcrafter-config', esc_attr( wp_json_encode( $cached ) ) );
            return;
        }

        // 3. Full parse + build
        try {
            $parsed = $this->parser->parse( $script );
            // CRITICAL: Normalize data to strip line numbers before processing
            $parsed = $this->normalizeParsedData( $parsed );
        } catch ( \Throwable $e ) {
            if ( Config::instance()->is_debug() ) {
                Logger::log_exception( $e, 'animation_parsing' );
            }
            return;
        }

        $target_selector = $parsed['target']['selector'] ?? ( '.elementor-element-' . $widget_id );
        $target_type     = isset( $parsed['target']['selector'] ) ? 'custom' : 'wrapper';

        $scroll_config = $parsed['scroll'] ?? [];
        $scrollTrigger = $this->build_scroll_trigger_config( $scroll_config, $widget_id );

        $is_timeline = ! empty( $parsed['timeline']['steps'] );

        if ( $is_timeline ) {
            $config = $this->timelineBuilder->build( $element, $parsed, $scrollTrigger, $target_selector, $target_type );
        } else {
            $config = $this->tweenBuilder->build( $element, $parsed, $scrollTrigger, $target_selector, $target_type );
        }

        if ( ! empty( $parsed['_warnings'] ) && Config::instance()->is_debug() ) {
            $config['_debug_warnings'] = $parsed['_warnings'];
        }

        $config = apply_filters( 'scrollcrafter/frontend/config', $config, $element, $parsed );

        // Store in both caches
        $this->config_cache[ $cache_key ] = $config;
        set_transient( self::TRANSIENT_PREFIX . $cache_key, $config, self::TRANSIENT_TTL );

        $element->add_render_attribute(
            '_wrapper',
            'data-scrollcrafter-config',
            esc_attr( wp_json_encode( $config ) )
        );
    }

    /**
     * Invalidate all ScrollCrafter config transients when Elementor saves.
     * Uses global transient deletion since we can't track which scripts changed.
     */
    public function invalidate_cache( int $post_id, array $editor_data ): void
    {
        global $wpdb;

        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
                '_transient_' . self::TRANSIENT_PREFIX . '%'
            )
        );
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
                '_transient_timeout_' . self::TRANSIENT_PREFIX . '%'
            )
        );

        // Clear in-memory cache too
        $this->config_cache = [];
    }

    /**
     * Apply runtime-only overrides that shouldn't be cached (e.g. markers depend on login state).
     */
    private function apply_runtime_overrides( array $config ): array
    {
        // Markers should only show for logged-in users
        if ( ! is_user_logged_in() ) {
            // Deep check for scrollTrigger.markers in various config shapes
            if ( isset( $config['animation']['vars']['scrollTrigger']['markers'] ) ) {
                $config['animation']['vars']['scrollTrigger']['markers'] = false;
            }
            if ( isset( $config['animation']['vars2']['scrollTrigger']['markers'] ) ) {
                $config['animation']['vars2']['scrollTrigger']['markers'] = false;
            }
            if ( isset( $config['timelineVars']['scrollTrigger']['markers'] ) ) {
                $config['timelineVars']['scrollTrigger']['markers'] = false;
            }
        }
        return $config;
    }

    private function build_scroll_trigger_config( array $scroll, string $widget_id ): array
    {
        $defaults = [
            'trigger'       => null,
            'start'         => 'top 80%',
            'end'           => 'bottom 20%',
            'toggleActions' => 'play none none reverse',
            'scrub'         => false,
            'markers'       => false,
            'id'            => 'sc-' . $widget_id,
        ];

        $pass_through = [ 'pin', 'pinSpacing', 'anticipatePin', 'once', 'snap', 'fastScrollEnd', 'preventOverlaps' ];

        $config = array_merge( $defaults, array_intersect_key( $scroll, $defaults ) );

        foreach ( $pass_through as $key ) {
            if ( isset( $scroll[ $key ] ) ) {
                $config[ $key ] = $scroll[ $key ];
            }
        }

        if ( isset( $scroll['markers'] ) && $scroll['markers'] && is_user_logged_in() ) {
            $config['markers'] = true;
        } else {
            $config['markers'] = false;
        }

        return $config;
    }

    private function normalizeParsedData(array $data): array {
        $clean = [];
        foreach ($data as $key => $item) {
            if (is_array($item) && array_key_exists('value', $item) && array_key_exists('line', $item)) {
                 $clean[$key] = $item['value'];
            } elseif (is_array($item)) {
                 $clean[$key] = $this->normalizeParsedData($item);
            } else {
                 $clean[$key] = $item;
            }
        }
        return $clean;
    }
}
