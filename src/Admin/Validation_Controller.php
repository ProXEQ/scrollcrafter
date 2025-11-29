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

    // Dozwolone klucze dla walidacji (prosta schema)
    private const ALLOWED_KEYS = [
        'animation' => ['type', 'from', 'to', 'duration', 'delay', 'ease', 'stagger'],
        'scroll'    => ['start', 'end', 'scrub', 'once', 'markers', 'toggleactions', 'pin', 'pinspacing', 'snap', 'anticipatepin'],
        'target'    => ['selector'],
        'step'      => ['type', 'selector', 'from', 'to', 'duration', 'delay', 'ease', 'stagger', 'startat'],
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
            // 1. Parsowanie składniowe (czy format [sekcja] klucz: wartosc jest ok)
            $parsed = $this->parser->parse( $script );
        } catch ( \Throwable $e ) {
            return $this->response_with_error( $e->getMessage(), 'PARSER_EXCEPTION', $e->getLine() );
        }

        // Pobierz błędy składniowe z parsera
        $errors   = array_map( fn($e) => $this->normalize_message($e, 'error'), $parsed['_errors'] ?? [] );
        $warnings = array_map( fn($w) => $this->normalize_message($w, 'warning'), $parsed['_warnings'] ?? [] );

        // 2. Walidacja Logiczna (czy klucze mają sens)
        $logicIssues = $this->validate_logic( $parsed );
        foreach ( $logicIssues as $issue ) {
            if ( $issue['severity'] === 'error' ) {
                $errors[] = $issue;
            } else {
                $warnings[] = $issue;
            }
        }

        // Jeśli są błędy krytyczne, przerywamy przed budowaniem configu
        if ( ! empty( $errors ) ) {
            return new WP_REST_Response([
                'ok' => false, 'errors' => $errors, 'warnings' => $warnings, 'config' => null
            ], 200);
        }

        // 3. Budowanie Configu (Symulacja)
        try {
            $fakeElement = new class() { public function get_id(): string { return 'preview'; } };
            $targetSelector = $parsed['target']['selector'] ?? '.elementor-element-preview';
            $targetType     = isset( $parsed['target']['selector'] ) ? 'custom' : 'wrapper';
            $scrollTrigger  = $this->build_scroll_trigger_config( $parsed['scroll'] ?? [] );
            $isTimeline     = ! empty( $parsed['timeline']['steps'] );

            if ( 'timeline' === $mode || ( 'auto' === $mode && $isTimeline ) ) {
                $config = $this->timelineBuilder->build($fakeElement, $parsed, $scrollTrigger, $targetSelector, $targetType);
            } else {
                $config = $this->tweenBuilder->build($fakeElement, $parsed, $scrollTrigger, $targetSelector, $targetType);
            }
        } catch ( \Throwable $e ) {
            return $this->response_with_error( 'Builder Error: ' . $e->getMessage(), 'BUILDER_ERROR' );
        }

        return new WP_REST_Response([
            'ok'       => true,
            'errors'   => [], // Pusta tablica = sukces
            'warnings' => $warnings,
            'config'   => $config,
        ], 200);
    }

    /**
     * Sprawdza poprawność nazw kluczy i wartości.
     */
    private function validate_logic( array $parsed ): array
    {
        $issues = [];

        // Sprawdź sekcję [animation]
        if ( ! empty( $parsed['animation'] ) ) {
            foreach ( $parsed['animation'] as $key => $val ) {
                if ( ! in_array( $key, self::ALLOWED_KEYS['animation'], true ) ) {
                    $issues[] = $this->create_issue( "Unknown key '{$key}' in [animation]. Did you mean '" . $this->suggest_key($key, 'animation') . "'?", 'warning' );
                }
            }
        }

        // Sprawdź sekcję [scroll]
        if ( ! empty( $parsed['scroll'] ) ) {
            foreach ( $parsed['scroll'] as $key => $val ) {
                $normalizedKey = strtolower($key); // ScrollTrigger keys case-insensitive check here
                if ( ! in_array( $normalizedKey, self::ALLOWED_KEYS['scroll'], true ) ) {
                    $issues[] = $this->create_issue( "Unknown key '{$key}' in [scroll].", 'warning' );
                }
            }
        }

        // Sprawdź kroki timeline
        if ( ! empty( $parsed['timeline']['steps'] ) ) {
            foreach ( $parsed['timeline']['steps'] as $index => $step ) {
                foreach ( $step as $key => $val ) {
                     if ( ! in_array( $key, self::ALLOWED_KEYS['step'], true ) ) {
                        $issues[] = $this->create_issue( "Unknown key '{$key}' in [step." . ($index + 1) . "].", 'warning' );
                    }
                }
            }
        }

        return $issues;
    }

    private function suggest_key(string $badKey, string $section): string {
        // Prosty mechanizm sugestii (można użyć levenshtein w przyszłości)
        return self::ALLOWED_KEYS[$section][0] ?? '';
    }

    private function create_issue( string $message, string $severity = 'warning', int $line = 1 ): array
    {
        return [
            'message'  => $message,
            'severity' => $severity,
            'line'     => $line,
            'from'     => 0, // JS określi pozycję
            'to'       => 0
        ];
    }

    private function response_with_error( string $message, string $code, int $line = 1 ): WP_REST_Response
    {
        return new WP_REST_Response([
            'ok'       => false,
            'errors'   => [[
                'message' => $message, 'code' => $code, 'severity' => 'error', 'line' => $line
            ]],
            'warnings' => [],
            'config'   => null
        ], 200);
    }

    // ... (Metody build_scroll_trigger_config i normalize_message pozostają bez zmian, skopiuj je ze starego pliku) ...
    // Skopiuj build_scroll_trigger_config z poprzedniej wersji.
    // Skopiuj normalize_message z poprzedniej wersji.
    
     private function build_scroll_trigger_config( array $scroll ): array
    {
        $scrollTrigger = [
            'start'         => $scroll['start'] ?? 'top 80%',
            'end'           => $scroll['end'] ?? 'bottom 20%',
            'toggleActions' => $scroll['toggleActions'] ?? 'play none none reverse',
        ];
        // ... (skrócona wersja dla czytelności, użyj pełnej z poprzednich kroków)
         if ( array_key_exists( 'scrub', $scroll ) ) $scrollTrigger['scrub'] = $scroll['scrub'];
         if ( array_key_exists( 'markers', $scroll ) ) $scrollTrigger['markers'] = (bool) $scroll['markers'];
        
        return $scrollTrigger;
    }
    
    private function normalize_message( $item, string $severity = 'error' ): array {
        if ( is_string( $item ) ) return [ 'message' => $item, 'severity' => $severity, 'line' => 1 ];
        return [
            'message'   => (string) ( $item['message'] ?? 'Unknown issue' ),
            'severity'  => $severity,
            'line'      => (int) ($item['line'] ?? 1),
        ];
    }
}
