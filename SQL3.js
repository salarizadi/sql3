/**
 *  Copyright (c) 2025
 *  @Version : 1.0.0
 *  @Author  : https://salarizadi.ir
 *  @description A promise-based wrapper for SQLite3 that provides a fluent interface
 *  for database operations with chainable where clauses and transaction support.
 */

const sqlite3 = require('sqlite3').verbose();

/**
 * SQL3 - An enhanced SQLite3 wrapper class providing promise-based database operations
 * with support for query building, transactions, and batch processing.
 */
class SQL3 {

    /**
     * Creates a new SQL3 instance
     * @param {string} databaseFile - Path to the SQLite database file
     */
    constructor (databaseFile) {
        this.db = new sqlite3.Database(databaseFile);
        // Internal state for WHERE clause building
        this._clearWhereConditions();
        // Stores the last executed query for debugging and logging
        this.lastQuery = {
            sql : null,
            type: null,
            params: null,
        };
        this.isTransactionActive = false;
    }

    /**
     * Stores the details of the last executed query
     * @private
     * @param {string} sql - The SQL query string
     * @param {Array|Object} params - Query parameters
     * @param {string} type - Query type (run/all/get)
     */
    _storeLastQuery (sql, type, params) {
        this.lastQuery = { sql, type, params: Array.isArray(params) ? [...params] : params };
    }

    /**
     * Retrieves the last executed query details
     * @returns {Object} Object containing the last query's SQL, type, and parameters
     */
    getLastQuery = () => this.lastQuery

    /**
     * Executes a write operation (INSERT, UPDATE, DELETE)
     * @private
     * @param {string} sql - SQL query to execute
     * @param {Array} params - Query parameters
     * @returns {Promise<Object>} Object containing lastID and number of changes
     */
    _run (sql, params = []) {
        this._storeLastQuery(sql, 'run', params);
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(new Error(`SQL run error: ${err.message}`));
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }

    /**
     * Executes a query returning multiple rows
     * @private
     * @param {string} sql - SQL query to execute
     * @param {Array} params - Query parameters
     * @returns {Promise<Array>} Array of result rows
     */
    _all (sql, params = []) {
        this._storeLastQuery(sql, 'all', params);
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(new Error(`SQL all error: ${err.message}`));
                else resolve(rows || []);
            });
        });
    }

    /**
     * Executes a query returning a single row
     * @private
     * @param {string} sql - SQL query to execute
     * @param {Array} params - Query parameters
     * @returns {Promise<Object|null>} Single result row or null
     */
    _get (sql, params = []) {
        this._storeLastQuery(sql, 'get', params);
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(new Error(`SQL get error: ${err.message}`));
                else resolve(row || null);
            });
        });
    }

    /**
     * Iterates over each row in the query result using generator pattern
     * @param {string} sql - SQL query to execute
     * @param {Array} params - Query parameters
     * @returns {AsyncGenerator<Object>} Async generator yielding each row
     */
    async* each (sql, params = []) {
        return new Promise((resolve, reject) => {
            const rows = [];
            this.db.each(
                sql,
                params,
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    rows.push(row);
                },
                (err, count) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(rows);
                }
            );
        }).then(function* (rows) {
            for (const row of rows) {
                yield row;
            }
        });
    }

    /**
     * Generic query executor supporting multiple query types
     * @param {string} sql - SQL query to execute
     * @param {Array} params - Query parameters
     * @param {string} method - Query type (all/get/run/each)
     * @returns {Promise} Query results based on type
     */
    async query (sql, params = [], method = 'all') {
        return new Promise((resolve, reject) => {
            const callback = (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(result);
            };

            switch (method) {
                case 'all':
                    this.db.all(sql, params, callback);
                    break;
                case 'get':
                    this.db.get(sql, params, callback);
                    break;
                case 'run':
                    this.db.run(sql, params, callback);
                    break;
                case 'each':
                    resolve(this.each(sql, params));
                    break;
                default:
                    reject(new Error(`Unknown method: ${method}`));
            }
        });
    }

    /**
     * Checks if a table exists in the database
     * @param {string} table - Table name to check
     * @returns {Promise<boolean>} True if table exists, false otherwise
     */
    async tableExists (table) {
        const result = await this._get(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            [table]
        );
        return !!result;
    }

    /**
     * Creates a new table if it doesn't exist
     * @param {string} table - Table name
     * @param {Object} columns - Column definitions {columnName: columnType}
     * @returns {Promise} Result of table creation
     */
    async createTable (table, columns) {
        if (!columns || typeof columns !== 'object') {
            throw new Error('Invalid columns definition');
        }

        const columnDefs = Object.entries(columns).map(([name, type]) => `${name} ${type}`);
        return this._run(`CREATE TABLE IF NOT EXISTS ${table} (${columnDefs.join(', ')})`);
    }

    /**
     * Drops a table if it exists
     * @param {string} table - Table name to drop
     * @returns {Promise} Result of drop operation
     */
    async dropTable (table) {
        return this._run(`DROP TABLE IF EXISTS ${table}`);
    }

    /**
     * Adds a WHERE condition to the query chain
     * @param {string} column - Column name
     * @param {*} value - Value to compare against
     * @param {string} operator - Logical operator (AND/OR)
     * @param {string} comparison - Comparison operator (=, >, <, etc.)
     * @returns {SQL3} This instance for chaining
     */
    where (column, value, operator = 'AND', comparison = '=') {
        this.whereClauses.push(`${column} ${comparison} ?`);
        this.whereParams.push(value);
        this.whereOperators.push(operator);
        return this;
    }

    /**
     * Clears all WHERE conditions
     * @private
     */
    _clearWhereConditions () {
        this.whereClauses = [];
        this.whereParams  = [];
        this.whereOperators = [];
    }

    /**
     * Builds the WHERE clause from stored conditions
     * @private
     * @returns {Object} WHERE clause and parameters
     */
    _buildWhereClause () {
        if (this.whereClauses.length === 0) return { whereClause: '', params: [] };

        const whereClause = this.whereClauses.reduce((acc, clause, index) => {
            if (index === 0) return ` WHERE ${clause}`;
            return `${acc} ${this.whereOperators[index]} ${clause}`;
        }, '');

        return { whereClause, params: [...this.whereParams] };
    }

    /**
     * Retrieves all matching rows from a table
     * @param {string} table - Table name
     * @param {string|Array} columns - Columns to select
     * @returns {Promise<Array>} Matching rows
     */
    async get (table, columns = '*') {
        let columnStr = columns;

        if (Array.isArray(columns))
            columnStr = columns.join(', ');

        const { whereClause, params } = this._buildWhereClause();
        const query = `SELECT ${columnStr} FROM ${table}${whereClause}`;

        this._clearWhereConditions();

        return await this._all(query, params);
    }

    /**
     * Retrieves a single row from a table
     * @param {string} table - Table name
     * @param {string} columns - Columns to select
     * @returns {Promise<Object|null>} First matching row or null
     */
    async getOne (table, columns = '*') {
        const { whereClause, params } = this._buildWhereClause();
        const query = `SELECT ${columns} FROM ${table}${whereClause} LIMIT 1`;
        const result = await this._get(query, params);
        this._clearWhereConditions();

        if (!result) return null;
        if (columns !== '*' && !columns.includes(',')) {
            return result[columns];
        }
        return result;
    }

    /**
     * Counts rows in a table
     * @param {string} table - Table name
     * @param {string} column - Column to count
     * @returns {Promise<number>} Number of matching rows
     */
    async count (table, column = '*') {
        const { whereClause, params } = this._buildWhereClause();
        const query = `SELECT COUNT(${column}) as count FROM ${table}${whereClause}`;
        const result = await this._get(query, params);
        this._clearWhereConditions();
        return result?.count || 0;
    }

    /**
     * Inserts a new row into a table
     * @param {string} table - Table name
     * @param {Object} data - Data to insert {column: value}
     * @returns {Promise<Object>} Result with success status and lastID
     */
    async insert (table, data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data for insert');
        }

        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = new Array(values.length).fill('?').join(', ');

        const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

        try {
            const result = await this._run(query, values);
            return { success: true, lastID: result.lastID };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Updates rows in a table
     * @param {string} table - Table name
     * @param {Object} data - Data to update {column: value}
     * @returns {Promise<Object>} Result of update operation
     */
    async update (table, data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data for update');
        }

        const columns = Object.keys(data);
        const setClauses = columns.map(col => `${col} = ?`);
        const values = Object.values(data);

        const { whereClause, params } = this._buildWhereClause();

        const query = `UPDATE ${table} SET ${setClauses.join(', ')}${whereClause}`;
        const result = await this._run(query, [...values, ...params]);
        this._clearWhereConditions();
        return result;
    }

    /**
     * Deletes rows from a table
     * @param {string} table - Table name
     * @returns {Promise<Object>} Result of delete operation
     */
    async delete (table) {
        const { whereClause, params } = this._buildWhereClause();
        const query = `DELETE FROM ${table}${whereClause}`;
        const result = await this._run(query, params);
        this._clearWhereConditions();
        return result;
    }

    /**
     * Implements pagination for table queries
     * @param {string} table - Table name
     * @param {number} page - Page number
     * @param {number} perPage - Items per page
     * @param {string} columns - Columns to select
     * @returns {Promise<Object>} Paginated results with metadata
     */
    async paginate (table, page = 1, perPage = 10, columns = '*') {
        const offset = (page - 1) * perPage;
        const totalCount = await this.count(table);
        const { whereClause, params } = this._buildWhereClause();

        const query = `SELECT ${columns} FROM ${table}${whereClause} LIMIT ${perPage} OFFSET ${offset}`;
        const data = await this._all(query, params);
        this._clearWhereConditions();

        return {
            data,
            pagination: {
                total: totalCount,
                per_page: perPage,
                current_page: page,
                total_pages: Math.ceil(totalCount / perPage),
                has_more: page < Math.ceil(totalCount / perPage)
            }
        };
    }

    /**
     * Processes table data in batches
     * @param {string} table - Table name
     * @param {number} batchSize - Number of records per batch
     * @param {Function} callback - Function to process each batch
     * @param {string} columns - Columns to select
     * @returns {Promise<void>}
     */
    async batchSize (table, batchSize, callback, columns = '*') {
        let offset = 0;

        while (true) {
            const { whereClause, params } = this._buildWhereClause();
            const query = `SELECT ${columns} FROM ${table}${whereClause} LIMIT ${batchSize} OFFSET ${offset}`;
            const batch = await this._all(query, params);

            if (batch.length === 0) break;
            await callback(batch);
            offset += batchSize;
        }

        this._clearWhereConditions();
    }

    /**
     * Begins a new SQLite transaction
     * @throws {Error} If a transaction is already active
     * @returns {Promise<void>}
     */
    async beginTransaction () {
        if (this.isTransactionActive)
            throw new Error('Transaction already active');

        await this._run('BEGIN TRANSACTION');
        this.isTransactionActive = true;
    }

    /**
     * Commits the current active transaction
     * @throws {Error} If no transaction is active
     * @returns {Promise<void>}
     */
    async commit () {
        if (!this.isTransactionActive)
            throw new Error('No active transaction to commit');

        await this._run('COMMIT');
        this.isTransactionActive = false;
    }

    /**
     * Rolls back the current active transaction
     * If no transaction is active, silently returns
     * @returns {Promise<void>}
     */
    async rollback () {
        if (!this.isTransactionActive) return;
        await this._run('ROLLBACK');
        this.isTransactionActive = false;
    }

    /**
     * Performs VACUUM operation on the database to optimize storage and performance
     * Can be used with or without additional options
     * @param {string} into - Name of the new database file (for VACUUM INTO)
     * @returns {Promise<boolean>}
     */
    async vacuum (into) {
        // Check if there's an active transaction since VACUUM can't run inside a transaction
        if (this.isTransactionActive)
            throw new Error('Cannot VACUUM within a transaction');

        try {
            // If INTO option is provided, use VACUUM INTO syntax
            if (into) {
                // VACUUM INTO allows creating a new database file with the vacuumed contents
                await this._run(`VACUUM INTO '${into}'`);
            } else {
                // Regular VACUUM operation
                await this._run('VACUUM');
            }
        } catch (error) {
            throw new Error(`VACUUM operation failed: ${error.message}`);
        }
    }

    /**
     * Closes the database connection
     * @returns {Promise<void>}
     */
    close () {
        return new Promise((resolve, reject) => {
            this.db.close(err => {
                if (err) reject(new Error(`Failed to close database: ${err.message}`)); else {
                    this._clearWhereConditions();
                    this.isTransactionActive = false;
                    resolve();
                }
            });
        });
    }

}

module.exports = SQL3;