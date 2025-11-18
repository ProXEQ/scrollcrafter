<?php

namespace ScrollCrafter\Support;

/**
 * Prosty logger dla ScrollCrafter.
 *
 * Loguje do standardowego debug.log WordPressa (wp-content/debug.log),
 * jeśli WP_DEBUG_LOG jest włączone.
 */
class Logger
{
    /**
     * Czy logger jest włączony.
     *
     * Domyślnie powiązany z WP_DEBUG oraz opcją debug_mode w Config.
     */
    // public static function is_enabled(): bool
    // {
    //     if ( ! defined( 'WP_DEBUG' ) || ! WP_DEBUG ) {
    //         return false;
    //     }

    //     // Opcjonalnie: powiąż z ustawieniem pluginu (debug_mode).
    //     if ( class_exists( Config::class ) ) {
    //         $config = Config::instance();
    //         return $config->is_debug();
    //     }

    //     return true;
    // }
    public static function is_enabled(): bool
    {
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

        $prefix = sprintf('[ScrollCrafter][%s] ', $context);

        error_log( $prefix . $message );
    }

    /**
     * Helper do logowania wyjątków.
     */
    public static function log_exception( \Throwable $e, string $context = 'exception' ): void
    {
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

        self::log( $message, $context );
    }
}
