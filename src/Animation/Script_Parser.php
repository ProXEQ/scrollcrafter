<?php

namespace ScrollCrafter\Animation;

class Script_Parser
{
    private const SECTION_ANIM = 'animation';
    private const SECTION_SCROLL = 'scroll';
    private const SECTION_TARGET = 'target';
    private const SECTION_TIMELINE = 'timeline';

    /**
     * Parsuje DSL v2 z sekcjami oraz DSL v1 (płaski).
     *
     * Zwraca strukturę:
     * [
     *   'animation' => [...],            // jeśli używany tween
     *   'scroll'    => [...],
     *   'target'    => [...],
     *   'timeline'  => [
     *      'defaults' => [...],
     *      'steps'    => [
     *          [ 'type'=>'from', 'from'=>[], 'to'=>[], 'duration'=>..., 'ease'=>..., 'startAt'=>... ],
     *          ...
     *      ],
     *   ],
     *   '_raw'      => [...],           // płaskie wartości v1 (dla kompatybilności)
     * ]
     */
    public function parse(string $script): array
    {
        $lines = preg_split('/\r\n|\r|\n/', $script) ?: [];
        $currentSection = null;

        $result = [
            'animation' => [],
            'scroll'    => [],
            'target'    => [],
            'timeline'  => [
                'defaults' => [],
                'steps'    => [],
            ],
            '_raw'      => [], // płaskie klucze v1
        ];

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            // Sekcja [name] lub [step.N] lub timeline.defaults.key
            if ($this->isSectionHeader($line)) {
                $section = $this->parseSectionHeader($line);
                $currentSection = $section;
                continue;
            }

            // klucz: wartość
            if (!str_contains($line, ':')) {
                continue;
            }

            [$rawKey, $rawValue] = array_map('trim', explode(':', $line, 2));
            if ($rawKey === '') {
                continue;
            }

            // timeline.defaults.duration: 0.8
            if ($currentSection === self::SECTION_TIMELINE && str_contains($rawKey, '.')) {
                $this->assignTimelineDotKey($result, $rawKey, $rawValue);
                continue;
            }

            $key = strtolower($rawKey);
            $value = $rawValue;

            if ($currentSection === self::SECTION_ANIM) {
                $this->assignAnimationKey($result['animation'], $key, $value);
                continue;
            }

            if ($currentSection === self::SECTION_SCROLL) {
                $this->assignScrollKey($result['scroll'], $key, $value);
                continue;
            }

            if ($currentSection === self::SECTION_TARGET) {
                $this->assignTargetKey($result['target'], $key, $value);
                continue;
            }

            if (is_array($currentSection) && ($currentSection['type'] ?? '') === 'step') {
                // Jesteśmy w [step.N]
                $index = $currentSection['index'];
                $result['timeline']['steps'][$index] = $result['timeline']['steps'][$index] ?? [];
                $this->assignStepKey($result['timeline']['steps'][$index], $key, $value);
                continue;
            }

            // Brak sekcji -> płaski v1
            $result['_raw'][$key] = $value;
        }

        // Posortuj kroki timeline po indeksie
        if (!empty($result['timeline']['steps'])) {
            ksort($result['timeline']['steps'], SORT_NUMERIC);
            // Zmień na indeksy ciągłe
            $result['timeline']['steps'] = array_values($result['timeline']['steps']);
        }

