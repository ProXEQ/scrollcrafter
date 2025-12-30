/**
 * Internal dependencies
 */
import type { I18n, LocaleData } from './types';
/**
 * WordPress dependencies
 */
import type { Hooks } from '@wordpress/hooks';
/**
 * Create an i18n instance
 *
 * @param [initialData]   Locale data configuration.
 * @param [initialDomain] Domain for which configuration applies.
 * @param [hooks]         Hooks implementation.
 *
 * @return I18n instance.
 */
export declare const createI18n: <TextDomain extends string>(initialData?: LocaleData<TextDomain>, initialDomain?: TextDomain, hooks?: Hooks) => I18n<TextDomain>;
//# sourceMappingURL=create-i18n.d.ts.map