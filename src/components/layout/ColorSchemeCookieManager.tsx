'use client';

import { MantineColorScheme, MantineColorSchemeManager } from '@mantine/core';

const COOKIE_NAME = 'theme';

// O objeto deve implementar todos os 5 métodos/propriedades da interface.
export const colorSchemeManager: MantineColorSchemeManager = {
  // 1. GET (Leitura do Cookie)
  get: () => { 
    if (typeof document === 'undefined') {
        return 'light'; // Fallback para SSR
    }
    
    // Leitura do cookie 'theme'
    const match = document.cookie.match(new RegExp('(^| )' + COOKIE_NAME + '=([^;]+)'));
    
    // Retorna o valor do cookie ('light' ou 'dark') ou 'light' como fallback
    const scheme = match ? (match[2] as MantineColorScheme) : 'light'; 
    console.log('wwwwwwwwwwwwwww scheme: ', scheme);
    
    return scheme;
  },
  
  // 2. SET (Escrita no Cookie)
  set: (value) => { 
    // Escrita no cookie 'theme'
    document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=31536000; secure=true; sameSite=Lax`; 
  },

  // 3. SUBSCRIBE (Necessário para a reatividade do Mantine)
  // Como estamos usando cookies e confiamos que o `set` fará a persistência,
  // podemos deixar os métodos de subscrição vazios ou simplesmente retornar uma função vazia,
  // a menos que você tenha uma loja de estado global (como Redux ou Zustand) gerenciando o tema.
  subscribe: (onUpdate) => {
    // Você pode adicionar um listener aqui se estiver usando um estado global.
    // Para persistência via cookie, isso geralmente não é estritamente necessário para o fluxo básico.
    // Retorna uma função de unsubscribe vazia
    return () => {};
  },

  // 4. UNSUBSCRIBE (Necessário para a reatividade do Mantine)
  unsubscribe: () => {
    // Deve ser uma função sem argumentos.
  },
  
  // 5. CLEAR (Para limpar o valor salvo)
  clear: () => {
    // Apaga o cookie definindo uma data de expiração no passado
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  },
};