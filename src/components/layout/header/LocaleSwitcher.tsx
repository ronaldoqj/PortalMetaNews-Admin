import {useLocale, useTranslations} from 'next-intl';
import {routing} from '@/i18n/routing';
import LocaleSwitcherSelect from './LocaleSwitcherSelect';

export default function LocaleSwitcher() {
  const t = useTranslations('LocaleSwitcher');
  const locale = useLocale();
  
  // Vamos usar o array original de locales (com hífen)
  const allLocales = routing.locales;

  return (
    <LocaleSwitcherSelect defaultValue={locale} label={t('label')}>
      {allLocales.map((localeCode) => {
        // 1. Mantenha o código original (com hífen) para o roteamento
        // (Será usado como 'key' e 'value')
        
        // 2. Crie a versão com underscore APENAS para a tradução ICU
        const localeForICU = localeCode.replace(/-/g, '_');

        return (
          <option 
            key={localeCode}        // Usar localeCode (ex: 'pt-BR')
            value={localeCode}      // Usar localeCode (ex: 'pt-BR') para o roteador
          >
            {/*
              Passa a versão com underscore (ex: 'pt_BR') para a função t(),
              que fará a correspondência no seletor ICU do JSON.
            */}
            {t('locale', {locale: localeForICU})}
          </option>
        );
      })}
    </LocaleSwitcherSelect>
  );
}
