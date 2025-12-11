<?php

namespace ScrollCrafter\Elementor;

use Elementor\Widgets_Manager;
use Elementor\Widget_Base;
use ScrollCrafter\Support\Config;
use ScrollCrafter\Support\Logger;

/**
 * Integracja z Elementorem: rejestracja dedykowanych widgetów ScrollCrafter.
 */
class Plugin_Integration
{
    public function hooks(): void
    {
        // Rejestracja widgetów.
        add_action( 'elementor/widgets/register', [ $this, 'register_widgets' ] );
        
        // Assety dla dedykowanych widgetów (frontend + editor).
        add_action( 'elementor/frontend/after_enqueue_scripts', [ $this, 'enqueue_widget_assets' ] );
        add_action( 'elementor/editor/after_enqueue_scripts', [ $this, 'enqueue_widget_assets' ] );
    }

    /**
     * Rejestruje niestandardowe widgety ScrollCrafter.
     *
     * @param Widgets_Manager $widgets_manager
     */
    public function register_widgets( Widgets_Manager $widgets_manager ): void
    {
        /**
         * Filtr pozwalający dodawać własne widgety do ScrollCraftera.
         * 
         * @param array $widgets Lista FQCN klas widgetów (string[]).
         */
        $widget_classes = apply_filters( 'scrollcrafter/widgets', [] );

        if ( empty( $widget_classes ) || ! is_array( $widget_classes ) ) {
            return;
        }

        $registered = [];
        $failed     = [];

        foreach ( $widget_classes as $widget_class ) {
            try {
                // Walidacja: czy klasa istnieje i dziedziczy po Widget_Base
                if ( ! class_exists( $widget_class ) ) {
                    $failed[] = $widget_class . ' (class not found)';
                    continue;
                }

                if ( ! is_subclass_of( $widget_class, Widget_Base::class ) ) {
                    $failed[] = $widget_class . ' (not a valid Elementor widget)';
                    continue;
                }

                // Instancjonowanie i rejestracja
                $widget_instance = new $widget_class();
                $widgets_manager->register( $widget_instance );
                $registered[] = $widget_class;

            } catch ( \Throwable $e ) {
                $failed[] = $widget_class . ' (exception: ' . $e->getMessage() . ')';
                
                // Logujemy wyjątek, jeśli debug jest włączony
                if ( Config::instance()->is_debug() ) {
                    Logger::log_exception( $e, 'widget_registration' );
                }
            }
        }

        // Jeden zbiorczy log zamiast wielu
        if ( ! empty( $registered ) && Config::instance()->is_debug() ) {
            Logger::log( 'Registered widgets: ' . implode( ', ', $registered ), 'elementor' );
        }

        if ( ! empty( $failed ) && Config::instance()->is_debug() ) {
            Logger::log( 'Failed to register widgets: ' . implode( ', ', $failed ), 'elementor' );
        }
    }

    /**
     * Ładuje assety specyficzne dla dedykowanych widgetów ScrollCrafter.
     * Obecnie puste - miejsce na przyszłe rozszerzenia.
     */
    public function enqueue_widget_assets(): void
    {
    }
}
