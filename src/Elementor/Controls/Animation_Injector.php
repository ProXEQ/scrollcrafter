<?php

namespace ScrollCrafter\Elementor\Controls;

if ( ! defined( "ABSPATH" ) ) {
    exit;
}
use Elementor\Controls_Manager;
use Elementor\Element_Base;
use ScrollCrafter\Support\Logger;

class Animation_Injector
{
    public function hooks(): void
    {
        // Containers (New)
        add_action(
            'elementor/element/container/_section_responsive/after_section_end',
            [ $this, 'add_section_for_element' ],
            10,
            2
        );

        // All Widgets
        add_action(
            'elementor/element/common/_section_responsive/after_section_end',
            [ $this, 'add_section_for_element' ],
            10,
            2
        );

        // Sections (Legacy)
        add_action(
            'elementor/element/section/_section_responsive/after_section_end',
            [ $this, 'add_section_for_element' ],
            10,
            2
        );

        // Columns (Legacy)
        add_action(
            'elementor/element/column/_section_responsive/after_section_end',
            [ $this, 'add_section_for_element' ],
            10,
            2
        );
    }

    public function add_section_for_element( Element_Base $element, array $args ): void
    {
        $this->add_scrollcrafter_section( $element );
    }

    /**
     * Minimalna sekcja: enable + script DSL.
     */
    private function add_scrollcrafter_section( Element_Base $element ): void
    {
        $element->start_controls_section(
            'scrollcrafter_section_animation',
            [
                'label' => esc_html__( 'ScrollCrafter Animations', 'scrollcrafter' ),
                'tab'   => Controls_Manager::TAB_ADVANCED,
            ]
        );

        $element->add_control(
            'scrollcrafter_enable',
            [
                'label'        => esc_html__( 'Enable ScrollCrafter', 'scrollcrafter' ),
                'type'         => Controls_Manager::SWITCHER,
                'label_on'     => esc_html__( 'Yes', 'scrollcrafter' ),
                'label_off'    => esc_html__( 'No', 'scrollcrafter' ),
                'return_value' => 'yes',
                'default'      => '',
            ]
        );

        $element->add_control(
            'scrollcrafter_script',
            [
                'label'       => esc_html__( 'Animation script', 'scrollcrafter' ),
                'type'        => Controls_Manager::TEXTAREA,
                'rows'        => 10,
                'placeholder' => esc_html__( "[animation] ...", 'scrollcrafter' ),
                'description' => esc_html__( 'Click button at the bottom to open the DSL Editor.', 'scrollcrafter' ),
                'condition'   => [
                    'scrollcrafter_enable' => 'yes',
                ],
            ]
        );

        $element->add_control(
            'scrollcrafter_open_editor',
            [
                'type'        => Controls_Manager::BUTTON,
                'text'        => esc_html__( 'Open Editor', 'scrollcrafter' ),
                'button_type' => 'default',
                'event'       => 'scrollcrafter:open_editor',
                'separator'   => 'before',
                'condition'   => [
                    'scrollcrafter_enable' => 'yes',
                ],
            ]
        );

        $element->end_controls_section();
    }
}
