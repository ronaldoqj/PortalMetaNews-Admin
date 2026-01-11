import { createTheme } from '@mantine/core';

export class DefaultTheme {
    static themes = createTheme({
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
    });

  static async getDefaultTheme() {
    return this.themes;
  }

}
