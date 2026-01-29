<?php

namespace ScrollCrafter\Admin;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

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

    private const ALLOWED_KEYS = [
        'animation' => ['type', 'method', 'from', 'to', 'duration', 'delay', 'ease', 'stagger', 'strict', 'repeat', 'yoyo', 'split', 'stagger.from', 'stagger.amount'],
        'scroll'    => ['start', 'end', 'scrub', 'once', 'markers', 'toggleactions', 'pin', 'pinspacing', 'snap', 'anticipatepin', 'strict', 'id', 'trigger'],
        'target'    => ['selector', 'type'],
        'step'      => ['type', 'selector', 'from', 'to', 'duration', 'delay', 'ease', 'stagger', 'startat', 'position', 'label'],
    ];

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
                    'script'    => [ 'required' => true, 'type' => 'string', 'sanitize_callback' => 'wp_kses_post' ],
                    'mode'      => [ 'type' => 'string', 'default' => 'auto' ],
                    'widget_id' => [ 'type' => 'string', 'default' => 'preview' ],
                    'markers'   => [ 'type' => 'boolean', 'default' => false ],
                    'lint_only' => [ 'type' => 'boolean', 'default' => false ],
                ],
            ]
        );
    }

    public function handle_validate( WP_REST_Request $request ): WP_REST_Response
    {
        $script      = (string) $request->get_param( 'script' );
        $mode        = (string) $request->get_param( 'mode' );
        $widget_id   = (string) $request->get_param( 'widget_id' );
        $show_markers = (bool) $request->get_param( 'markers' );

        if ( '' === trim( $script ) ) {
            return $this->response_with_error(__('The script is empty.', 'scrollcrafter'), 'empty_script');
        }

        try {
            $parsed = $this->parser->parse( $script );
        } catch ( \Throwable $e ) {
            return $this->response_with_error( $e->getMessage(), 'PARSER_EXCEPTION', $e->getLine() > 0 ? $e->getLine() : 1 );
        }

        $errors   = array_map( fn($e) => $this->normalize_message($e, 'error'), $parsed['_errors'] ?? [] );
        $warnings = array_map( fn($w) => $this->normalize_message($w, 'warning'), $parsed['_warnings'] ?? [] );

        $logicIssues = $this->validate_logic( $parsed, $script );
        
        $securityIssues = $this->validate_calc_expressions( $parsed, $script );

        $allIssues = array_merge($logicIssues, $securityIssues);
        
        foreach ( $allIssues as $issue ) {
            if ( $issue['severity'] === 'error' ) {
                $errors[] = $issue;
            } else {
                $warnings[] = $issue;
            }
        }

        if ( ! empty( $errors ) ) {
            return new WP_REST_Response([
                'ok' => false, 'errors' => $errors, 'warnings' => $warnings, 'config' => null
            ], 200);
        }

        if ( (bool) $request->get_param( 'lint_only' ) ) {
            return new WP_REST_Response([
                'ok'       => true,
                'errors'   => [],
                'warnings' => $warnings,
                'config'   => null,
            ], 200);
        }

        try {
            // Fake element with the requested ID
            $fakeElement = new class($widget_id) { 
                private string $id;
                public function __construct($id) { $this->id = $id; }
                public function get_id(): string { return $this->id; } 
                public function get_settings_for_display() { return []; }
            };

            $targetNode = $parsed['target']['selector'] ?? null;
            $targetSelector = (is_array($targetNode) && isset($targetNode['value'])) ? $targetNode['value'] : ('.elementor-element-' . $widget_id);
            $targetType     = !empty($targetNode) ? 'custom' : 'wrapper';
            $scrollTrigger  = $this->build_scroll_trigger_config( $parsed['scroll'] ?? [], $widget_id, $show_markers );
            
            $hasSteps = !empty($parsed['timeline']['steps']);
            if (!$hasSteps && !empty($parsed['media'])) {
                foreach ($parsed['media'] as $m) {
                    if (!empty($m['timeline']['steps'])) {
                        $hasSteps = true; break;
                    }
                }
            }

            if ( 'timeline' === $mode || ( 'auto' === $mode && $hasSteps ) ) {
                $config = $this->timelineBuilder->build($fakeElement, $parsed, $scrollTrigger, $targetSelector, $targetType);
            } else {
                $config = $this->tweenBuilder->build($fakeElement, $parsed, $scrollTrigger, $targetSelector, $targetType);
            }
        } catch ( \Throwable $e ) {
            $message = sprintf(
                /* translators: 1: Error message, 2: Line number. */
                __('Error building the configuration: %1$s (line %2$d).', 'scrollcrafter'),
                $e->getMessage(),
                $e->getLine() > 0 ? $e->getLine() : 1
            );
            return $this->response_with_error( $message, 'BUILDER_ERROR', $e->getLine() > 0 ? $e->getLine() : 1 );
        }

        return new WP_REST_Response([
            'ok'       => true,
            'errors'   => [],
            'warnings' => $warnings,
            'config'   => $config,
        ], 200);
    }

    private function validate_logic( array $parsed, string $script ): array
    {
        $issues = [];

        $check_keys = function( $data, $sectionName, $allowedKeys ) use ( &$issues ) {
            if ( empty( $data ) ) return;
            foreach ( $data as $key => $item ) {
                $normalizedKey = strtolower($key);
                $line = $item['line'] ?? 1;
                $value = $item['value'] ?? null;

                if ( ! in_array( $normalizedKey, $allowedKeys, true ) ) {
                    $message = sprintf(
                        /* translators: 1: Unknown key name, 2: Section name (e.g. [animation]). */
                        __( "Unknown key '%1\$s' in [%2\$s].", 'scrollcrafter' ),
                        $key,
                        $sectionName
                    );
                    $issues[] = $this->create_issue( $message, 'warning', $line );
                }
                
                // Simple sane checks
                if (in_array($normalizedKey, ['duration', 'delay', 'stagger'], true)) {
                    if (is_numeric($value) && $value < 0) {
                        $issues[] = $this->create_issue(
                            sprintf(
                                /* translators: %s: The field name (e.g. duration). */
                                __("Value for '%s' cannot be negative.", 'scrollcrafter'),
                                $key
                            ),
                            'error',
                            $line
                        );
                    }
                }
            }
        };

        $check_steps = function( $steps, $contextPrefix = '' ) use ( &$issues ) {
            if ( empty( $steps ) ) return;
            foreach ( $steps as $index => $step ) {
                foreach ( $step as $key => $item ) {
                    $normalizedKey = strtolower($key);
                     $line = $item['line'] ?? 1;
                     $value = $item['value'] ?? null;

                    if ( ! in_array( $normalizedKey, self::ALLOWED_KEYS['step'], true ) ) {
                        $issues[] = $this->create_issue( 
                            sprintf(
                                /* translators: 1: Unknown key name, 2: Step identifier (e.g. step.1), 3: Step number */
                                __( "Unknown key '%1\$s' in [%2\$sstep.%3\$d].", 'scrollcrafter' ),
                                $key,
                                $contextPrefix,
                                ($index + 1)
                            ),
                            'warning', 
                            $line 
                        );
                    }
                    
                    if (in_array($normalizedKey, ['duration', 'delay', 'stagger'], true)) {
                        if (is_numeric($value) && $value < 0) {
                            $issues[] = $this->create_issue(
                                sprintf(
                                    /* translators: %s: The field name (e.g. duration). */
                                    __("Value for '%s' cannot be negative.", 'scrollcrafter'),
                                    $key
                                ),
                                'error',
                                $line
                            );
                        }
                    }
                }
            }
        };

        $check_keys( $parsed['animation'] ?? [], 'animation', self::ALLOWED_KEYS['animation'] );
        $check_keys( $parsed['scroll'] ?? [], 'scroll', self::ALLOWED_KEYS['scroll'] );
        $check_steps( $parsed['timeline']['steps'] ?? [] );

        // Add GSAP-specific logic warnings
        $this->add_gsap_sanity_checks( $parsed, $issues );

        if ( ! empty( $parsed['media'] ) ) {
            foreach ( $parsed['media'] as $mediaSlug => $mediaData ) {
                $check_keys( $mediaData['animation'] ?? [], "animation @{$mediaSlug}", self::ALLOWED_KEYS['animation'] );
                $check_keys( $mediaData['scroll'] ?? [], "scroll @{$mediaSlug}", self::ALLOWED_KEYS['scroll'] );
                $check_steps( $mediaData['timeline']['steps'] ?? [], "@{$mediaSlug} " );
            }
        }

        return $issues;
    }

    private function add_gsap_sanity_checks( array $parsed, array &$issues ): void
    {
        $scroll = $parsed['scroll'] ?? [];
        $anim   = $parsed['animation'] ?? [];

        // 1. Scrub vs toggleActions
        if ( isset( $scroll['scrub'] ) && isset( $scroll['toggleactions'] ) ) {
            $issues[] = $this->create_issue(
                __( "GSAP ignores 'toggleActions' when 'scrub' is enabled.", 'scrollcrafter' ),
                'warning',
                $scroll['toggleactions']['line'] ?? 1
            );
        }

        // 2. Pin without Scrub (UX suggestion)
        if ( ( $scroll['pin']['value'] ?? false ) && ! isset( $scroll['scrub'] ) ) {
            $issues[] = $this->create_issue(
                __( "Consider adding 'scrub: true' when using 'pin' for smoother interaction.", 'scrollcrafter' ),
                'warning',
                $scroll['pin']['line'] ?? 1
            );
        }

        // 3. Start vs End logic (simple numeric comparison)
        $start = $scroll['start']['value'] ?? '';
        $end   = $scroll['end']['value'] ?? '';
        if ( is_string( $start ) && is_string( $end ) ) {
            if ( preg_match( '/^(\d+)%$/', $start, $mStart ) && preg_match( '/^(\d+)%$/', $end, $mEnd ) ) {
                if ( (int) $mStart[1] > (int) $mEnd[1] ) {
                    $issues[] = $this->create_issue(
                        __( "End position occurs before start position (e.g. 80% vs 20%).", 'scrollcrafter' ),
                        'warning',
                        $scroll['end']['line'] ?? 1
                    );
                }
            }
        }

        // 4. type: from conflicts
        $type = strtolower( $anim['type']['value'] ?? 'from' );
        if ( 'from' === $type && isset( $anim['to'] ) ) {
            $issues[] = $this->create_issue(
                __( "You are using 'type: from' but defined properties in a 'to:' block. Move them to 'from:' or change type to 'fromTo'.", 'scrollcrafter' ),
                'warning',
                $anim['to']['line'] ?? 1
            );
        }
    }

    private function create_issue( string $message, string $severity = 'warning', int $line = 1 ): array
    {
        return [ 'message' => $message, 'severity' => $severity, 'line' => $line ];
    }

    private function response_with_error( string $message, string $code, int $line = 1 ): WP_REST_Response
    {
        return new WP_REST_Response([
            'ok' => false, 'errors' => [[ 'message' => $message, 'code' => $code, 'severity' => 'error', 'line' => $line ]], 'config' => null
        ], 200);
    }
    
    private function build_scroll_trigger_config( array $scroll, string $widget_id, bool $force_markers = false ): array
    {
        $scrollTrigger = [
            'start'         => $scroll['start']['value'] ?? 'top 80%',
            'end'           => $scroll['end']['value'] ?? 'bottom 20%',
            'toggleActions' => $scroll['toggleActions']['value'] ?? 'play none none reverse',
            'id'            => 'sc-' . $widget_id,
        ];
        if ( array_key_exists( 'scrub', $scroll ) ) $scrollTrigger['scrub'] = $scroll['scrub']['value'];
        
        // Markers: from DSL script OR from editor toggle - only for logged-in users
        $markers_requested = $force_markers || ( array_key_exists( 'markers', $scroll ) && $scroll['markers']['value'] );
        if ( $markers_requested && is_user_logged_in() ) {
            $scrollTrigger['markers'] = true;
        }
        
        if ( array_key_exists( 'trigger', $scroll ) ) $scrollTrigger['trigger'] = $scroll['trigger']['value'];
        
        return $scrollTrigger;
    }

    private function normalize_message( $item, string $severity = 'error' ): array {
        if ( is_array( $item ) && isset( $item['line'] ) ) {
            return [
                'message'  => $item['message'],
                'severity' => $severity,
                'line'     => (int) $item['line']
            ];
        }
    
        return [
            'message'  => is_string($item) ? $item : 'Unknown issue',
            'severity' => $severity,
            'line'     => 1
        ];
    }


    /**
     * Sprawdza bezpieczeństwo wyrażeń calc()
     */
    private function validate_calc_expressions( array $parsed, string $script ): array
    {
        $issues = [];
        
        $finder = function( $data, $path = '', $parentLine = 1 ) use ( &$finder, &$issues ) {
            foreach ( $data as $key => $item ) {
                $line = $parentLine;
                $val = $item;
                
                if (is_array($item) && array_key_exists('value', $item) && array_key_exists('line', $item)) {
                     $val = $item['value'];
                     $line = $item['line'];
                }
                
                if ( is_array( $val ) ) {
                    $finder( $val, $path . '.' . $key, $line );
                } elseif ( is_string( $val ) && stripos( $val, 'calc(' ) !== false ) {
                    if ( preg_match( '/calc\s*\((.*)\)/i', $val, $matches ) ) {
                        $expression = $matches[1];
                        $cleanExpr = $expression;
                        
                        $vars = ['sw', 'cw', 'ch', 'vw', 'vh', 'center', 'vcenter', 'end'];
                        foreach($vars as $v) {
                             // Allow variables to be used as limits or limit-like units (e.g. 100sw)
                             $cleanExpr = preg_replace("/{$v}\\b/i", '', $cleanExpr);
                        }
                        
                        if ( ! preg_match( '/^[0-9\.\+\-\*\/\(\)\s]*$/', $cleanExpr ) ) {
                             $issues[] = [
                                'message' => sprintf(
                                    /* translators: %s: The unsafe expression found in calc(). */
                                    __( "Unsafe characters in calc(): '%s'. Only math and vars (sw, vw, center...) are allowed.", 'scrollcrafter' ),
                                    $expression
                                ),
                                'severity' => 'error',
                                'line'     => $line,
                            ];

                        }
                    }
                }
            }
        };

        $finder( $parsed );
        return $issues;
    }

}
