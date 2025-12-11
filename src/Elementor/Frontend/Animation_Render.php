<?php

namespace ScrollCrafter\Elementor\Frontend;

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
        // Te klasy analizujemy w kolejnych krokach
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

        // Pobranie ustawień "raw" jest szybsze niż pełne get_settings_for_display() w niektórych przypadkach,
        // ale w Elementorze 3.0+ to jest standard.
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
        } catch ( \Throwable $e ) {
            // Cichy błąd na produkcji, log tylko w debugu
            if ( Config::instance()->is_debug() ) {
                Logger::log_exception( $e, 'animation_parsing' );
            }
            return;
        }

        // Ustalenie selektora
        $widget_id       = $element->get_id();
        $target_selector = $parsed['target']['selector'] ?? ( '.elementor-element-' . $widget_id );
        $target_type     = isset( $parsed['target']['selector'] ) ? 'custom' : 'wrapper';

        // Budowanie konfiguracji ScrollTrigger
        $scroll_config = $parsed['scroll'] ?? [];
        $scrollTrigger = $this->build_scroll_trigger_config( $scroll_config, $widget_id );

        // Budowanie głównego configu (Timeline vs Tween)
        $is_timeline = ! empty( $parsed['timeline']['steps'] );

        // Przekazujemy $element do buildera, może być potrzebny do kontekstu
        if ( $is_timeline ) {
            $config = $this->timelineBuilder->build( $element, $parsed, $scrollTrigger, $target_selector, $target_type );
        } else {
            $config = $this->tweenBuilder->build( $element, $parsed, $scrollTrigger, $target_selector, $target_type );
        }

        // Dodanie ostrzeżeń z parsera do configu (dla JS w konsoli)
        if ( ! empty( $parsed['_warnings'] ) && Config::instance()->is_debug() ) {
            $config['_debug_warnings'] = $parsed['_warnings'];
        }

        // Filtr dla developerów
        $config = apply_filters( 'scrollcrafter/frontend/config', $config, $element, $parsed );

        // Wstrzyknięcie atrybutu do DOM
        $element->add_render_attribute(
            '_wrapper',
            'data-scrollcrafter-config',
            esc_attr( wp_json_encode( $config ) )
        );
    }

    private function build_scroll_trigger_config( array $scroll, string $widget_id ): array
    {
        // Domyślne wartości
        $defaults = [
            'trigger'       => null, // Zostanie ustawione w JS na podstawie elementu
            'start'         => 'top 80%',
            'end'           => 'bottom 20%',
            'toggleActions' => 'play none none reverse',
            'scrub'         => false, // false lub true lub number
            'markers'       => Config::instance()->is_debug(), // Markers widoczne tylko w trybie debug
            'id'            => 'sc-' . $widget_id, // Unikalne ID dla debugowania GSAP
        ];

        // Mapowanie kluczy 1:1, które po prostu przechodzą dalej
        $pass_through = [ 'pin', 'pinSpacing', 'anticipatePin', 'once', 'snap' ];

        $config = array_merge( $defaults, array_intersect_key( $scroll, $defaults ) );

        // Nadpisanie wartościami z DSL, jeśli istnieją i nie są puste/null
        // (uproszczona logika, w praktyce array_merge wyżej załatwia sprawę dla kluczy, które się pokrywają)
        
        foreach ( $pass_through as $key ) {
            if ( isset( $scroll[ $key ] ) ) {
                $config[ $key ] = $scroll[ $key ];
            }
        }

        // Specyficzne nadpisanie markers z DSL, jeśli ktoś wymusił
        if ( isset( $scroll['markers'] ) ) {
            $config['markers'] = (bool) $scroll['markers'];
        }

        return $config;
    }
}
