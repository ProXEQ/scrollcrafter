<?php
/**
 * Cache utility for ScrollCrafter.
 * Handles purging of various popular WordPress caching plugins.
 */

namespace ScrollCrafter\Support;

if ( ! defined( "ABSPATH" ) ) {
    exit;
}

class Cache
{
    /**
     * Purge all known caches.
     */
    public static function purge_all(): void
    {
        // 1. WP Rocket
        if ( function_exists( 'rocket_clean_domain' ) ) {
            rocket_clean_domain();
        }

        // 2. LiteSpeed Cache
        if ( class_exists( '\LiteSpeed\Pure' ) || has_action( 'litespeed_purge_all' ) ) {
            do_action( 'litespeed_purge_all' );
        }

        // 3. Autoptimize
        if ( class_exists( '\autoptimizeCache' ) ) {
            \autoptimizeCache::clearall();
        }

        // 4. SG Optimizer (SiteGround)
        if ( function_exists( 'sg_cachepress_purge_cache' ) ) {
            sg_cachepress_purge_cache();
        }

        // 5. W3 Total Cache
        if ( function_exists( 'w3tc_flush_all' ) ) {
            w3tc_flush_all();
        }

        // 6. WP Super Cache
        if ( function_exists( 'wp_cache_clear_cache' ) ) {
            wp_cache_clear_cache();
        }

        // 7. SiteGround Central
        if ( has_action( 'siteground_central_purge_cache' ) ) {
            do_action( 'siteground_central_purge_cache' );
        }

        // 8. Kinsta
        if ( class_exists( 'Kinsta\Cache' ) ) {
            do_action( 'kinsta_cache_purge_all' );
        }
    }

    /**
     * Hook into settings updates to purge cache automatically.
     */
    public static function register_hooks(): void
    {
        add_action( 'update_option_scrollcrafter_settings', [ self::class, 'purge_all' ] );
    }
}
