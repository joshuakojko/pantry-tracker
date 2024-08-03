"use client";

// React and Next.js imports
import { useEffect, useState } from 'react';

// Material-UI imports
import { useRouter } from 'next/navigation';
import {
  AppBar,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  TextField,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab,
} from '@mui/material';
import { alpha } from '@mui/material/styles';

// Material-UI icons
import GitHubIcon from '@mui/icons-material/GitHub';
import KitchenIcon from '@mui/icons-material/Kitchen';
import InventoryIcon from '@mui/icons-material/Inventory';
import RestaurantIcon from '@mui/icons-material/Restaurant';

// Firebase imports
import { signInAnonymouslyWithGroupId } from '@/app/firebase';
import { auth } from '@/app/firebase';

// Firebase imports
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/app/firebase';

/**
 * LandingPage Component
 * 
 * This component serves as the landing page for the Pantry Tracker application.
 * It provides an introduction to the app's features and allows users to join or create a group.
 */
function LandingPage() {
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState('');
  const [isNewGroup, setIsNewGroup] = useState(true);
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && user.displayName) {
        router.push('/pantry');
      }
    });
  
    return () => unsubscribe();
  }, [router]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setIsNewGroup(newValue === 0);
    setGroupId(''); // Clear the group ID when switching tabs
    setError(''); // Clear any previous errors
  };

  const handleSubmit = async () => {
    setError('');
    const groupRef = doc(firestore, 'users', groupId);
    const groupDoc = await getDoc(groupRef);
    if (isNewGroup) {
      if (groupDoc.exists() && groupDoc.data()) {
        setError('This group already exists. Please choose a different name.');
        return;
      }
    } else {
      if (!groupDoc.exists() || !groupDoc.data()) {
        setError('This group does not exist. Please check the group ID or create a new group.');
        return;
      }
    }

    // Attempt to sign in
    const user = await signInAnonymouslyWithGroupId(groupId);
    if (user && user.displayName) {
      router.push('/pantry');
    }
  };

  return (
    <Box sx={{ 
      flexGrow: 1, 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden' 
    }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ backdropFilter: 'blur(10px)', backgroundColor: alpha(theme.palette.background.default, 0.8) }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <KitchenIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <span style={{ fontWeight: 'bold' }}>Pantry Tracker</span>
          </Typography>
          <IconButton
            color="inherit"
            aria-label="GitHub repository"
            edge="end"
            component="a"
            href="https://github.com/joshuakojko/pantry-tracker"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ '&:hover': { color: theme.palette.primary.main } }}
          >
            <GitHubIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden' 
      }}>
        <Container maxWidth="md" sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          py: 4
        }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h2" component="h1" gutterBottom fontWeight="bold" sx={{ fontSize: { xs: '2rem', md: '3rem' } }}>
              Organize Your Pantry Like a Pro
            </Typography>
            <Typography variant="h5" paragraph color="text.secondary" sx={{ mb: 4 }}>
              Track, update, and organize pantry items with ease using Pantry Tracker
            </Typography>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => setOpen(true)}
              sx={{
                py: 1.5,
                px: 3,
                fontSize: '1rem',
                fontWeight: 'bold',
                boxShadow: '0 4px 6px rgba(50, 50, 93, 0.11), 0 1px 3px rgba(0, 0, 0, 0.08)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 7px 14px rgba(50, 50, 93, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08)',
                },
              }}
            >
              JOIN PANTRY GROUP
            </Button>
          </Box>
        </Container>

        <Box sx={{ 
          bgcolor: alpha(theme.palette.primary.main, 0.05), 
          flexGrow: 1,
          overflow: 'auto'
        }}>
          <Container maxWidth="md" sx={{ py: 4 }}>
            <Typography variant="h3" component="h2" gutterBottom textAlign="center" fontWeight="bold" sx={{ mb: 4 }}>
              Features
            </Typography>
            <Grid container spacing={4}>
              {[
                { title: "Item Management", description: "Create, read, update, and delete pantry items with ease.", icon: <InventoryIcon fontSize="large" sx={{ color: theme.palette.primary.main }} /> },
                { title: "Real-Time Pantry Management", description: "Manage your pantry items across devices in real-time.", icon: <KitchenIcon fontSize="large" sx={{ color: theme.palette.primary.main }} /> },
                { title: "Generate Recipes", description: "Generate new recipes from your pantry ingredients with AI.", icon: <RestaurantIcon fontSize="large" sx={{ color: theme.palette.primary.main }} /> }
              ].map((feature, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Box sx={{
                    textAlign: 'center',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    p: 3,
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
                    }
                  }}>
                    {feature.icon}
                    <Typography variant="h6" component="h3" gutterBottom fontWeight="bold" sx={{ mt: 2, mb: 1 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Create or Join a Pantry Group</DialogTitle>
        <DialogContent>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
            <Tab label="Create New Group" />
            <Tab label="Join Existing Group" />
          </Tabs>
          {tabValue === 0 ? (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Create a new group:
              </Typography>
              <TextField
                autoFocus
                margin="dense"
                label="New Group ID"
                fullWidth
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                error={!!error}
                helperText={error}
              />
            </>
          ) : (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Enter an existing group ID:
              </Typography>
              <TextField
                autoFocus
                margin="dense"
                label="Existing Group ID"
                fullWidth
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                error={!!error}
                helperText={error}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {isNewGroup ? "Create" : "Join"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LandingPage;