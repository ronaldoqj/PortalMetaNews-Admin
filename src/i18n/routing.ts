import {defineRouting} from 'next-intl/routing';
 
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'en-US', 'pt', 'pt-BR', 'pt-PT'],
 
  // Used when no locale matches
  defaultLocale: 'pt-BR',
  
  // Optional: Define custom pathnames for your routes
  pathnames: {
    '/': '/',
    '/news': {
      'pt-BR': '/noticias'
    }
  }
});