<?php

namespace ScrollCrafter\Animation;

class Timeline_Config_Builder
{
    public function build(
        $element,
        array $parsed,
        array $scrollTrigger,
        string $targetSelector,
        string $targetType
    ): array {
        // --- 1. Budowa Configu Globalnego (Standard) ---
        $tlData = $parsed['timeline'] ?? [];
        $defaults = $tlData['defaults'] ?? [];
        $timelineVars = [];
        
        if (!empty($defaults)) {
            $timelineVars['defaults'] = $defaults;
        }

        if (!empty($scrollTrigger)) {
            $timelineVars['scrollTrigger'] = $scrollTrigger;
        }

        $steps = $this->buildSteps($tlData['steps'] ?? []);

        // --- 2. Budowa Configu dla Media (Responsive) ---
        $mediaConfigs = [];
        $mediaRaw = $parsed['media'] ?? [];

        foreach ($mediaRaw as $mediaSlug => $mediaData) {
            $mediaConfig = [];
            $mediaTlData = $mediaData['timeline'] ?? [];

            // a) Nadpisywanie Defaults
            if (!empty($mediaTlData['defaults'])) {
                $mediaConfig['timelineVars']['defaults'] = $mediaTlData['defaults'];
            }
            
            // b) ScrollTrigger w media
            $mediaScroll = $mediaData['scroll'] ?? [];
            if (!empty($mediaScroll)) {
                $mediaConfig['timelineVars']['scrollTrigger'] = $mediaScroll;
            }

            // c) Obsługa flagi STRICT (Nowość)
            // Strict może być w defaults (timeline) lub w scrollTrigger
            $isStrict = false;

            // Sprawdzamy w defaults (np. [timeline @mobile] strict: true)
            if (isset($mediaTlData['defaults']['strict'])) {
                $isStrict = (bool)$mediaTlData['defaults']['strict'];
                // Usuwamy z defaults, żeby GSAP nie krzyczał
                unset($mediaConfig['timelineVars']['defaults']['strict']);
            }
            
            // Sprawdzamy w scroll (np. [scroll @mobile] strict: true)
            if (isset($mediaScroll['strict'])) {
                $isStrict = (bool)$mediaScroll['strict'];
                // Usuwamy z scrollTrigger
                unset($mediaConfig['timelineVars']['scrollTrigger']['strict']);
            }

            // Zapisujemy flagę w głównym obiekcie mediaConfig
            if ($isStrict) {
                $mediaConfig['strict'] = true;
            }

            // d) Nadpisywanie Kroków (Steps)
            if (!empty($mediaTlData['steps'])) {
                // Pobieramy globalne kroki jako bazę
                $mergedStepsRaw = $tlData['steps'] ?? [];
                
                foreach ($mediaTlData['steps'] as $idx => $stepOverride) {
                    if (isset($mergedStepsRaw[$idx])) {
                        $mergedStepsRaw[$idx] = array_merge($mergedStepsRaw[$idx], $stepOverride);
                    } else {
                        $mergedStepsRaw[$idx] = $stepOverride;
                    }
                }
                
                ksort($mergedStepsRaw);
                $mediaConfig['steps'] = $this->buildSteps($mergedStepsRaw);
            }

            // Jeśli cokolwiek zdefiniowano dla tego breakpointu, dodajemy do wyniku
            if (!empty($mediaConfig)) {
                $mediaConfigs[$mediaSlug] = $mediaConfig;
            }
        }

        return [
            'widget'       => 'scroll_timeline',
            'id'           => $element->get_id(),
            'target'       => [
                'type'     => $targetType,
                'selector' => $targetSelector,
            ],
            'timelineVars' => $timelineVars,
            'steps'        => $steps,
            'media'        => $mediaConfigs, 
        ];
    }

    /**
     * Helper do budowania kroków
     */
    private function buildSteps(array $rawSteps): array
    {
        $steps = [];
        foreach ($rawSteps as $step) {
            $method = strtolower($step['type'] ?? 'to');
            if (!in_array($method, ['to', 'from', 'fromto', 'set', 'addlabel', 'call'], true)) {
                $method = 'to';
            }

            $selector = $step['selector'] ?? null;
            $position = $step['position'] ?? null;
            $vars  = [];
            $vars2 = [];

            if ($method === 'fromto') {
                $vars  = $step['from'] ?? [];
                $vars2 = array_merge($step['to'] ?? [], $this->extractParams($step));
            } elseif (in_array($method, ['to', 'from', 'set'])) {
                $source = ($method === 'from') ? ($step['from'] ?? []) : ($step['to'] ?? []);
                $vars = array_merge($source, $this->extractParams($step));
            } elseif ($method === 'addlabel') {
                $vars = $step['label'] ?? 'label_' . rand(100,999);
            }

            $steps[] = [
                'method'   => $method,
                'selector' => $selector,
                'vars'     => $vars,
                'vars2'    => $vars2,
                'position' => $position,
            ];
        }
        return $steps;
    }

    private function extractParams(array $step): array {
        $params = [];
        $keys = ['duration', 'delay', 'ease', 'stagger', 'startAt', 'yoyo', 'repeat'];
        foreach ($keys as $k) {
            if (isset($step[$k])) {
                $params[$k] = $step[$k];
            }
        }
        return $params;
    }
}
