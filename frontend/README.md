# Attendance Management System - Frontend

Modern React dashboard for managing attendance data from ZKTeco biometric devices.

## 🏗️ Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date Handling**: date-fns

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/         # Layout components (Sidebar, Header)
│   │   ├── dashboard/      # Dashboard widgets
│   │   ├── employees/      # Employee components
│   │   ├── devices/        # Device components
│   │   └── attendance/     # Attendance components
│   ├── pages/              # Page components
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── EmployeesPage.jsx
│   │   ├── DevicesPage.jsx
│   │   ├── AttendancePage.jsx
│   │   ├── RealTimeMonitorPage.jsx
│   │   ├── BackgroundMonitorPage.jsx
│   │   └── ManualMonitorPage.jsx
│   ├── services/           # API services
│   │   └── api.js
│   ├── store/              # Zustand stores
│   │   ├── authStore.js
│   │   └── backgroundMonitorStore.js
│   ├── utils/              # Utility functions
│   ├── styles/             # Global styles
│   ├── App.jsx             # Main app component
│   └── main.jsx            # Entry point
├── public/                 # Static assets
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ LTS
- npm or yarn
- Backend API running

### Installation

1. **Navigate to frontend**

   ```bash
   cd frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**

   Create `.env` file:

   ```env
   VITE_API_URL=http://localhost:5000/api/v1
   ```

4. **Start development server**

   ```bash
   npm run dev
   ```

   App runs at: `http://localhost:3000`

### Build for Production

```bash
npm run build
```

Build output in `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## 🎨 UI Components

### Pages

#### Dashboard

- Overview statistics
- Recent attendance logs
- Quick actions
- System status

#### Employees

- Employee list with search/filter
- Add/Edit/Delete employees
- Department management
- Bulk import

#### Devices

- Device registry
- Connection testing
- Device information
- User synchronization

#### Attendance

- Attendance logs viewer
- Date range filtering
- Employee filtering
- Export functionality
- Manual sync trigger
- Real-time monitoring feed
- Background monitoring (24/7 capture with persistent state)

### Key Components

**Layout Components:**

- `MainLayout` - App shell with sidebar
- `Sidebar` - Navigation menu
- `Header` - Top bar with user menu

**Shared Components:**

- `Card` - Content container
- `Table` - Data tables
- `Modal` - Dialog boxes
- `Button` - Action buttons
- `Input` - Form inputs
- `Badge` - Status indicators
- `LoadingSpinner` - Loading states

## 🔐 Authentication

### Login Flow

1. User enters credentials
2. API validates and returns JWT
3. Token stored in localStorage
4. Token included in all API requests
5. Auto-redirect on token expiration

### Protected Routes

All routes except `/login` require authentication. Unauthenticated users are redirected to login page.

### Role-Based UI

Components adapt based on user role:

- **Admin**: Full access
- **Manager**: Limited write access
- **Viewer**: Read-only

## 📡 API Integration

### API Service Structure

```javascript
// Example API call
import { employeeAPI } from "./services/api";

