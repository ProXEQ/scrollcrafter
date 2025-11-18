<?php

namespace ScrollCrafter\Elementor\Frontend;

use Elementor\Element_Base;
use ScrollCrafter\Animation\Script_Parser;
use ScrollCrafter\Support\Logger;

class Animation_Render
{
    public function hooks(): void
    {
        add_action(
            'elementor/frontend/before_render',
            [ $this, 'add_animation_attributes' ]
        );
    }

    /**
     * Dodaje data-scrollcrafter-config do wrappera elementu,
     * jeśli w Advanced włączono ScrollCrafter.
     *
     * @param Element_Base $element
     */
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

        $parser = new Script_Parser();

        try {
            $parsed = $parser->parse( $script );
        } catch ( \Throwable $e ) {
            Logger::log_exception( $e, 'animation_script' );
            return;
        }

        // --- TARGET ---------------------------------------------------------
        $target_selector = $parsed['target']['selector'] ?? ( '.elementor-element-' . $element->get_id() );
        $target_type     = isset( $parsed['target']['selector'] ) ? 'custom' : 'wrapper';

        // --- SCROLL TRIGGER -------------------------------------------------
        $scroll = $parsed['scroll'] ?? [];

        $scrollTrigger = [
            'start'         => $scroll['start'] ?? 'top 80%',
            'end'           => $scroll['end'] ?? 'bottom 20%',
            'toggleActions' => $scroll['toggleActions'] ?? 'play none none reverse',
        ];

        // scrub: bool lub number – przekazujemy surowo do JS
        if ( array_key_exists( 'scrub', $scroll ) ) {
            $scrollTrigger['scrub'] = $scroll['scrub'];
        } else {
            $scrollTrigger['scrub'] = false;
        }

        // once – prosty bool; używany raczej do logiki wyżej/niżej JS
        if ( array_key_exists( 'once', $scroll ) ) {
            $scrollTrigger['once'] = (bool) $scroll['once'];
        }

        // dodatkowe pola v2: pin, pinSpacing, anticipatePin, markers, snap
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
            // snap może być bool/number/string – nie kastujemy, przekazujemy do JS
            $scrollTrigger['snap'] = $scroll['snap'];
        }

        // --- TIMELINE CZY POJEDYNCZY TWEEN ---------------------------------
        $is_timeline = ! empty( $parsed['timeline']['steps'] );

        if ( $is_timeline ) {
            $timeline_defaults = $parsed['timeline']['defaults'] ?? [];
            $timeline_steps    = $parsed['timeline']['steps'] ?? [];

            $config = [
                'widget'  => 'scroll_timeline',
                'id'      => $element->get_id(),
                'target'  => [
                    'type'     => $target_type,
                    'selector' => $target_selector,
                ],
                'timeline' => [
                    'defaults' => $timeline_defaults,
                    'steps'    => $timeline_steps,
                ],
                'scrollTrigger' => $scrollTrigger,
            ];
        } else {
            // Pojedynczy tween (scroll_animation) – korzysta z sekcji [animation] lub z płaskich _raw (v1).
            $anim = $parsed['animation'] ?? [];

            $type     = $anim['type'] ?? 'from';
            $fromVars = $anim['from'] ?? [ 'y' => 50.0, 'opacity' => 0.0 ];
            $toVars   = $anim['to']   ?? [ 'y' => 0.0,  'opacity' => 1.0 ];
            $duration = isset( $anim['duration'] ) ? (float) $anim['duration'] : 0.8;
            $delay    = isset( $anim['delay'] ) ? (float) $anim['delay'] : 0.0;
            $ease     = $anim['ease'] ?? 'power2.out';
            $stagger  = isset( $anim['stagger'] ) ? (float) $anim['stagger'] : 0.0;

            // Fallback v1 – płaskie klucze, gdy sekcja [animation] nie użyta.
            if ( empty( $anim ) && ! empty( $parsed['_raw'] ) ) {
                $raw = $parsed['_raw'];

                if ( isset( $raw['type'] ) ) {
                    $type = $raw['type'];
                }

                if ( isset( $raw['from'] ) && is_string( $raw['from'] ) ) {
                    $fromVars = $this->parse_vars_list( $raw['from'] );
                }

                if ( isset( $raw['to'] ) && is_string( $raw['to'] ) ) {
                    $toVars = $this->parse_vars_list( $raw['to'] );
                }

                if ( isset( $raw['duration'] ) ) {
                    $duration = (float) $raw['duration'];
                }

                if ( isset( $raw['delay'] ) ) {
                    $delay = (float) $raw['delay'];
                }

                if ( isset( $raw['ease'] ) ) {
                    $ease = $raw['ease'];
                }

                if ( isset( $raw['stagger'] ) ) {
                    $stagger = (float) $raw['stagger'];
                }
            }

            $config = [
                'widget'  => 'scroll_animation',
                'id'      => $element->get_id(),
                'target'  => [
                    'type'     => $target_type,
                    'selector' => $target_selector,
                ],
                'animation' => [
                    'type'     => $type,
                    'from'     => $fromVars,
                    'to'       => $toVars,
                    'duration' => $duration,
                    'delay'    => $delay,
                    'ease'     => $ease,
                    'stagger'  => $stagger,
                ],
                'scrollTrigger' => $scrollTrigger,
            ];
        }

        $json = wp_json_encode( $config );
        if ( ! is_string( $json ) ) {
            return;
        }

        $element->add_render_attribute(
            '_wrapper',
            'data-scrollcrafter-config',
            esc_attr( $json )
        );

        // Debug – do wyłączenia, gdy będzie stabilnie.
        Logger::log(
            [
                'element_id' => $element->get_id(),
                'parsed'     => $parsed,
                'config'     => $config,
            ],
            'frontend_animation'
        );
    }

    /**
     * Pomocniczy parser listy "y=50, opacity=0" na potrzeby fallbacku v1,
     * gdy Script_Parser zwróci _raw.
     *
     * @param string $value
     * @return array<string,mixed>
     */
    private function parse_vars_list( string $value ): array
    {
        $vars = [];
        $parts = array_map( 'trim', explode( ',', $value ) );

        foreach ( $parts as $part ) {
            if ( '' === $part || ! str_contains( $part, '=' ) ) {
                continue;
            }

            [ $k, $v ] = array_map( 'trim', explode( '=', $part, 2 ) );
            if ( '' === $k ) {
                continue;
            }

            if ( is_numeric( $v ) ) {
                $vars[ $k ] = (float) $v;
            } elseif ( in_array( strtolower( $v ), [ 'true', 'false', 'yes', 'no', 'on', 'off', '1', '0' ], true ) ) {
                $vars[ $k ] = in_array( strtolower( $v ), [ 'true', 'yes', 'on', '1' ], true );
            } else {
                $vars[ $k ] = $v;
            }
        }

        return $vars;
    }
}
