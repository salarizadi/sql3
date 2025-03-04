# SQL3

[![npm version](https://img.shields.io/npm/v/@salarizadi/sql3.svg)](https://www.npmjs.com/package/@salarizadi/sql3)
[![npm downloads](https://img.shields.io/npm/dm/@salarizadi/sql3.svg)](https://www.npmjs.com/package/@salarizadi/sql3)
[![npm bundle size](https://img.shields.io/bundlephobia/min/@salarizadi/sql3)](https://bundlephobia.com/package/@salarizadi/sql3)
[![License](https://img.shields.io/npm/l/@salarizadi/sql3)](https://github.com/salarizadi/sql3/blob/main/LICENSE)
[![GitHub last commit](https://img.shields.io/github/last-commit/salarizadi/sql3)](https://github.com/salarizadi/sql3/commits/main)
[![npm type definitions](https://img.shields.io/npm/types/@salarizadi/sql3)](https://www.npmjs.com/package/@salarizadi/sql3)

A helpful SQLite3 wrapper that enhances your database operations with a fluent interface, transactions, and modern async/await support.

## Features

- 🎯 Simple and intuitive API
- 🔗 Chainable query building
- 💫 Promise-based operations
- 🔄 Transaction support
- 📦 Batch processing helper
- 📄 Built-in pagination
- 🎮 Easy debugging
- 🚀 Performance optimized

## Installation

```bash
npm install @salarizadi/sql3
```
OR
```bash
yarn add @salarizadi/sql3
```

## Quick Start

```javascript
const SQL3 = require('@salarizadi/sql3');

// In-memory database (temporary, for testing)
const db = new SQL3(':memory:');

// File-based database (persistent storage)
// const db = new SQL3('database.sqlite');

async function main() {
    // Create a table
    await db.createTable('users', {
        id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
        name: 'TEXT NOT NULL',
        email: 'TEXT UNIQUE'
    });

    // Insert data
    const result = await db.insert('users', {
        name: 'John Doe',
        email: 'john@example.com'
    });
    
    console.log('Inserted user ID:', result.lastID);

    // Query with conditions
    const users = await db
        .where('name', 'LIKE', '%John%')
        .get('users');

    console.log('Found users:', users);
}

main().catch(console.error);
```

## Core Features

### Simple Queries

```javascript
// Get all records
const all = await db.get('users');

// Get one record
const user = await db.getOne('users');

// Count records
const count = await db.count('users');
```

### Where Conditions

```javascript
const users = await db
    .where('age', 18, 'AND', '>')
    .where('status', 'active')
    .where('role', 'admin', 'OR')
    .get('users');
```

### Transactions

```javascript
try {
    await db.beginTransaction();
    
    await db.insert('users', { name: 'User 1' });
    await db.insert('logs', { action: 'User created' });
    
    await db.commit();
} catch (error) {
    await db.rollback();
    console.error('Error:', error);
}
```

### Batch Processing

```javascript
await db.batchSize('users', 50, async (batch) => {
    for (const user of batch) {
        await processUser(user);
    }
});
```

### Pagination

```javascript
const { data, pagination } = await db.paginate('users', 1, 20);
console.log('Users:', data);
console.log('Page info:', pagination);
```

## API Reference

### Core Methods

#### Table Operations
- `createTable(table, columns)`: Create a new table
- `dropTable(table)`: Drop an existing table
- `tableExists(table)`: Check if a table exists

#### Query Methods
- `get(table, columns = '*')`: Get multiple records
- `getOne(table, columns = '*')`: Get a single record
- `insert(table, data)`: Insert new record
- `update(table, data)`: Update records
- `delete(table)`: Delete records
- `count(table, column = '*')`: Count records

#### Where Clauses
- `where(column, value, operator = 'AND', comparison = '=')`: Add a where condition

#### Transactions
- `beginTransaction()`: Start a transaction
- `commit()`: Commit transaction
- `rollback()`: Rollback transaction

#### Utilities
- `paginate(table, page = 1, perPage = 10)`: Get paginated results
- `batchSize(table, size, callback)`: Process records in batches
- `vacuum(into?)`: Optimize database
- `close()`: Close database connection
- `getLastQuery()`: Get last executed query details

## Example Use Cases

### User Management System
```javascript
// Create users table
await db.createTable('users', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    username: 'TEXT UNIQUE NOT NULL',
    email: 'TEXT UNIQUE NOT NULL',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
});

// Add new user
const { lastID } = await db.insert('users', {
    username: 'johndoe',
    email: 'john@example.com'
});

// Find user by email
const user = await db
    .where('email', 'john@example.com')
    .getOne('users');
```

### Activity Logging
```javascript
// Log user activity with transaction
async function logActivity(userId, action) {
    try {
        await db.beginTransaction();
        
        await db.insert('logs', {
            user_id: userId,
            action: action,
            timestamp: new Date().toISOString()
        });
        
        await db.update('users', {
            last_activity: new Date().toISOString()
        }).where('id', userId);
        
        await db.commit();
    } catch (error) {
        await db.rollback();
        throw error;
    }
}
```

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Created and maintained by [Salar Izadi](https://salarizadi.ir)

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/salarizadi/sql3/issues) on GitHub.