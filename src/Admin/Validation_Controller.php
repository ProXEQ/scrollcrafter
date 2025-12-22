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

    private const ALLOWED_KEYS = [
        'animation' => ['type', 'method', 'from', 'to', 'duration', 'delay', 'ease', 'stagger', 'strict', 'repeat', 'yoyo'],
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
                    'script' => [ 'required' => true, 'type' => 'string', 'sanitize_callback' => 'wp_kses_post' ],
                    'mode'   => [ 'type' => 'string', 'default' => 'auto' ],
                ],
            ]
        );
    }

    public function handle_validate( WP_REST_Request $request ): WP_REST_Response
    {
        $script = (string) $request->get_param( 'script' );
        $mode   = (string) $request->get_param( 'mode' );

        if ( '' === trim( $script ) ) {
            return $this->response_with_error( 'The script is empty.', 'empty_script' );
        }

        try {
            // Parser teraz zwraca klucz 'media'
            $parsed = $this->parser->parse( $script );
            error_log('[SC Parser] Parsed: ' . print_r($parsed, true));
        } catch ( \Throwable $e ) {
            return $this->response_with_error( $e->getMessage(), 'PARSER_EXCEPTION', $e->getLine() > 0 ? $e->getLine() : 1 );
        }

        $errors   = array_map( fn($e) => $this->normalize_message($e, 'error'), $parsed['_errors'] ?? [] );
        $warnings = array_map( fn($w) => $this->normalize_message($w, 'warning'), $parsed['_warnings'] ?? [] );

        // Walidacja logiki (teraz rekursywna dla mediów)
        $logicIssues = $this->validate_logic( $parsed, $script );
        
        // 2. Walidacja Bezpieczeństwa (Calc Expressions) - NOWOŚĆ
        $securityIssues = $this->validate_calc_expressions( $parsed, $script );

        // Łączymy wyniki
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

        try {
            $fakeElement = new class() { public function get_id(): string { return 'preview'; } };
            $targetSelector = $parsed['target']['selector'] ?? '.elementor-element-preview';
            $targetType     = isset( $parsed['target']['selector'] ) ? 'custom' : 'wrapper';
            $scrollTrigger  = $this->build_scroll_trigger_config( $parsed['scroll'] ?? [] );
            
            // Detekcja trybu timeline musi uwzględniać kroki w media
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
            return $this->response_with_error( 'Builder Error: ' . $e->getMessage(), 'BUILDER_ERROR' );
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

        // Helper do sprawdzania kluczy w danej sekcji
        $check_keys = function( $data, $sectionName, $allowedKeys ) use ( &$issues, $script ) {
            if ( empty( $data ) ) return;
            foreach ( $data as $key => $val ) {
                $normalizedKey = strtolower($key);
                if ( ! in_array( $normalizedKey, $allowedKeys, true ) ) {
                    // Próbujemy znaleźć linię w kodzie
                    $line = $this->find_line_number($script, $key . ':');
                    $issues[] = $this->create_issue(
                        "Unknown key '{$key}' in [{$sectionName}].", 'warning', $line
                    );
                }
            }
        };

        // Helper do sprawdzania kroków
        $check_steps = function( $steps, $contextPrefix = '' ) use ( &$issues, $script ) {
            if ( empty( $steps ) ) return;
            foreach ( $steps as $index => $step ) {
                foreach ( $step as $key => $val ) {
                    $normalizedKey = strtolower($key);
                    if ( ! in_array( $normalizedKey, self::ALLOWED_KEYS['step'], true ) ) {
                        $line = $this->find_line_number($script, $key . ':');
                        $issues[] = $this->create_issue( 
                            "Unknown key '{$key}' in [{$contextPrefix}step." . ($index + 1) . "].", 'warning', $line 
                        );
                    }
                }
            }
        };

        // 1. Walidacja Globalna
        $check_keys( $parsed['animation'] ?? [], 'animation', self::ALLOWED_KEYS['animation'] );
        $check_keys( $parsed['scroll'] ?? [], 'scroll', self::ALLOWED_KEYS['scroll'] );
        $check_steps( $parsed['timeline']['steps'] ?? [] );

        // 2. Walidacja Mediów (Responsive)
        if ( ! empty( $parsed['media'] ) ) {
            foreach ( $parsed['media'] as $mediaSlug => $mediaData ) {
                $check_keys( $mediaData['animation'] ?? [], "animation @{$mediaSlug}", self::ALLOWED_KEYS['animation'] );
                $check_keys( $mediaData['scroll'] ?? [], "scroll @{$mediaSlug}", self::ALLOWED_KEYS['scroll'] );
                $check_steps( $mediaData['timeline']['steps'] ?? [], "@{$mediaSlug} " );
            }
        }

        return $issues;
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
    
    private function build_scroll_trigger_config( array $scroll ): array
    {
        $scrollTrigger = [
            'start'         => $scroll['start'] ?? 'top 80%',
            'end'           => $scroll['end'] ?? 'bottom 20%',
            'toggleActions' => $scroll['toggleActions'] ?? 'play none none reverse',
        ];
        if ( array_key_exists( 'scrub', $scroll ) ) $scrollTrigger['scrub'] = $scroll['scrub'];
        if ( array_key_exists( 'markers', $scroll ) ) $scrollTrigger['markers'] = (bool) $scroll['markers'];
        
        return $scrollTrigger;
    }

    private function normalize_message( $item, string $severity = 'error' ): array {
        $message = 'Unknown issue';
        $line    = 1;
        if ( is_string( $item ) ) { $message = $item; } 
        elseif ( is_array( $item ) ) {
            $message = (string) ( $item['message'] ?? 'Unknown issue' );
            $line    = (int) ( $item['line'] ?? 1 );
        }
        if ( $line === 1 && preg_match( '/at line (\d+)/i', $message, $matches ) ) {
            $line = (int) $matches[1];
        }
        return [ 'message' => $message, 'severity' => $severity, 'line' => $line ];
    }

    private function find_line_number(string $script, string $searchPhrase): int {
        $lines = explode("\n", $script);
        foreach ($lines as $index => $line) {
            $trimLine = trim($line);
            // Ignorujemy linie będące w całości komentarzami (zaczynające się od //)
            if (strpos($trimLine, '//') === 0) {
                continue;
            }
            
            if (strpos($line, $searchPhrase) !== false) {
                 return $index + 1;
            }
        }
        return 1;
    }

        /**
     * Sprawdza bezpieczeństwo wyrażeń calc()
     */
    private function validate_calc_expressions( array $parsed, string $script ): array
    {
        $issues = [];
        
        $finder = function( $data, $path = '' ) use ( &$finder, &$issues, $script ) {
            foreach ( $data as $key => $val ) {
                if ( is_array( $val ) ) {
                    $finder( $val, $path . '.' . $key );
                } elseif ( is_string( $val ) && stripos( $val, 'calc(' ) !== false ) {
                    if ( preg_match( '/calc\s*\((.*)\)/i', $val, $matches ) ) {
                        $expression = $matches[1];
                        $cleanExpr = $expression;
                        
                        $vars = ['sw', 'cw', 'ch', 'vw', 'vh', 'center', 'vcenter', 'end'];
                        foreach($vars as $v) {
                             $cleanExpr = preg_replace("/\\b{$v}\\b/i", '', $cleanExpr);
                        }
                        
                        // Sprawdzamy czy zostały tylko bezpieczne znaki (cyfry, operatory)
                        if ( ! preg_match( '/^[0-9\.\+\-\*\/\(\)\s]*$/', $cleanExpr ) ) {
                             $lines = explode("\n", $script);
                             $lineNum = 1;
                             foreach ($lines as $idx => $line) {
                                 if (strpos($line, $val) !== false) { $lineNum = $idx + 1; break; }
                             }

                             $issues[] = [ 
                                'message' => "Unsafe characters in calc(): '{$expression}'. Only math and vars (sw, vw, center...) are allowed.",
                                'severity' => 'error',
                                'line' => $lineNum
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
