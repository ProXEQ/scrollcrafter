<?php

namespace ScrollCrafter\Elementor\Frontend;

use Elementor\Element_Base;
use ScrollCrafter\Animation\Script_Parser;
use ScrollCrafter\Animation\Tween_Config_Builder;
use ScrollCrafter\Animation\Timeline_Config_Builder;
use ScrollCrafter\Support\Logger;

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
        add_action(
            'elementor/frontend/before_render',
            [ $this, 'add_animation_attributes' ]
        );
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
        } catch ( \Throwable $e ) {
            Logger::log_exception( $e, 'animation_script' );
            return;
        }

        // TARGET
        $target_selector = $parsed['target']['selector'] ?? ( '.elementor-element-' . $element->get_id() );
        $target_type     = isset( $parsed['target']['selector'] ) ? 'custom' : 'wrapper';

        // SCROLL TRIGGER
        $scroll        = $parsed['scroll'] ?? [];
        $scrollTrigger = $this->build_scroll_trigger_config( $scroll );

        $is_timeline = ! empty( $parsed['timeline']['steps'] );

        if ( $is_timeline ) {
            $config = $this->timelineBuilder->build(
                $element,
                $parsed,
                $scrollTrigger,
                $target_selector,
                $target_type
            );
        } else {
            $config = $this->tweenBuilder->build(
                $element,
                $parsed,
                $scrollTrigger,
                $target_selector,
                $target_type
            );
        }

        if ( ! empty( $parsed['_warnings'] ?? [] ) ) {
            $config['_debug'] = [
                'warnings' => $parsed['_warnings'],
            ];
        }

        $config = apply_filters( 'scrollcrafter/config', $config, $element, $parsed );

        $json = wp_json_encode( $config );
        if ( ! is_string( $json ) ) {
            return;
        }

        $element->add_render_attribute(
            '_wrapper',
            'data-scrollcrafter-config',
            esc_attr( $json )
        );

        Logger::log(
            [
                'element_id' => $element->get_id(),
                'config'     => $config,
            ],
            'frontend_animation'
        );
    }

    /**
     * Buduje część scrollTrigger na podstawie sekcji [scroll].
     *
     * @param array<string,mixed> $scroll
     * @return array<string,mixed>
     */
    private function build_scroll_trigger_config( array $scroll ): array
    {
        $scrollTrigger = [
            'start'         => $scroll['start'] ?? 'top 80%',
            'end'           => $scroll['end'] ?? 'bottom 20%',
            'toggleActions' => $scroll['toggleActions'] ?? 'play none none reverse',
        ];

        if ( array_key_exists( 'scrub', $scroll ) ) {
            $scrollTrigger['scrub'] = $scroll['scrub']; // bool|float
        } else {
            $scrollTrigger['scrub'] = false;
        }

        if ( array_key_exists( 'once', $scroll ) ) {
            $scrollTrigger['once'] = (bool) $scroll['once'];
        }

        if ( array_key_exists( 'pin', $scroll ) ) {
            $scrollTrigger['pin'] = (bool) $scroll['pin'];
        }

        if ( array_key_exists( 'pinSpacing', $scroll ) ) {
            $scrollTrigger['pinSpacing'] = (bool) $scroll['pinSpacing'];
        }

        if ( array_key_exists( 'anticipatePin', $scroll ) ) {
            $scrollTrigger['anticipatePin'] = (float) $scroll['anticipatePin'];
        }

        if ( array_key_exists( 'markers', $scroll ) ) {
            $scrollTrigger['markers'] = (bool) $scroll['markers'];
        }

        if ( array_key_exists( 'snap', $scroll ) ) {
            $scrollTrigger['snap'] = $scroll['snap']; // bool|float|string
        }

        return $scrollTrigger;
    }
}