        return $result;
    }

    private function isSectionHeader(string $line): bool
    {
        return $line[0] === '[' && substr($line, -1) === ']';
    }

    /**
     * Zwraca string sekcji ('animation'/'scroll'/'target'/'timeline') lub ['type'=>'step','index'=>N]
     */
    private function parseSectionHeader(string $line): string|array
    {
        $name = strtolower(trim($line, '[] '));

        if ($name === self::SECTION_ANIM || $name === self::SECTION_SCROLL || $name === self::SECTION_TARGET || $name === self::SECTION_TIMELINE) {
            return $name;
        }

        // step.N
        if (str_starts_with($name, 'step.')) {
            $suffix = substr($name, 5);
            $n = ctype_digit($suffix) ? (int)$suffix : null;
            if ($n !== null) {
                return [ 'type' => 'step', 'index' => $n ];
            }
        }

        // Nieznana sekcja -> traktuj jak zwykły tekst (brak zmiany sekcji)
        return '';
    }

    private function assignAnimationKey(array &$anim, string $key, string $value): void
    {
        switch ($key) {
            case 'type':
                $anim['type'] = $value;
                break;
            case 'from':
            case 'to':
                $anim[$key] = $this->parseVarsList($value);
                break;
            case 'duration':
            case 'delay':
            case 'stagger':
                $anim[$key] = (float)$value;
                break;
            case 'ease':
                $anim['ease'] = $value;
                break;
            default:
                // ignore unknown
                break;
        }
    }

    private function assignScrollKey(array &$scroll, string $key, string $value): void
    {
        switch ($key) {
            case 'start':
            case 'end':
            case 'toggleactions':
                $scroll[$key === 'toggleactions' ? 'toggleActions' : $key] = $value;
                break;
            case 'scrub':
                $scroll['scrub'] = $this->parseBoolOrNumber($value);
                break;
            case 'once':
            case 'pin':
            case 'pinspacing':
            case 'markers':
                $scroll[$key === 'pinspacing' ? 'pinSpacing' : $key] = $this->parseBool($value);
                break;
            case 'anticipatepin':
                $scroll['anticipatePin'] = (float)$value;
                break;
            case 'snap':
                // v2: przechowaj surową wartość (bool/number/string); runtime może zdecydować jak użyć
                $scroll['snap'] = $this->parseBoolOrNumberOrString($value);
                break;
            default:
                break;
        }
    }

    private function assignTargetKey(array &$target, string $key, string $value): void
    {
        if ($key === 'selector') {
            $target['selector'] = $value;
        }
    }

    private function assignTimelineDotKey(array &$result, string $rawKey, string $value): void
    {
        // timeline.defaults.duration: 0.8
        $parts = array_map('trim', explode('.', strtolower($rawKey)));
        if (count($parts) === 3 && $parts[0] === 'timeline' && $parts[1] === 'defaults') {
            $k = $parts[2];
            if (in_array($k, ['duration', 'delay', 'stagger'], true)) {
                $result['timeline']['defaults'][$k] = (float)$value;
                return;
            }
            if ($k === 'ease') {
                $result['timeline']['defaults']['ease'] = $value;
                return;
            }
        }
        // Inne dot‑keys można rozszerzyć później
    }

    private function assignStepKey(array &$step, string $key, string $value): void
    {
        switch ($key) {
            case 'type':
                $step['type'] = $value;
                break;
            case 'from':
            case 'to':
                $step[$key] = $this->parseVarsList($value);
                break;
            case 'duration':
            case 'delay':
            case 'stagger':
            case 'startat':
                $step[$key === 'startat' ? 'startAt' : $key] = (float)$value;
                break;
            case 'ease':
                $step['ease'] = $value;
                break;
            default:
                break;
        }
    }

    private function parseVarsList(string $value): array
    {
        $vars = [];
        $parts = array_map('trim', explode(',', $value));
        foreach ($parts as $part) {
            if ($part === '' || !str_contains($part, '=')) {
                continue;
            }
            [$k, $v] = array_map('trim', explode('=', $part, 2));
            if ($k === '') {
                continue;
            }
            if (is_numeric($v)) {
                $vars[$k] = (float)$v;
            } elseif ($this->isBoolString($v)) {
                $vars[$k] = $this->parseBool($v);
            } else {
                $vars[$k] = $v;
            }
        }
        return $vars;
    }

    private function isBoolString(string $value): bool
    {
        $v = strtolower(trim($value));
        return in_array($v, ['1','0','true','false','yes','no','on','off'], true);
    }

    private function parseBool(string $value): bool
    {
        $v = strtolower(trim($value));
        return in_array($v, ['1','true','yes','on'], true);
    }

    private function parseBoolOrNumber(string $value): bool|float
    {
        $v = strtolower(trim($value));
        if (is_numeric($v)) {
            return (float)$v;
        }
        return $this->parseBool($v);
    }

    private function parseBoolOrNumberOrString(string $value): bool|float|string
    {
        $v = trim($value);
        if (is_numeric($v)) {
            return (float)$v;
        }
        if ($this->isBoolString($v)) {
            return $this->parseBool($v);
        }
        return $v;
    }
}
