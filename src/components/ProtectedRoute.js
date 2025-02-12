import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';

const ProtectedRoute = ({ children }) => {
  const { accounts } = useMsal();
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        if (accounts.length > 0) {
          const email = accounts[0].username;
          console.log('Henter brukerrolle for:', email);
          
          const role = await window.electronAPI.getUserRole(email);
          console.log('Mottatt brukerrolle:', role);
          
          setUserRole(role);
        }
      } catch (error) {
        console.error('Feil ved henting av brukerrolle:', error);
        setUserRole('USER'); // Fallback til USER rolle ved feil
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, [accounts]);

  if (isLoading) {
    return <div>Laster...</div>;
  }

  if (!accounts.length) {
    navigate('/');
    return null;
  }

  return children;
};

export default ProtectedRoute; 