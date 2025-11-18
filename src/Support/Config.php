<?php

namespace ScrollCrafter\Support;

/**
 * Globalna konfiguracja pluginu ScrollCrafter.
 *
 * Odpowiada za odczyt i podstawową walidację opcji z bazy danych.
 *
 * Wszystkie opcje trzymamy w jednym rekordzie:
 *  - option_name: scrollcrafter_settings
 *
 * Struktura (przykładowa):
 *  [
 *      'gsap_mode'          => 'local' | 'cdn_custom' | 'cdn_gsap_docs',
 *      'gsap_cdn_url'       => 'https://cdn.jsdelivr.net/...',
 *      'scrolltrigger_cdn'  => 'https://cdn.jsdelivr.net/...',
 *      'debug_mode'         => true|false,
 *  ]
 */
class Config
{
    private const OPTION_NAME = 'scrollcrafter_settings';

    /**
     * @var Config|null
     */
    private static ?Config $instance = null;

    /**
     * @var array<string,mixed>
     */
    private array $options = [];

    private function __construct()
    {
        $raw = get_option( self::OPTION_NAME, [] );

        if ( ! is_array( $raw ) ) {
            $raw = [];
        }

        $this->options = $raw;
    }

    public static function instance(): Config
    {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    /**
     * Zwraca tryb ładowania GSAP.
     *
     * 'local'       - lokalny bundle (domyślne).
     * 'cdn_custom'  - adresy CDN z ustawień pluginu.
     * 'cdn_gsap_docs' - predefiniowany CDN wg oficjalnego snippetu GSAP.
     */
    public function get_gsap_mode(): string
    {
        $mode = $this->options['gsap_mode'] ?? 'local';

        $allowed = [ 'local', 'cdn_custom', 'cdn_gsap_docs' ];

        if ( ! in_array( $mode, $allowed, true ) ) {
            return 'local';
        }

        return $mode;
    }

    /**
     * URL GSAP CDN (dla trybu 'cdn_custom').
     */
    public function get_gsap_cdn_url(): string
    {
        $url = (string) ( $this->options['gsap_cdn_url'] ?? '' );

        if ( '' === $url ) {
            // sensowny fallback, ale i tak używamy go tylko w trybie cdn_custom
            $url = 'https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js';
        }

        return esc_url_raw( $url );
    }

    /**
     * URL ScrollTrigger CDN (dla trybu 'cdn_custom').
     */
    public function get_scrolltrigger_cdn_url(): string
    {
        $url = (string) ( $this->options['scrolltrigger_cdn'] ?? '' );

        if ( '' === $url ) {
            $url = 'https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js';
        }

        return esc_url_raw( $url );
    }

    /**
     * Czy plugin powinien działać w trybie debug (np. markers w ScrollTrigger).
     */
    public function is_debug(): bool
    {
        $debug = $this->options['debug_mode'] ?? false;

        return (bool) $debug;
    }

    /**
     * Uniwersalny getter opcji (może się przydać w przyszłości).
     *
     * @param string $key
     * @param mixed  $default
     *
     * @return mixed
     */
    public function get( string $key, $default = null )
    {
        if ( array_key_exists( $key, $this->options ) ) {
            return $this->options[ $key ];
        }

        return $default;
    }

    /**
     * Helper do odświeżenia cache opcji po zapisie.
     */
    public function reload(): void
    {
        $raw = get_option( self::OPTION_NAME, [] );

        if ( ! is_array( $raw ) ) {
            $raw = [];
        }

        $this->options = $raw;
    }
}
