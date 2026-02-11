<?php

namespace ScrollCrafter\Animation;

if ( ! defined( "ABSPATH" ) ) {
    exit;
}
class Tween_Config_Builder
{
    public function build(
        $element,
        array $parsed,
        array $scrollTrigger,
        string $targetSelector,
        string $targetType
    ): array {
        // Normalize parsed data to strip line numbers
        $parsed = $this->normalizeParsedData($parsed);
        $scrollTrigger = $this->normalizeParsedData($scrollTrigger);

        $animData = $parsed['animation'] ?? [];
        $finalConfig = $this->buildTweenConfig($animData, $scrollTrigger);

        $mediaConfigs = [];
        $mediaRaw = $parsed['media'] ?? [];

        foreach ($mediaRaw as $mediaSlug => $mediaData) {
            $mediaAnim = $mediaData['animation'] ?? [];
            $mediaScroll = $mediaData['scroll'] ?? []; 

            if (empty($mediaAnim) && empty($mediaScroll)) {
                continue;
            }

            $mergedAnim = $this->mergeAnimData($animData, $mediaAnim);
            
            $mergedScroll = !empty($mediaScroll) ? $mediaScroll : $scrollTrigger;

            if (isset($mediaScroll['strict'])) {
                $mergedAnim['strict'] = $mediaScroll['strict'];
            }

            $mediaConfigs[$mediaSlug] = $this->buildTweenConfig($mergedAnim, $mergedScroll);
        }
        
        
        return [
            'widget' => 'scroll_animation', 
            'id'     => $element->get_id(),
            'target' => [
                'type'     => $targetType,
                'selector' => $targetSelector,
            ],
            'animation' => $finalConfig,
            'media'     => $mediaConfigs,
            'disabled'  => $parsed['disabled'] ?? [], // Pass disabled breakpoints to frontend
        ];
    }

    private function normalizeParsedData(array $data): array {
        $clean = [];
        foreach ($data as $key => $item) {
            if (is_array($item) && array_key_exists('value', $item) && array_key_exists('line', $item)) {
                 $clean[$key] = $item['value'];
            } elseif (is_array($item)) {
                 $clean[$key] = $this->normalizeParsedData($item);
            } else {
                 $clean[$key] = $item;
            }
        }
        return $clean;
    }

    private function mergeAnimData(array $base, array $override): array
    {
        $merged = array_merge($base, $override);
        
        if (isset($base['from']) && isset($override['from'])) {
            $merged['from'] = array_merge($base['from'], $override['from']);
        }
        if (isset($base['to']) && isset($override['to'])) {
            $merged['to'] = array_merge($base['to'], $override['to']);
        }
        return $merged;
    }

    private function buildTweenConfig(array $anim, array $scrollTrigger): array
    {
        $type = strtolower($anim['type'] ?? 'from');
        if (!in_array($type, ['to', 'from', 'fromto', 'set'], true)) {
            $type = 'from';
        }

        $varsFrom = $anim['from'] ?? [];
        $varsTo   = $anim['to'] ?? [];

        $commonParams = [];

        if (isset($anim['duration'])) {
            $commonParams['duration'] = (float)$anim['duration'];
        } else {
            if ($type !== 'set') {
                $commonParams['duration'] = 0.8; 
            }
        }

        if (isset($anim['delay'])) $commonParams['delay'] = (float)$anim['delay'];
        if (isset($anim['ease']))  $commonParams['ease'] = $anim['ease'];
        if (isset($anim['stagger'])) $commonParams['stagger'] = $anim['stagger'];
        if (isset($anim['text']))    $commonParams['text'] = $anim['text'];

        $finalConfig = [];

        switch ($type) {
            case 'fromto':
                $finalConfig = [
                    'method' => 'fromTo',
                    'vars'   => $varsFrom, 
                    'vars2'  => array_merge($varsTo, $commonParams), 
                ];
                break;
            case 'to':
                $finalConfig = [
                    'method' => 'to',
                    'vars'   => array_merge($varsTo, $commonParams),
                ];
                break;
            case 'set':
                $finalConfig = [
                    'method' => 'set',
                    'vars'   => $varsTo,
                ];
                break;
            case 'from':
            default:
                $vars = !empty($varsFrom) ? $varsFrom : $varsTo;
                if (empty($vars)) {
                    $vars = ['y' => 50, 'autoAlpha' => 0];
                } else {
                    // Map opacity to autoAlpha for better visibility handling
                    if (isset($vars['opacity'])) {
                        $vars['autoAlpha'] = $vars['opacity'];
                        unset($vars['opacity']);
                    }
                }
                $finalConfig = [
                    'method' => 'from',
                    'vars'   => array_merge($vars, $commonParams),
                ];
                break;
        }

        if (isset($anim['strict'])) {
            $finalConfig['strict'] = (bool)$anim['strict'];
        }

        if (!empty($scrollTrigger)) {
            if (isset($scrollTrigger['strict'])) {
                $finalConfig['strict'] = (bool)$scrollTrigger['strict'];
                unset($scrollTrigger['strict']);
            }

            if ($type === 'fromto') {
                $finalConfig['vars2']['scrollTrigger'] = $scrollTrigger;
            } else {
                $finalConfig['vars']['scrollTrigger'] = $scrollTrigger;
            }
        }
        
        if (isset($anim['split'])) {
            $finalConfig['split'] = $anim['split'];
        }

        return $finalConfig;
    }
}
