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

    public function __construct()
    {
        $this->parser         = new Script_Parser();
        $this->tweenBuilder   = new Tween_Config_Builder();
        $this->timelineBuilder = new Timeline_Config_Builder();
    }

    public function hooks(): void
    {
        add_action( 'elementor/frontend/before_render', [ $this, 'add_animation_attributes' ] );
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

        try {
            $parsed = $this->parser->parse( $script );
            // Normalize parsed data to flat values for the renderer logic
            $parsed = $this->normalizeParsedData( $parsed );
        } catch ( \Throwable $e ) {
            if ( Config::instance()->is_debug() ) {
                Logger::log_exception( $e, 'animation_parsing' );
            }
            return;
        }

        $widget_id       = $element->get_id();
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

        $element->add_render_attribute(
            '_wrapper',
            'data-scrollcrafter-config',
            esc_attr( wp_json_encode( $config ) )
        );
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

    private function build_scroll_trigger_config( array $scroll, string $widget_id ): array
    {
        $defaults = [
            'trigger'       => null,
            'start'         => 'top 80%',
            'end'           => 'bottom 20%',
            'toggleActions' => 'play none none reverse',
            'scrub'         => false,
            'markers'       => false, // Never enable by default - controlled explicitly via DSL or editor toggle
            'id'            => 'sc-' . $widget_id,
        ];

        $pass_through = [ 'pin', 'pinSpacing', 'anticipatePin', 'once', 'snap' ];

        $config = array_merge( $defaults, array_intersect_key( $scroll, $defaults ) );

        
        foreach ( $pass_through as $key ) {
            if ( isset( $scroll[ $key ] ) ) {
                $config[ $key ] = $scroll[ $key ];
            }
        }

        // Markers only for logged-in users (security: don't expose to public)
        if ( isset( $scroll['markers'] ) && $scroll['markers'] && is_user_logged_in() ) {
            $config['markers'] = true;
        } else {
            $config['markers'] = false;
        }

        return $config;
    }
}
