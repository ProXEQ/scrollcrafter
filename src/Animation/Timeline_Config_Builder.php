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

        $mediaConfigs = [];
        $mediaRaw = $parsed['media'] ?? [];

        foreach ($mediaRaw as $mediaSlug => $mediaData) {
            $mediaConfig = [];
            $mediaTlData = $mediaData['timeline'] ?? [];

            if (!empty($mediaTlData['defaults'])) {
                $mediaConfig['timelineVars']['defaults'] = $mediaTlData['defaults'];
            }
            
            $mediaScroll = $mediaData['scroll'] ?? [];
            if (!empty($mediaScroll)) {
                $mediaConfig['timelineVars']['scrollTrigger'] = $mediaScroll;
            }

            $isStrict = false;

            if (isset($mediaTlData['defaults']['strict'])) {
                $isStrict = (bool)$mediaTlData['defaults']['strict'];
                unset($mediaConfig['timelineVars']['defaults']['strict']);
            }
            
            if (isset($mediaScroll['strict'])) {
                $isStrict = (bool)$mediaScroll['strict'];
                unset($mediaConfig['timelineVars']['scrollTrigger']['strict']);
            }

            if ($isStrict) {
                $mediaConfig['strict'] = true;
            }

            if (!empty($mediaTlData['steps'])) {
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
