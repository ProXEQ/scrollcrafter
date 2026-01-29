<?php

namespace ScrollCrafter\Support;

if ( ! defined( "ABSPATH" ) ) {
    exit;
}
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
        if ( defined( 'SCROLLCRAFTER_FORCE_LOG' ) && SCROLLCRAFTER_FORCE_LOG ) {
            return true;
        }

        if ( ! defined( 'WP_DEBUG' ) || ! WP_DEBUG ) {
            return false;
        }

        if ( defined( 'WP_DEBUG_LOG' ) && ! WP_DEBUG_LOG ) {
            return false;
        }

        if ( class_exists( Config::class ) ) {
            return Config::instance()->is_debug();
        }

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

        $prefix = sprintf( '[ScrollCrafter][%s] ', $context );
        error_log( $prefix . $message );
    }
}
