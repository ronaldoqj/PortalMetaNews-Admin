import {defineRouting} from 'next-intl/routing';
 
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en-US', 'en-GB', 'pt-BR', 'pt-PT'],
 
  // Used when no locale matches
  defaultLocale: 'pt-BR',

  domains: [
    {
      domain: 'portalmetanews.com',
      defaultLocale: 'en-US',
      locales: ['en-US', 'en-GB']
    }, // EUA / Reino Unido
    {
      domain: 'portalmetanews.com.br',
      defaultLocale: 'pt-BR',
      locales: ['pt-BR']
    }, // Brasil / Portugal
    {
      domain: 'portalmetanews.pt',
      defaultLocale: 'pt-PT',
      locales: ['pt-PT']
    } // Portugal / Brasil
  ],
  
  // Optional: Define custom pathnames for your routes
  pathnames: {
    '/': '/',
    '/news': {
      'en-US': '/news',
      'en-GB': '/news',
      'pt-BR': '/noticias',
      'pt-PT': '/noticias',
    }
  }
});