"use client";

// React and Next.js imports 
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

// Material-UI imports
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Menu,
  MenuItem,
  Snackbar,
  TextField,
  Toolbar,
  Typography,
  Checkbox,
  useMediaQuery,
  useTheme,
  TextareaAutosize,
  createTheme,
  ThemeProvider,
} from "@mui/material";

import themeConfig from '@/theme.json';

// Material-UI Icons imports
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Upload as UploadIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  ExitToApp as LeaveIcon,
  Home as HomeIcon,
  Restaurant as RecipeIcon,
  Kitchen as KitchenIcon,
  MenuBook as RestaurantIcon,
} from "@mui/icons-material";

// CSV export imports
import { CSVLink } from "react-csv";

// PDF export imports
import jsPDF from "jspdf";
import "jspdf-autotable";

// Firebase imports
import { auth, firestore, storage } from "@/app/firebase";

// Firebase firestore imports
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

// Firebase storage imports
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

// HOC wrapper for authentication
import withAuth from "@/app/components/withAuth";
import { signOutUser } from "@/app/firebase";

interface Item {
  id: string;
  name: string;
  quantity: number;
  description: string;
  image?: string;
  createdAt: any;
}

/**
 * InventoryDashboard Component
 * 
 * This component serves as the main dashboard for the Pantry Tracker application.
 * It manages the inventory of items, allows for CRUD operations, and provides
 * features like recipe generation and inventory export.
 */

