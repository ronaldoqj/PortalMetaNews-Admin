'use client';

import React from 'react';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { useMantineColorScheme } from '@mantine/core';

export function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  console.log("Current color scheme:", colorScheme);
  console.log("Current color toggleColorScheme:", toggleColorScheme);
  const setTheme = (theme: string) => {
    document.cookie = `theme=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    window.location.reload();
  };

  return (
    <div>
      <button onClick={() => setTheme('dark')}>
        <IconMoon stroke={1.5} />
      </button>
      <button onClick={() => setTheme('light')}>
        <IconSun stroke={1.5} />
      </button>
    </div>
  );
}