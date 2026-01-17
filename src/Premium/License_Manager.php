<?php

namespace ScrollCrafter\Premium;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class License_Manager {

    private static ?License_Manager $instance = null;

    public static function instance(): License_Manager {
        if ( is_null( self::$instance ) ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Helper to safely access global freemius instance.
     * @return \Freemius|null
     */
    public function fs() {
        global $scrollcrafter_fs;
        if ( isset( $scrollcrafter_fs ) ) {
            return $scrollcrafter_fs;
        }
        return null;
    }

    public function is_premium(): bool {
        $fs = $this->fs();
        return $fs && $fs->can_use_premium_code();
    }

    public function is_plan( string $plan_name ): bool {
        $fs = $this->fs();
        return $fs && $fs->is_plan( $plan_name );
    }

    public function get_upgrade_url(): string {
        $fs = $this->fs();
        return $fs ? $fs->get_upgrade_url() : '#';
    }

    /**
     * Checks if a specific feature is enabled (e.g. 'stagger_grid', 'split_text')
     * This allows us to gate specific features behind different plans if needed.
     */
    public function can_use_feature( string $feature_slug ): bool {
        if ( ! $this->is_premium() ) {
            return false;
        }

        // Future: Plan logic
        // if ( 'advanced_grid' === $feature_slug && ! $this->is_plan('business') ) return false;

        return true;
    }
}
