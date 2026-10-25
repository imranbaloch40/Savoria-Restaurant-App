export type DietaryTag = 
  | 'Vegetarian' 
  | 'Vegan' 
  | 'Gluten-Free' 
  | 'Halal' 
  | 'Chef Special' 
  | 'Spicy' 
  | 'Keto Friendly' 
  | 'Dairy-Free';

export type CategoryId = 
  | 'all' 
  | 'starters' 
  | 'mains' 
  | 'italian' 
  | 'grill' 
  | 'asian' 
  | 'desserts' 
  | 'beverages';

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  description: string;
}

export interface FoodItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: CategoryId;
  image: string;
  rating: number;
  reviewsCount: number;
  prepTime: string;
  calories: number;
  dietary: DietaryTag[];
  available?: boolean;
  isChefSpecial?: boolean;
  isPopular?: boolean;
  spicyLevel?: number; // 0 to 3
  ingredients: string[];
  allergens?: string[];
}

export interface CartItem {
  foodItem: FoodItem;
  quantity: number;
  specialInstructions?: string;
  selectedOptions?: string[];
}

export type SeatingArea = 
  | 'Main Dining Hall' 
  | 'Romantic Terrace' 
  | 'Rooftop Sky Lounge' 
  | 'Chef Table & Counter' 
  | 'VIP Private Suite';

export type DiningOccasion = 
  | 'Casual Dining' 
  | 'Birthday Celebration' 
  | 'Romantic Anniversary' 
  | 'Business Dinner' 
  | 'Family Gathering' 
  | 'Date Night';

export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled';

export interface Reservation {
  id: string;
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  date: string;
  time: string;
  guests: number;
  seatingArea: SeatingArea;
  occasion: DiningOccasion;
  specialRequests?: string;
  bookingReference: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  statusHistory?: ReservationStatusHistoryEntry[];
  tableNumber?: string;
}

export interface ReservationStatusHistoryEntry {
  status: ReservationStatus;
  changedAt: string;
  changedBy: string;
}

export interface UserProfile {
  uid: string;
  userId?: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  deliveryAddress?: DeliveryAddress;
  favoriteFoodIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type UserRole = 'customer' | 'manager' | 'admin';

export interface DeliveryAddress {
  country: string;
  city: string;
  area: string;
  houseNumber: string;
  streetAddress: string;
  additionalDetails?: string;
}

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: DeliveryAddress;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  orderType: 'dine-in' | 'takeout' | 'delivery';
  tableNumber?: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  specialInstructions?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
  statusHistory?: OrderStatusHistoryEntry[];
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'ready-for-dispatch'
  | 'on-the-way'
  | 'delivered'
  | 'ready-for-pickup'
  | 'picked-up'
  | 'ready-to-serve'
  | 'served'
  | 'completed'
  | 'cancelled';

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  changedAt: string;
  changedBy: string;
}

export interface ManagerApplication {
  uid: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  restaurantDetails: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}