const getEmployees = async () => {
  try {
    const response = await employeeAPI.getAll({
      page: 1,
      limit: 50,
      search: "john",
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch employees:", error);
  }
};
```

### Available API Methods

**Auth:**

- `authAPI.login(credentials)`
- `authAPI.register(userData)`
- `authAPI.getProfile()`
- `authAPI.changePassword(data)`

**Employees:**

- `employeeAPI.getAll(params)`
- `employeeAPI.getById(id)`
- `employeeAPI.create(data)`
- `employeeAPI.update(id, data)`
- `employeeAPI.delete(id)`

**Devices:**

- `deviceAPI.getAll(params)`
- `deviceAPI.register(data)`
- `deviceAPI.testConnection(id)`
- `deviceAPI.getInfo(id)`

**Attendance:**

- `attendanceAPI.getLogs(params)`
- `attendanceAPI.triggerSync(deviceId)`
- `attendanceAPI.getDashboardStats()`
- `attendanceAPI.getEmployeeSummary(employeeId, params)`
- `attendanceAPI.getBackgroundMonitorStatus()`
- `attendanceAPI.startBackgroundMonitor()`
- `attendanceAPI.stopBackgroundMonitor()`

## 🗂️ State Management

### Zustand Stores

**Auth Store:**

```javascript
import { useAuthStore } from "./store/authStore";

// In component
const { user, login, logout } = useAuthStore();
```

Store features:

- User authentication state
- Login/logout actions
- Token management
- Profile fetching
- Clears background monitoring on logout

**Background Monitoring Store:**

```javascript
import { useBackgroundMonitorStore } from "./store/backgroundMonitorStore";

// In component
const { logs, setLogs, addLog, clearLogs } = useBackgroundMonitorStore();
```

Store features:

- Persistent log storage (localStorage)
- Smart caching with 5-minute refresh
- Real-time log additions via SSE
- Automatic pruning of old logs
- Survives page navigation

### Local State

- Component-level state with `useState`
- Form state management
- UI state (modals, dropdowns)

## 🎨 Styling

### Tailwind CSS

Utility-first CSS framework for rapid development.

**Common Patterns:**

```jsx
// Card
<div className="card">
  <h2 className="text-lg font-semibold mb-4">Title</h2>
  <p className="text-gray-600">Content</p>
</div>

// Button
<button className="btn btn-primary">
  Click me
</button>

// Input
<input
  className="input"
  type="text"
  placeholder="Enter text"
/>

// Badge
<span className="badge badge-success">
  Active
</span>
```

### Custom Classes

Defined in `src/styles/index.css`:

- `.btn`, `.btn-primary`, `.btn-secondary`
- `.input`
- `.card`
- `.badge`, `.badge-success`, etc.

## 📊 Data Visualization

### Recharts Integration

```jsx
import { LineChart, Line, XAxis, YAxis } from "recharts";

<LineChart data={data} width={600} height={300}>
  <XAxis dataKey="date" />
  <YAxis />
  <Line type="monotone" dataKey="count" stroke="#3b82f6" />
</LineChart>;
```

### Chart Types

- Line charts - Attendance trends
- Bar charts - Department statistics
- Pie charts - Status distribution

## 🔄 Real-time Features

### Server-Sent Events (SSE)

**Manual Real-Time Monitoring:**

```javascript
// Connect to device stream
const eventSource = new EventSource(
  `${API_URL}/attendance/realtime/${deviceId}`,
);

eventSource.onmessage = (event) => {
  const log = JSON.parse(event.data);
  // Update UI with new attendance
};

// Clean up on unmount
eventSource.close();
```

**Background Monitoring Stream:**

```javascript
// Connect to background monitoring stream
const eventSource = new EventSource(
  `${API_URL}/attendance/background-monitor/stream`,
);

eventSource.onmessage = (event) => {
  const log = JSON.parse(event.data);
  // Add to Zustand store
  addLog(log);
};
```

### State Persistence

Background monitoring uses Zustand with localStorage persistence:

- Logs persist across page navigation
- Smart caching reduces database calls
- Only fetches if cache is empty or > 5 minutes old
- SSE updates add to existing logs without replacing
- Automatic cleanup on logout

## 📱 Responsive Design

### Breakpoints

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Mobile-First Approach

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid */}
</div>
```

## 🧪 Development Workflow

### Component Development

1. **Create component**

   ```jsx
   // src/components/MyComponent.jsx
   export default function MyComponent({ prop1, prop2 }) {
     return <div>...</div>;
   }
   ```

2. **Import and use**

   ```jsx
   import MyComponent from "./components/MyComponent";

   <MyComponent prop1="value" prop2={data} />;
   ```

### Adding New Pages

1. Create page component in `src/pages/`
2. Add route in `App.jsx`
3. Add navigation link in Sidebar

### API Integration

1. Add API method in `src/services/api.js`
2. Call from component or create custom hook
3. Handle loading/error states

## 🎯 Best Practices

### Component Structure

```jsx
import React, { useState, useEffect } from "react";

export default function Component() {
  // Hooks
  const [state, setState] = useState(null);

  // Effects
  useEffect(() => {
    // Side effects
  }, []);

  // Handlers
  const handleClick = () => {
    // Logic
  };

  // Render
  return <div>{/* JSX */}</div>;
}
```

### Error Handling

```jsx
const [error, setError] = useState(null);
const [loading, setLoading] = useState(false);

const fetchData = async () => {
  setLoading(true);
  setError(null);

  try {
    const data = await api.getData();
    // Process data
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### Form Handling

```jsx
const [formData, setFormData] = useState({
  name: "",
  email: "",
});

const handleChange = (e) => {
  setFormData({
    ...formData,
    [e.target.name]: e.target.value,
  });
};

const handleSubmit = async (e) => {
  e.preventDefault();
  // Submit form
};
```

## 🚀 Deployment

### Environment Variables

Create `.env.production`:

```env
VITE_API_URL=https://api.yourdomain.com/api/v1
```

### Build Process

```bash
npm run build
```

### Static Hosting

Deploy `dist/` folder to:

- Vercel
- Netlify
- AWS S3 + CloudFront
- Nginx/Apache

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/attendance/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:5000;
    }
}
```

## 🔧 Configuration

### Vite Configuration

`vite.config.js` handles:

- Dev server port
- API proxy
- Build options
- Plugin configuration

### Tailwind Configuration

`tailwind.config.js` customizes:

- Color palette
- Spacing scale
- Breakpoints
- Custom utilities

## 📦 Key Dependencies

| Package          | Purpose             |
| ---------------- | ------------------- |
| react            | UI library          |
| react-router-dom | Client-side routing |
| zustand          | State management    |
| axios            | HTTP client         |
| tailwindcss      | CSS framework       |
| recharts         | Charts and graphs   |
| lucide-react     | Icon library        |
| date-fns         | Date utilities      |
| vite             | Build tool          |

## 🐛 Troubleshooting

### API Connection Issues

```bash
# Check API URL in .env
echo $VITE_API_URL

# Verify backend is running
curl http://localhost:5000/api/v1/health
```

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .vite
```

### Authentication Issues

```bash
# Clear localStorage
localStorage.clear();

# Check token in DevTools > Application > Local Storage
```

## 📈 Performance Optimization

### Code Splitting

```jsx
import { lazy, Suspense } from "react";

const EmployeesPage = lazy(() => import("./pages/EmployeesPage"));

<Suspense fallback={<LoadingSpinner />}>
  <EmployeesPage />
</Suspense>;
```

### Memoization

```jsx
import { useMemo } from "react";

const filteredData = useMemo(() => {
  return data.filter((item) => item.status === "active");
}, [data]);
```

## 🤝 Contributing

### Development Setup

1. Fork repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

### Code Style

- Use functional components
- Follow React hooks rules
- Use TypeScript (future enhancement)
- Write meaningful commit messages

## 📄 License

MIT License - See LICENSE file

## 📚 Resources

- [React Documentation](https://react.dev/)
- [Vite Guide](https://vitejs.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [React Router](https://reactrouter.com/)
- [Zustand](https://github.com/pmndrs/zustand)
