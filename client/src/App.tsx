import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { AppRoutes } from './routes/AppRoutes.js';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
