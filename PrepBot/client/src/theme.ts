import { createTheme } from '@mui/material/styles';
import '@fontsource/inter';

const theme = createTheme({
  typography: {
    fontFamily: 'Inter, sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
});
export default theme;