'use client';

import React from 'react';
import { IconMoon, IconSun, IconDeviceDesktop  } from '@tabler/icons-react';
import { useMantineColorScheme } from '@mantine/core';

export function ThemeToggle() {
  const { setColorScheme } = useMantineColorScheme();

  const setTheme = (theme: 'dark' | 'light' | 'auto') => {
    document.cookie = `theme=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    if (setColorScheme) {
      setColorScheme(theme);
    } else {
      window.location.reload();
    }
  };

  return (
    <div>
      <button onClick={() => setTheme('dark')}>
        <IconMoon stroke={1.5} />
      </button>
      <button onClick={() => setTheme('light')}>
        <IconSun stroke={1.5} />
      </button>
      <button onClick={() => setTheme('auto')}>
        <IconDeviceDesktop stroke={1.5} />
      </button>
    </div>
  );
}