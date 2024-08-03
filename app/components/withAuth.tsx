'use client';

// React and Next.js imports
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Firebase imports
import { getCurrentUser } from '@/app/firebase';

// Material-UI imports
import { Box, CircularProgress } from '@mui/material';

/**
 * withAuth Higher-Order Component
 * 
 * This HOC wraps components that require authentication.
 * It checks if the user is authenticated and redirects to the landing page if not.
 * 
 * @param WrappedComponent The component to be wrapped with authentication
 * @returns A new component with authentication logic
 */

const withAuth = (WrappedComponent: React.ComponentType) => {
  const WithAuth = (props: any) => {
    // Next.js router
    const router = useRouter();

    // React useState hooks to manage authentication state
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // React useEffect hook to check authentication status and redirection on component mount
    useEffect(() => {
      const checkAuth = async () => {
        const user = await getCurrentUser();
        if (user && user.displayName) {
          setIsAuthenticated(true);
        } else {
          router.push('/');
        }
        setIsLoading(false);
      };

      checkAuth();
    }, [router]);

    // Show loading indicator while authenticating
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };

  return WithAuth;
};

export default withAuth;