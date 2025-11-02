import { cookies } from 'next/headers';
import { createTheme } from '@mantine/core';

export class LayoutHelper {
    static themes = {
    light: createTheme({
      fontFamily: 'Roboto, sans-serif',
      colors: {
        brand: [
          '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1',
          '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'
        ],
        electric: [
          '#dbf4f8', '#a3e0ee', '#72cce8', '#49b5dd', '#2197d4',
          '#06b6d4', '#0582b9', '#046e9f', '#035a84', '#024769'
        ],
        neon: [
          '#d0fbe8', '#9af3cb', '#63ebac', '#3dd993', '#19ca7a',
          '#10b981', '#0e9b6d', '#0c7d60', '#0a5d4f', '#08403d'
        ],
        text: [
          '#f9f9f9', '#d7d7d7', '#a9a9a9', '#7c7c7c', '#4e4e4e',
          '#1a1a1a', '#151515', '#101010', '#0a0a0a', '#050505'
        ],
        background: [
          '#ffffff', '#f4f4f4', '#e1e1e1', '#cfcfcf', '#b2b2b2',
          '#8e8e8e', '#707070', '#525252', '#363636', '#1a1a1a'
        ],
      },
      primaryColor: 'brand',
      primaryShade: 4,
      shadows: {
        md: '1px 1px 3px rgba(0, 0, 0, .25)',
        xl: '5px 5px 3px rgba(0, 0, 0, .25)',
      },
      black: '#050505',
      white: '#f9f9f9',
      headings: {
        sizes: {
          h1: { fontSize: '36px' },
        },
      },
      defaultGradient: {
        from: '#6366f1',
        to: '#06b6d4',
        deg: 45,
      },
    }),
    dark: createTheme({
      fontFamily: 'Roboto, sans-serif',
      colors: {
        brand: [
          '#1e3a8a', '#1e40af', '#1d4ed8', '#2563eb', '#3b82f6',
          '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'
        ],
        electric: [
          '#024769', '#035a84', '#046e9f', '#0582b9', '#06b6d4',
          '#2197d4', '#49b5dd', '#72cce8', '#a3e0ee', '#dbf4f8'
        ],
        neon: [
          '#08403d', '#0a5d4f', '#0c7d60', '#0e9b6d', '#10b981',
          '#19ca7a', '#3dd993', '#63ebac', '#9af3cb', '#d0fbe8'
        ],
        text: [
          '#f9f9f9', '#d7d7d7', '#a9a9a9', '#8e8e8e', '#646464',
          '#2f2f2f', '#252525', '#1b1b1b', '#141414', '#0a0a0a'
        ],
        background: [
          '#1a1a1a', '#363636', '#525252', '#707070', '#8e8e8e',
          '#b2b2b2', '#cfcfcf', '#e1e1e1', '#f4f4f4', '#ffffff'
        ],
      },
      primaryColor: 'brand',
      primaryShade: 4,
      shadows: {
        md: '1px 1px 3px rgba(0, 0, 0, .5)',
        xl: '5px 5px 15px rgba(0, 0, 0, .6)',
      },
      black: '#0a0a0a',
      white: '#f9f9f9',
      headings: {
        sizes: {
          h1: { fontSize: '36px' },
        },
      },
      defaultGradient: {
        from: '#2563eb',
        to: '#10b981',
        deg: 45,
     },
    })
  };

  static async getThemeFromCookie() {
    const cookieStore = await cookies(); // aguarde a Promise
    const themeCookie = cookieStore.get("theme");
    console.log('getThemeFromCookie server themeCookie:', themeCookie?.value);
    
    if (themeCookie?.value === 'dark') return createTheme(this.themes.dark);
    return createTheme(this.themes.light);
  }

  static async getCurrentThemeName() {
    const cookieStore = await cookies();
    const themeCookie = cookieStore.get("theme");

    return themeCookie?.value === 'dark' ? 'dark' : 'light';
  }

  static getThemeFromString(theme: string) {
    if (theme === 'dark') return createTheme(this.themes.dark);
    return createTheme(this.themes.light);
  }

  static setThemeCookie(theme: string) {
    document.cookie = `theme=${theme}; path=/; max-age=31536000`; // 1 ano de validade
    window.location.reload(); // Recarrega para aplicar novo tema via server
}
}