function InventoryDashboard() {
    // Item management state
    const [items, setItems] = useState<Item[]>([]);
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);
    const [editingItem, setEditingItem] = useState<Item | null>(null);
    const [selectedItemId, setSelectedItemId] = useState(null);

    // Dialog control state
    const [openDialog, setOpenDialog] = useState(false);
    const [openDetailDialog, setOpenDetailDialog] = useState(false);

    // Form input state
    const [itemName, setItemName] = useState("");
    const [itemDescription, setItemDescription] = useState("");
    const [itemQuantity, setItemQuantity] = useState("");
    const [itemImage, setItemImage] = useState<File | { url: string } | null>(null);

    // UI state
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedSection, setSelectedSection] = useState("Pantry");
    const [isLoading, setIsLoading] = useState(true);

    // Recipe generation state
    const [selectedIngredients, setSelectedIngredients] = useState<Item[]>([]);
    const [recipeText, setRecipeText] = useState("");
    const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);

    // Refs
    const fileInputRef = useRef(null);

    // Router and authentication
    const router = useRouter();
    const [groupId, setGroupId] = useState(null);

    // Responsive design
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const drawerWidth = isMobile ? 180 : 240;

    // Load user data (assign groupId shared session key) and redirect if not authenticated
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && user.displayName) {
        setGroupId(user.displayName);
        setIsLoading(false);
      } else {
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Load inventory data by groupId
  useEffect(() => {
    if (!groupId) return;

    const unsubscribe = onSnapshot(
      query(
        collection(firestore, `users/${groupId}/inventory`),
        orderBy("createdAt", "desc")
      ),
      (snapshot) => {
        const newItems = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setItems(newItems);
        setFilteredItems(newItems);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [groupId]);

  // Filter items by search query
  useEffect(() => {
    const filtered = items.filter((item) => {
      return (
        item.name.toLowerCase().startsWith(searchQuery.toLowerCase())
      );
    });
    setFilteredItems(filtered);
  }, [searchQuery, items]);

  // Reset selected ingredients when changing section
  useEffect(() => {
    if (selectedSection === "Recipes") {
      setSelectedIngredients([]);
    }
  }, [selectedSection]);

  // Logout user and redirect to login
  const handleLogout = useCallback(async () => {
    try {
      await signOutUser();
      setGroupId(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, []);

  // Handle open dialog for editing or adding an item
  const handleOpenDialog = useCallback((item: Item | null = null) => {
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setItemDescription(item.description);
      setItemImage(item.imageUrl ? { url: item.imageUrl } : null);
      setItemQuantity(item.quantity.toString());
    } else {
      setEditingItem(null);
      setItemName("");
      setItemDescription("");
      setItemImage(null);
      setItemQuantity("");
    }
    setOpenDialog(true);
  }, []);

  // Handle close dialog for editing or adding an item
  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setEditingItem(null);
    setItemName("");
    setItemQuantity("");
    setItemDescription("");
    setItemImage(null);
  }, []);

  // Handle saving or updating an item in the inventory
  const handleSaveItem = async () => {
    if (itemName && itemQuantity && itemDescription) {
      // Prepare item data
      const itemData: {
        name: string;
        quantity: number;
        description: string;
        createdAt?: any;
        image?: string;
      } = {
        name: itemName,
        quantity: parseInt(itemQuantity, 10),
        description: itemDescription,
      };

      // Check for name collision with existing items (excluding the current item being edited)
      const collision = items.find(
        (item) =>
          item.name === itemData.name &&
          (editingItem ? item.id !== editingItem.id : true)
      );

      if (collision) {
        setSnackbarMessage(
          `An item with the name "${itemData.name}" already exists.`
        );
        setSnackbarOpen(true);
        return;
      }

      // Handle image upload if a new image is provided
      if (itemImage && (itemImage instanceof File || !itemImage.url)) {
        const imageRef = ref(
          storage,
          `inventory-images/${Date.now()}_${itemImage.name}`
        );
        await uploadBytes(imageRef, itemImage);
        const imageUrl = await getDownloadURL(imageRef);
        itemData.image = imageUrl;
      }

      if (editingItem) {
        // If editing an existing item
        if (itemData.quantity < 1) {
          // Delete item if quantity is less than 1
          if (editingItem.image) {
            await deleteObject(ref(storage, editingItem.image));
          }
          await deleteDoc(
            doc(
              firestore,
              `users/${auth.currentUser.displayName}/inventory`,
              editingItem.id
            )
          );
          if (selectedItemId) {
            handleCloseDialog();
            handleCloseDetailDialog();
            return;
          }
        } else {
          // Update existing item
          itemData.createdAt = serverTimestamp();
          await updateDoc(
            doc(
              firestore,
              `users/${auth.currentUser.displayName}/inventory`,
              editingItem.id
            ),
            itemData
          );
          // Update local state if the edited item is currently selected in an open dialog
          if (selectedItemId && selectedItemId === editingItem.id) {
            const updatedItems = items.map((item) =>
              item.id === editingItem.id
                ? { ...editingItem, ...itemData }
                : item
            );
            setItems(updatedItems);
          }
        }
      } else {
        // If adding a new item
        if (itemData.quantity < 1) {
          setSnackbarMessage("Quantity must be greater than 0.");
          setSnackbarOpen(true);
          return;
        }
        itemData.createdAt = serverTimestamp();
        await addDoc(
          collection(
            firestore,
            `users/${auth.currentUser.displayName}/inventory`
          ),
          itemData
        );
      }

      handleCloseDialog();
    }
  };

  // Handle deleting an item from the inventory
  const handleDeleteItem = useCallback(async (id: string) => {
    const itemRef = doc(
      firestore,
      `users/${auth.currentUser.displayName}/inventory`,
      id
    );
    const item = items.find((item) => item.id === id);
    if (item) {
      if (item.quantity > 1) {
        // Decrement quantity if greater than 1
        await updateDoc(itemRef, { quantity: item.quantity - 1 });
      } else {
        // Delete item if quantity is less than 1
        if (item.image) {
            // Delete image from storage if present
            await deleteObject(ref(storage, item.image));
        }
        await deleteDoc(itemRef);
      }
    }
  }, [items]);

  const handleCloseSnackbar = useCallback((event: React.SyntheticEvent | Event, reason?: string) => {
    // Close snackbar if clicked outside
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  }, []);

  const handleExportClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
  }, []);

  // Handle export to PDF
  const exportToPDF = useCallback((dataToExport: Item[]) => {
    const doc = new jsPDF();
    doc.autoTable({
      head: [["Name", "Quantity", "Description"]],
      body: dataToExport.map((item) => [
        item.name,
        item.quantity,
        item.description,
      ]),
    });
    doc.save("inventory.pdf");
  }, []);

  // Handle image change for adding or editing an item
  const handleImageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (
      file &&
      (file.type === "image/jpeg" ||
        file.type === "image/jpg" ||
        file.type === "image/png")
    ) {
      setItemImage(file);
    } else {
      setSnackbarMessage(
        "Please select a valid image file (JPG, PNG, or JPEG)"
      );
      setSnackbarOpen(true);
    }
  }, []);

  const handleOpenDetailDialog = useCallback((item: Item) => {
    setSelectedItemId(item.id);
    setOpenDetailDialog(true);
  }, []);

  const handleCloseDetailDialog = useCallback(() => {
    setSelectedItemId(null);
    setOpenDetailDialog(false);
  }, []);

  // Toggles the selection state of an ingredient in the selectedIngredients array
  // If the ingredient is already selected, it removes it; otherwise, it adds it
  const handleIngredientToggle = useCallback((item: Item) => {
    setSelectedIngredients((prev) =>
      prev.some((prevItem) => prevItem.id === item.id)
        ? prev.filter((prevItem) => prevItem.id !== item.id)
        : [...prev, item]
    );
  }, []);

  // Preprocesses the selected ingredients for LLM prompt template, returns the recipe generation response, and sets the recipe text
  const fetchRecipeIdeas = useCallback(async () => {
    if (selectedIngredients.length === 0) return;
    setIsLoadingRecipe(true);

    const ingredientsList = selectedIngredients.map(
        (item) => `${item.name} (${item.quantity}x)`
    ).join(", ");

    const promptTemplate = `
    As an AI chef, your task is to suggest a recipe based on the following ingredients available in the pantry:
    
    ${ingredientsList}
    
    Please provide a recipe that:
    1. Uses as many of the listed ingredients as possible
    2. Is feasible to make with common kitchen equipment
    3. Takes into account the quantities available
    4. Is suitable for a home cook
    
    Your response should include:
    - Recipe name
    - List of ingredients with quantities
    - Step-by-step cooking instructions
    - Estimated cooking time
    - Difficulty level (Easy, Medium, Hard)
    - Any substitutions or additional ingredients that might enhance the dish
    
    If you can't create a complete recipe with the given ingredients, suggest the best possible dish or snack that can be made, and mention what additional key ingredients would be needed for a more complete meal.
    `;

    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
            //   "HTTP-Referer": `${process.env.NEXT_PUBLIC_SITE_URL}`,
            //   "X-Title": "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "meta-llama/llama-3.1-8b-instruct:free",
            messages: [
              {
                role: "user",
                content: promptTemplate,
              },
            ],
          }),
        }
      );

      const data = await response.json();
      setRecipeText(data.choices[0].message.content);
    } catch (error) {
      setRecipeText("Recipe generation rate limit reached. Please try again later.");
    } finally {
      setIsLoadingRecipe(false);
    }
  }, [selectedIngredients]);

  const selectedItem = items.find((item) => item.id === selectedItemId);

  // Conditionally renders the content based on the selected section (Pantry, Recipes, or Download button)
  const renderContent = () => {
    switch (selectedSection) {
      case "Pantry":
        return (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h5" component="h2" sx={{ mb: 2, mt: 0 }}>
              Pantry Tracker
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                Add New Item
              </Button>
            </Box>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              <Grid container spacing={3}>
                {filteredItems.map((item) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                    <Card
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-5px)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        },
                        cursor: 'pointer',
                        borderRadius: '12px',
                        overflow: 'hidden',
                      }}
                      onClick={() => handleOpenDetailDialog(item)}
                    >
                      <Box
                        sx={{
                          position: 'relative',
                          paddingTop: '75%',
                          width: '100%',
                          overflow: 'hidden',
                        }}
                      >
                        <CardMedia
                          component="img"
                          image={item.image || "https://via.placeholder.com/150"}
                          alt={item.name}
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.3s ease',
                            '&:hover': {
                              transform: 'scale(1.05)',
                            },
                          }}
                        />
                      </Box>
                      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                        <Typography variant="h6" component="div" noWrap sx={{ mb: 1 }}>
                          {item.name}
                        </Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Quantity: {item.quantity}
                          </Typography>
                          <Box>
                            <IconButton
                              aria-label="edit"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDialog(item);
                              }}
                              sx={{ mr: 1 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              aria-label="delete"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(item.id);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        );
      case "Recipes":
        return (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
              Recipe Ideas
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {filteredItems.map((item) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox
                        checked={selectedIngredients.some(selectedItem => selectedItem.id === item.id)}
                        onChange={() => handleIngredientToggle(item)}
                    />
                    <Typography>{item.name}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Button
              variant="contained"
              color="primary"
              onClick={fetchRecipeIdeas}
              disabled={isLoadingRecipe || selectedIngredients.length === 0}
              sx={{ mb: 2 }}
              startIcon={<RestaurantIcon />}
            >
              Generate Recipe
            </Button>
            {isLoadingRecipe ? (
              <CircularProgress />
            ) : (
              <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                <TextareaAutosize
                  value={recipeText}
                  readOnly
                  style={{
                    width: '100%',
                    minHeight: '200px',
                    padding: '10px',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'break-word',
                  }}
                />
              </Box>
            )}
          </Box>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", height: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
      >
        <Toolbar>
          <KitchenIcon sx={{ mr: 1 }} />
          <Typography variant="h6" noWrap component="div" sx={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>
            Pantry App
          </Typography>
        </Toolbar>
        <Divider />
        <List>
          {["Pantry", "Recipes"].map((text) => (
            <ListItemButton
              key={text}
              onClick={() => setSelectedSection(text)}
              sx={{
                backgroundColor:
                  selectedSection === text ? "action.selected" : "inherit",
                py: isMobile ? 1 : 2,
              }}
            >
              <ListItemIcon>
                {text === "Pantry" && <HomeIcon />}
                {text === "Recipes" && <RecipeIcon />}
              </ListItemIcon>
              <ListItemText primary={text} primaryTypographyProps={{ fontSize: isMobile ? '0.9rem' : '1rem' }} />
            </ListItemButton>
          ))}
          <ListItemButton onClick={handleExportClick} sx={{ py: isMobile ? 1 : 2 }}>
            <ListItemIcon>
              <DownloadIcon />
            </ListItemIcon>
            <ListItemText primary="Download" primaryTypographyProps={{ fontSize: isMobile ? '0.9rem' : '1rem' }} />
          </ListItemButton>
          <ListItemButton onClick={handleLogout} sx={{ py: isMobile ? 1 : 2 }}>
            <ListItemIcon>
              <LeaveIcon />
            </ListItemIcon>
            <ListItemText primary="Leave Group" primaryTypographyProps={{ fontSize: isMobile ? '0.9rem' : '1rem' }} />
          </ListItemButton>
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {renderContent()}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem>
          <CSVLink
            data={filteredItems.map(({ id, image, ...rest }) => rest)}
            filename="inventory_filtered.csv"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            Export Filtered to CSV
          </CSVLink>
        </MenuItem>
        <MenuItem>
          <CSVLink
            data={items.map(({ id, image, ...rest }) => rest)}
            filename="inventory_all.csv"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            Export All to CSV
          </CSVLink>
        </MenuItem>
        <MenuItem
          onClick={() => {
            exportToPDF(filteredItems);
            handleCloseMenu();
          }}
        >
          Export Filtered to PDF
        </MenuItem>
        <MenuItem
          onClick={() => {
            exportToPDF(items);
            handleCloseMenu();
          }}
        >
          Export All to PDF
        </MenuItem>
      </Menu>

      <Dialog
        open={openDetailDialog}
        onClose={handleCloseDetailDialog}
        maxWidth="sm"
        fullWidth
      >
        {selectedItem && (
          <>
            <DialogTitle sx={{ textAlign: "center" }}>
              {selectedItem.name}
            </DialogTitle>
            <DialogContent>
              <Box
                sx={{
                  position: "relative",
                  paddingTop: "75%", // 4:3 aspect ratio
                  width: "100%",
                  overflow: "hidden",
                  marginBottom: 2,
                }}
              >
                <img
                  src={selectedItem.image || "https://via.placeholder.com/150"}
                  alt={selectedItem.name}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </Box>
              <Typography variant="h6" sx={{ mt: 2 }}>
                Quantity: {selectedItem.quantity}
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                {selectedItem.description}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 3 }}>
              <Button
                onClick={() => handleOpenDialog(selectedItem)}
                color="primary"
                variant="contained"
                startIcon={<EditIcon />}
              >
                Edit Item
              </Button>
              <Button
                onClick={() => {
                  handleDeleteItem(selectedItem.id);
                  handleCloseDetailDialog();
                }}
                color="error"
                variant="contained"
                startIcon={<DeleteIcon />}
              >
                Delete Item
              </Button>
              <Button
                onClick={handleCloseDetailDialog}
                color="inherit"
                variant="outlined"
                startIcon={<CloseIcon />}
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Item Name"
            fullWidth
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Quantity"
            type="number"
            fullWidth
            value={itemQuantity}
            onChange={(e) => setItemQuantity(e.target.value)}
            inputProps={{ min: 1 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
          />
          <input
            accept="image/*"
            style={{ display: "none" }}
            id="raised-button-file"
            type="file"
            onChange={handleImageChange}
            ref={fileInputRef}
          />
          <label htmlFor="raised-button-file">
            <Button
              variant="contained"
              component="span"
              startIcon={<UploadIcon />}
              style={{ marginTop: "1rem" }}
            >
              {itemImage ? "Change Image" : "Upload Image"}
            </Button>
          </label>
          {itemImage && (
            <Box mt={2}>
              <img
                src={
                  itemImage instanceof File
                    ? URL.createObjectURL(itemImage)
                    : itemImage.url
                }
                alt="Item"
                style={{ maxWidth: "100%", maxHeight: "200px" }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveItem} color="primary">
            {editingItem ? "Save" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
      />
    </Box>
  );
}

export default withAuth(InventoryDashboard);