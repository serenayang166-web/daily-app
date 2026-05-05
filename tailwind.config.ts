import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#7B61FF',
          light: '#9D85FF',
          soft: '#F3F0FF',
        },
        ink: '#111827',
        mute: '#6B7280',
        page: '#DBEAFE',
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont',
          '"SF Pro Text"', '"SF Pro Display"',
          '"Helvetica Neue"',
          '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"',
          'system-ui', 'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
