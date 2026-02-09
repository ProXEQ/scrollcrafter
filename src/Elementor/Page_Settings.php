<?php

namespace ScrollCrafter\Elementor;

if ( ! defined( "ABSPATH" ) ) {
    exit;
}

use Elementor\Controls_Manager;
use Elementor\Core\DocumentTypes\PageBase;

/**
 * Elementor Page Settings for ScrollCrafter Pro features.
 * Allows per-page override of global smooth scroll settings.
 */
class Page_Settings
{
    public function hooks(): void
    {
        // Only register for Pro users
        if ( ! sc_is_pro() ) {
            return;
        }

        add_action( 'elementor/documents/register_controls', [ $this, 'register_page_controls' ] );
    }

    /**
     * Register ScrollCrafter controls in Page Settings.
     *
     * @param \Elementor\Core\Base\Document $document
     */
    public function register_page_controls( $document ): void
    {
        // Only add to page-type documents
        if ( ! $document instanceof PageBase ) {
            return;
        }

        $document->start_controls_section(
            'scrollcrafter_page_settings',
            [
                'label' => __( 'ScrollCrafter', 'scrollcrafter' ),
                'tab'   => Controls_Manager::TAB_SETTINGS,
            ]
        );

        $document->add_control(
            'scrollcrafter_smooth_scroll',
            [
                'label'       => __( 'Smooth Scroll', 'scrollcrafter' ),
                'type'        => Controls_Manager::SELECT,
                'default'     => 'default',
                'options'     => [
                    'default' => __( 'Default (use global setting)', 'scrollcrafter' ),
                    'enable'  => __( 'Enable on this page', 'scrollcrafter' ),
                    'disable' => __( 'Disable on this page', 'scrollcrafter' ),
                ],
                'description' => __( 'Override the global smooth scroll setting for this page.', 'scrollcrafter' ),
            ]
        );

        $document->add_control(
            'scrollcrafter_smooth_lerp',
            [
                'label'       => __( 'Smoothness (lerp)', 'scrollcrafter' ),
                'type'        => Controls_Manager::NUMBER,
                'default'     => '',
                'min'         => 0.01,
                'max'         => 1,
                'step'        => 0.01,
                'placeholder' => __( 'Default', 'scrollcrafter' ),
                'description' => __( 'Lower = smoother. Leave empty to use global value.', 'scrollcrafter' ),
                'condition'   => [
                    'scrollcrafter_smooth_scroll' => 'enable',
                ],
            ]
        );

        $document->end_controls_section();
    }

    /**
     * Get page-level smooth scroll settings.
     *
     * @param int $post_id
     * @return array|null Null if default, array with settings if override
     */
    public static function get_page_settings( int $post_id ): ?array
    {
        if ( ! sc_is_pro() ) {
            return null;
        }

        $document = \Elementor\Plugin::$instance->documents->get( $post_id );
        if ( ! $document ) {
            return null;
        }

        $smooth_scroll = $document->get_settings( 'scrollcrafter_smooth_scroll' );

        // Default = no override
        if ( empty( $smooth_scroll ) || $smooth_scroll === 'default' ) {
            return null;
        }

        $result = [
            'enabled' => $smooth_scroll === 'enable',
        ];

        // Get custom lerp if set
        if ( $smooth_scroll === 'enable' ) {
            $lerp = $document->get_settings( 'scrollcrafter_smooth_lerp' );
            if ( ! empty( $lerp ) && is_numeric( $lerp ) ) {
                $result['lerp'] = (float) $lerp;
            }
        }

        return $result;
    }
}
