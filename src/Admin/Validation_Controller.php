<?php

namespace ScrollCrafter\Admin;

use WP_REST_Request;
use WP_REST_Response;
use ScrollCrafter\Animation\Script_Parser;
use ScrollCrafter\Animation\Tween_Config_Builder;
use ScrollCrafter\Animation\Timeline_Config_Builder;
use ScrollCrafter\Support\Logger;

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
        Logger::log( 'Registering validation REST route', 'validation' );

        register_rest_route(
            'scrollcrafter/v1',
            '/validate',
            [
                'methods'             => 'POST',
                'callback'            => [ $this, 'handle_validate' ],
                'permission_callback' => function () {
                    Logger::log( 'Checking permissions for validation REST route', 'validation' );
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

        Logger::log( "Validating script in mode '{$mode}'", 'validation' );

        if ( '' === trim( $script ) ) {
            Logger::log( 'Validation failed: empty script', 'validation' );

            $errors = [
                $this->normalize_message( 
                    [
                        'message' => 'The script is empty.',
                        'line'    => 1,
                        'column'  => 1,
                        'code'    => 'empty_script',
                    ] 
                ),
            ];
            return new WP_REST_Response(
                [
                    'ok'       => false,
                    'errors'   => $errors,
                    'warnings' => [],
                    'config'   => null,
                ],
                200
            );
        }

        try {
            $parsed = $this->parser->parse( $script );
            Logger::log( 'Script parsed successfully', 'validation' );
        } catch ( \Throwable $e ) {
            Logger::log_exception( $e, 'validation' );

            $errors = [
                $this->normalize_message( 
                    [
                        'message' => $e->getMessage(),
                        'code'    => 'PARSER_EXCEPTION',
                    ],
                    'error'
                ),
            ];

            return new WP_REST_Response(
                [
                    'ok'       => false,
                    'errors'   => $errors,
                    'warnings' => [],
                    'config'   => null,
                ],
                200
            );
        }

                $rawWarnings = (array) ( $parsed['_warnings'] ?? [] );
        $warnings    = [];
        foreach ( $rawWarnings as $w ) {
            $warnings[] = $this->normalize_message( $w, 'warning' );
        }

        $rawErrors = (array) ( $parsed['_errors'] ?? [] ); // możesz dodać taką tablicę w parserze
        $errors    = [];
        foreach ( $rawErrors as $e ) {
            $errors[] = $this->normalize_message( $e, 'error' );
        }
        $scroll   = $parsed['scroll'] ?? [];

        // "Element" tylko dla potrzeb builderów – ID nie ma znaczenia.
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

        Logger::log(
            "Determining config type for validation: mode='{$mode}', isTimeline=" . ( $isTimeline ? 'true' : 'false' ),
            'validation'
        );

        if ( 'timeline' === $mode || ( 'auto' === $mode && $isTimeline ) ) {
            $config = $this->timelineBuilder->build(
                $fakeElement,
                $parsed,
                $scrollTrigger,
                $targetSelector,
                $targetType
            );
            Logger::log( 'Built timeline config for validation', 'validation' );
        } else {
            $config = $this->tweenBuilder->build(
                $fakeElement,
                $parsed,
                $scrollTrigger,
                $targetSelector,
                $targetType
            );
            Logger::log( 'Built tween config for validation', 'validation' );
        }

        Logger::log(
            [
                'warnings' => $warnings,
                'errors'   => $errors,
                'config'   => $config,
            ],
            'validation_result'
        );

        Logger::log( 'Validation completed successfully', 'validation' );

        $ok = empty( $errors );

        return new WP_REST_Response(
            [
                'ok'       => $ok,
                'errors'   => $errors,
                'warnings' => $warnings,
                'config'   => $ok ? $config : null,
            ],
            200
        );
    }

    /**
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

        Logger::log( 'Built scrollTrigger config for validation', 'validation' );

        return $scrollTrigger;
    }

/**
* @param string|array<string,mixed> $item
*/
    private function normalize_message( $item, string $severity = 'error' ): array {
        // String -> prosty komunikat bez pozycji
        if ( is_string( $item ) ) {
            return [
                'message'  => $item,
                'severity' => $severity,
            ];
        }

        if ( ! is_array( $item ) ) {
            return [
                'message'  => 'Unknown validation issue.',
                'severity' => $severity,
            ];
        }

        $message = (string) ( $item['message'] ?? 'Unknown validation issue.' );

    // Jeśli nie ma 'line', spróbuj wyciągnąć go z message ("at line 14")
    if ( ! isset( $item['line'] ) ) {
        if ( preg_match( '/line\s+(\d+)/i', $message, $m ) ) {
            $item['line'] = (int) $m[1];
        }
    }

        return [
            'message'   => (string) ( $item['message'] ?? 'Unknown validation issue.' ),
            'severity'  => $severity,
            'line'      => isset( $item['line'] ) ? (int) $item['line'] : null,
            'column'    => isset( $item['column'] ) ? (int) $item['column'] : null,
            'endLine'   => isset( $item['endLine'] ) ? (int) $item['endLine'] : null,
            'endColumn' => isset( $item['endColumn'] ) ? (int) $item['endColumn'] : null,
            'code'      => isset( $item['code'] ) ? (string) $item['code'] : null,
            'section'   => isset( $item['section'] ) ? (string) $item['section'] : null,
            'field'     => isset( $item['field'] ) ? (string) $item['field'] : null,
        ];
    }
}
