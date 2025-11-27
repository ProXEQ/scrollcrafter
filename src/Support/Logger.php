<?php

namespace ScrollCrafter\Support;

/**
 * Prosty logger dla ScrollCrafter.
 *
 * Loguje do standardowego debug.log WordPressa (wp-content/debug.log),
 * jeśli WP_DEBUG_LOG jest włączone ORAZ (opcjonalnie) włączony jest tryb debugowania wtyczki.
 */
class Logger
{
    /**
     * Czy logger jest włączony.
     */
    public static function is_enabled(): bool
    {
        // 1. Jeśli WP_DEBUG nie jest włączone, nigdy nie loguj.
        if ( ! defined( 'WP_DEBUG' ) || ! WP_DEBUG ) {
            error_log( '[ScrollCrafter][Logger] WP_DEBUG is not enabled. Logging is disabled.' );
            return false;
        }

        // 2. Jeśli WP_DEBUG_LOG nie jest włączone, logowanie nie ma sensu (nie trafi do pliku).
        if ( defined( 'WP_DEBUG_LOG' ) && ! WP_DEBUG_LOG ) {
            error_log( '[ScrollCrafter][Logger] WP_DEBUG_LOG is not enabled. Logging is disabled.' );
            return false;
        }

        // 3. Sprawdź ustawienia wtyczki (jeśli klasa Config jest dostępna).
        if ( class_exists( Config::class ) ) {
            return Config::instance()->is_debug();
        }

        error_log( '[ScrollCrafter][Logger] Config class not found. Falling back to logging enabled.' );
        return true;
    }

    /**
     * Zapisuje wiadomość do loga.
     *
     * @param mixed  $message  String/array/object do zalogowania.
     * @param string $context  Krótki tag kontekstu (np. 'assets', 'widget', 'js').
     */
    public static function log( $message, string $context = 'scrollcrafter' ): void
    {
        if ( ! self::is_enabled() ) {
            return;
        }

        if ( is_array( $message ) || is_object( $message ) ) {
            $message = print_r( $message, true );
        }

        $prefix = sprintf( '[ScrollCrafter][%s] ', $context );

        error_log( $prefix . $message );
    }

    /**
     * Helper do logowania wyjątków.
     */
    public static function log_exception( \Throwable $e, string $context = 'exception' ): void
    {
        // Wyjątki logujemy zawsze, jeśli WP_DEBUG jest włączone, niezależnie od ustawień wtyczki,
        // ponieważ są to błędy krytyczne.
        if ( ! defined( 'WP_DEBUG' ) || ! WP_DEBUG ) {
            return;
        }

        $message = sprintf(
            '%s: %s in %s:%d%sStack trace:%s%s',
            get_class( $e ),
            $e->getMessage(),
            $e->getFile(),
            $e->getLine(),
            PHP_EOL,
            PHP_EOL,
            $e->getTraceAsString()
        );

        // Używamy error_log bezpośrednio, aby pominąć sprawdzenie is_enabled()
        $prefix = sprintf( '[ScrollCrafter][%s] ', $context );
        error_log( $prefix . $message );
    }
}
