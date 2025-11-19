<?php

namespace ScrollCrafter\Animation;

class Script_Parser
{
    private const SECTION_ANIM    = 'animation';
    private const SECTION_SCROLL  = 'scroll';
    private const SECTION_TARGET  = 'target';
    private const SECTION_TIMELINE = 'timeline';

    /**
     * Parsuje DSL v2 z sekcjami.
     *
     * Zwraca strukturę:
     * [
     *   'animation' => [...],
     *   'scroll'    => [...],
     *   'target'    => [...],
     *   'timeline'  => [
     *      'defaults' => [...],
     *      'steps'    => [...],
     *   ],
     *   '_warnings' => string[], // opcjonalne ostrzeżenia
     * ]
     */
    public function parse(string $script): array
    {
        $lines          = preg_split('/\r\n|\r|\n/', $script) ?: [];
        $currentSection = null;

        $result = [
            'animation' => [],
            'scroll'    => [],
            'target'    => [],
            'timeline'  => [
                'defaults' => [],
                'steps'    => [],
            ],
            '_warnings' => [],
        ];

        foreach ($lines as $index => $rawLine) {
            $line = $this->stripInlineComment($rawLine);
            $line = trim($line);

            if ($line === '') {
                continue;
            }

            // Sekcja [name] lub [step.N] lub timeline.defaults.key
            if ($this->isSectionHeader($line)) {
                $section = $this->parseSectionHeader($line);

                if ($section === '') {
                    $result['_warnings'][] = sprintf(
                        'Unknown section "%s" at line %d',
                        trim($line, "[] \t"),
                        $index + 1
                    );
                    // Nie zmieniamy currentSection, pozwalamy kontynuować w poprzedniej sekcji.
                    continue;
                }

                $currentSection = $section;
                continue;
            }

            // klucz: wartość
            if (!str_contains($line, ':')) {
                $result['_warnings'][] = sprintf(
                    'Ignored line without ":" at line %d',
                    $index + 1
                );
                continue;
            }

            [$rawKey, $rawValue] = array_map('trim', explode(':', $line, 2));
            if ($rawKey === '') {
                $result['_warnings'][] = sprintf(
                    'Empty key at line %d',
                    $index + 1
                );
                continue;
            }

            // timeline.defaults.duration: 0.8
            if ($currentSection === self::SECTION_TIMELINE && str_contains($rawKey, '.')) {
                $this->assignTimelineDotKey($result, $rawKey, $rawValue);
                continue;
            }

            $key   = strtolower($rawKey);
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
                // [step.N]
                $indexStep = $currentSection['index'];
                $result['timeline']['steps'][$indexStep] = $result['timeline']['steps'][$indexStep] ?? [];
                $this->assignStepKey($result['timeline']['steps'][$indexStep], $key, $value);
                continue;
            }

            // Linia poza znaną sekcją – ignorujemy, raportujemy ostrzeżenie.
            $result['_warnings'][] = sprintf(
                'Line outside any known section at line %d',
                $index + 1
            );
        }

        // Posortuj kroki timeline po indeksie
        if (!empty($result['timeline']['steps'])) {
            ksort($result['timeline']['steps'], SORT_NUMERIC);
            $result['timeline']['steps'] = array_values($result['timeline']['steps']);
        }

        return $result;
    }

    private function stripInlineComment(string $line): string
    {
        $hashPos = strpos($line, '#');
        if ($hashPos === false) {
            return $line;
        }

        // Wszystko przed '#' zostawiamy, resztę traktujemy jako komentarz.
        return substr($line, 0, $hashPos);
    }

    private function isSectionHeader(string $line): bool
    {
        return $line[0] === '[' && substr($line, -1) === ']';
    }

    /**
     * Zwraca string sekcji ('animation'/'scroll'/'target'/'timeline') lub ['type'=>'step','index'=>N]
     * lub '' dla nieznanej sekcji.
     */
    private function parseSectionHeader(string $line): string|array
    {
        $name = strtolower(trim($line, '[] '));

        if ($name === self::SECTION_ANIM
            || $name === self::SECTION_SCROLL
            || $name === self::SECTION_TARGET
            || $name === self::SECTION_TIMELINE
        ) {
            return $name;
        }

        // step.N
        if (str_starts_with($name, 'step.')) {
            $suffix = substr($name, 5);
            $n      = ctype_digit($suffix) ? (int) $suffix : null;
            if ($n !== null) {
                return ['type' => 'step', 'index' => $n];
            }
        }

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
                $anim[$key] = (float) $value;
                break;
            case 'ease':
                $anim['ease'] = $value;
                break;
            default:
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
                $scroll['anticipatePin'] = (float) $value;
                break;
            case 'snap':
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
        $parts = array_map('trim', explode('.', strtolower($rawKey)));
        if (count($parts) === 3 && $parts[0] === 'timeline' && $parts[1] === 'defaults') {
            $k = $parts[2];
            if (in_array($k, ['duration', 'delay', 'stagger'], true)) {
                $result['timeline']['defaults'][$k] = (float) $value;
                return;
            }
            if ($k === 'ease') {
                $result['timeline']['defaults']['ease'] = $value;
                return;
            }
        }
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
                $step[$key === 'startat' ? 'startAt' : $key] = (float) $value;
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
        $vars  = [];
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
                $vars[$k] = (float) $v;
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
        return in_array($v, ['1', '0', 'true', 'false', 'yes', 'no', 'on', 'off'], true);
    }

    private function parseBool(string $value): bool
    {
        $v = strtolower(trim($value));
        return in_array($v, ['1', 'true', 'yes', 'on'], true);
    }

    private function parseBoolOrNumber(string $value): bool|float
    {
        $v = strtolower(trim($value));
        if (is_numeric($v)) {
            return (float) $v;
        }

        return $this->parseBool($v);
    }

    private function parseBoolOrNumberOrString(string $value): bool|float|string
    {
        $v = trim($value);
        if (is_numeric($v)) {
            return (float) $v;
        }
        if ($this->isBoolString($v)) {
            return $this->parseBool($v);
        }
        return $v;
    }
}
