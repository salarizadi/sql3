const SQL3 = require('./SQL3');

async function runExample () {
    // Create a new database instance
    const db = new SQL3(':memory:');

    try {
        // Create a test table
        await db.createTable('test_users', {
            id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
            name: 'TEXT NOT NULL',
            email: 'TEXT UNIQUE',
            created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
        });

        console.log('✅ Table created successfully');

        // Insert some test data
        const insert1 = await db.insert('test_users', {
            name: 'John Doe',
            email: 'john@example.com'
        });

        const insert2 = await db.insert('test_users', {
            name: 'Jane Smith',
            email: 'jane@example.com'
        });

        console.log('✅ Test data inserted:', {insert1, insert2});

        // Test WHERE clause
        const users = await db
            .where('name', '%John%', 'AND', 'LIKE')
            .get('test_users');

        console.log('✅ Query with WHERE clause:', users);

        // Test transaction
        await db.beginTransaction();
        try {
            await db.insert('test_users', {
                name: 'Transaction Test',
                email: 'transaction@test.com'
            });
            await db.commit();
            console.log('✅ Transaction test passed');
        } catch (error) {
            await db.rollback();
            console.error('❌ Transaction test failed:', error);
        }

        // Test count
        const count = await db.count('test_users');
        console.log('✅ Total users:', count);

        // Test pagination
        const page = await db.paginate('test_users', 1, 2);
        console.log('✅ Pagination test:', page);

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await db.close();
        console.log('✅ Database closed');
    }
}

// Run the example
runExample().catch(console.error);