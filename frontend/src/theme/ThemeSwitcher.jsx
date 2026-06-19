import { useTheme } from './ThemeContext.jsx';

const THEMES = [
  { key: 'retro', label: '90s' },
  { key: 'swiss', label: 'SWISS' },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-switcher">
      {THEMES.map((t) => (
        <button
          key={t.key}
          className={theme === t.key ? 'active' : ''}
          onClick={() => setTheme(t.key)}
          title={`Switch to ${t.label} theme`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
