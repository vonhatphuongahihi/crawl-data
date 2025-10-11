import mysql from 'mysql2/promise';

async function testConnection() {
    console.log('🔍 Testing database connection...');

    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: 'NhatphuongBFF10@',
            database: 'issue_tracking_db'
        });

        console.log('✅ Connected to MySQL database successfully!');

        // Test query - show tables
        const [rows] = await connection.execute('SHOW TABLES');
        console.log('📋 Available tables:');
        rows.forEach(row => {
            console.log(`   - ${Object.values(row)[0]}`);
        });

        // Test query - count records in each table
        const tables = ['bts_issues', 'bts_users', 'bts_projects', 'bts_statuses'];
        console.log('\n📊 Record counts:');
        for (const table of tables) {
            try {
                const [countRows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`   ${table}: ${countRows[0].count} records`);
            } catch (error) {
                console.log(`   ${table}: Error - ${error.message}`);
            }
        }

        await connection.end();
        console.log('✅ Database connection test completed successfully!');

    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
}

testConnection();
