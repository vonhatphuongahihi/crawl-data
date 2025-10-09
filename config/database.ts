import mysql from 'mysql2/promise';

export interface DatabaseConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    connectionLimit?: number;
}

export const localDatabaseConfig: DatabaseConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'NhatphuongBFF10@', // Thay đổi theo cấu hình MySQL của bạn
    database: 'issue_tracking_db',
    connectionLimit: 10
};

export const remoteDatabaseConfig: DatabaseConfig = {
    host: '10.177.204.70',
    port: 3307,
    user: 'niq_user',
    password: 'niq_password',
    database: 'issue_tracking_db',
    connectionLimit: 10
};

// Tạo connection pool
export function createDatabaseConnection(config: DatabaseConfig = localDatabaseConfig) {
    return mysql.createPool({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        waitForConnections: true,
        connectionLimit: config.connectionLimit || 10,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true
    });
}

export default createDatabaseConnection;

