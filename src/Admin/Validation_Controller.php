<?php

namespace ScrollCrafter\Admin;

use WP_REST_Request;
use WP_REST_Response;
use ScrollCrafter\Animation\Script_Parser;
use ScrollCrafter\Animation\Tween_Config_Builder;
use ScrollCrafter\Animation\Timeline_Config_Builder;

class Validation_Controller
{
    private Script_Parser $parser;
    private Tween_Config_Builder $tweenBuilder;
    private Timeline_Config_Builder $timelineBuilder;

    public function __construct()
    {
        $this->parser          = new Script_Parser();
        $this->tweenBuilder    = new Tween_Config_Builder();
        $this->timelineBuilder = new Timeline_Config_Builder();
    }

    public function hooks(): void
    {
        add_action( 'rest_api_init', [ $this, 'register_routes' ] );
    }

    public function register_routes(): void
    {
        register_rest_route(
            'scrollcrafter/v1',
            '/validate',
            [
                'methods'             => 'POST',
                'callback'            => [ $this, 'handle_validate' ],
                'permission_callback' => function () {
                    return current_user_can( 'edit_posts' );
                },
                'args'                => [
                    'script' => [
                        'required'          => true,
                        'type'              => 'string',
                        'sanitize_callback' => 'wp_kses_post',
                    ],
                    'mode'   => [
                        'required' => false,
                        'type'     => 'string',
                        'enum'     => [ 'auto', 'tween', 'timeline' ],
                        'default'  => 'auto',
                    ],
                ],
            ]
        );
    }

    public function handle_validate( WP_REST_Request $request ): WP_REST_Response
    {
        $script = (string) $request->get_param( 'script' );
        $mode   = (string) $request->get_param( 'mode' );

        if ( '' === trim( $script ) ) {
            return new WP_REST_Response(
                [
                    'ok'       => false,
                    'errors'   => [ 'Empty script.' ],
                    'warnings' => [],
                    'config'   => null,
                ],
                200
            );
        }

        try {
            $parsed = $this->parser->parse( $script );
        } catch ( \Throwable $e ) {
            return new WP_REST_Response(
                [
                    'ok'       => false,
                    'errors'   => [ $e->getMessage() ],
                    'warnings' => [],
                    'config'   => null,
                ],
                200
            );
        }

        $warnings = (array) ( $parsed['_warnings'] ?? [] );
        $scroll   = $parsed['scroll'] ?? [];

        // Używamy fake elementu – config interesuje nas strukturalnie, bez realnego ID.
        $fakeElement = new class() {
            public function get_id(): string
            {
                return 'preview';
            }
        };

        $targetSelector = $parsed['target']['selector'] ?? '.elementor-element-preview';
        $targetType     = isset( $parsed['target']['selector'] ) ? 'custom' : 'wrapper';

        $scrollTrigger = $this->build_scroll_trigger_config( $scroll );

        $isTimeline = ! empty( $parsed['timeline']['steps'] );

        $config = null;

        if ( 'timeline' === $mode || ( 'auto' === $mode && $isTimeline ) ) {
            $config = $this->timelineBuilder->build(
                $fakeElement,
                $parsed,
                $scrollTrigger,
                $targetSelector,
                $targetType
            );
        } else {
            $config = $this->tweenBuilder->build(
                $fakeElement,
                $parsed,
                $scrollTrigger,
                $targetSelector,
                $targetType
            );
        }

        return new WP_REST_Response(
            [
                'ok'       => true,
                'errors'   => [],
                'warnings' => $warnings,
                'config'   => $config,
            ],
            200
        );
    }

    /**
     * Skopiowane z Animation_Render::build_scroll_trigger_config
     * (można rozważyć współdzielenie w przyszłości).
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
            $scrollTrigger['scrub'] = $scroll['scrub'];
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
            $scrollTrigger['snap'] = $scroll['snap'];
        }

        return $scrollTrigger;
    }
}
