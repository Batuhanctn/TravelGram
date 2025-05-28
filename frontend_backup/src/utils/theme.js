export const lightTheme = {
  colors: {
    primary: '#2196F3',
    secondary: '#FF9800',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#212121',
    textSecondary: '#757575',
    border: '#E0E0E0',
    error: '#B00020',
    success: '#4CAF50',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    h1: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    h2: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    body: {
      fontSize: 16,
    },
    caption: {
      fontSize: 14,
      color: '#757575',
    },
  },
  roundness: {
    small: 4,
    medium: 8,
    large: 16,
  },
};

export const darkTheme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    background: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    border: '#2C2C2C',
  },
};
