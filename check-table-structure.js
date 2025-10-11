import mysql from 'mysql2/promise';
import { localDatabaseConfig } from './dist/config/database.js';

async function checkTableStructure() {
    console.log('🔍 Checking table structure...');

    try {
        const connection = await mysql.createConnection(localDatabaseConfig);

        // Check bts_issues table structure
        const [rows] = await connection.execute('DESCRIBE bts_issues');
        console.log('\n📋 bts_issues table structure:');
        console.table(rows);

        // Check bts_projects table structure  
        const [projectRows] = await connection.execute('DESCRIBE bts_projects');
        console.log('\n📋 bts_projects table structure:');
        console.table(projectRows);

        await connection.end();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkTableStructure();