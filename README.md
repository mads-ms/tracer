# Tracer - Food Traceability System

A modern web-based food traceability system for Hazard Analysis and Critical Control Points compliance.

## Features

### Core Functionality
- **Supplier Management**: Register and manage food suppliers
- **Customer Management**: Manage customer information and sales history
- **Incoming Lot Registration**: Track raw materials entering the facility
- **Quality Control Checks**: Monitor incoming lot quality and compliance
- **Food Composition Management**: Create recipes and track ingredient usage
- **Outgoing Lot Management**: Manage processed food lots
- **Package Management**: Handle packaging with barcode support (GS1)
- **Sales Management**: Track sales and customer transactions
- **Full Traceability**: Complete traceability from supplier to customer
- **Company Settings**: Configure GS1 codes and system preferences

### Technical Features
- **Modern Web Interface**: React-based responsive UI
- **RESTful API**: Express.js backend with comprehensive endpoints
- **SQLite Database**: Lightweight, file-based database
- **Barcode Support**: GS1-13, GS1-14, and GS1-128 barcode generation
- **Real-time Updates**: Live data synchronization
- **Export Capabilities**: PDF reports and data export
- **Mobile Responsive**: Works on desktop, tablet, and mobile devices

## Project Structure

```
    /
├── backend/                 # Node.js/Express API server
│   ├── database/           # Database connection and initialization
│   ├── routes/             # API route handlers
│   ├── server.js           # Main server file
│   └── package.json        # Backend dependencies
├── frontend/               # React frontend application
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── App.js          # Main application component
│   │   └── index.js        # Application entry point
│   └── package.json        # Frontend dependencies
└── README.md              # This file
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Backend Setup
```bash
cd backend
npm install
npm start
```

The backend server will start on `http://localhost:3001`

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

The frontend application will start on `http://localhost:3000`

## API Endpoints

### Suppliers
- `GET /api/suppliers` - Get all suppliers
- `POST /api/suppliers` - Create new supplier
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier
- `GET /api/suppliers/stats/summary` - Get supplier statistics

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer
- `GET /api/customers/stats/summary` - Get customer statistics

### Incoming Lots
- `GET /api/lots-in` - Get all incoming lots
- `POST /api/lots-in` - Register new incoming lot
- `PUT /api/lots-in/:id` - Update incoming lot
- `DELETE /api/lots-in/:id` - Delete incoming lot
- `GET /api/lots-in/stats/summary` - Get lot statistics

### Quality Checks
- `GET /api/checks` - Get all quality checks
- `POST /api/checks` - Create new quality check
- `PUT /api/checks/:id` - Update quality check
- `DELETE /api/checks/:id` - Delete quality check
- `GET /api/checks/stats/summary` - Get check statistics

### Foods
- `GET /api/foods/raw` - Get raw materials
- `POST /api/foods/raw` - Create raw material
- `GET /api/foods/processed` - Get processed foods
- `POST /api/foods/processed` - Create processed food
- `GET /api/foods/stats/summary` - Get food statistics

### Company Settings
- `GET /api/company` - Get company settings
- `POST /api/company/info` - Update company information
- `POST /api/company/settings` - Update system settings
- `GET /api/company/measure-units` - Get measure units

## Database Schema

The system uses SQLite with the following main tables:

- **supplier**: Supplier information
- **customer**: Customer information
- **food_in**: Raw materials
- **food_out**: Processed foods
- **lot_in**: Incoming lots
- **lot_out**: Outgoing lots
- **supply_check**: Quality control checks
- **package**: Package information
- **sell**: Sales transactions
- **company**: Company settings
- **settings**: System settings

## Key Features

1. **Complete Traceability**: Full chain from supplier to customer
2. **HACCP Compliance**: Quality control and documentation
3. **GS1 Barcode Support**: Professional barcode generation
4. **Recipe Management**: Food composition tracking
5. **Quality Checks**: Incoming lot verification
6. **Multi-language Support**: Internationalization ready
7. **Data Export**: PDF reports and data export
8. **Audit Trail**: Complete data history

## Architechtural features

1. **Modern Web Interface**: Responsive design, better UX
2. **Real-time Updates**: Live data synchronization
3. **Better Search**: Advanced filtering and search
4. **Mobile Support**: Works on all devices
5. **API-First**: RESTful API for integration
6. **Modern Stack**: React, Node.js, SQLite
7. **Better Security**: Input validation, rate limiting
8. **Scalable Architecture**: Modular design

## Usage

1. **Initial Setup**: Configure company information and GS1 codes
2. **Add Suppliers**: Register food suppliers
3. **Add Customers**: Register customers
4. **Register Incoming Lots**: Track raw materials
5. **Perform Quality Checks**: Verify incoming materials
6. **Create Food Recipes**: Define processed foods
7. **Manage Outgoing Lots**: Track processed products
8. **Record Sales**: Complete the traceability chain
9. **Run Traceability**: Generate full traceability reports

## Development

### Adding New Features
1. Create API endpoints in `backend/routes/`
2. Add database schema changes in `backend/database/database.js`
3. Create React components in `frontend/src/components/`
4. Add pages in `frontend/src/pages/`
5. Update routing in `frontend/src/App.js`

### Code Style
- Use ES6+ features
- Follow React best practices
- Use async/await for API calls
- Implement proper error handling
- Add loading states for better UX

## License

open-source.

## Support

For issues and questions:
1. Check the API documentation
2. Review the database schema
3. Create an issue in the project repository

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---
